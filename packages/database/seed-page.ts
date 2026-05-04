import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Tạo một Facebook Page ảo để test
  const page = await prisma.facebookPage.upsert({
    where: { fbPageId: 'mock_page_12345' },
    update: {},
    create: {
      fbPageId: 'mock_page_12345',
      name: 'Trang Test Auto-Publish',
      encryptedAccessToken: 'dummy_encrypted',
      isActive: true,
      pictureUrl: 'https://ui-avatars.com/api/?name=Test+Page&background=random',
    },
  });

  console.log('Đã tạo thành công Page ảo:', page.name);

  // Gán quyền cho admin (nếu admin không phải SUPER_ADMIN, tuy nhiên admin hiện tại là SUPER_ADMIN nên không bắt buộc, nhưng cứ gán cho chắc)
  const admin = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });
  if (admin) {
    await prisma.userPageAccess.upsert({
      where: {
        userId_pageId: {
          userId: admin.id,
          pageId: page.id,
        }
      },
      update: {},
      create: {
        userId: admin.id,
        pageId: page.id,
        canPost: true,
      }
    });
    console.log('Đã cấp quyền truy cập cho:', admin.email);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
