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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 animate-fade-in bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800">
      {/* Page selector */}
      <div className="space-y-2 relative">
        <label htmlFor="pageId" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Facebook Page <span className="text-rose-500">*</span>
        </label>
        <select
          id="pageId"
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          defaultValue=""
          onChange={(e) => setValue('pageId', e.target.value, { shouldValidate: true })}
        >
          <option value="" disabled>Chọn Page đăng bài...</option>
          {pages.map((page) => (
            <option key={page.id} value={page.id}>{page.name}</option>
          ))}
        </select>
        {errors.pageId && <p className="text-xs text-rose-500 absolute -bottom-5 left-1">{errors.pageId.message}</p>}
      </div>

      {/* Message */}
      <div className="space-y-2 pt-2 relative">
        <label htmlFor="message" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Nội dung bài viết <span className="text-rose-500">*</span>
        </label>
        <textarea
          id="message"
          rows={6}
          placeholder="Bạn đang nghĩ gì? Viết nội dung bài viết vào đây..."
          className="w-full resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          {...register('message')}
        />
        {errors.message && <p className="text-xs text-rose-500 absolute -bottom-5 left-1">{errors.message.message}</p>}
      </div>

      {/* Hashtags */}
      <div className="space-y-2 pt-2">
        <label htmlFor="hashtags" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Hashtags
        </label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 font-medium">#</span>
          <input
            id="hashtags"
            type="text"
            placeholder="marketing, sale, vietnam"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 pl-8 pr-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            {...register('hashtags')}
          />
        </div>
      </div>

      {/* Image upload */}
      <div className="space-y-2 pt-2">
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Ảnh đính kèm</label>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50/50 dark:bg-slate-800/30 p-2">
          <ImageUploadZone
            files={uploadingFiles}
            onFilesSelected={handleFilesSelected}
            onRemove={handleRemoveFile}
            maxFiles={10}
          />
        </div>
        {errors.mediaUrls && (
          <p className="text-xs text-rose-500 mt-1 ml-1">{errors.mediaUrls.message}</p>
        )}
      </div>

      {/* Schedule toggle */}
      <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
        <label className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <div className="relative flex items-center">
            <input
              type="checkbox"
              checked={isScheduled}
              onChange={(e) => {
                setIsScheduled(e.target.checked)
                if (!e.target.checked) setValue('scheduledAt', null)
              }}
              className="peer sr-only"
            />
            <div className="w-11 h-6 bg-slate-300 dark:bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">Lên lịch tự động</div>
            <div className="text-xs text-slate-500 mt-0.5">Hệ thống sẽ tự động đăng bài vào thời gian bạn chọn</div>
          </div>
        </label>

        {isScheduled && (
          <div className="space-y-2 animate-slide-up pl-1">
            <label htmlFor="scheduledAt" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Chọn thời gian đăng
            </label>
            <input
              id="scheduledAt"
              type="datetime-local"
              min={new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16)}
              className="w-full sm:w-auto block rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              onChange={(e) => {
                if (!e.target.value) return
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
              <p className="text-xs text-rose-500">{errors.scheduledAt.message}</p>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isSubmitting}
          className="w-full sm:w-1/3 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-all"
        >
          Hủy bỏ
        </button>
        <button
          type="submit"
          disabled={isSubmitting || isUploading}
          className="relative w-full sm:w-2/3 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-70 transition-all group"
        >
          {isSubmitting || isUploading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {isSubmitting ? 'Đang xử lý...' : 'Đang tải ảnh lên...'}
            </span>
          ) : (
            <span className="flex items-center justify-center group-hover:scale-[1.02] transition-transform">
              {isScheduled ? 'Lên lịch bài viết ngay' : 'Đăng bài ngay'}
              <svg className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </span>
          )}
        </button>
      </div>
    </form>
  )
}
