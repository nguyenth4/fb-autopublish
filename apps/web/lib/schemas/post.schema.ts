import { z } from 'zod'

export const createPostSchema = z.object({
  pageId: z.string().cuid('Vui lòng chọn một Page'),
  message: z
    .string()
    .min(1, 'Nội dung không được để trống')
    .max(63206, 'Nội dung quá dài'),
  hashtags: z.string().max(500, 'Hashtag quá dài').optional().default(''),
  mediaUrls: z.array(z.string().url('URL ảnh không hợp lệ')).max(10, 'Tối đa 10 ảnh'),
  // ISO 8601 with offset — client must append "+07:00" before submitting
  scheduledAt: z
    .string()
    .datetime({ offset: true, message: 'Định dạng ngày giờ không hợp lệ' })
    .nullable()
    .optional(),
  templateId: z.string().cuid().optional(),
})

export type CreatePostInput = z.infer<typeof createPostSchema>
