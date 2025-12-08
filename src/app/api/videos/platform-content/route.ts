import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { SarahAI } from '@/lib/ai'
import { HeyGenService } from '@/lib/integrations/heygen'
import { SupremeOnePlatformService } from '@/lib/integrations/supreme-one'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      videoType, // 'social_media', 'prospect_personalized', 'platform_demo'
      topic,
      prospectId,
      includeScreenshots,
      platformContentIds,
      duration
    } = await request.json()

    if (!videoType || !topic) {
      return NextResponse.json(
        { error: 'Video type and topic are required' },
        { status: 400 }
      )
    }

    const sarah = new SarahAI()
    const heygenApiKey = process.env.HEYGEN_API_KEY
    const supremeOneUrl = process.env.SUPREME_ONE_PLATFORM_URL

    if (!heygenApiKey) {
      return NextResponse.json(
        { error: 'HeyGen API key not configured' },
        { status: 500 }
      )
    }

    const heygen = new HeyGenService(heygenApiKey)

    // Get Supreme One platform content
    let platformContent: any[] = []
    let screenshots: any[] = []

    if (supremeOneUrl) {
      const credentials = process.env.SUPREME_ONE_USERNAME && process.env.SUPREME_ONE_PASSWORD ? {
        username: process.env.SUPREME_ONE_USERNAME,
        password: process.env.SUPREME_ONE_PASSWORD
      } : undefined

      const supremeOne = new SupremeOnePlatformService(supremeOneUrl, credentials)

      // Get platform content
      if (platformContentIds && platformContentIds.length > 0) {
        platformContent = await prisma.knowledgeBase.findMany({
          where: { id: { in: platformContentIds } }
        })
      } else {
        // Get latest relevant content
        platformContent = await supremeOne.getLatestContent(['training', 'f&i'])
      }

      // Get screenshots if requested
      if (includeScreenshots) {
        const contentUrls = platformContent.slice(0, 3).map(item => item.url || `${supremeOneUrl}/training`)
        screenshots = await supremeOne.captureScreenshots(contentUrls, {
          description: 'Platform demonstration screenshots'
        })
      }
    }

    let script = ''
    let prospect = null

    // Generate script based on video type
    switch (videoType) {
      case 'social_media':
        script = await sarah.generateContentWithSupremeOneData('video_script', topic, platformContent)
        break

      case 'prospect_personalized':
        if (!prospectId) {
          return NextResponse.json({ error: 'Prospect ID required for personalized video' }, { status: 400 })
        }

        prospect = await prisma.prospect.findFirst({
          where: { id: prospectId, userId: session.user.id }
        })

        if (!prospect) {
          return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })
        }

        script = await sarah.generateVideoScript(
          `F&I Training for ${prospect.firstName} at ${prospect.company || 'your dealership'}`,
          'linkedin',
          90,
          platformContent
        )
        break

      case 'platform_demo':
        // Create a demo script showing platform features
        script = await sarah.generateVideoScript(
          `Supreme One Platform Demo: ${topic}`,
          'demo',
          duration || 90,
          platformContent
        )
        break

      default:
        return NextResponse.json({ error: 'Invalid video type' }, { status: 400 })
    }

    // Generate video with HeyGen
    const videoRequest = {
      avatar_id: process.env.HEYGEN_DEFAULT_AVATAR_ID || '',
      voice_id: process.env.HEYGEN_DEFAULT_VOICE_ID || '',
      script: script,
      title: `Sarah AI - ${videoType} - ${topic}`,
      dimension: { width: 1280, height: 720 }
    }

    const videoId = await heygen.generateVideo(videoRequest)

    // Store video record with platform data
    const videoRecord = await prisma.videoContent.create({
      data: {
        title: `${videoType} - ${topic}`,
        description: `Video generated using Supreme One platform content`,
        filename: videoId,
        url: '', // Will be updated when ready
        format: 'mp4',
        tags: [
          videoType,
          topic,
          'supreme-one',
          'platform-content',
          ...(prospect ? [`prospect-${prospect.id}`] : [])
        ]
      }
    })

    // Create interaction record if for prospect
    if (prospect) {
      await prisma.interaction.create({
        data: {
          type: 'EMAIL', // Will be used for video email
          content: `Personalized video created: ${topic}`,
          result: 'Video generated successfully',
          completedAt: new Date(),
          successful: true,
          prospectId: prospect.id
        }
      })
    }

    return NextResponse.json({
      videoId,
      dbId: videoRecord.id,
      script,
      platformContentUsed: platformContent.length,
      screenshotsIncluded: screenshots.length,
      prospect: prospect ? {
        id: prospect.id,
        name: `${prospect.firstName} ${prospect.lastName}`,
        company: prospect.company
      } : null,
      status: 'generating',
      message: 'Video with Supreme One platform content generation started'
    })

  } catch (error) {
    console.error('Platform content video generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate video with platform content' },
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

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'platform_analysis':
        // Analyze available Supreme One content for video opportunities
        const platformContent = await prisma.knowledgeBase.findMany({
          where: { category: { not: 'platform_integration' } },
          take: 20
        })

        const sarah = new SarahAI()
        const analysis = await sarah.analyzeSupremeOneROI(platformContent, {})

        return NextResponse.json({
          contentItems: platformContent.length,
          analysis,
          videoOpportunities: {
            improvements: analysis.improvements,
            projectedROI: analysis.projectedROI,
            trainingRecommendations: analysis.trainingRecommendations
          }
        })

      case 'content_suggestions':
        // Get content suggestions for video creation
        const recentContent = await prisma.knowledgeBase.findMany({
          orderBy: { updatedAt: 'desc' },
          take: 10
        })

        const suggestions = recentContent.map(item => ({
          id: item.id,
          title: item.title,
          category: item.category,
          videoIdeas: [
            `Social media post about ${item.title}`,
            `Prospect education on ${item.category}`,
            `Platform demo featuring ${item.title}`
          ]
        }))

        return NextResponse.json({ suggestions })

      default:
        // Get recent platform-content videos
        const recentVideos = await prisma.videoContent.findMany({
          where: {
            tags: { has: 'platform-content' }
          },
          orderBy: { createdAt: 'desc' },
          take: 20
        })

        return NextResponse.json({ videos: recentVideos })
    }

  } catch (error) {
    console.error('Platform content video GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch platform content video data' },
      { status: 500 }
    )
  }
}