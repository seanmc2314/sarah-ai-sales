import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET
const LINKEDIN_REDIRECT_URI = process.env.NEXTAUTH_URL + '/api/linkedin/callback'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    console.error('LinkedIn OAuth error:', error)
    return NextResponse.redirect(new URL('/dashboard?linkedin=error', request.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/dashboard?linkedin=no_code', request.url))
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: LINKEDIN_CLIENT_ID!,
        client_secret: LINKEDIN_CLIENT_SECRET!,
        redirect_uri: LINKEDIN_REDIRECT_URI,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('LinkedIn token error:', errorData)
      return NextResponse.redirect(new URL('/dashboard?linkedin=token_error', request.url))
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token
    const expiresIn = tokenData.expires_in // seconds

    // Get LinkedIn profile info
    const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    let linkedinId = 'unknown'
    let linkedinName = 'LinkedIn User'

    if (profileResponse.ok) {
      const profileData = await profileResponse.json()
      linkedinId = profileData.sub
      linkedinName = profileData.name || `${profileData.given_name} ${profileData.family_name}`
    }

    // Get current user session
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.redirect(new URL('/auth/signin?linkedin=not_logged_in', request.url))
    }

    // Store LinkedIn credentials in database
    const expiresAt = new Date(Date.now() + expiresIn * 1000)

    await prisma.linkedInAccount.upsert({
      where: { userId: session.user.id },
      update: {
        accessToken,
        expiresAt,
        linkedinId,
        linkedinName,
      },
      create: {
        userId: session.user.id,
        accessToken,
        expiresAt,
        linkedinId,
        linkedinName,
      },
    })

    return NextResponse.redirect(new URL('/dashboard?linkedin=connected', request.url))
  } catch (err) {
    console.error('LinkedIn callback error:', err)
    return NextResponse.redirect(new URL('/dashboard?linkedin=error', request.url))
  }
}
