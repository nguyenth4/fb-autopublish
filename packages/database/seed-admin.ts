import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs' 

const prisma = new PrismaClient()

async function main() {
  const email = 'admin@example.com'
  const password = 'password123'
  const hash = await bcrypt.hash(password, 10)

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: 'Super Admin',
      passwordHash: hash,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  })

  console.log('✅ Admin user created/verified:')
  console.log(`Email: ${admin.email}`)
  console.log(`Password: ${password}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
