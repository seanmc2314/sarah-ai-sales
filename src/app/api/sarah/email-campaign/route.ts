import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { SarahAI } from '@/lib/ai'
import { LocalSupremeOnePlatformService } from '@/lib/integrations/supreme-one-local'
import { EmailService } from '@/lib/integrations/email'
import { HeyGenService } from '@/lib/integrations/heygen'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      campaignName,
      prospectIds,
      emailType, // 'introduction', 'follow_up', 'value_proposition', 'appointment_request'
      includeVideo,
      customMessage,
      scheduleDate
    } = await request.json()

    if (!campaignName || !prospectIds || prospectIds.length === 0) {
      return NextResponse.json(
        { error: 'Campaign name and prospect IDs are required' },
        { status: 400 }
      )
    }

    // Get prospects
    const prospects = await prisma.prospect.findMany({
      where: {
        id: { in: prospectIds },
        userId: session.user.id
      }
    })

    if (prospects.length === 0) {
      return NextResponse.json(
        { error: 'No valid prospects found' },
        { status: 404 }
      )
    }

    // Initialize services
    const sarah = new SarahAI()
    const supremeOneLocal = new LocalSupremeOnePlatformService()

    // Get Supreme One data for personalization
    const fiExpertise = await supremeOneLocal.getFIExpertiseData()
    const platformContent = await supremeOneLocal.searchContent('f&i training dealership')

    // Create campaign
    const campaign = await prisma.campaign.create({
      data: {
        name: campaignName,
        description: `Email campaign: ${emailType} to ${prospects.length} prospects`,
        type: 'EMAIL_SEQUENCE',
        status: scheduleDate ? 'SCHEDULED' : 'ACTIVE',
        targetAudience: `${prospects.length} automotive prospects`,
        content: customMessage || '',
        scheduledAt: scheduleDate ? new Date(scheduleDate) : new Date(),
        userId: session.user.id
      }
    })

    // Configure Sarah AI's email service
    const emailConfig = {
      host: 'smtp.office365.com', // GoDaddy Microsoft 365
      port: 587,
      secure: false,
      user: 'sarahai@supremeone.net',
      password: process.env.SARAH_EMAIL_PASSWORD || '',
      fromName: 'Sarah AI - Supreme One Training',
      fromEmail: 'sarahai@supremeone.net'
    }

    const emailService = new EmailService(emailConfig)

    // Initialize HeyGen if video is requested
    let heygen: HeyGenService | null = null
    if (includeVideo && process.env.HEYGEN_API_KEY) {
      heygen = new HeyGenService(process.env.HEYGEN_API_KEY)
    }

    const results = {
      campaignId: campaign.id,
      successful: [] as string[],
      failed: [] as { prospectId: string; error: string }[],
      videosGenerated: [] as string[]
    }

    // Process each prospect
    for (const prospect of prospects) {
      try {
        // Generate personalized email content
        const emailContent = await sarah.generateContentWithSupremeOneData(
          'email',
          getEmailTopic(emailType, prospect),
          fiExpertise,
          platformContent
        )

        // Generate video if requested
        let videoUrl = null
        if (includeVideo && heygen) {
          try {
            const videoScript = await sarah.createSupremeOneProspectVideo(
              prospect,
              fiExpertise,
              ['dashboard', 'training', 'reports']
            )

            const videoId = await heygen.generateVideo({
              avatar_id: process.env.HEYGEN_DEFAULT_AVATAR_ID || '',
              voice_id: process.env.HEYGEN_DEFAULT_VOICE_ID || '',
              script: videoScript,
              title: `Personal message for ${prospect.firstName} at ${prospect.company}`
            })

            // Wait for video completion
            const videoStatus = await heygen.waitForVideoCompletion(videoId)
            videoUrl = videoStatus.video_url
            results.videosGenerated.push(videoId)

            // Store video record
            await prisma.videoContent.create({
              data: {
                title: `Personal video for ${prospect.firstName} ${prospect.lastName}`,
                description: `Supreme One prospecting video for ${prospect.company}`,
                filename: videoId,
                url: videoUrl || '',
                tags: ['prospecting', 'supreme-one', prospect.company || 'unknown']
              }
            })

          } catch (videoError) {
            console.error('Video generation failed for prospect:', prospect.id, videoError)
            // Continue with email-only approach
          }
        }

        // Create email template
        let emailTemplate
        if (videoUrl) {
          emailTemplate = await emailService.createVideoEmailTemplate(
            videoUrl,
            `I created this personalized Supreme One F&I analysis specifically for ${prospect.company}.`,
            'Would you be open to a brief conversation about improving your F&I performance?'
          )
        } else {
          // Parse email content to get subject and body
          const { subject, body } = parseEmailContent(emailContent, prospect)

          emailTemplate = {
            subject,
            htmlBody: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                ${body.split('\n').map(p => `<p>${p}</p>`).join('')}
                <div style="margin-top: 30px; text-align: center;">
                  <a href="https://calendly.com/sarah-ai-supreme-one"
                     style="background-color: #2c5aa0; color: white; padding: 12px 30px;
                            text-decoration: none; border-radius: 5px; display: inline-block;">
                    Schedule Free F&I Assessment
                  </a>
                </div>
                <div style="margin-top: 30px; padding: 15px; background: #f8f9fa; border-radius: 5px;">
                  <h4>About Supreme One Training:</h4>
                  <p>We help automotive dealerships increase F&I profits by 15-30% through proven methodologies and compliance training.</p>
                </div>
                <div style="margin-top: 20px; font-size: 12px; color: #666;">
                  <p>Best regards,<br>
                  Sarah AI<br>
                  Supreme One Training<br>
                  sarahai@supremeone.net</p>
                </div>
              </div>
            `,
            textBody: body
          }
        }

        // Send email
        const recipient = {
          email: prospect.email || '',
          firstName: prospect.firstName,
          lastName: prospect.lastName,
          company: prospect.company || ''
        }

        if (recipient.email) {
          const messageId = await emailService.sendEmail(recipient, emailTemplate)

          // Create interaction record
          await prisma.interaction.create({
            data: {
              type: 'EMAIL',
              content: emailTemplate.subject,
              result: `Email sent successfully - Message ID: ${messageId}`,
              completedAt: new Date(),
              successful: true,
              prospectId: prospect.id
            }
          })

          // Update prospect status and last contact
          await prisma.prospect.update({
            where: { id: prospect.id },
            data: {
              status: emailType === 'introduction' ? 'CONTACTED' : prospect.status,
              lastContactDate: new Date(),
              nextFollowUp: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days
            }
          })

          results.successful.push(prospect.id)
        } else {
          results.failed.push({
            prospectId: prospect.id,
            error: 'No email address available'
          })
        }

      } catch (error) {
        console.error(`Failed to process prospect ${prospect.id}:`, error)
        results.failed.push({
          prospectId: prospect.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Update campaign status
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date()
      }
    })

    return NextResponse.json({
      campaign: {
        id: campaign.id,
        name: campaignName,
        emailType
      },
      results,
      summary: {
        totalProspects: prospects.length,
        emailsSent: results.successful.length,
        failed: results.failed.length,
        videosGenerated: results.videosGenerated.length
      }
    })

  } catch (error) {
    console.error('Email campaign error:', error)
    return NextResponse.json(
      { error: 'Failed to execute email campaign' },
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

    // Get recent email campaigns
    const campaigns = await prisma.campaign.findMany({
      where: {
        userId: session.user.id,
        type: 'EMAIL_SEQUENCE'
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    })

    // Get campaign statistics
    const stats = await prisma.interaction.groupBy({
      by: ['successful'],
      where: {
        type: 'EMAIL',
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
      campaigns,
      stats: {
        totalEmails: stats.reduce((sum, stat) => sum + stat._count, 0),
        successful: stats.find(s => s.successful)?._count || 0,
        failed: stats.find(s => !s.successful)?._count || 0
      },
      emailTypes: [
        'introduction',
        'follow_up',
        'value_proposition',
        'appointment_request'
      ]
    })

  } catch (error) {
    console.error('Email campaign GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch email campaign data' },
      { status: 500 }
    )
  }
}

function getEmailTopic(emailType: string, prospect: any): string {
  switch (emailType) {
    case 'introduction':
      return `F&I Training Introduction for ${prospect.company}`
    case 'follow_up':
      return `Following up on F&I Performance for ${prospect.company}`
    case 'value_proposition':
      return `Supreme One F&I Training Value for ${prospect.company}`
    case 'appointment_request':
      return `Free F&I Assessment for ${prospect.company}`
    default:
      return `F&I Training Opportunity for ${prospect.company}`
  }
}

function parseEmailContent(content: string, prospect: any): { subject: string; body: string } {
  const lines = content.split('\n').filter(line => line.trim() !== '')

  // Look for subject line indicators
  let subject = `F&I Performance Enhancement for ${prospect.company}`
  let body = content

  // Try to extract subject if it's clearly marked
  const subjectLine = lines.find(line =>
    line.toLowerCase().includes('subject:') ||
    line.toLowerCase().includes('re:') ||
    line.toLowerCase().includes('regarding:')
  )

  if (subjectLine) {
    subject = subjectLine.replace(/subject:\s*/i, '').replace(/re:\s*/i, '').trim()
    body = lines.filter(line => line !== subjectLine).join('\n')
  }

  return { subject, body }
}