import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { SarahAI } from '@/lib/ai'
import { EmailService } from '@/lib/integrations/email'
import { HeyGenService } from '@/lib/integrations/heygen'
import { SocialMediaService } from '@/lib/integrations/social-media'
import { prisma } from '@/lib/prisma'

interface CampaignSettings {
  geography?: string
  dealershipType?: string
  minEmployees?: number
  maxEmployees?: number
  targetPositions?: string[]
  industries?: string[]
}

interface CampaignStep {
  type: 'EMAIL' | 'VIDEO_EMAIL' | 'SOCIAL_POST' | 'FOLLOW_UP' | 'APPOINTMENT_REQUEST'
  delay: number // days after previous step
  content?: string
  conditions?: string[]
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      campaignName,
      description,
      targetSettings,
      steps,
      autoStart
    } = await request.json()

    if (!campaignName || !steps || steps.length === 0) {
      return NextResponse.json(
        { error: 'Campaign name and steps are required' },
        { status: 400 }
      )
    }

    // Create the campaign
    const campaign = await prisma.campaign.create({
      data: {
        name: campaignName,
        description: description || `Automated campaign: ${campaignName}`,
        type: 'EMAIL_SEQUENCE',
        status: autoStart ? 'ACTIVE' : 'DRAFT',
        targetAudience: JSON.stringify(targetSettings),
        content: JSON.stringify(steps),
        scheduledAt: autoStart ? new Date() : undefined,
        userId: session.user.id
      }
    })

    // If auto-start, begin executing the campaign
    if (autoStart) {
      const executionResult = await executeAutomatedCampaign(
        campaign.id,
        session.user.id,
        targetSettings,
        steps
      )

      return NextResponse.json({
        campaign,
        execution: executionResult
      })
    }

    return NextResponse.json(campaign)

  } catch (error) {
    console.error('Automated campaign creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create automated campaign' },
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
    const active = searchParams.get('active')

    if (campaignId) {
      // Get specific campaign with execution details
      const campaign = await prisma.campaign.findFirst({
        where: {
          id: campaignId,
          userId: session.user.id
        }
      })

      if (!campaign) {
        return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
      }

      // Get campaign interactions
      const interactions = await prisma.interaction.findMany({
        where: {
          prospect: {
            userId: session.user.id
          }
        },
        include: {
          prospect: {
            select: {
              firstName: true,
              lastName: true,
              company: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 100
      })

      return NextResponse.json({
        campaign,
        interactions,
        stats: await getCampaignStats(campaignId)
      })
    }

    // Get all automated campaigns
    let whereClause: any = {
      userId: session.user.id,
      type: 'EMAIL_SEQUENCE'
    }

    if (active === 'true') {
      whereClause.status = 'ACTIVE'
    }

    const campaigns = await prisma.campaign.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    return NextResponse.json(campaigns)

  } catch (error) {
    console.error('Error fetching automated campaigns:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    )
  }
}

async function executeAutomatedCampaign(
  campaignId: string,
  userId: string,
  targetSettings: CampaignSettings,
  steps: CampaignStep[]
): Promise<any> {
  try {
    const sarah = new SarahAI()

    // Find prospects matching target criteria
    let whereClause: any = {
      userId,
      status: { in: ['COLD', 'CONTACTED'] }
    }

    if (targetSettings.geography) {
      // Assume geography is stored in notes or a location field
      whereClause.notes = { contains: targetSettings.geography }
    }

    if (targetSettings.targetPositions) {
      whereClause.position = { in: targetSettings.targetPositions }
    }

    if (targetSettings.industries) {
      whereClause.industry = { in: targetSettings.industries }
    }

    const prospects = await prisma.prospect.findMany({
      where: whereClause,
      take: 100 // Limit initial batch
    })

    const results = {
      prospectsFound: prospects.length,
      stepResults: [] as any[],
      successful: 0,
      failed: 0
    }

    // Execute first step immediately
    const firstStep = steps[0]
    if (firstStep && prospects.length > 0) {
      const stepResult = await executeStep(firstStep, prospects, userId, campaignId)
      results.stepResults.push(stepResult)
      results.successful += stepResult.successful.length
      results.failed += stepResult.failed.length

      // Schedule future steps
      for (let i = 1; i < steps.length; i++) {
        const step = steps[i]
        const executeAt = new Date(Date.now() + step.delay * 24 * 60 * 60 * 1000)

        // In a real implementation, you'd use a job queue like Bull or Agenda
        // For now, we'll just log the scheduled steps
        console.log(`Step ${i + 1} scheduled for ${executeAt.toISOString()}`)

        // Create a scheduled task record
        await prisma.interaction.create({
          data: {
            type: 'EMAIL',
            content: `Scheduled: ${step.type} - ${step.content?.substring(0, 100)}`,
            scheduledAt: executeAt,
            prospectId: prospects[0].id // This would be handled differently in production
          }
        })
      }
    }

    return results

  } catch (error) {
    console.error('Campaign execution error:', error)
    throw error
  }
}

async function executeStep(
  step: CampaignStep,
  prospects: any[],
  userId: string,
  campaignId: string
): Promise<any> {
  const sarah = new SarahAI()
  const results = {
    step: step.type,
    successful: [] as string[],
    failed: [] as { prospectId: string; error: string }[]
  }

  // Get user settings for integrations
  const user = await prisma.user.findUnique({
    where: { id: userId }
  })

  if (!user) {
    throw new Error('User not found')
  }

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

  for (const prospect of prospects) {
    try {
      switch (step.type) {
        case 'EMAIL':
          const emailContent = await sarah.generateProspectingEmail(prospect, 'AUTOMATED_OUTREACH')

          if (prospect.email) {
            const recipient = {
              email: prospect.email,
              firstName: prospect.firstName,
              lastName: prospect.lastName,
              company: prospect.company
            }

            const template = {
              subject: emailContent.subject,
              htmlBody: `<div style="font-family: Arial, sans-serif;">${emailContent.body.replace(/\\n/g, '<br>')}</div>`,
              textBody: emailContent.body
            }

            await emailService.sendEmail(recipient, template)

            // Log interaction
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

            results.successful.push(prospect.id)
          }
          break

        case 'VIDEO_EMAIL':
          if (process.env.HEYGEN_API_KEY && prospect.email) {
            const heygen = new HeyGenService(process.env.HEYGEN_API_KEY)

            const videoScript = `Hi ${prospect.firstName}, I'm Sarah from Supreme One Training. I noticed ${prospect.company} and wanted to personally reach out about how we're helping dealerships increase F&I profits by 20-30%. I'd love to share how we can help ${prospect.company} achieve similar results.`

            try {
              const videoStatus = await heygen.generateVideoComplete({
                avatar_id: process.env.HEYGEN_DEFAULT_AVATAR_ID || '',
                voice_id: process.env.HEYGEN_DEFAULT_VOICE_ID || '',
                script: videoScript,
                title: `Personal message for ${prospect.firstName}`
              })

              if (videoStatus.video_url) {
                const videoTemplate = await emailService.createVideoEmailTemplate(
                  videoStatus.video_url,
                  `I created this personal video message for ${prospect.company}.`,
                  'Would you be open to a brief conversation about your F&I performance?'
                )

                const recipient = {
                  email: prospect.email,
                  firstName: prospect.firstName,
                  lastName: prospect.lastName,
                  company: prospect.company
                }

                await emailService.sendEmail(recipient, videoTemplate)
                results.successful.push(prospect.id)
              }
            } catch (videoError) {
              console.error('Video generation failed:', videoError)
              results.failed.push({ prospectId: prospect.id, error: 'Video generation failed' })
            }
          }
          break

        case 'FOLLOW_UP':
          const followUpContent = await sarah.generateProspectingEmail(prospect, 'FOLLOW_UP')

          // Check if enough time has passed since last contact
          const lastInteraction = await prisma.interaction.findFirst({
            where: { prospectId: prospect.id },
            orderBy: { createdAt: 'desc' }
          })

          const daysSinceContact = lastInteraction
            ? Math.floor((Date.now() - lastInteraction.createdAt.getTime()) / (1000 * 60 * 60 * 24))
            : 999

          if (daysSinceContact >= 3 && prospect.email) {
            const recipient = {
              email: prospect.email,
              firstName: prospect.firstName,
              lastName: prospect.lastName,
              company: prospect.company
            }

            const template = {
              subject: followUpContent.subject,
              htmlBody: `<div style="font-family: Arial, sans-serif;">${followUpContent.body.replace(/\\n/g, '<br>')}</div>`,
              textBody: followUpContent.body
            }

            await emailService.sendEmail(recipient, template)
            results.successful.push(prospect.id)
          }
          break

        case 'APPOINTMENT_REQUEST':
          const appointmentRequest = await sarah.generateAppointmentRequest(prospect, 'CONSULTATION_REQUEST')

          if (prospect.email) {
            const recipient = {
              email: prospect.email,
              firstName: prospect.firstName,
              lastName: prospect.lastName,
              company: prospect.company
            }

            const template = {
              subject: `Quick consultation request for ${prospect.company}`,
              htmlBody: `<div style="font-family: Arial, sans-serif;">${appointmentRequest.replace(/\\n/g, '<br>')}<br><br><a href="https://calendly.com/sarah-ai-supreme-one" style="background: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Schedule Now</a></div>`,
              textBody: appointmentRequest
            }

            await emailService.sendEmail(recipient, template)
            results.successful.push(prospect.id)
          }
          break

        default:
          results.failed.push({ prospectId: prospect.id, error: 'Unknown step type' })
      }

      // Update prospect last contact date
      await prisma.prospect.update({
        where: { id: prospect.id },
        data: { lastContactDate: new Date() }
      })

    } catch (error) {
      console.error(`Step execution failed for prospect ${prospect.id}:`, error)
      results.failed.push({
        prospectId: prospect.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  return results
}

async function getCampaignStats(campaignId: string) {
  // This would calculate campaign performance metrics
  // For now, return basic stats
  return {
    emailsSent: 0,
    opensEstimate: 0,
    responses: 0,
    appointmentsBooked: 0,
    conversionRate: 0
  }
}