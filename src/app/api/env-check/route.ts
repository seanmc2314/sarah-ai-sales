import { NextResponse } from 'next/server'

export async function GET() {
  const dbUrl = process.env.DATABASE_URL || ''

  return NextResponse.json({
    urlExists: dbUrl.length > 0,
    urlLength: dbUrl.length,
    first20chars: dbUrl.substring(0, 20),
    last20chars: dbUrl.substring(dbUrl.length - 20),
    startsCorrectly: dbUrl.startsWith('postgresql://neondb'),
    endsCorrectly: dbUrl.endsWith('sslmode=require'),
    hasQuotes: dbUrl.includes('"') || dbUrl.includes("'"),
    nextauthUrl: process.env.NEXTAUTH_URL || 'NOT SET',
    nodeEnv: process.env.NODE_ENV
  })
}
