import { NextResponse } from 'next/server'

// LinkedIn OAuth configuration
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID
const LINKEDIN_REDIRECT_URI = process.env.NEXTAUTH_URL + '/api/linkedin/callback'

export async function GET() {
  if (!LINKEDIN_CLIENT_ID) {
    return NextResponse.json({ error: 'LinkedIn not configured' }, { status: 500 })
  }

  // LinkedIn OAuth 2.0 authorization URL
  // w_member_social from "Share on LinkedIn" product
  // openid, profile from "Sign In with LinkedIn using OpenID Connect" product
  // w_organization_social from "Advertising API" product - for company page posting
  const scope = 'openid profile w_member_social w_organization_social'
  const state = Math.random().toString(36).substring(7)

  const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization')
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id', LINKEDIN_CLIENT_ID)
  authUrl.searchParams.set('redirect_uri', LINKEDIN_REDIRECT_URI)
  authUrl.searchParams.set('scope', scope)
  authUrl.searchParams.set('state', state)

  return NextResponse.redirect(authUrl.toString())
}
// LinkedIn integration v1
