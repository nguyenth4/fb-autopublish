import { NextResponse } from 'next/server'
import { prisma } from '@packages/database/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Verify DB is reachable
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() })
  } catch {
    return NextResponse.json(
      { status: 'error', message: 'Database unreachable' },
      { status: 503 },
    )
  }
}
