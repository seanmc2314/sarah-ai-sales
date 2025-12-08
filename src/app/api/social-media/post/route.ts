import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { SarahAI } from '@/lib/ai'
import { SocialMediaService } from '@/lib/integrations/social-media'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      content,
      platforms,
      mediaUrl,
      mediaType,
      scheduledAt,
      topic
    } = await request.json()

    if (!content || !platforms || platforms.length === 0) {
      return NextResponse.json(
        { error: 'Content and platforms are required' },
        { status: 400 }
      )
    }

    // Get user's social media configurations
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Initialize social media service with user's tokens
    const socialMedia = new SocialMediaService({
      instagram: user.instagramEmail ? {
        accessToken: process.env.INSTAGRAM_ACCESS_TOKEN || '',
        userId: process.env.INSTAGRAM_USER_ID || ''
      } : undefined,
      facebook: user.facebookEmail ? {
        accessToken: process.env.FACEBOOK_ACCESS_TOKEN || '',
        pageId: process.env.FACEBOOK_PAGE_ID || ''
      } : undefined,
      youtube: user.youtubeEmail ? {
        accessToken: process.env.YOUTUBE_ACCESS_TOKEN || '',
        channelId: process.env.YOUTUBE_CHANNEL_ID || ''
      } : undefined
    })

    const results: any = {
      success: [],
      errors: [],
      posts: []
    }

    // Post to each requested platform
    for (const platform of platforms) {
      try {
        const post = {
          platform: platform.toUpperCase(),
          content,
          mediaUrl,
          mediaType,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined
        }

        let postId: string | undefined

        switch (platform.toLowerCase()) {
          case 'instagram':
            if (mediaUrl && mediaType === 'video') {
              postId = await socialMedia.postToInstagram(post)
              results.success.push('Instagram')
            } else {
              results.errors.push('Instagram requires video content')
            }
            break

          case 'facebook':
            postId = await socialMedia.postToFacebook(post)
            results.success.push('Facebook')
            break

          case 'youtube':
            if (mediaUrl && mediaType === 'video') {
              postId = await socialMedia.uploadToYouTube(post)
              results.success.push('YouTube')
            } else {
              results.errors.push('YouTube requires video content')
            }
            break

          case 'linkedin':
            // LinkedIn posting would go here when API access is available
            results.errors.push('LinkedIn API access not configured')
            break

          default:
            results.errors.push(`Unsupported platform: ${platform}`)
        }

        // Save post record to database
        if (postId) {
          const socialPost = await prisma.socialPost.create({
            data: {
              platform: platform.toUpperCase() as any,
              content,
              mediaUrl,
              mediaType,
              scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
              publishedAt: new Date(),
              status: 'PUBLISHED',
              userId: session.user.id
            }
          })

          results.posts.push({
            id: socialPost.id,
            platform,
            postId,
            status: 'published'
          })
        }

      } catch (error) {
        console.error(`Error posting to ${platform}:`, error)
        results.errors.push(`${platform}: ${error}`)
      }
    }

    return NextResponse.json(results)

  } catch (error) {
    console.error('Social media posting error:', error)
    return NextResponse.json(
      { error: 'Failed to post to social media' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get recent social media posts
    const posts = await prisma.socialPost.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    // Get posting statistics
    const stats = await prisma.socialPost.groupBy({
      by: ['platform', 'status'],
      where: { userId: session.user.id },
      _count: true
    })

    return NextResponse.json({
      posts,
      stats
    })

  } catch (error) {
    console.error('Error fetching social media data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch social media data' },
      { status: 500 }
    )
  }
}