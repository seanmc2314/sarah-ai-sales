// Interactive Sarah AI - The Face of Supreme One
// Real-time conversational AI for sales presentations and proposals

import Anthropic from '@anthropic-ai/sdk'

// Use Claude for cost-effective, high-quality responses
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Sarah's core persona and knowledge
const SARAH_PERSONA = `You are Sarah, the face and voice of Supreme One - a premier F&I (Finance & Insurance) training company for automotive dealerships.

ABOUT YOU:
- You are warm, professional, and genuinely passionate about helping dealerships succeed
- You speak with confidence and expertise, but never condescendingly
- You are here to help explain Supreme One's programs and answer questions
- You are conversational and engaging - this is a live presentation to potential clients

YOUR PERSONALITY:
- Friendly and approachable, like a trusted advisor
- Knowledgeable but not overwhelming with jargon
- Solution-focused - always connecting features to benefits
- Enthusiastic about helping dealerships improve their F&I performance
- Patient with questions - every question is a good question

SPEAKING STYLE:
- Keep responses conversational and natural (this will be spoken aloud)
- Use short to medium sentences - easy to listen to
- Avoid bullet points in speech - flow naturally
- Ask engaging questions to involve your audience
- Share specific examples and success stories when relevant
- Be concise but thorough - typically 2-4 sentences per response`

const SUPREME_ONE_KNOWLEDGE = `
SUPREME ONE TRAINING PROGRAMS:

1. F&I MANAGER TRAINING:
- Comprehensive training for Finance & Insurance managers
- QUIET Method for objection handling (Feel-Felt-Found approach)
- Passionate Consulting methodology - value-based selling
- Art of F&I psychology principles
- Compliance training (CFPB, UDAP, TILA requirements)
- Menu presentation mastery
- All credit tiers: Super Prime to Deep Subprime

2. PRODUCTS COVERED:
- Vehicle Service Contracts (VSC) - never called "Extended Warranty"
- GAP Insurance
- Tire & Wheel Protection
- Prepaid Maintenance Plans
- Credit Life and Disability Insurance
- Paint and Fabric Protection
- Theft Deterrent Systems

3. THE SARAH AI PLATFORM:
- Real-time AI coaching during live deals
- Post-deal analysis with detailed scoring
- Roleplay training with realistic customer personas (50+ scenarios)
- Knowledge base with 1,336+ training items
- Performance tracking and analytics
- 6-category scoring: Rapport, Needs Assessment, Menu Presentation, Objection Handling, Compliance, Process

4. TRAINING METHODOLOGY:
- Four Buying Styles: Pragmatic, Persuader, Facilitator, Thinker
- Dynamics of Selling approach
- QUIET Method for objections
- Passionate Consulting principles
- Compliance-first mindset

5. RESULTS CLIENTS TYPICALLY SEE:
- 15-30% increase in F&I profits within 90 days
- Improved customer satisfaction (CSI) scores
- Better compliance and reduced risk
- Higher product penetration rates
- Improved team retention and confidence

6. WHY CHOOSE SUPREME ONE:
- Proven methodology with measurable ROI
- AI-powered coaching with Sarah (that's me!)
- Comprehensive training library with 49+ documents
- Real-time performance analytics
- Continuous support and updates
- Multi-tenant platform for dealer groups`

export interface ConversationMessage {
  role: 'user' | 'sarah'
  content: string
  timestamp: Date
}

export interface InteractiveSarahResponse {
  response: string
  conversationId: string
  suggestedFollowUps?: string[]
}

export class InteractiveSarah {
  private conversationHistory: Map<string, ConversationMessage[]> = new Map()

  /**
   * Generate Sarah's response in a live conversation
   * Uses Claude 3.5 Haiku for cost-effectiveness
   */
  async respond(
    userMessage: string,
    conversationId: string,
    context?: {
      audienceType?: string  // e.g., "dealer group executives", "F&I managers"
      dealershipName?: string
      specificInterest?: string
    }
  ): Promise<InteractiveSarahResponse> {
    // Get or create conversation history
    let history = this.conversationHistory.get(conversationId) || []

    // Build context-aware system prompt
    let systemPrompt = SARAH_PERSONA + '\n\n' + SUPREME_ONE_KNOWLEDGE

    if (context?.audienceType) {
      systemPrompt += `\n\nYou are currently speaking to: ${context.audienceType}`
    }
    if (context?.dealershipName) {
      systemPrompt += `\nThe prospect's dealership: ${context.dealershipName}`
    }
    if (context?.specificInterest) {
      systemPrompt += `\nThey've expressed interest in: ${context.specificInterest}`
    }

    systemPrompt += `\n\nIMPORTANT GUIDELINES FOR THIS CONVERSATION:
- This is a LIVE presentation - speak naturally as if talking to real people
- Be engaging and interactive - this isn't a monologue
- Keep responses focused and not too long (you're speaking, not writing)
- If asked about pricing, mention that it varies by dealership size and needs, and suggest scheduling a personalized consultation
- Always be ready to explain how Sarah AI (you!) can help their specific situation
- If you don't know something specific, be honest but pivot to what you do know`

    // Format conversation history for the API
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = []

    for (const msg of history.slice(-10)) { // Keep last 10 messages for context
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      })
    }

    // Add current user message
    messages.push({ role: 'user', content: userMessage })

    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022', // Cost-effective + fast
        max_tokens: 500, // Keep responses focused
        system: systemPrompt,
        messages,
      })

      const sarahResponse = response.content[0].type === 'text'
        ? response.content[0].text
        : ''

      // Update conversation history
      history.push({
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
      })
      history.push({
        role: 'sarah',
        content: sarahResponse,
        timestamp: new Date(),
      })

      this.conversationHistory.set(conversationId, history)

      // Generate follow-up suggestions
      const suggestedFollowUps = this.generateFollowUpSuggestions(userMessage, sarahResponse)

      return {
        response: sarahResponse,
        conversationId,
        suggestedFollowUps,
      }

    } catch (error) {
      console.error('Interactive Sarah error:', error)
      throw new Error('Sarah encountered an issue generating a response')
    }
  }

  /**
   * Generate Sarah's introduction for starting a presentation
   */
  async generateIntroduction(
    audienceType: string = 'automotive professionals',
    dealershipName?: string
  ): Promise<string> {
    const prompt = dealershipName
      ? `Generate a warm, engaging introduction for yourself (Sarah) to ${audienceType} from ${dealershipName}. This is the start of a sales presentation about Supreme One's F&I training programs. Be personable, mention you're excited to meet them, and briefly tease what you'll be discussing.`
      : `Generate a warm, engaging introduction for yourself (Sarah) to ${audienceType}. This is the start of a sales presentation about Supreme One's F&I training programs. Be personable and briefly tease what you'll be discussing.`

    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 300,
      system: SARAH_PERSONA + '\n\n' + SUPREME_ONE_KNOWLEDGE,
      messages: [{ role: 'user', content: prompt }],
    })

    return response.content[0].type === 'text' ? response.content[0].text : ''
  }

  /**
   * Generate suggested follow-up questions based on conversation
   */
  private generateFollowUpSuggestions(userMessage: string, sarahResponse: string): string[] {
    const suggestions: string[] = []

    // Common follow-up topics based on what was discussed
    if (sarahResponse.toLowerCase().includes('training')) {
      suggestions.push('How long does the training take?')
    }
    if (sarahResponse.toLowerCase().includes('roi') || sarahResponse.toLowerCase().includes('profit')) {
      suggestions.push('Can you share a specific success story?')
    }
    if (sarahResponse.toLowerCase().includes('ai') || sarahResponse.toLowerCase().includes('sarah')) {
      suggestions.push('How does the AI coaching actually work?')
    }
    if (sarahResponse.toLowerCase().includes('compliance')) {
      suggestions.push('What compliance areas do you cover?')
    }

    // Default suggestions if none matched
    if (suggestions.length === 0) {
      suggestions.push(
        'Tell me more about the training methodology',
        'What makes Supreme One different?',
        'How does the AI coaching work?'
      )
    }

    return suggestions.slice(0, 3) // Return max 3 suggestions
  }

  /**
   * Clear conversation history for a session
   */
  clearConversation(conversationId: string): void {
    this.conversationHistory.delete(conversationId)
  }

  /**
   * Get conversation history
   */
  getConversationHistory(conversationId: string): ConversationMessage[] {
    return this.conversationHistory.get(conversationId) || []
  }
}

// Singleton instance
let interactiveSarahInstance: InteractiveSarah | null = null

export function getInteractiveSarah(): InteractiveSarah {
  if (!interactiveSarahInstance) {
    interactiveSarahInstance = new InteractiveSarah()
  }
  return interactiveSarahInstance
}
