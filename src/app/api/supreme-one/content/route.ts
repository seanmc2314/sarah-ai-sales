import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { SupremeOnePlatformService } from '@/lib/integrations/supreme-one'
import { SarahAI } from '@/lib/ai'
import { HeyGenService } from '@/lib/integrations/heygen'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const category = searchParams.get('category')
    const query = searchParams.get('query')

    const supremeOneUrl = process.env.SUPREME_ONE_PLATFORM_URL
    if (!supremeOneUrl) {
      return NextResponse.json(
        { error: 'Supreme One platform URL not configured' },
        { status: 500 }
      )
    }

    const credentials = process.env.SUPREME_ONE_USERNAME && process.env.SUPREME_ONE_PASSWORD ? {
      username: process.env.SUPREME_ONE_USERNAME,
      password: process.env.SUPREME_ONE_PASSWORD
    } : undefined

    const supremeOne = new SupremeOnePlatformService(supremeOneUrl, credentials)

    switch (action) {
      case 'extract':
        // Extract all content from platform
        const content = await supremeOne.extractPlatformContent()

        // Store in database for future use
        for (const item of content) {
          // First try to find existing record
          const existing = await prisma.knowledgeBase.findFirst({
            where: {
              title: item.title,
              category: item.category
            }
          })

          if (existing) {
            await prisma.knowledgeBase.update({
              where: { id: existing.id },
              data: {
                content: item.content,
                tags: item.tags,
                updatedAt: new Date()
              }
            })
          } else {
            await prisma.knowledgeBase.create({
              data: {
                title: item.title,
                category: item.category,
                content: item.content,
                tags: item.tags
              }
            })
          }
        }

        return NextResponse.json({
          message: 'Content extracted successfully',
          count: content.length,
          content: content.slice(0, 10) // Return first 10 for preview
        })

      case 'search':
        if (!query) {
          return NextResponse.json({ error: 'Query parameter required' }, { status: 400 })
        }

        const searchResults = await supremeOne.searchContent(query)
        return NextResponse.json({ results: searchResults })

      case 'latest':
        const categories = category ? [category] : undefined
        const latestContent = await supremeOne.getLatestContent(categories)
        return NextResponse.json({ content: latestContent })

      case 'screenshots':
        // Get content URLs for screenshots
        const allContent = await supremeOne.extractPlatformContent()
        const urls = allContent.slice(0, 5).map(item => item.url) // Limit to 5 for demo

        const screenshots = await supremeOne.captureScreenshots(urls, {
          fullPage: false,
          description: 'Supreme One platform content'
        })

        return NextResponse.json({ screenshots })

      default:
        // Return stored content from database
        const whereClause: any = {}
        if (category) {
          whereClause.category = category
        }

        const storedContent = await prisma.knowledgeBase.findMany({
          where: whereClause,
          orderBy: { updatedAt: 'desc' },
          take: 20
        })

        return NextResponse.json({ content: storedContent })
    }

  } catch (error) {
    console.error('Supreme One content API error:', error)
    return NextResponse.json(
      { error: 'Failed to process Supreme One content' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      action,
      contentIds,
      demoConfig,
      videoRequest
    } = await request.json()

    const supremeOneUrl = process.env.SUPREME_ONE_PLATFORM_URL
    if (!supremeOneUrl) {
      return NextResponse.json(
        { error: 'Supreme One platform URL not configured' },
        { status: 500 }
      )
    }

    const credentials = process.env.SUPREME_ONE_USERNAME && process.env.SUPREME_ONE_PASSWORD ? {
      username: process.env.SUPREME_ONE_USERNAME,
      password: process.env.SUPREME_ONE_PASSWORD
    } : undefined

    const supremeOne = new SupremeOnePlatformService(supremeOneUrl, credentials)
    const sarah = new SarahAI()

    switch (action) {
      case 'create_demo':
        if (!demoConfig) {
          return NextResponse.json({ error: 'Demo configuration required' }, { status: 400 })
        }

        const demo = await supremeOne.createProgramDemo(demoConfig)

        // Store demo in database
        await prisma.videoContent.create({
          data: {
            title: demo.title,
            description: demo.description,
            filename: `demo_${Date.now()}`,
            url: '', // Will be filled when uploaded
            duration: demo.duration,
            tags: ['demo', 'supreme-one', 'platform'],
            format: 'images'
          }
        })

        return NextResponse.json({ demo })

      case 'generate_content_video':
        if (!contentIds || !Array.isArray(contentIds)) {
          return NextResponse.json({ error: 'Content IDs required' }, { status: 400 })
        }

        // Get content from database
        const contentItems = await prisma.knowledgeBase.findMany({
          where: { id: { in: contentIds } }
        })

        if (contentItems.length === 0) {
          return NextResponse.json({ error: 'No content found' }, { status: 404 })
        }

        // Generate video script based on Supreme One content
        const script = await sarah.generateVideoScript(
          `Supreme One F&I Training: ${contentItems[0].title}`,
          'social_media',
          60
        )

        // Create video using HeyGen
        if (process.env.HEYGEN_API_KEY) {
          const heygen = new HeyGenService(process.env.HEYGEN_API_KEY)

          const videoId = await heygen.generateVideo({
            avatar_id: process.env.HEYGEN_DEFAULT_AVATAR_ID || '',
            voice_id: process.env.HEYGEN_DEFAULT_VOICE_ID || '',
            script: script,
            title: `Supreme One Training: ${contentItems[0].title}`
          })

          return NextResponse.json({
            videoId,
            script,
            contentUsed: contentItems.map(item => ({
              id: item.id,
              title: item.title,
              category: item.category
            }))
          })
        } else {
          return NextResponse.json({
            script,
            contentUsed: contentItems,
            message: 'Video script generated. HeyGen API key needed for video creation.'
          })
        }

      case 'update_sarah_knowledge':
        // Update Sarah AI's knowledge base with latest Supreme One content
        const latestContent = await supremeOne.getLatestContent()

        // Create comprehensive knowledge update
        const knowledgeUpdate = latestContent.map(item =>
          `${item.category.toUpperCase()}: ${item.title}\n${item.content}\nTags: ${item.tags.join(', ')}`
        ).join('\n\n---\n\n')

        // Store as enhanced knowledge
        const existingKnowledge = await prisma.knowledgeBase.findFirst({
          where: {
            title: 'Supreme One Platform Knowledge',
            category: 'platform_integration'
          }
        })

        if (existingKnowledge) {
          await prisma.knowledgeBase.update({
            where: { id: existingKnowledge.id },
            data: {
              content: knowledgeUpdate,
              updatedAt: new Date()
            }
          })
        } else {
          await prisma.knowledgeBase.create({
            data: {
              title: 'Supreme One Platform Knowledge',
              category: 'platform_integration',
              content: knowledgeUpdate,
              tags: ['supreme-one', 'platform', 'knowledge-base']
            }
          })
        }

        return NextResponse.json({
          message: 'Sarah AI knowledge updated with Supreme One content',
          itemsProcessed: latestContent.length
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Supreme One content POST error:', error)
    return NextResponse.json(
      { error: 'Failed to process Supreme One request' },
      { status: 500 }
    )
  }
}