import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export async function GET() {
  const dbUrl = process.env.DATABASE_URL || ''
  const maskedUrl = dbUrl ? dbUrl.replace(/:[^:@]+@/, ':***@') : 'NOT SET'

  // Check for common issues
  const diagnostics = {
    urlExists: !!dbUrl,
    urlLength: dbUrl.length,
    maskedUrl,
    startsWithPostgresql: dbUrl.startsWith('postgresql://'),
    containsNeon: dbUrl.includes('neon.tech'),
    hasQuotes: dbUrl.includes('"') || dbUrl.includes("'"),
    hasNewlines: dbUrl.includes('\n') || dbUrl.includes('\r'),
    hasSpaces: dbUrl.trim() !== dbUrl
  }

  try {
    const prisma = new PrismaClient()
    const userCount = await prisma.user.count()
    const users = await prisma.user.findMany({
      select: { email: true, name: true }
    })
    await prisma.$disconnect()

    return NextResponse.json({
      success: true,
      dbConnected: true,
      userCount,
      users,
      diagnostics
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: String(error),
      errorName: (error as Error).name,
      diagnostics
    }, { status: 500 })
  }
}
