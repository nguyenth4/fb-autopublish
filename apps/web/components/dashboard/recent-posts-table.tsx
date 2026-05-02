import { cn } from '@/lib/utils'
import type { PostStatus } from '@prisma/client'
import Link from 'next/link'

type Post = {
  id: string
  message: string
  status: PostStatus
  scheduledAt: Date | null
  publishedAt: Date | null
  createdAt: Date
  page: { name: string; pictureUrl: string | null }
  jobLogs: { errorCode: string | null; errorMessage: string | null }[]
}

const statusLabel: Record<PostStatus, string> = {
  DRAFT: 'Nháp',
  SCHEDULED: 'Đã lên lịch',
  PUBLISHING: 'Đang đăng...',
  PUBLISHED: 'Đã đăng',
  FAILED: 'Thất bại',
}

const statusStyle: Record<PostStatus, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  SCHEDULED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  PUBLISHING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  PUBLISHED: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

function formatDate(date: Date | null): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function RecentPostsTable({ posts }: { posts: Post[] }) {
  if (posts.length === 0) {
    return (
      <div className="rounded-xl border p-10 text-center text-sm text-muted-foreground">
        Chưa có bài viết nào.{' '}
        <Link href="/dashboard/posts/new" className="underline underline-offset-2">
          Tạo bài viết đầu tiên
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-xl border overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="text-sm font-medium">Bài viết gần đây</h2>
        <Link href="/dashboard/posts" className="text-xs text-muted-foreground hover:underline">
          Xem tất cả →
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Page</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nội dung</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Trạng thái</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Thời gian</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => {
              const lastLog = post.jobLogs[0]
              const timeLabel =
                post.status === 'PUBLISHED'
                  ? formatDate(post.publishedAt)
                  : post.status === 'SCHEDULED'
                    ? formatDate(post.scheduledAt)
                    : formatDate(post.createdAt)

              return (
                <tr key={post.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 whitespace-nowrap">{post.page.name}</td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="truncate">{post.message}</p>
                    {post.status === 'FAILED' && lastLog?.errorCode && (
                      <p className="text-xs text-destructive mt-0.5">{lastLog.errorCode}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                        statusStyle[post.status],
                      )}
                    >
                      {statusLabel[post.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground text-xs">
                    {timeLabel}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
