import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { SarahAI } from '@/lib/ai'
import { LocalSupremeOnePlatformService } from '@/lib/integrations/supreme-one-local'
import { HeyGenService } from '@/lib/integrations/heygen'
import { EmailService } from '@/lib/integrations/email'
import { SocialMediaService } from '@/lib/integrations/social-media'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      action,
      topic,
      contentType,
      prospectId,
      platforms,
      includeVideo,
      includeScreenshots
    } = await request.json()

    const sarah = new SarahAI()
    const supremeOneLocal = new LocalSupremeOnePlatformService()

    // Get Supreme One platform data
    const fiExpertise = await supremeOneLocal.getFIExpertiseData()
    const platformContent = await supremeOneLocal.searchContent(topic || 'f&i training')

    switch (action) {
      case 'create_social_campaign':
        if (!topic) {
          return NextResponse.json({ error: 'Topic is required' }, { status: 400 })
        }

        // Generate social media content using Supreme One data
        const socialContent = await sarah.generateContentWithSupremeOneData(
          'social_post',
          topic,
          fiExpertise,
          platformContent
        )

        // Create video if requested
        let videoUrl = null
        if (includeVideo && process.env.HEYGEN_API_KEY) {
          const videoScript = await sarah.generateContentWithSupremeOneData(
            'video_script',
            topic,
            fiExpertise,
            platformContent
          )

          const heygen = new HeyGenService(process.env.HEYGEN_API_KEY)
          const videoId = await heygen.generateVideo({
            avatar_id: process.env.HEYGEN_DEFAULT_AVATAR_ID || '',
            voice_id: process.env.HEYGEN_DEFAULT_VOICE_ID || '',
            script: videoScript,
            title: `Supreme One: ${topic}`
          })

          // Wait for video completion and get URL
          const videoStatus = await heygen.waitForVideoCompletion(videoId)
          videoUrl = videoStatus.video_url
        }

        // Get screenshots if requested
        let screenshots: string[] = []
        if (includeScreenshots) {
          const screenshotData = await supremeOneLocal.captureInterfaceScreenshots()
          screenshots = screenshotData.map(s => s.path)
        }

        // Post to social media platforms
        const postResults = []
        if (platforms && platforms.length > 0) {
          const user = await prisma.user.findUnique({
            where: { id: session.user.id }
          })

          if (user) {
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

            const postData = {
              platform: 'MULTIPLE' as any,
              content: socialContent,
              mediaUrl: videoUrl || undefined,
              mediaType: videoUrl ? 'video' as any : undefined
            }

            const results = await socialMedia.postToAllPlatforms(postData)
            postResults.push(results)
          }
        }

        return NextResponse.json({
          socialContent,
          videoUrl,
          screenshots: screenshots.length,
          platformDataUsed: platformContent.length,
          fiExpertiseIncluded: {
            practices: fiExpertise.practice_tags.length,
            compliance: fiExpertise.compliance_tags.length,
            objections: fiExpertise.objection_types.length
          },
          postResults
        })

      case 'prospect_outreach':
        if (!prospectId) {
          return NextResponse.json({ error: 'Prospect ID is required' }, { status: 400 })
        }

        const prospect = await prisma.prospect.findFirst({
          where: { id: prospectId, userId: session.user.id }
        })

        if (!prospect) {
          return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })
        }

        // Generate ROI analysis for this prospect
        const roiAnalysis = await sarah.analyzeSupremeOneROI(
          {
            name: prospect.company,
            type: prospect.industry,
            location: prospect.notes?.match(/location:\s*([^,\n]+)/i)?.[1]
          },
          fiExpertise
        )

        // Create personalized email
        const emailContent = await sarah.generateContentWithSupremeOneData(
          'email',
          `F&I Performance Enhancement for ${prospect.company}`,
          fiExpertise,
          platformContent
        )

        // Create personalized video if requested
        let prospectVideoUrl = null
        if (includeVideo && process.env.HEYGEN_API_KEY) {
          const prospectVideoScript = await sarah.createSupremeOneProspectVideo(
            prospect,
            fiExpertise,
            includeScreenshots ? ['dashboard', 'training', 'reports'] : undefined
          )

          const heygen = new HeyGenService(process.env.HEYGEN_API_KEY)
          const videoId = await heygen.generateVideo({
            avatar_id: process.env.HEYGEN_DEFAULT_AVATAR_ID || '',
            voice_id: process.env.HEYGEN_DEFAULT_VOICE_ID || '',
            script: prospectVideoScript,
            title: `Personal message for ${prospect.firstName} at ${prospect.company}`
          })

          const videoStatus = await heygen.waitForVideoCompletion(videoId)
          prospectVideoUrl = videoStatus.video_url
        }

        // Send email if prospect has email
        let emailSent = false
        if (prospect.email && process.env.EMAIL_USER) {
          const emailService = new EmailService({
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.EMAIL_PORT || '587'),
            secure: false,
            user: process.env.EMAIL_USER,
            password: process.env.EMAIL_PASSWORD || '',
            fromName: 'Sarah AI - Supreme One Training',
            fromEmail: process.env.EMAIL_USER
          })

          let emailTemplate
          if (prospectVideoUrl) {
            emailTemplate = await emailService.createVideoEmailTemplate(
              prospectVideoUrl,
              `I created this personalized analysis for ${prospect.company} based on our Supreme One F&I training platform.`,
              'Would you be open to a brief conversation about improving your F&I performance?'
            )
          } else {
            emailTemplate = {
              subject: `F&I Performance Enhancement Opportunity for ${prospect.company}`,
              htmlBody: emailContent.replace(/\n/g, '<br>'),
              textBody: emailContent
            }
          }

          try {
            await emailService.sendEmail({
              email: prospect.email || '',
              firstName: prospect.firstName,
              lastName: prospect.lastName,
              company: prospect.company || ''
            }, emailTemplate)

            emailSent = true

            // Create interaction record
            await prisma.interaction.create({
              data: {
                type: 'EMAIL',
                content: 'Supreme One F&I training outreach with platform data',
                result: 'Email sent with personalized content and ROI analysis',
                completedAt: new Date(),
                successful: true,
                prospectId: prospect.id
              }
            })
          } catch (error) {
            console.error('Failed to send prospect email:', error)
          }
        }

        return NextResponse.json({
          prospect: {
            name: `${prospect.firstName} ${prospect.lastName}`,
            company: prospect.company,
            email: prospect.email
          },
          roiAnalysis,
          emailContent,
          videoUrl: prospectVideoUrl,
          emailSent,
          platformInsights: {
            relevantPractices: fiExpertise.practice_tags.filter((tag: string) =>
              tag.includes('rapport') || tag.includes('value') || tag.includes('close')
            ).slice(0, 5),
            complianceAreas: fiExpertise.compliance_tags.slice(0, 3),
            trainingScenarios: fiExpertise.roleplay_scenarios.slice(0, 3)
          }
        })

      case 'content_analysis':
        // Analyze Supreme One content for marketing opportunities
        const contentAnalysis = await sarah.analyzeSupremeOneROI(platformContent, fiExpertise)

        return NextResponse.json({
          platformContent: platformContent.length,
          fiExpertise: {
            totalPractices: fiExpertise.practice_tags.length,
            totalCompliance: fiExpertise.compliance_tags.length,
            totalObjections: fiExpertise.objection_types.length,
            totalScenarios: fiExpertise.roleplay_scenarios.length
          },
          contentAnalysis,
          recommendations: {
            improvements: contentAnalysis.improvements,
            projectedROI: contentAnalysis.projectedROI,
            trainingRecommendations: contentAnalysis.trainingRecommendations
          }
        })

      case 'update_knowledge':
        // Update Sarah AI's knowledge base with latest Supreme One content
        const allContent = await supremeOneLocal.extractAllContent()

        // Store all content in database
        for (const item of allContent) {
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
          message: 'Sarah AI knowledge updated with Supreme One platform content',
          contentItems: allContent.length,
          categories: [...new Set(allContent.map(item => item.category))],
          expertise: {
            practices: fiExpertise.practice_tags.length,
            compliance: fiExpertise.compliance_tags.length,
            scenarios: fiExpertise.roleplay_scenarios.length
          }
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Sarah Supreme One integration error:', error)
    return NextResponse.json(
      { error: 'Failed to process Supreme One integration request' },
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

    const supremeOneLocal = new LocalSupremeOnePlatformService()

    // Get current Supreme One platform status
    const fiExpertise = await supremeOneLocal.getFIExpertiseData()
    const interfaces = await supremeOneLocal.getInterfacesList()
    const recentContent = await supremeOneLocal.getTrainingContent()

    // Get stored knowledge from database
    const storedKnowledge = await prisma.knowledgeBase.count({
      where: {
        OR: [
          { category: 'local_platform' },
          { tags: { has: 'supreme-one' } }
        ]
      }
    })

    return NextResponse.json({
      platformStatus: 'connected',
      localPath: '/Users/seanmcnally/Desktop/supreme-one-platform',
      expertise: {
        practices: fiExpertise.practice_tags.length,
        compliance: fiExpertise.compliance_tags.length,
        objections: fiExpertise.objection_types.length,
        scenarios: fiExpertise.roleplay_scenarios.length
      },
      interfaces: interfaces.length,
      contentFiles: recentContent.length,
      storedKnowledge,
      capabilities: [
        'Social media content with F&I expertise',
        'Personalized prospect videos with platform screenshots',
        'ROI analysis based on actual training data',
        'Compliance-focused messaging',
        'Real F&I scenario references',
        'Platform interface demonstrations'
      ]
    })

  } catch (error) {
    console.error('Sarah Supreme One status error:', error)
    return NextResponse.json(
      { error: 'Failed to get Supreme One integration status' },
      { status: 500 }
    )
  }
}