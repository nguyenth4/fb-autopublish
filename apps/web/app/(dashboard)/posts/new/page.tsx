import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@packages/database/prisma'
import { PostComposer } from '@/components/posts/post-composer'
import Link from 'next/link'

export default async function NewPostPage() {
  const session = await requireAuth()
  const isSuperAdmin = session.user.role === 'SUPER_ADMIN'

  const pages = isSuperAdmin
    ? await prisma.facebookPage.findMany({
        where: { isActive: true },
        select: { id: true, name: true, pictureUrl: true },
        orderBy: { name: 'asc' },
      })
    : await prisma.facebookPage.findMany({
        where: {
          isActive: true,
          userAccesses: { some: { userId: session.user.id, canPost: true } },
        },
        select: { id: true, name: true, pictureUrl: true },
        orderBy: { name: 'asc' },
      })

  if (pages.length === 0) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">
          Bạn chưa được phân quyền quản lý Page nào.{' '}
          <Link href="/dashboard" className="underline underline-offset-2">
            Quay lại Dashboard
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-medium">Tạo bài viết mới</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Đăng ngay hoặc lên lịch cho bài viết của bạn
        </p>
      </div>
      <PostComposer pages={pages} />
    </div>
  )
}
