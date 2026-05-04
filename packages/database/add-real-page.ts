import { PrismaClient } from '@prisma/client';
import { encryptToken } from './src/crypto';

const prisma = new PrismaClient();

// ============================================================================
// HƯỚNG DẪN DÀNH CHO BẠN:
// Điền các thông tin của trang Facebook thật của bạn vào 3 biến bên dưới:
// ============================================================================
const REAL_PAGE_ID = '932826203256993'; 
const REAL_PAGE_NAME = '3D Đì Co';
const REAL_PAGE_ACCESS_TOKEN = 'EAALq7Ol6ZAjsBRW0N2EGdbdV4TswR0ZB0LzSNlwG1DE65YFHfr6RSFdLgsFWcJSihV2HQAzdBOcdiZC1ZCqFZCBv3LRRn1ENxmFclK1JZCqXgIiZBgE5tl5xDq1HGGoWPE6NZBHNvYZAaQeTauvrVdxkh8ujXZCSHR0GB9z1nSZAMG6nNkaMQ2tEMNYiMkTduwTIzm0quOt1YO5mpwBzvrw0t0yLeNSAXqlvhfNfjQm08YZD';

async function main() {
  // Đã điền thông tin thành công

  console.log('Đang mã hóa Token để bảo mật...');
  // Sử dụng thuật toán AES-256 để mã hóa Token trước khi lưu vào DB
  const encryptedToken = encryptToken(REAL_PAGE_ACCESS_TOKEN);

  console.log('Đang kết nối Facebook Graph API để lấy ảnh đại diện...');
  let pictureUrl = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(REAL_PAGE_NAME);
  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${REAL_PAGE_ID}/picture?redirect=0&access_token=${REAL_PAGE_ACCESS_TOKEN}`);
    if (res.ok) {
      const data = await res.json() as any;
      if (data.data && data.data.url) {
        pictureUrl = data.data.url;
      }
    }
  } catch (err) {
    console.log('⚠️ Không lấy được ảnh đại diện từ Facebook, dùng ảnh mặc định.');
  }

  const page = await prisma.facebookPage.upsert({
    where: { fbPageId: REAL_PAGE_ID },
    update: {
      name: REAL_PAGE_NAME,
      encryptedAccessToken: encryptedToken,
      pictureUrl: pictureUrl,
      isActive: true,
    },
    create: {
      fbPageId: REAL_PAGE_ID,
      name: REAL_PAGE_NAME,
      encryptedAccessToken: encryptedToken,
      pictureUrl: pictureUrl,
      isActive: true,
    },
  });

  console.log(`✅ Đã lưu thành công Fanpage thật: "${page.name}" vào Database!`);

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
    console.log(`✅ Đã cấp quyền đăng bài trên trang này cho tài khoản: ${admin.email}`);
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
