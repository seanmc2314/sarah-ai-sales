import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { SarahAI } from '@/lib/ai'
import { HeyGenService } from '@/lib/integrations/heygen'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { topic, platform, duration, avatarId, voiceId } = await request.json()

    if (!topic || !platform) {
      return NextResponse.json(
        { error: 'Topic and platform are required' },
        { status: 400 }
      )
    }

    // Initialize services
    const sarah = new SarahAI()
    const heygenApiKey = process.env.HEYGEN_API_KEY

    if (!heygenApiKey) {
      return NextResponse.json(
        { error: 'HeyGen API key not configured' },
        { status: 500 }
      )
    }

    const heygen = new HeyGenService(heygenApiKey)

    // Generate video script using Sarah AI
    const script = await sarah.generateVideoScript(topic, platform, duration || 60)

    // Generate video using HeyGen
    const videoRequest = {
      avatar_id: avatarId || process.env.HEYGEN_DEFAULT_AVATAR_ID || '',
      voice_id: voiceId || process.env.HEYGEN_DEFAULT_VOICE_ID || '',
      script: script,
      title: `Sarah AI - ${topic}`,
      dimension: { width: 1280, height: 720 }
    }

    const videoId = await heygen.generateVideo(videoRequest)

    // Store video generation request in database
    const videoRecord = await prisma.videoContent.create({
      data: {
        title: `Sarah AI - ${topic}`,
        description: `Video about ${topic} for ${platform}`,
        filename: videoId,
        url: '', // Will be updated when video is ready
        format: 'mp4',
        tags: [platform, topic, 'sarah-ai', 'f&i-training']
      }
    })

    // Return video ID for status tracking
    return NextResponse.json({
      videoId,
      dbId: videoRecord.id,
      script,
      status: 'generating',
      message: 'Video generation started. Use the status endpoint to check progress.'
    })

  } catch (error) {
    console.error('Video generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate video' },
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
    const videoId = searchParams.get('videoId')

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      )
    }

    const heygenApiKey = process.env.HEYGEN_API_KEY
    if (!heygenApiKey) {
      return NextResponse.json(
        { error: 'HeyGen API key not configured' },
        { status: 500 }
      )
    }

    const heygen = new HeyGenService(heygenApiKey)
    const status = await heygen.getVideoStatus(videoId)

    // Update database if video is completed
    if (status.status === 'completed' && status.video_url) {
      await prisma.videoContent.updateMany({
        where: { filename: videoId },
        data: {
          url: status.video_url,
          duration: status.duration
        }
      })
    }

    return NextResponse.json(status)

  } catch (error) {
    console.error('Video status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check video status' },
      { status: 500 }
    )
  }
}