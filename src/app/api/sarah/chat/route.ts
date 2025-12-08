import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { SarahAI } from '@/lib/ai'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { message, history } = await request.json()

    const sarah = new SarahAI()

    // Analyze the message to determine intent and create appropriate response
    let response = ''
    let task = null

    if (message.toLowerCase().includes('linkedin') && message.toLowerCase().includes('post')) {
      const topic = extractTopic(message) || 'F&I training excellence'
      response = await sarah.generateLinkedInPost(topic)
      task = {
        id: Date.now().toString(),
        type: 'content_generation',
        description: `Generate LinkedIn post about ${topic}`,
        status: 'completed',
        result: 'LinkedIn post generated successfully'
      }
    } else if (message.toLowerCase().includes('prospect') || message.toLowerCase().includes('research')) {
      response = `I'll help you with prospect research. To get started, I need to know:

• What type of prospects are you targeting? (Dealership GMs, F&I Managers, etc.)
• Geographic location or territory
• Company size or specific dealership groups
• Any specific criteria or requirements

I can then search LinkedIn and other sources to find qualified prospects for your F&I training program.`

      task = {
        id: Date.now().toString(),
        type: 'prospect_research',
        description: 'Research automotive prospects',
        status: 'pending'
      }
    } else if (message.toLowerCase().includes('call') && message.toLowerCase().includes('script')) {
      const prospect = { firstName: 'John', lastName: 'Smith', company: 'Auto Dealership', position: 'GM' }
      response = await sarah.generateCallScript(prospect, 'Schedule F&I training consultation')

      task = {
        id: Date.now().toString(),
        type: 'content_generation',
        description: 'Generate phone call script',
        status: 'completed',
        result: 'Call script generated successfully'
      }
    } else if (message.toLowerCase().includes('follow') && message.toLowerCase().includes('up')) {
      response = `I'll create a follow-up sequence for your prospects. Here's what I recommend:

**Day 1:** Initial connection/thank you message
**Day 3:** Share valuable F&I industry insight
**Day 7:** Send case study or success story
**Day 14:** Soft pitch with training overview
**Day 21:** Direct proposal request
**Day 30:** Final follow-up with special offer

Would you like me to draft specific messages for any of these follow-up touchpoints?`

      task = {
        id: Date.now().toString(),
        type: 'follow_up',
        description: 'Create prospect follow-up sequence',
        status: 'completed',
        result: 'Follow-up sequence created'
      }
    } else {
      // General AI response
      response = `I understand you're looking for help with ${message}. I specialize in:

• **Prospect Research**: Finding qualified automotive professionals
• **Content Creation**: LinkedIn posts, emails, marketing materials
• **Appointment Setting**: Scheduling and managing meetings
• **Sales Support**: Call scripts, follow-up sequences, objection handling
• **F&I Expertise**: Training content, compliance information

Could you be more specific about what you'd like me to help you with? For example:
- "Generate a LinkedIn post about F&I training benefits"
- "Help me find dealership GMs in California"
- "Create a follow-up email sequence for prospects"
- "Write a phone script for cold calling"`
    }

    return NextResponse.json({
      response,
      task
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function extractTopic(message: string): string | null {
  const topicMatches = message.match(/about (.+?)(\.|$|for|to)/i)
  return topicMatches ? topicMatches[1] : null
}