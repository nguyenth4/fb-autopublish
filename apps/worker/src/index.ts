import 'dotenv/config'
import { Worker, type WorkerOptions } from 'bullmq'
import { prisma } from '@packages/database/prisma'
import { createFacebookService } from '../../web/lib/facebook/facebook.service'
import { RateLimiterService } from './services/rate-limiter.service'
import { createPublishProcessor } from './processors/publish.processor'

const QUEUE_NAME = 'publish-post'

async function bootstrap() {
  console.log('[Worker] Starting Facebook Auto-Publishing Worker...')
  console.log(`[Worker] NODE_ENV=${process.env.NODE_ENV}`)

  // Validate required env vars at startup — fail fast
  const required = [
    'DATABASE_URL',
    'REDIS_HOST',
    'ENCRYPTION_KEY',
    'FACEBOOK_APP_ID',
    'FACEBOOK_APP_SECRET',
  ]
  for (const key of required) {
    if (!process.env[key]) {
      console.error(`[Worker] Missing required environment variable: ${key}`)
      process.exit(1)
    }
  }

  const fbService = createFacebookService()
  const rateLimiter = new RateLimiterService(
    5,       // maxTokens (burst)
    18_000,  // ms per token refill (~200/hr)
  )

  const processor = createPublishProcessor({ prisma, fbService, rateLimiter })

  const workerOptions: WorkerOptions = {
    connection: {
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number(process.env.REDIS_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD,
      ...(process.env.REDIS_TLS === 'true' && { tls: {} }),
    },
    concurrency: 2,          // Keep low — respect FB rate limits per page
    stalledInterval: 30_000, // Re-queue stalled jobs after 30s
    maxStalledCount: 2,
  }

  const worker = new Worker(QUEUE_NAME, processor, workerOptions)

  worker.on('completed', (job) => {
    console.log(`[Worker] Completed job=${job.id}`)
  })

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Failed job=${job?.id}`, err.message)
  })

  worker.on('stalled', (jobId) => {
    console.warn(`[Worker] Stalled job=${jobId} — will be re-queued`)
  })

  worker.on('error', (err) => {
    console.error('[Worker] Worker error:', err)
  })

  // ── Graceful shutdown ──────────────────────────────────────────────────────
  // PM2 sends SIGTERM on restart/stop.
  // worker.close() waits for in-progress job to finish (up to 30s).
  async function gracefulShutdown(signal: string) {
    console.log(`[Worker] Received ${signal} — shutting down gracefully...`)
    await worker.close()
    await prisma.$disconnect()
    console.log('[Worker] Shutdown complete.')
    process.exit(0)
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
  process.on('SIGINT', () => gracefulShutdown('SIGINT'))

  console.log(`[Worker] Listening on queue: "${QUEUE_NAME}"`)
  console.log(`[Worker] Concurrency: ${workerOptions.concurrency}`)
}

bootstrap().catch((err) => {
  console.error('[Worker] Fatal bootstrap error:', err)
  process.exit(1)
})
