import OpenAI from 'openai'
import { prisma } from '@/lib/prisma'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export interface ProspectData {
  firstName: string
  lastName: string
  position?: string
  dealership?: string
  dealershipWebsite?: string
  location?: string
  employeeCount?: number
  revenue?: string
  industry?: string
  notes?: string
}

export interface ProposalOptions {
  templateId?: string
  includeROI?: boolean
  includePricing?: boolean
  tone?: 'formal' | 'casual' | 'professional'
}

export async function generateProposal(
  prospectData: ProspectData,
  options: ProposalOptions = {}
) {
  const {
    includeROI = true,
    includePricing = true,
    tone = 'professional'
  } = options

  // Build the AI prompt
  const prompt = buildProposalPrompt(prospectData, { includeROI, includePricing, tone })

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert sales consultant for Supreme One Training, a premier F&I training platform. You specialize in creating compelling, personalized proposals for dealership owners, GMs, and presidents. Your proposals focus on:
- How Supreme One Training with Sarah AI improves F&I performance
- Measurable ROI through increased PVR (Per Vehicle Retail) and product penetration
- Real-world success stories from similar dealerships
- Professional, consultative tone that builds trust
- Clear next steps and value proposition`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })

    const proposalContent = completion.choices[0].message.content || ''

    // Generate personalized pitch
    const pitch = await generatePersonalizedPitch(prospectData)

    // Calculate ROI if requested
    const roiCalculation = includeROI ? await calculateROI(prospectData) : null

    return {
      content: proposalContent,
      personalizedPitch: pitch,
      roiCalculation,
      title: `Supreme One Training Proposal for ${prospectData.dealership || 'Your Dealership'}`
    }
  } catch (error) {
    console.error('Error generating proposal:', error)
    throw new Error('Failed to generate proposal')
  }
}

function buildProposalPrompt(
  prospect: ProspectData,
  options: { includeROI: boolean; includePricing: boolean; tone: string }
): string {
  const { firstName, lastName, position, dealership, location, employeeCount, revenue, notes } = prospect
  const { includeROI, includePricing, tone } = options

  let prompt = `Create a compelling training program proposal for:\n\n`
  prompt += `**Prospect Details:**\n`
  prompt += `- Name: ${firstName} ${lastName}\n`
  if (position) prompt += `- Position: ${position}\n`
  if (dealership) prompt += `- Dealership: ${dealership}\n`
  if (location) prompt += `- Location: ${location}\n`
  if (employeeCount) prompt += `- Team Size: ${employeeCount} employees\n`
  if (revenue) prompt += `- Revenue Range: ${revenue}\n`
  if (notes) prompt += `- Additional Context: ${notes}\n`

  prompt += `\n**Proposal Requirements:**\n`
  prompt += `1. Opening that references their specific situation and challenges\n`
  prompt += `2. Introduction to Supreme One Training and Sarah AI platform\n`
  prompt += `3. Key benefits specific to their dealership size and market\n`
  prompt += `4. Training program overview:\n`
  prompt += `   - F&I product knowledge (VSC, GAP, maintenance plans, etc.)\n`
  prompt += `   - Objection handling and closing techniques\n`
  prompt += `   - Compliance and best practices\n`
  prompt += `   - Sarah AI-powered role-play and coaching\n`

  if (includeROI) {
    prompt += `5. ROI projection showing potential revenue increase from improved F&I performance\n`
  }

  if (includePricing) {
    prompt += `6. Investment tiers (mention we offer flexible pricing based on team size)\n`
  }

  prompt += `7. Success stories from similar dealerships\n`
  prompt += `8. Clear call-to-action for next steps\n\n`

  prompt += `Tone: ${tone}, consultative, focused on value and results.\n`
  prompt += `Length: Comprehensive but scannable (800-1200 words)\n`
  prompt += `Format: Use markdown with clear sections and bullet points.`

  return prompt
}

async function generatePersonalizedPitch(prospect: ProspectData): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are a sales expert creating personalized opening pitches. Be concise, relevant, and compelling.'
      },
      {
        role: 'user',
        content: `Create a 2-3 sentence personalized opening pitch for ${prospect.firstName} ${prospect.lastName}, ${prospect.position || 'decision maker'} at ${prospect.dealership || 'their dealership'}. Focus on how Supreme One Training can help them improve their F&I department performance. ${prospect.notes ? `Context: ${prospect.notes}` : ''}`
      }
    ],
    temperature: 0.8,
    max_tokens: 200
  })

  return completion.choices[0].message.content || ''
}

interface ROIData {
  currentMonthlyVehicles: number
  currentPVR: number
  projectedPVRIncrease: number
  monthlyRevenueIncrease: number
  annualRevenueIncrease: number
  trainingInvestment: number
  roi: number
  paybackMonths: number
}

async function calculateROI(prospect: ProspectData): Promise<ROIData> {
  // Default assumptions based on dealership size
  const estimatedMonthlyVehicles = prospect.employeeCount
    ? Math.floor(prospect.employeeCount * 25) // Rough estimate: 25 vehicles per employee per month
    : 100 // Default for small dealership

  // Industry average F&I PVR is around $1,500-$1,800
  const currentPVR = 1500

  // Supreme One Training typically improves PVR by 20-40%
  const projectedIncrease = 0.25 // Conservative 25% increase

  const projectedPVRIncrease = currentPVR * projectedIncrease
  const monthlyRevenueIncrease = estimatedMonthlyVehicles * projectedPVRIncrease
  const annualRevenueIncrease = monthlyRevenueIncrease * 12

  // Training investment (estimate based on team size)
  const teamSize = prospect.employeeCount || 5
  const pricePerPerson = 500 // Monthly per person
  const trainingInvestment = teamSize * pricePerPerson

  const roi = ((annualRevenueIncrease - (trainingInvestment * 12)) / (trainingInvestment * 12)) * 100
  const paybackMonths = (trainingInvestment * 12) / monthlyRevenueIncrease

  return {
    currentMonthlyVehicles: estimatedMonthlyVehicles,
    currentPVR,
    projectedPVRIncrease: Math.round(projectedPVRIncrease),
    monthlyRevenueIncrease: Math.round(monthlyRevenueIncrease),
    annualRevenueIncrease: Math.round(annualRevenueIncrease),
    trainingInvestment,
    roi: Math.round(roi),
    paybackMonths: Math.round(paybackMonths * 10) / 10 // Round to 1 decimal
  }
}

export async function saveProposal(
  userId: string,
  prospectId: string,
  proposalData: {
    title: string
    content: string
    personalizedPitch: string
    roiCalculation: ROIData | null
    templateId?: string
  }
) {
  return await prisma.proposal.create({
    data: {
      title: proposalData.title,
      content: proposalData.content,
      personalizedPitch: proposalData.personalizedPitch,
      roiCalculation: proposalData.roiCalculation,
      trainingProgram: 'Supreme One Training with Sarah AI',
      status: 'DRAFT',
      userId,
      prospectId,
      templateId: proposalData.templateId || null
    }
  })
}

export async function sendProposal(proposalId: string) {
  // Mark proposal as sent
  const proposal = await prisma.proposal.update({
    where: { id: proposalId },
    data: {
      status: 'SENT',
      sentAt: new Date()
    },
    include: {
      prospect: true,
      user: true
    }
  })

  // Update prospect status
  await prisma.prospect.update({
    where: { id: proposal.prospectId },
    data: {
      status: 'PROPOSAL_SENT',
      lastContactDate: new Date()
    }
  })

  // Create interaction record
  await prisma.interaction.create({
    data: {
      type: 'EMAIL',
      content: `Proposal sent: ${proposal.title}`,
      result: 'SENT',
      completedAt: new Date(),
      successful: true,
      prospectId: proposal.prospectId
    }
  })

  // TODO: Actually send the email via email service
  // This would integrate with the email settings in User model

  return proposal
}
