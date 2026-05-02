'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createPostSchema, type CreatePostInput } from '@/lib/schemas/post.schema'
import { getPresignedUploadUrl } from '@/lib/actions/upload.actions'
import { createPostAction } from '@/lib/actions/post.actions'
import { ImageUploadZone, type UploadingFile } from './image-upload-zone'

interface PageOption {
  id: string
  name: string
  pictureUrl: string | null
}

export function PostComposer({ pages }: { pages: PageOption[] }) {
  const router = useRouter()
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isScheduled, setIsScheduled] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreatePostInput>({
    resolver: zodResolver(createPostSchema),
    defaultValues: { mediaUrls: [], hashtags: '' },
  })

  // ── Upload handler ─────────────────────────────────────────────────────────
  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      const startIndex = uploadingFiles.length
      const newEntries: UploadingFile[] = files.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        status: 'uploading',
      }))

      setUploadingFiles((prev) => [...prev, ...newEntries])

      const uploadedUrls = await Promise.all(
        files.map(async (file, i) => {
          const idx = startIndex + i
          try {
            const result = await getPresignedUploadUrl(file.name, file.type, file.size)
            if (!result.success) throw new Error(result.error)

            // PUT directly to S3 — Next.js server never touches the binary
            const res = await fetch(result.uploadUrl, {
              method: 'PUT',
              body: file,
              headers: { 'Content-Type': file.type },
            })
            if (!res.ok) throw new Error(`Upload failed: HTTP ${res.status}`)

            setUploadingFiles((prev) =>
              prev.map((f, j) =>
                j === idx ? { ...f, status: 'done', publicUrl: result.publicUrl } : f,
              ),
            )
            return result.publicUrl
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Upload thất bại'
            setUploadingFiles((prev) =>
              prev.map((f, j) => (j === idx ? { ...f, status: 'error', error: msg } : f)),
            )
            toast.error(`Lỗi upload: ${msg}`)
            return null
          }
        }),
      )

      const successUrls = uploadedUrls.filter((u): u is string => u !== null)
      const current = watch('mediaUrls') ?? []
      setValue('mediaUrls', [...current, ...successUrls], { shouldValidate: true })
    },
    [uploadingFiles.length, setValue, watch],
  )

  const handleRemoveFile = useCallback(
    (index: number) => {
      const removed = uploadingFiles[index]
      if (removed?.preview) URL.revokeObjectURL(removed.preview)
      setUploadingFiles((prev) => prev.filter((_, i) => i !== index))
      const current = watch('mediaUrls') ?? []
      setValue(
        'mediaUrls',
        current.filter((_, i) => i !== index),
        { shouldValidate: true },
      )
    },
    [uploadingFiles, setValue, watch],
  )

  // ── Submit ─────────────────────────────────────────────────────────────────
  const onSubmit = async (data: CreatePostInput) => {
    if (uploadingFiles.some((f) => f.status === 'uploading')) {
      toast.warning('Vui lòng đợi ảnh upload xong')
      return
    }
    if (uploadingFiles.some((f) => f.status === 'error')) {
      toast.error('Có ảnh upload thất bại. Vui lòng xóa và thử lại.')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await createPostAction({
        pageId: data.pageId,
        message: data.message,
        hashtags: data.hashtags,
        mediaUrls: data.mediaUrls,
        scheduledAt: data.scheduledAt,
      })

      if (!result.success) {
        toast.error(result.error ?? 'Có lỗi xảy ra')
        return
      }

      toast.success(data.scheduledAt ? 'Bài viết đã được lên lịch!' : 'Bài viết đã vào hàng chờ!')
      router.push('/dashboard/posts')
      router.refresh()
    } finally {
      setIsSubmitting(false)
    }
  }

  const isUploading = uploadingFiles.some((f) => f.status === 'uploading')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Page selector */}
      <div className="space-y-2">
        <label htmlFor="pageId" className="text-sm font-medium">
          Facebook Page <span className="text-destructive">*</span>
        </label>
        <select
          id="pageId"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          defaultValue=""
          onChange={(e) => setValue('pageId', e.target.value, { shouldValidate: true })}
        >
          <option value="" disabled>Chọn Page...</option>
          {pages.map((page) => (
            <option key={page.id} value={page.id}>{page.name}</option>
          ))}
        </select>
        {errors.pageId && <p className="text-xs text-destructive">{errors.pageId.message}</p>}
      </div>

      {/* Message */}
      <div className="space-y-2">
        <label htmlFor="message" className="text-sm font-medium">
          Nội dung <span className="text-destructive">*</span>
        </label>
        <textarea
          id="message"
          rows={6}
          placeholder="Viết nội dung bài viết..."
          className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          {...register('message')}
        />
        {errors.message && <p className="text-xs text-destructive">{errors.message.message}</p>}
      </div>

      {/* Hashtags */}
      <div className="space-y-2">
        <label htmlFor="hashtags" className="text-sm font-medium">
          Hashtags
        </label>
        <input
          id="hashtags"
          type="text"
          placeholder="#marketing #sale #vietnam"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          {...register('hashtags')}
        />
      </div>

      {/* Image upload */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Ảnh đính kèm</label>
        <ImageUploadZone
          files={uploadingFiles}
          onFilesSelected={handleFilesSelected}
          onRemove={handleRemoveFile}
          maxFiles={10}
        />
        {errors.mediaUrls && (
          <p className="text-xs text-destructive">{errors.mediaUrls.message}</p>
        )}
      </div>

      {/* Schedule toggle */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="schedule-toggle"
            checked={isScheduled}
            onChange={(e) => {
              setIsScheduled(e.target.checked)
              if (!e.target.checked) setValue('scheduledAt', null)
            }}
            className="h-4 w-4 rounded border-input"
          />
          <label htmlFor="schedule-toggle" className="text-sm font-medium cursor-pointer">
            Lên lịch đăng
          </label>
        </div>

        {isScheduled && (
          <div className="space-y-2">
            <label htmlFor="scheduledAt" className="text-sm font-medium">
              Thời gian đăng
            </label>
            <input
              id="scheduledAt"
              type="datetime-local"
              min={new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              onChange={(e) => {
                if (!e.target.value) return
                // Append browser timezone offset — converts "2025-08-01T09:00" → "2025-08-01T09:00:00+07:00"
                const d = new Date(e.target.value)
                const offset = -d.getTimezoneOffset()
                const sign = offset >= 0 ? '+' : '-'
                const hh = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0')
                const mm = String(Math.abs(offset) % 60).padStart(2, '0')
                setValue('scheduledAt', `${e.target.value}:00${sign}${hh}:${mm}`, {
                  shouldValidate: true,
                })
              }}
            />
            {errors.scheduledAt && (
              <p className="text-xs text-destructive">{errors.scheduledAt.message}</p>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting || isUploading}
          className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isSubmitting
            ? 'Đang xử lý...'
            : isUploading
              ? 'Đang upload ảnh...'
              : isScheduled
                ? 'Lên lịch bài viết'
                : 'Đăng ngay'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isSubmitting}
          className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
        >
          Hủy
        </button>
      </div>
    </form>
  )
}
