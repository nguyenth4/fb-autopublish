import type { Job } from 'bullmq'
import type { PrismaClient } from '@prisma/client'
import { PostStatus, JobStatus } from '@prisma/client'
import {
  FacebookService,
  FacebookApiError,
} from '../../../web/lib/facebook/facebook.service'
import { decryptToken } from '@packages/database/crypto'
import type { RateLimiterService } from '../services/rate-limiter.service'

export interface PublishPostJobData {
  postId: string
}

interface ProcessorDeps {
  prisma: PrismaClient
  fbService: FacebookService
  rateLimiter: RateLimiterService
}

/**
 * Factory function — returns a BullMQ-compatible processor with injected deps.
 * Pattern enables clean unit testing: mock prisma/fbService/rateLimiter independently.
 */
export function createPublishProcessor(deps: ProcessorDeps) {
  const { prisma, fbService, rateLimiter } = deps

  return async function processPublishJob(job: Job<PublishPostJobData>): Promise<void> {
    const { postId } = job.data
    const attemptNumber = (job.attemptsMade ?? 0) + 1

    console.log(`[Worker] job=${job.id} postId=${postId} attempt=${attemptNumber}`)

    // ── 1. Load post + page from DB ──────────────────────────────────────────
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        page: {
          select: { id: true, fbPageId: true, encryptedAccessToken: true },
        },
      },
    })

    if (!post) {
      // Permanent error — post deleted before worker ran
      throw Object.assign(new Error(`Post ${postId} not found`), { unrecoverable: true })
    }

    // ── 2. Idempotency guard ─────────────────────────────────────────────────
    if (post.status === PostStatus.PUBLISHED) {
      console.warn(`[Worker] Post ${postId} already published — skipping`)
      return
    }

    // ── 3. Set PUBLISHING — distributed lock ─────────────────────────────────
    await prisma.post.update({
      where: { id: postId },
      data: { status: PostStatus.PUBLISHING },
    })

    const startedAt = Date.now()

    try {
      // ── 4. Rate limit per page ───────────────────────────────────────────
      await rateLimiter.acquire(post.page.fbPageId)

      // ── 5. Decrypt token in-memory ───────────────────────────────────────
      const pageAccessToken = decryptToken(post.page.encryptedAccessToken)

      // ── 6. Publish to Facebook ───────────────────────────────────────────
      const mediaUrls = post.mediaUrls as string[]
      const result = await fbService.publishImagePost({
        message: post.message,
        mediaUrls,
        pageAccessToken,
        pageId: post.page.fbPageId,
      })

      // ── 7. Mark PUBLISHED ────────────────────────────────────────────────
      await prisma.post.update({
        where: { id: postId },
        data: {
          status: PostStatus.PUBLISHED,
          publishedAt: result.publishedAt,
          fbPostId: result.postId,
        },
      })

      // ── 8. Write success log ─────────────────────────────────────────────
      await prisma.jobLog.create({
        data: {
          postId,
          status: JobStatus.COMPLETED,
          attempt: attemptNumber,
          processingTimeMs: Date.now() - startedAt,
        },
      })

      console.log(`[Worker] SUCCESS: post=${postId} fbPostId=${result.postId}`)
    } catch (error) {
      const isFbError = error instanceof FacebookApiError
      const isRetryable = isFbError ? error.isRetryable : true
      const isLastAttempt = attemptNumber >= (job.opts.attempts ?? 3)
      const errorMessage = error instanceof Error ? error.message : String(error)
      const fbCode = isFbError ? error.fbCode : null

      const errorCode = isFbError
        ? fbCode === 190
          ? 'FB_INVALID_TOKEN'
          : [4, 17, 32].includes(fbCode!)
            ? 'FB_RATE_LIMIT'
            : 'FB_API_ERROR'
        : 'NETWORK_ERROR'

      console.error(
        `[Worker] FAILED: post=${postId} attempt=${attemptNumber} code=${errorCode}`,
        errorMessage,
      )

      // Revert status
      const nextStatus =
        isLastAttempt || !isRetryable ? PostStatus.FAILED : PostStatus.SCHEDULED

      await prisma.post.update({
        where: { id: postId },
        data: { status: nextStatus },
      })

      await prisma.jobLog.create({
        data: {
          postId,
          status:
            isLastAttempt || !isRetryable ? JobStatus.FAILED : JobStatus.RETRYING,
          attempt: attemptNumber,
          errorCode,
          errorMessage,
          fbErrorCode: fbCode,
          processingTimeMs: Date.now() - startedAt,
        },
      })

      // Non-retryable: prevent BullMQ from retrying
      if (!isRetryable) {
        throw Object.assign(new Error(`Permanent failure: ${errorMessage}`), {
          unrecoverable: true,
        })
      }

      // Re-throw → BullMQ retries with exponential backoff (5s, 10s, 20s)
      throw error
    }
  }
}
