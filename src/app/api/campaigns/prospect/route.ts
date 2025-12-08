import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { SarahAI } from '@/lib/ai'
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
      campaignType, // 'EMAIL_SEQUENCE', 'PERSONALIZED_VIDEO', 'LINKEDIN_OUTREACH'
      message,
      includeVideo,
      scheduledAt
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

    // Create campaign record
    const campaign = await prisma.campaign.create({
      data: {
        name: campaignName,
        description: `${campaignType} campaign for ${prospects.length} prospects`,
        type: campaignType as any,
        status: 'SCHEDULED',
        targetAudience: `${prospects.length} automotive prospects`,
        content: message,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
        userId: session.user.id
      }
    })

    // Initialize services
    const sarah = new SarahAI()
    const emailConfig = {
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: false,
      user: process.env.EMAIL_USER || '',
      password: process.env.EMAIL_PASSWORD || '',
      fromName: 'Sarah AI - Supreme One Training',
      fromEmail: process.env.EMAIL_USER || ''
    }
    const emailService = new EmailService(emailConfig)

    const results = {
      campaignId: campaign.id,
      successful: [] as string[],
      failed: [] as { prospectId: string; error: string }[],
      videosGenerated: [] as string[]
    }

    // Process each prospect
    for (const prospect of prospects) {
      try {
        let emailContent: any

        if (includeVideo && process.env.HEYGEN_API_KEY) {
          // Generate personalized video
          const heygen = new HeyGenService(process.env.HEYGEN_API_KEY)

          const videoScript = `Hi ${prospect.firstName}, I'm Sarah from Supreme One Training. I noticed ${prospect.company} and wanted to share how we've helped similar dealerships like yours increase F&I profits by 20-30%. I'd love to discuss how we can help ${prospect.company} achieve similar results. Let's schedule a brief 15-minute call to explore the possibilities.`

          const videoRequest = {
            avatar_id: process.env.HEYGEN_DEFAULT_AVATAR_ID || '',
            voice_id: process.env.HEYGEN_DEFAULT_VOICE_ID || '',
            script: videoScript,
            title: `Personal message for ${prospect.firstName} at ${prospect.company}`
          }

          try {
            const videoStatus = await heygen.generateVideoComplete(videoRequest)

            if (videoStatus.video_url) {
              // Create video email template
              const personalMessage = `I created this personal video message specifically for you and ${prospect.company}.`
              const callToAction = `Based on our experience with similar dealerships, I believe we can help ${prospect.company} achieve significant F&I improvements. Would you be open to a brief conversation?`

              const videoTemplate = await emailService.createVideoEmailTemplate(
                videoStatus.video_url,
                personalMessage,
                callToAction
              )

              emailContent = videoTemplate
              results.videosGenerated.push(videoStatus.video_id)

              // Store video record
              await prisma.videoContent.create({
                data: {
                  title: `Personal video for ${prospect.firstName} ${prospect.lastName}`,
                  description: `Personalized prospecting video for ${prospect.company}`,
                  filename: videoStatus.video_id,
                  url: videoStatus.video_url,
                  duration: videoStatus.duration,
                  format: 'mp4',
                  tags: ['prospecting', 'personalized', prospect.company || 'unknown']
                }
              })
            }
          } catch (videoError) {
            console.error('Video generation failed for prospect:', prospect.id, videoError)
            // Fall back to text-only email
          }
        }

        // Generate email content if no video or video failed
        if (!emailContent) {
          const prospectingEmail = await sarah.generateProspectingEmail(prospect, campaignType)

          emailContent = {
            subject: prospectingEmail.subject,
            htmlBody: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <p>Hi ${prospect.firstName},</p>
                ${prospectingEmail.body.split('\\n').map(p => `<p>${p}</p>`).join('')}
                <p>Best regards,<br>Sarah AI<br>Supreme One Training</p>
                <div style="margin-top: 30px; text-align: center;">
                  <a href="https://calendly.com/your-calendar-link"
                     style="background-color: #3498db; color: white; padding: 12px 30px;
                            text-decoration: none; border-radius: 5px; display: inline-block;">
                    Schedule a Free Consultation
                  </a>
                </div>
              </div>
            `,
            textBody: prospectingEmail.body
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
          await emailService.sendEmail(recipient, emailContent)

          // Create interaction record
          await prisma.interaction.create({
            data: {
              type: 'EMAIL',
              content: emailContent.subject,
              result: 'Sent successfully',
              completedAt: new Date(),
              successful: true,
              prospectId: prospect.id
            }
          })

          // Update prospect last contact date
          await prisma.prospect.update({
            where: { id: prospect.id },
            data: {
              lastContactDate: new Date(),
              nextFollowUp: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days
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

    return NextResponse.json(results)

  } catch (error) {
    console.error('Campaign execution error:', error)
    return NextResponse.json(
      { error: 'Failed to execute campaign' },
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
    const campaignId = searchParams.get('campaignId')

    if (campaignId) {
      // Get specific campaign details
      const campaign = await prisma.campaign.findFirst({
        where: {
          id: campaignId,
          userId: session.user.id
        },
        include: {
          posts: true
        }
      })

      return NextResponse.json(campaign)
    } else {
      // Get all campaigns
      const campaigns = await prisma.campaign.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
        take: 50
      })

      return NextResponse.json(campaigns)
    }

  } catch (error) {
    console.error('Error fetching campaign data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaign data' },
      { status: 500 }
    )
  }
}