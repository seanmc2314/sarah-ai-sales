import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)

  return NextResponse.json({
    linkedinClientId: process.env.LINKEDIN_CLIENT_ID ? 'SET' : 'NOT SET',
    linkedinClientSecret: process.env.LINKEDIN_CLIENT_SECRET ? 'SET' : 'NOT SET',
    nextauthUrl: process.env.NEXTAUTH_URL || 'NOT SET',
    redirectUri: (process.env.NEXTAUTH_URL || '') + '/api/linkedin/callback',
    sessionExists: !!session,
    userId: session?.user?.id || 'NO USER',
    userEmail: session?.user?.email || 'NO EMAIL'
  })
}
