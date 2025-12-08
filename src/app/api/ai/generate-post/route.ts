import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { SarahAI } from '@/lib/ai'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { topic, platform } = await request.json()

    if (!topic || !platform) {
      return NextResponse.json(
        { error: 'Topic and platform are required' },
        { status: 400 }
      )
    }

    const sarah = new SarahAI()
    const content = await sarah.generateLinkedInPost(topic, `${platform.toLowerCase()} users`)

    return NextResponse.json({
      content,
      platform,
      topic
    })

  } catch (error) {
    console.error('Generate post API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}