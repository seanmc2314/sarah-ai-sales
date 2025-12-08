import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const userCount = await prisma.user.count()
    const users = await prisma.user.findMany({
      select: { email: true, name: true }
    })

    return NextResponse.json({
      success: true,
      dbConnected: true,
      userCount,
      users,
      databaseUrlExists: !!process.env.DATABASE_URL
    })
  } catch (error) {
    console.error('DB Test error:', error)
    return NextResponse.json({
      success: false,
      error: String(error),
      databaseUrlExists: !!process.env.DATABASE_URL
    }, { status: 500 })
  }
}
