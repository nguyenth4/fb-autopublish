import { Queue, type ConnectionOptions } from 'bullmq'

export const QUEUE_NAMES = {
  PUBLISH_POST: 'publish-post',
} as const

/** Only postId in payload — worker loads full data from DB. Never put tokens here. */
export interface PublishPostJobData {
  postId: string
}

function getRedisConnection(): ConnectionOptions {
  return {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
    password: process.env.REDIS_PASSWORD,
    ...(process.env.REDIS_TLS === 'true' && { tls: {} }),
  }
}

let publishQueue: Queue<PublishPostJobData> | null = null

export function getPublishQueue(): Queue<PublishPostJobData> {
  if (!publishQueue) {
    publishQueue = new Queue<PublishPostJobData>(QUEUE_NAMES.PUBLISH_POST, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    })
  }
  return publishQueue
}
