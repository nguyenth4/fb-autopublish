'use client'

import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { cn } from '@/lib/utils'

export interface UploadingFile {
  file: File
  preview: string
  status: 'uploading' | 'done' | 'error'
  publicUrl?: string
  error?: string
}

interface ImageUploadZoneProps {
  files: UploadingFile[]
  onFilesSelected: (files: File[]) => void
  onRemove: (index: number) => void
  maxFiles?: number
}

export function ImageUploadZone({
  files,
  onFilesSelected,
  onRemove,
  maxFiles = 10,
}: ImageUploadZoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const remaining = maxFiles - files.length
      if (remaining <= 0) return
      onFilesSelected(acceptedFiles.slice(0, remaining))
    },
    [files.length, maxFiles, onFilesSelected],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'] },
    maxSize: 10 * 1024 * 1024,
    disabled: files.length >= maxFiles,
  })

  return (
    <div className="space-y-3">
      {files.length < maxFiles && (
        <div
          {...getRootProps()}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors',
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50',
            files.length >= maxFiles && 'opacity-50 cursor-not-allowed',
          )}
        >
          <input {...getInputProps()} />
          <p className="text-sm text-muted-foreground">
            {isDragActive ? 'Thả ảnh vào đây...' : 'Kéo thả ảnh hoặc click để chọn'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            PNG, JPG, GIF, WEBP · Tối đa 10MB · Còn {maxFiles - files.length} ảnh
          </p>
        </div>
      )}

      {files.length > 0 && (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {files.map((item, index) => (
            <div key={index} className="group relative aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.preview}
                alt={`preview-${index}`}
                className={cn(
                  'h-full w-full rounded-md object-cover',
                  item.status === 'error' && 'opacity-40',
                )}
              />

              {item.status === 'uploading' && (
                <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/40">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </div>
              )}

              {item.status === 'error' && (
                <div className="absolute inset-0 flex items-center justify-center rounded-md bg-destructive/20">
                  <span className="text-[10px] text-destructive font-medium px-1 text-center">
                    {item.error ?? 'Lỗi'}
                  </span>
                </div>
              )}

              {item.status === 'done' && (
                <div className="absolute top-1 left-1 h-4 w-4 rounded-full bg-green-500 flex items-center justify-center">
                  <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}

              {item.status !== 'uploading' && (
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="absolute right-1 top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white text-xs group-hover:flex hover:bg-black"
                  aria-label="Xóa ảnh"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
