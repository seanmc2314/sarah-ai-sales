import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { LocalSupremeOnePlatformService } from '@/lib/integrations/supreme-one-local'
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

    const supremeOneLocal = new LocalSupremeOnePlatformService()

    switch (action) {
      case 'extract':
        // Extract all content from local platform
        const allContent = await supremeOneLocal.extractAllContent()

        // Store in database for future use
        for (const item of allContent) {
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
          message: 'Local Supreme One content extracted successfully',
          count: allContent.length,
          content: allContent.slice(0, 10) // Return first 10 for preview
        })

      case 'fi_expertise':
        // Get F&I expertise data
        const fiData = await supremeOneLocal.getFIExpertiseData()
        return NextResponse.json({ fiExpertise: fiData })

      case 'interfaces':
        // Get list of available interfaces
        const interfaces = await supremeOneLocal.getInterfacesList()
        return NextResponse.json({ interfaces })

      case 'screenshots':
        // Capture screenshots of interfaces
        const screenshots = await supremeOneLocal.captureInterfaceScreenshots()
        return NextResponse.json({ screenshots })

      case 'training_content':
        // Get training content by category
        const trainingContent = await supremeOneLocal.getTrainingContent(category || undefined)
        return NextResponse.json({ content: trainingContent })

      case 'search':
        if (!query) {
          return NextResponse.json({ error: 'Query parameter required' }, { status: 400 })
        }

        const searchResults = await supremeOneLocal.searchContent(query)
        return NextResponse.json({ results: searchResults })

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
    console.error('Local Supreme One API error:', error)
    return NextResponse.json(
      { error: 'Failed to process local Supreme One content' },
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
      videoType,
      topic,
      prospectId,
      includeScreenshots
    } = await request.json()

    const supremeOneLocal = new LocalSupremeOnePlatformService()
    const sarah = new SarahAI()

    switch (action) {
      case 'create_content_video':
        if (!topic) {
          return NextResponse.json({ error: 'Topic is required' }, { status: 400 })
        }

        // Get relevant Supreme One content
        let platformContent: any[] = []

        if (contentIds && contentIds.length > 0) {
          // Get specific content by IDs
          platformContent = await prisma.knowledgeBase.findMany({
            where: { id: { in: contentIds } }
          })
        } else {
          // Get relevant content based on topic
          platformContent = await supremeOneLocal.searchContent(topic)
        }

        // Get F&I expertise for context
        const fiExpertise = await supremeOneLocal.getFIExpertiseData()

        // Generate video script with platform content
        const script = await sarah.generateVideoScript(
          topic,
          videoType || 'social_media',
          90,
          platformContent
        )

        // Include F&I expertise context
        const enhancedScript = await sarah.generateContentWithSupremeOneData(
          'video_script',
          topic,
          [
            ...platformContent,
            {
              title: 'F&I Practice Tags',
              content: `Key F&I practices: ${fiExpertise.practice_tags.slice(0, 10).join(', ')}`
            },
            {
              title: 'Common Objections',
              content: `Common objections to address: ${fiExpertise.objection_types.slice(0, 5).join(', ')}`
            }
          ]
        )

        // Create video if HeyGen is available
        let videoId = null
        if (process.env.HEYGEN_API_KEY) {
          const heygen = new HeyGenService(process.env.HEYGEN_API_KEY)

          videoId = await heygen.generateVideo({
            avatar_id: process.env.HEYGEN_DEFAULT_AVATAR_ID || '',
            voice_id: process.env.HEYGEN_DEFAULT_VOICE_ID || '',
            script: enhancedScript,
            title: `Supreme One Training: ${topic}`
          })

          // Store video record
          await prisma.videoContent.create({
            data: {
              title: `Supreme One: ${topic}`,
              description: 'Video created using local Supreme One platform content',
              filename: videoId,
              url: '', // Will be updated when ready
              tags: ['supreme-one', 'local-content', topic.toLowerCase().replace(/\s+/g, '-')],
              format: 'mp4'
            }
          })
        }

        return NextResponse.json({
          script: enhancedScript,
          videoId,
          platformContentUsed: platformContent.length,
          fiExpertiseIncluded: {
            practiceTags: fiExpertise.practice_tags.length,
            objectionTypes: fiExpertise.objection_types.length,
            roleplayScenarios: fiExpertise.roleplay_scenarios.length
          }
        })

      case 'create_prospect_video':
        if (!prospectId) {
          return NextResponse.json({ error: 'Prospect ID required' }, { status: 400 })
        }

        const prospect = await prisma.prospect.findFirst({
          where: { id: prospectId, userId: session.user.id }
        })

        if (!prospect) {
          return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })
        }

        // Get relevant F&I content for this prospect
        const prospectContent = await supremeOneLocal.searchContent('f&i training dealership')
        const fiData = await supremeOneLocal.getFIExpertiseData()

        // Create personalized script
        const prospectScript = await sarah.generateVideoScript(
          `F&I Training for ${prospect.firstName} at ${prospect.company || 'their dealership'}`,
          'linkedin',
          90,
          prospectContent
        )

        // Create video
        let prospectVideoId = null
        if (process.env.HEYGEN_API_KEY) {
          const heygen = new HeyGenService(process.env.HEYGEN_API_KEY)

          prospectVideoId = await heygen.generateVideo({
            avatar_id: process.env.HEYGEN_DEFAULT_AVATAR_ID || '',
            voice_id: process.env.HEYGEN_DEFAULT_VOICE_ID || '',
            script: prospectScript,
            title: `Personal message for ${prospect.firstName} at ${prospect.company}`
          })

          // Create interaction record
          await prisma.interaction.create({
            data: {
              type: 'EMAIL',
              content: `Personalized Supreme One video created for ${prospect.firstName}`,
              result: 'Video generated with platform content',
              completedAt: new Date(),
              successful: true,
              prospectId: prospect.id
            }
          })
        }

        return NextResponse.json({
          script: prospectScript,
          videoId: prospectVideoId,
          prospect: {
            name: `${prospect.firstName} ${prospect.lastName}`,
            company: prospect.company
          },
          platformFeaturesHighlighted: prospectContent.slice(0, 5).map(c => c.title)
        })

      case 'update_sarah_knowledge':
        // Update Sarah AI's knowledge with local platform content
        const latestContent = await supremeOneLocal.extractAllContent()
        const fiExpertiseData = await supremeOneLocal.getFIExpertiseData()

        // Create comprehensive knowledge update
        const knowledgeUpdate = `
SUPREME ONE PLATFORM KNOWLEDGE:

F&I EXPERTISE:
- Practice Tags: ${fiExpertiseData.practice_tags.join(', ')}
- Compliance Requirements: ${fiExpertiseData.compliance_tags.join(', ')}
- Common Objections: ${fiExpertiseData.objection_types.join(', ')}
- Roleplay Scenarios: ${fiExpertiseData.roleplay_scenarios.join(', ')}

PLATFORM CONTENT:
${latestContent.map(item => `${item.title}: ${item.content.substring(0, 200)}...`).join('\n\n')}
        `

        // Store enhanced knowledge
        const existingLocalKnowledge = await prisma.knowledgeBase.findFirst({
          where: {
            title: 'Supreme One Local Platform Knowledge',
            category: 'local_platform'
          }
        })

        if (existingLocalKnowledge) {
          await prisma.knowledgeBase.update({
            where: { id: existingLocalKnowledge.id },
            data: {
              content: knowledgeUpdate,
              updatedAt: new Date()
            }
          })
        } else {
          await prisma.knowledgeBase.create({
            data: {
              title: 'Supreme One Local Platform Knowledge',
              category: 'local_platform',
              content: knowledgeUpdate,
              tags: ['supreme-one', 'local', 'platform', 'f&i']
            }
          })
        }

        return NextResponse.json({
          message: 'Sarah AI knowledge updated with local Supreme One content',
          contentItems: latestContent.length,
          fiDataIncluded: true
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Local Supreme One POST error:', error)
    return NextResponse.json(
      { error: 'Failed to process local Supreme One request' },
      { status: 500 }
    )
  }
}