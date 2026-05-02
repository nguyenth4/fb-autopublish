'use server'

import { revalidatePath } from 'next/cache'
import { getAuthSession } from '@/lib/auth-helpers'
import { prisma } from '@packages/database/prisma'
import { getPublishQueue } from '@/lib/queue'
import type { PublishPostJobData } from '@/lib/queue'
import { createPostSchema } from '@/lib/schemas/post.schema'

interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

async function verifyPageAccess(userId: string, pageId: string): Promise<boolean> {
  const access = await prisma.userPageAccess.findUnique({
    where: { userId_pageId: { userId, pageId } },
    select: { canPost: true },
  })
  return access?.canPost === true
}

export async function createPostAction(
  input: unknown,
): Promise<ActionResult<{ postId: string; jobId: string }>> {
  const session = await getAuthSession()
  if (!session?.user) return { success: false, error: 'Unauthorized' }

  // Server-side validation (Zod)
  const parsed = createPostSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }
  const data = parsed.data

  const hasAccess = await verifyPageAccess(session.user.id, data.pageId)
  if (!hasAccess) {
    return { success: false, error: 'You do not have access to this page' }
  }

  // Parse scheduledAt — JS Date() auto-converts ISO 8601 with offset to UTC
  let scheduledAt: Date | null = null
  if (data.scheduledAt) {
    scheduledAt = new Date(data.scheduledAt)
    if (isNaN(scheduledAt.getTime())) {
      return { success: false, error: 'Invalid scheduledAt datetime' }
    }
    if (scheduledAt.getTime() <= Date.now()) {
      return { success: false, error: 'Scheduled time must be in the future' }
    }
  }

  // Merge message + hashtags
  const fullMessage = data.hashtags
    ? `${data.message}\n\n${data.hashtags}`
    : data.message

  // Create Post record
  const post = await prisma.post.create({
    data: {
      pageId: data.pageId,
      authorId: session.user.id,
      message: fullMessage,
      mediaUrls: data.mediaUrls,
      templateId: data.templateId ?? null,
      status: 'DRAFT',
      scheduledAt,
    },
  })

  // Enqueue BullMQ job
  const queue = getPublishQueue()
  const jobData: PublishPostJobData = { postId: post.id }
  const delayMs = scheduledAt ? Math.max(0, scheduledAt.getTime() - Date.now()) : 0

  const job = await queue.add('publish-post', jobData, {
    delay: delayMs,
    jobId: `post-${post.id}`, // Idempotent jobId — prevents duplicate enqueue
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 }, // 5s → 10s → 20s
  })

  // Save bullmqJobId for potential cancellation
  await prisma.post.update({
    where: { id: post.id },
    data: {
      bullmqJobId: job.id,
      status: scheduledAt ? 'SCHEDULED' : 'DRAFT',
    },
  })

  revalidatePath('/dashboard/posts')

  return {
    success: true,
    data: { postId: post.id, jobId: job.id! },
  }
}

export async function cancelScheduledPostAction(
  postId: string,
): Promise<ActionResult> {
  const session = await getAuthSession()
  if (!session?.user) return { success: false, error: 'Unauthorized' }

  const post = await prisma.post.findFirst({
    where: { id: postId, authorId: session.user.id, status: 'SCHEDULED' },
    select: { bullmqJobId: true },
  })
  if (!post) return { success: false, error: 'Post not found or already published' }

  if (post.bullmqJobId) {
    const queue = getPublishQueue()
    const job = await queue.getJob(post.bullmqJobId)
    await job?.remove()
  }

  await prisma.post.update({
    where: { id: postId },
    data: { status: 'DRAFT', bullmqJobId: null },
  })

  revalidatePath('/dashboard/posts')
  return { success: true }
}
