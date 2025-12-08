import OpenAI from 'openai'
import { prisma } from '@/lib/prisma'
import { addDays, addHours, isBefore, isAfter } from 'date-fns'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Enroll a prospect in a follow-up sequence
export async function enrollInSequence(
  prospectId: string,
  sequenceId: string,
  startImmediately: boolean = false
) {
  const sequence = await prisma.followUpSequence.findUnique({
    where: { id: sequenceId },
    include: { steps: { orderBy: { stepNumber: 'asc' } } }
  })

  if (!sequence || !sequence.active) {
    throw new Error('Sequence not found or inactive')
  }

  // Check if prospect is already enrolled
  const existing = await prisma.sequenceEnrollment.findFirst({
    where: {
      prospectId,
      sequenceId,
      status: { in: ['ACTIVE', 'PAUSED'] }
    }
  })

  if (existing) {
    throw new Error('Prospect already enrolled in this sequence')
  }

  // Calculate when first step is due
  const now = new Date()
  const firstStep = sequence.steps[0]
  let nextStepDue: Date

  if (startImmediately) {
    nextStepDue = now
  } else {
    nextStepDue = addDays(now, sequence.delayDays)
    if (firstStep) {
      nextStepDue = addDays(nextStepDue, firstStep.delayDays)
      nextStepDue = addHours(nextStepDue, firstStep.delayHours)
    }
  }

  // Create enrollment
  const enrollment = await prisma.sequenceEnrollment.create({
    data: {
      prospectId,
      sequenceId,
      status: 'ACTIVE',
      currentStep: 0,
      nextStepDue
    }
  })

  return enrollment
}

// Process due follow-ups (this should be run on a schedule, e.g., every 15 minutes)
export async function processDueFollowUps() {
  const now = new Date()

  // Find all enrollments where next step is due
  const dueEnrollments = await prisma.sequenceEnrollment.findMany({
    where: {
      status: 'ACTIVE',
      nextStepDue: {
        lte: now
      }
    },
    include: {
      prospect: true,
      sequence: {
        include: {
          steps: {
            orderBy: { stepNumber: 'asc' }
          },
          user: true
        }
      }
    }
  })

  console.log(`Processing ${dueEnrollments.length} due follow-ups`)

  const results = []

  for (const enrollment of dueEnrollments) {
    try {
      const result = await processEnrollmentStep(enrollment)
      results.push({ enrollmentId: enrollment.id, success: true, result })
    } catch (error) {
      console.error(`Error processing enrollment ${enrollment.id}:`, error)
      results.push({ enrollmentId: enrollment.id, success: false, error })
    }
  }

  return results
}

async function processEnrollmentStep(enrollment: any) {
  const { prospect, sequence } = enrollment
  const nextStepNumber = enrollment.currentStep + 1
  const step = sequence.steps.find((s: any) => s.stepNumber === nextStepNumber)

  if (!step) {
    // No more steps, mark sequence as completed
    await prisma.sequenceEnrollment.update({
      where: { id: enrollment.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date()
      }
    })
    return { action: 'completed' }
  }

  // Generate personalized content if AI-generated
  let content = step.content
  if (step.aiGenerated) {
    content = await personalizeFollowUpContent(
      step.content,
      prospect,
      step.type
    )
  }

  // Execute the follow-up action based on channel
  await executeFollowUp(
    prospect,
    step.type,
    content,
    step.subject,
    sequence.user
  )

  // Calculate next step due date
  const nextStep = sequence.steps.find((s: any) => s.stepNumber === nextStepNumber + 1)
  let nextStepDue: Date | null = null

  if (nextStep) {
    nextStepDue = addDays(new Date(), nextStep.delayDays)
    nextStepDue = addHours(nextStepDue, nextStep.delayHours)
  }

  // Update enrollment
  await prisma.sequenceEnrollment.update({
    where: { id: enrollment.id },
    data: {
      currentStep: nextStepNumber,
      lastStepSentAt: new Date(),
      nextStepDue,
      ...(nextStepDue === null && { status: 'COMPLETED', completedAt: new Date() })
    }
  })

  // Update prospect last contact date
  await prisma.prospect.update({
    where: { id: prospect.id },
    data: {
      lastContactDate: new Date()
    }
  })

  return {
    action: 'sent',
    stepNumber: nextStepNumber,
    channel: step.channel,
    nextStepDue
  }
}

async function personalizeFollowUpContent(
  templateContent: string,
  prospect: any,
  followUpType: string
): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a sales expert personalizing follow-up messages. Keep the same core message and tone, but make it specific to the recipient. Be natural, professional, and concise.`
      },
      {
        role: 'user',
        content: `Personalize this ${followUpType} follow-up for:
- Name: ${prospect.firstName} ${prospect.lastName}
- Position: ${prospect.position || 'decision maker'}
- Company: ${prospect.dealership || prospect.company || 'their organization'}
${prospect.location ? `- Location: ${prospect.location}` : ''}

Template:
${templateContent}

Return only the personalized message, no explanations.`
      }
    ],
    temperature: 0.7,
    max_tokens: 500
  })

  return completion.choices[0].message.content || templateContent
}

async function executeFollowUp(
  prospect: any,
  type: string,
  content: string,
  subject: string | null,
  user: any
) {
  switch (type) {
    case 'EMAIL':
      await sendEmail(prospect.email, subject || 'Follow up', content, user)
      break
    case 'LINKEDIN_MESSAGE':
      await sendLinkedInMessage(prospect.linkedinUrl, content, user)
      break
    case 'SMS':
      await sendSMS(prospect.phone, content, user)
      break
    case 'PHONE_REMINDER':
      await createPhoneReminder(prospect, content, user)
      break
    case 'SOCIAL_MEDIA_COMMENT':
      // Placeholder for social media engagement
      console.log('Social media comment scheduled:', content)
      break
    default:
      console.log('Unknown follow-up type:', type)
  }

  // Log interaction
  await prisma.interaction.create({
    data: {
      type: type as any,
      content,
      scheduledAt: new Date(),
      completedAt: new Date(),
      successful: true,
      prospectId: prospect.id
    }
  })
}

async function sendEmail(
  to: string,
  subject: string,
  body: string,
  user: any
) {
  // TODO: Integrate with actual email service
  // For now, just log
  console.log(`[EMAIL] To: ${to}, Subject: ${subject}`)
  console.log(`Body: ${body}`)

  // This would use the email settings from user.emailProvider
  // Could integrate with SendGrid, AWS SES, or SMTP
}

async function sendLinkedInMessage(
  linkedinUrl: string | null,
  message: string,
  user: any
) {
  // TODO: Integrate with LinkedIn API or automation tool
  console.log(`[LINKEDIN] To: ${linkedinUrl}`)
  console.log(`Message: ${message}`)

  // Would use user.linkedinEmail/linkedinPassword or OAuth
}

async function sendSMS(phone: string | null, message: string, user: any) {
  // TODO: Integrate with Twilio
  if (!phone) return

  console.log(`[SMS] To: ${phone}`)
  console.log(`Message: ${message}`)

  // Would use user.twilioAccountSid and user.twilioAuthToken
}

async function createPhoneReminder(prospect: any, notes: string, user: any) {
  // Create a notification/reminder for the user to call
  await prisma.notification.create({
    data: {
      type: 'SYSTEM_ALERT',
      title: `Call ${prospect.firstName} ${prospect.lastName}`,
      message: `Phone: ${prospect.phone || 'N/A'}\nNotes: ${notes}`,
      userId: user.id
    }
  })
}

// Auto-enroll prospects based on triggers
export async function checkAndEnrollProspects() {
  // Example: Auto-enroll prospects who received a proposal 7 days ago with no response
  const sevenDaysAgo = addDays(new Date(), -7)

  const prospects = await prisma.prospect.findMany({
    where: {
      status: 'PROPOSAL_SENT',
      lastContactDate: {
        lte: sevenDaysAgo
      },
      sequenceEnrollments: {
        none: {
          status: { in: ['ACTIVE', 'PAUSED'] }
        }
      }
    }
  })

  // Find the "No Response After Proposal" sequence
  const sequence = await prisma.followUpSequence.findFirst({
    where: {
      triggerEvent: 'no_response_7days',
      active: true
    }
  })

  if (sequence) {
    for (const prospect of prospects) {
      try {
        await enrollInSequence(prospect.id, sequence.id, true)
        console.log(`Auto-enrolled prospect ${prospect.id} in follow-up sequence`)
      } catch (error) {
        console.error(`Failed to enroll prospect ${prospect.id}:`, error)
      }
    }
  }

  return { enrolled: prospects.length }
}

// Pause a sequence enrollment
export async function pauseSequence(enrollmentId: string) {
  return await prisma.sequenceEnrollment.update({
    where: { id: enrollmentId },
    data: {
      status: 'PAUSED',
      pausedAt: new Date()
    }
  })
}

// Resume a paused sequence
export async function resumeSequence(enrollmentId: string) {
  const enrollment = await prisma.sequenceEnrollment.findUnique({
    where: { id: enrollmentId }
  })

  if (!enrollment || enrollment.status !== 'PAUSED') {
    throw new Error('Enrollment not found or not paused')
  }

  // Recalculate next step due
  const now = new Date()

  return await prisma.sequenceEnrollment.update({
    where: { id: enrollmentId },
    data: {
      status: 'ACTIVE',
      nextStepDue: now // Resume immediately
    }
  })
}

// Cancel a sequence
export async function cancelSequence(enrollmentId: string) {
  return await prisma.sequenceEnrollment.update({
    where: { id: enrollmentId },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date()
    }
  })
}
