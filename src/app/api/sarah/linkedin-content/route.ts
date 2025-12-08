import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { SarahAI } from '@/lib/ai'
import { LocalSupremeOnePlatformService } from '@/lib/integrations/supreme-one-local'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      contentType, // 'connection_request', 'direct_message', 'post', 'comment'
      prospectId,
      topic,
      tone, // 'professional', 'friendly', 'urgent', 'consultative'
      includeSupremeOneData
    } = await request.json()

    if (!contentType) {
      return NextResponse.json(
        { error: 'Content type is required' },
        { status: 400 }
      )
    }

    const sarah = new SarahAI()
    const supremeOneLocal = new LocalSupremeOnePlatformService()

    // Get Supreme One data if requested
    let fiExpertise: any = {}
    let platformContent: any[] = []

    if (includeSupremeOneData) {
      fiExpertise = await supremeOneLocal.getFIExpertiseData()
      platformContent = await supremeOneLocal.searchContent(topic || 'f&i training')
    }

    let prospect = null
    if (prospectId) {
      prospect = await prisma.prospect.findFirst({
        where: { id: prospectId, userId: session.user.id }
      })

      if (!prospect) {
        return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })
      }
    }

    let content = ''
    let instructions = ''

    switch (contentType) {
      case 'connection_request':
        if (!prospect) {
          return NextResponse.json({ error: 'Prospect required for connection request' }, { status: 400 })
        }

        content = await sarah.generateContentWithSupremeOneData(
          'prospect_message',
          `LinkedIn connection request for ${prospect.firstName} at ${prospect.company}`,
          fiExpertise,
          platformContent
        )

        instructions = `
LinkedIn Connection Request Instructions:
1. Go to ${prospect.firstName} ${prospect.lastName}'s LinkedIn profile
2. Click "Connect"
3. Choose "Add a note"
4. Copy and paste the message below (LinkedIn limits to 300 characters)
5. Click "Send invitation"

COPY THIS MESSAGE:
${content}

Note: LinkedIn may truncate long messages. If needed, shorten while keeping the personal touch.
        `
        break

      case 'direct_message':
        if (!prospect) {
          return NextResponse.json({ error: 'Prospect required for direct message' }, { status: 400 })
        }

        content = await sarah.generateContentWithSupremeOneData(
          'email',
          `LinkedIn direct message for ${prospect.firstName} at ${prospect.company}`,
          fiExpertise,
          platformContent
        )

        instructions = `
LinkedIn Direct Message Instructions:
1. Go to your LinkedIn messages
2. Start a new conversation with ${prospect.firstName} ${prospect.lastName}
3. Copy and paste the message below
4. Review and personalize if needed
5. Send the message

COPY THIS MESSAGE:
${content}
        `
        break

      case 'post':
        const postTopic = topic || 'F&I Training Excellence'
        content = await sarah.generateContentWithSupremeOneData(
          'social_post',
          postTopic,
          fiExpertise,
          platformContent
        )

        instructions = `
LinkedIn Post Instructions:
1. Go to your LinkedIn homepage
2. Click "Start a post"
3. Copy and paste the content below
4. Add any relevant images or videos
5. Review and edit if needed
6. Click "Post"

COPY THIS CONTENT:
${content}

Suggested hashtags to add:
#FinanceAndInsurance #DealershipTraining #AutomotiveTraining #SupremeOneTraining #FITraining #DealershipProfits
        `
        break

      case 'comment':
        if (!topic) {
          return NextResponse.json({ error: 'Topic/context required for comment' }, { status: 400 })
        }

        content = await sarah.generateContentWithSupremeOneData(
          'social_post',
          `Professional comment about ${topic}`,
          fiExpertise,
          platformContent
        )

        // Make it comment-appropriate (shorter, more conversational)
        const commentContent = await sarah.generateContentWithSupremeOneData(
          'prospect_message',
          `LinkedIn comment about ${topic} - keep it conversational and under 100 words`,
          fiExpertise,
          platformContent
        )

        instructions = `
LinkedIn Comment Instructions:
1. Navigate to the post you want to comment on
2. Click in the comment box
3. Copy and paste the comment below
4. Review and adjust tone if needed
5. Click "Post" to publish your comment

COPY THIS COMMENT:
${commentContent}
        `
        break

      default:
        return NextResponse.json({ error: 'Invalid content type' }, { status: 400 })
    }

    // Store the generated content for tracking
    await prisma.socialPost.create({
      data: {
        platform: 'LINKEDIN',
        content: content,
        status: 'DRAFT',
        userId: session.user.id
      }
    })

    // Create interaction record if for a prospect
    if (prospect) {
      await prisma.interaction.create({
        data: {
          type: 'LINKEDIN_MESSAGE',
          content: `LinkedIn ${contentType} generated`,
          result: 'Content ready for manual posting',
          scheduledAt: new Date(),
          prospectId: prospect.id
        }
      })
    }

    return NextResponse.json({
      contentType,
      content,
      instructions,
      prospect: prospect ? {
        name: `${prospect.firstName} ${prospect.lastName}`,
        company: prospect.company,
        position: prospect.position
      } : null,
      supremeOneDataUsed: includeSupremeOneData ? {
        practicesReferenced: fiExpertise.practice_tags?.slice(0, 3),
        compliancePoints: fiExpertise.compliance_tags?.slice(0, 2),
        contentSources: platformContent.length
      } : null,
      characterCount: content.length,
      wordCount: content.split(' ').length
    })

  } catch (error) {
    console.error('LinkedIn content generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate LinkedIn content' },
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

    if (action === 'templates') {
      // Return LinkedIn content templates
      const templates = {
        connection_request: {
          description: 'Personalized connection request messages',
          maxLength: 300,
          tips: [
            'Keep it under 300 characters',
            'Mention something specific about their company',
            'Reference mutual interests or connections',
            'Be clear about why you want to connect'
          ]
        },
        direct_message: {
          description: 'Follow-up messages after connecting',
          maxLength: 8000,
          tips: [
            'Thank them for connecting',
            'Provide immediate value or insight',
            'Ask a thoughtful question',
            'Include a soft call-to-action'
          ]
        },
        post: {
          description: 'Engaging posts for your LinkedIn feed',
          maxLength: 3000,
          tips: [
            'Start with a hook or question',
            'Share valuable insights or tips',
            'Include relevant hashtags',
            'End with engagement question'
          ]
        },
        comment: {
          description: 'Thoughtful comments on others\' posts',
          maxLength: 1250,
          tips: [
            'Add genuine value to the conversation',
            'Share a brief relevant experience',
            'Ask follow-up questions',
            'Keep it professional but personable'
          ]
        }
      }

      return NextResponse.json({ templates })
    }

    // Get recent LinkedIn content generated
    const recentContent = await prisma.socialPost.findMany({
      where: {
        userId: session.user.id,
        platform: 'LINKEDIN'
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        content: true,
        status: true,
        createdAt: true
      }
    })

    // Get LinkedIn interaction stats
    const linkedinStats = await prisma.interaction.groupBy({
      by: ['successful'],
      where: {
        type: 'LINKEDIN_MESSAGE',
        prospect: {
          userId: session.user.id
        },
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      _count: true
    })

    return NextResponse.json({
      recentContent,
      stats: {
        totalLinkedInActions: linkedinStats.reduce((sum, stat) => sum + stat._count, 0),
        successful: linkedinStats.find(s => s.successful)?._count || 0
      },
      contentTypes: [
        'connection_request',
        'direct_message',
        'post',
        'comment'
      ]
    })

  } catch (error) {
    console.error('LinkedIn content GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch LinkedIn content data' },
      { status: 500 }
    )
  }
}