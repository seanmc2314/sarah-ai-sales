import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { openai } from '@/lib/ai'

// POST /api/ai/pipeline - AI actions for pipeline leads
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, dealershipId } = await request.json()

    if (!dealershipId) {
      return NextResponse.json({ error: 'Dealership ID required' }, { status: 400 })
    }

    // Get dealership with all related data
    const dealership = await prisma.dealership.findUnique({
      where: { id: dealershipId },
      include: {
        contacts: true,
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        tasks: {
          where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
          orderBy: { dueDate: 'asc' }
        },
        assignedUser: {
          select: { name: true, email: true }
        }
      }
    })

    if (!dealership) {
      return NextResponse.json({ error: 'Dealership not found' }, { status: 404 })
    }

    const primaryContact = dealership.contacts.find(c => c.isPrimary) || dealership.contacts[0]

    switch (action) {
      case 'research':
        return await researchDealership(dealership, primaryContact)
      case 'outreach':
        return await generateOutreach(dealership, primaryContact)
      case 'suggest':
        return await suggestNextAction(dealership, primaryContact)
      case 'score':
        return await scoreLead(dealership, primaryContact)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('AI Pipeline error:', error)
    return NextResponse.json({ error: 'AI processing failed' }, { status: 500 })
  }
}

async function researchDealership(dealership: any, contact: any) {
  const prompt = `You are Sarah AI, a sales intelligence assistant for Supreme One Dealer Services, an F&I training company.

Research and analyze this automotive dealership for our sales team:

DEALERSHIP INFO:
- Name: ${dealership.name}
- Location: ${dealership.city || 'Unknown'}, ${dealership.state || 'Unknown'}
- Website: ${dealership.website || 'Not provided'}
- Brands: ${dealership.brands?.join(', ') || 'Unknown'}
- Employee Count: ${dealership.employeeCount || 'Unknown'}
- Current Stage: ${dealership.status}

PRIMARY CONTACT:
- Name: ${contact ? `${contact.firstName} ${contact.lastName}` : 'Unknown'}
- Position: ${contact?.position || 'Unknown'}
- Email: ${contact?.email || 'Unknown'}

Please provide:
1. **Company Overview** - Brief summary of the dealership (make educated assumptions based on size, brands, location)
2. **Key Decision Makers** - Typical roles we should target at this type of dealership
3. **Pain Points** - Common challenges dealerships like this face with F&I
4. **Talking Points** - 3-4 specific value propositions that would resonate
5. **Competitive Landscape** - What training providers might they currently use
6. **Recommended Approach** - How to best engage this prospect

Keep the response concise and actionable for our sales team.`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1000
  })

  return NextResponse.json({
    result: completion.choices[0].message.content,
    type: 'research'
  })
}

async function generateOutreach(dealership: any, contact: any) {
  const activityHistory = dealership.activities?.length > 0
    ? dealership.activities.map((a: any) => `${a.type}: ${a.subject}`).join('\n')
    : 'No previous contact'

  const prompt = `You are Sarah AI, a sales copywriter for Supreme One Dealer Services, an F&I training company.

Generate personalized outreach for this prospect:

DEALERSHIP:
- Name: ${dealership.name}
- Location: ${dealership.city || 'Unknown'}, ${dealership.state || 'Unknown'}
- Brands: ${dealership.brands?.join(', ') || 'Unknown'}
- Current Stage: ${dealership.status}

CONTACT:
- Name: ${contact ? `${contact.firstName} ${contact.lastName}` : 'Decision Maker'}
- Position: ${contact?.position || 'Unknown'}

PREVIOUS INTERACTIONS:
${activityHistory}

Please generate:

1. **Cold Email** (if PROSPECT stage)
   - Subject line
   - Email body (2-3 paragraphs)
   - Clear call-to-action

2. **LinkedIn Message** (brief, personalized)

3. **Follow-up Email** (if they've been contacted before)
   - Reference previous interaction
   - Add new value
   - Soft call-to-action

Make the messaging:
- Personalized to their dealership/role
- Value-focused (not salesy)
- Professional but warm
- Include a specific, easy next step`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1200
  })

  return NextResponse.json({
    result: completion.choices[0].message.content,
    type: 'outreach'
  })
}

async function suggestNextAction(dealership: any, contact: any) {
  const lastActivity = dealership.activities?.[0]
  const daysSinceLastContact = lastActivity
    ? Math.floor((Date.now() - new Date(lastActivity.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : null

  const pendingTasks = dealership.tasks?.length || 0

  const prompt = `You are Sarah AI, a sales coach for Supreme One Dealer Services.

Analyze this lead and suggest the best next action:

DEALERSHIP:
- Name: ${dealership.name}
- Stage: ${dealership.status}
- Monthly Value: $${dealership.monthlyValue || 'Unknown'}
- Days in CRM: ${Math.floor((Date.now() - new Date(dealership.createdAt).getTime()) / (1000 * 60 * 60 * 24))}

CONTACT:
- Name: ${contact ? `${contact.firstName} ${contact.lastName}` : 'Unknown'}
- Position: ${contact?.position || 'Unknown'}

ENGAGEMENT:
- Last Contact: ${daysSinceLastContact !== null ? `${daysSinceLastContact} days ago` : 'Never contacted'}
- Last Activity: ${lastActivity ? `${lastActivity.type} - ${lastActivity.subject}` : 'None'}
- Total Activities: ${dealership.activities?.length || 0}
- Pending Tasks: ${pendingTasks}

Based on their stage and engagement history, provide:

1. **Recommended Next Action** - Be specific (e.g., "Call to schedule demo", "Send case study email")
2. **Why This Action** - Brief reasoning
3. **Talking Points** - 2-3 key points to mention
4. **Watch Out For** - Any concerns or objections to prepare for
5. **Urgency Level** - High/Medium/Low and why

Keep it brief and actionable.`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 600
  })

  return NextResponse.json({
    result: completion.choices[0].message.content,
    type: 'suggestion',
    daysSinceLastContact
  })
}

async function scoreLead(dealership: any, contact: any) {
  const activityCount = dealership.activities?.length || 0
  const daysSinceCreated = Math.floor((Date.now() - new Date(dealership.createdAt).getTime()) / (1000 * 60 * 60 * 24))
  const lastActivity = dealership.activities?.[0]
  const daysSinceLastContact = lastActivity
    ? Math.floor((Date.now() - new Date(lastActivity.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : daysSinceCreated

  const prompt = `You are Sarah AI, a lead scoring analyst for Supreme One Dealer Services.

Score this lead based on the following data:

DEALERSHIP:
- Name: ${dealership.name}
- Location: ${dealership.city || 'Unknown'}, ${dealership.state || 'Unknown'}
- Brands: ${dealership.brands?.join(', ') || 'Unknown'}
- Employee Count: ${dealership.employeeCount || 'Unknown'}
- Current Stage: ${dealership.status}
- Estimated Monthly Value: $${dealership.monthlyValue || 'Unknown'}

CONTACT:
- Name: ${contact ? `${contact.firstName} ${contact.lastName}` : 'Unknown'}
- Position: ${contact?.position || 'Unknown'}
- Has Email: ${contact?.email ? 'Yes' : 'No'}
- Has Phone: ${contact?.phone ? 'Yes' : 'No'}

ENGAGEMENT:
- Days in Pipeline: ${daysSinceCreated}
- Total Activities: ${activityCount}
- Days Since Last Contact: ${daysSinceLastContact}
- Current Stage: ${dealership.status}

Provide a lead score analysis:

1. **Overall Score**: 0-100 (be specific)
2. **Score Breakdown**:
   - Fit Score (0-100): How well does this dealership match our ideal customer profile?
   - Engagement Score (0-100): How engaged have they been?
   - Timing Score (0-100): How ready are they to buy?
3. **Temperature**: 🔥 Hot / ☀️ Warm / ❄️ Cold
4. **Key Factors**: What's influencing the score positively/negatively
5. **Recommendation**: Should we prioritize, nurture, or deprioritize?

Be direct and honest in your assessment.`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 600
  })

  // Parse out the score from the response
  const response = completion.choices[0].message.content || ''
  const scoreMatch = response.match(/Overall Score[:\s]*(\d+)/i)
  const score = scoreMatch ? parseInt(scoreMatch[1]) : null

  // Determine temperature
  let temperature = 'cold'
  if (score && score >= 70) temperature = 'hot'
  else if (score && score >= 40) temperature = 'warm'

  return NextResponse.json({
    result: response,
    type: 'score',
    score,
    temperature
  })
}
