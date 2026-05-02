'use server'

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getAuthSession } from '@/lib/auth-helpers'
import { randomUUID } from 'node:crypto'
import path from 'node:path'

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
])
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

function getS3Client(): S3Client {
  return new S3Client({
    region: process.env.AWS_REGION ?? 'ap-southeast-1',
    ...(process.env.S3_ENDPOINT && {
      endpoint: process.env.S3_ENDPOINT,
      forcePathStyle: true,
    }),
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  })
}

type PresignedUrlSuccess = {
  success: true
  uploadUrl: string
  publicUrl: string
  key: string
}
type PresignedUrlError = { success: false; error: string }

export async function getPresignedUploadUrl(
  fileName: string,
  contentType: string,
  fileSizeBytes: number,
): Promise<PresignedUrlSuccess | PresignedUrlError> {
  const session = await getAuthSession()
  if (!session?.user) return { success: false, error: 'Unauthorized' }

  if (!ALLOWED_MIME_TYPES.has(contentType)) {
    return { success: false, error: `File type "${contentType}" không được phép` }
  }
  if (fileSizeBytes > MAX_FILE_SIZE_BYTES) {
    return { success: false, error: `File quá lớn. Tối đa ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB` }
  }

  const ext = path.extname(fileName).toLowerCase() || '.jpg'
  const key = `uploads/${session.user.id}/${randomUUID()}${ext}`
  const bucket = process.env.S3_BUCKET_NAME!

  try {
    const s3 = getS3Client()
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      ContentLength: fileSizeBytes,
      Metadata: {
        'uploaded-by': session.user.id,
        'original-name': encodeURIComponent(fileName),
      },
    })

    // Presigned URL expires in 5 minutes
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 })
    const baseUrl = process.env.CDN_BASE_URL ?? `https://${bucket}.s3.amazonaws.com`
    const publicUrl = `${baseUrl}/${key}`

    return { success: true, uploadUrl, publicUrl, key }
  } catch (error) {
    console.error('[upload] Failed to generate presigned URL:', error)
    return { success: false, error: 'Không thể tạo upload URL. Vui lòng thử lại.' }
  }
}
