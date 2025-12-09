import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { content } = await request.json()

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    // Get LinkedIn account
    const linkedInAccount = await prisma.linkedInAccount.findUnique({
      where: { userId: session.user.id }
    })

    if (!linkedInAccount) {
      return NextResponse.json({
        error: 'LinkedIn not connected',
        needsAuth: true
      }, { status: 401 })
    }

    // Check if token is expired
    if (new Date() > linkedInAccount.expiresAt) {
      return NextResponse.json({
        error: 'LinkedIn token expired, please reconnect',
        needsAuth: true
      }, { status: 401 })
    }

    // Supreme One Company Page ID
    const COMPANY_ID = '106558533'
    const organizationUrn = `urn:li:organization:${COMPANY_ID}`
    const personUrn = `urn:li:person:${linkedInAccount.linkedinId}`

    // Try posting to company page using v2 shares API
    let postResponse = await fetch('https://api.linkedin.com/v2/shares', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${linkedInAccount.accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        owner: organizationUrn,
        text: {
          text: content
        },
        distribution: {
          linkedInDistributionTarget: {}
        }
      }),
    })

    let postedTo = 'company'

    // If company page fails (403 = not admin), return specific error
    if (!postResponse.ok) {
      const errorText = await postResponse.text()
      console.error('LinkedIn company post error:', errorText)

      // Check if it's an access denied error
      if (postResponse.status === 403) {
        return NextResponse.json({
          error: 'You need to be an admin of the Supreme One LinkedIn page to post. Please ask the page owner to add you as an admin.',
          details: errorText,
          needsAdmin: true
        }, { status: 403 })
      }

      return NextResponse.json({
        error: 'Failed to post to LinkedIn',
        details: errorText
      }, { status: 500 })
    }

    const postResult = await postResponse.json()

    // Save the post to our database
    await prisma.socialPost.create({
      data: {
        platform: 'LINKEDIN',
        content,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        userId: session.user.id,
        engagement: {}
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Posted to LinkedIn successfully',
      postId: postResult.id
    })

  } catch (error) {
    console.error('LinkedIn post error:', error)
    return NextResponse.json({
      error: 'Failed to post to LinkedIn',
      details: String(error)
    }, { status: 500 })
  }
}

// Get LinkedIn connection status
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const linkedInAccount = await prisma.linkedInAccount.findUnique({
      where: { userId: session.user.id }
    })

    if (!linkedInAccount) {
      return NextResponse.json({
        connected: false
      })
    }

    const isExpired = new Date() > linkedInAccount.expiresAt

    return NextResponse.json({
      connected: !isExpired,
      linkedinName: linkedInAccount.linkedinName,
      expiresAt: linkedInAccount.expiresAt
    })

  } catch (error) {
    console.error('LinkedIn status error:', error)
    return NextResponse.json({
      connected: false,
      error: String(error)
    })
  }
}
