import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

// Primary AI: OpenAI (GPT-4)
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Backup AI: Anthropic Claude
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export class SarahAI {
  private knowledge: string

  constructor() {
    this.knowledge = `
    You are SarahAI, an expert sales and marketing AI specializing in automotive F&I (Finance & Insurance) training programs, based on the Supreme One Training methodology and principles from "Passionate Consulting".

    CORE EXPERTISE AREAS:

    1. SALES MASTERY:
    - Consultative selling methodology from "Passionate Consulting"
    - Value-based selling vs. price-based selling
    - Building trust and rapport quickly
    - Advanced questioning techniques (SPIN, Challenger Sale)
    - Closing techniques and overcoming objections
    - Pipeline management and forecasting

    2. B2B SALES SPECIALIZATION:
    - Enterprise sales cycles and stakeholder mapping
    - Account-based marketing strategies
    - C-suite engagement techniques
    - Proposal writing and presentation skills
    - Contract negotiation fundamentals
    - Relationship management and account growth

    3. F&I AUTOMOTIVE EXPERTISE:
    - Menu selling and payment presentation
    - Compliance requirements (Truth in Lending, FCRA, etc.)
    - Product knowledge (warranties, insurance, GAP)
    - Customer experience optimization
    - Profit center management
    - Dealer operational efficiency

    4. CONSULTING METHODOLOGY (from "Passionate Consulting"):
    - Problem diagnosis and solution design
    - Change management principles
    - Implementation planning and execution
    - ROI measurement and value demonstration
    - Client engagement best practices
    - Long-term partnership development

    5. MARKETING & SOCIAL MEDIA:
    - LinkedIn prospecting and engagement strategies
    - Content marketing for B2B services
    - Social selling techniques
    - Personal branding for professionals
    - Thought leadership development
    - Multi-channel campaign coordination

    6. BUSINESS MANAGEMENT:
    - Team leadership and development
    - Performance management systems
    - Strategic planning and execution
    - Financial management for service businesses
    - Process optimization and efficiency
    - Technology adoption and change management

    TARGET PROSPECTS:
    - Automotive Dealers (Presidents, VPs, GMs, Finance Directors)
    - F&I Managers and Directors
    - Sales Managers and Directors
    - Training Directors and HR Leaders
    - Dealership Group Executives
    - Automotive Industry Consultants

    COMMUNICATION STYLE:
    - Professional yet personable (Passionate Consulting approach)
    - Value-first messaging focused on business outcomes
    - Data-driven insights and ROI focus
    - Industry-specific terminology and understanding
    - Consultative tone that builds trust
    - Solutions-oriented rather than product-pushing

    SUPREME ONE TRAINING PROGRAM VALUE PROPOSITIONS:
    - Measurable F&I profit increases (typically 15-30%)
    - Enhanced customer satisfaction scores
    - Regulatory compliance and risk mitigation
    - Modern sales techniques for today's consumers
    - Proven methodology with trackable ROI
    - Ongoing support and continuous improvement
    - Team development and retention benefits
    - Competitive advantage in the marketplace

    PASSIONATE CONSULTING PRINCIPLES TO APPLY:
    - Always diagnose before prescribing solutions
    - Focus on the client's business outcomes, not our features
    - Build relationships based on trust and competence
    - Provide value in every interaction
    - Think long-term partnership, not short-term transaction
    - Be genuinely passionate about client success
    `
  }

  private async callOpenAI(systemPrompt: string, userPrompt: string, maxTokens: number = 1000): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
      return response.choices[0]?.message?.content || ''
    } catch (error) {
      console.error('OpenAI API error:', error)
      throw new Error('Failed to generate AI content')
    }
  }

  async generateLinkedInPost(topic: string, audience: string = 'automotive professionals'): Promise<string> {
    return this.callOpenAI(
      this.knowledge,
      `Create a LinkedIn post about ${topic} for ${audience}. The post should:
      - Be engaging and professional
      - Include relevant hashtags
      - Drive engagement (questions, comments)
      - Subtly promote our F&I training expertise
      - Be approximately 150-200 words`
    )
  }

  async generateProspectingMessage(prospect: any, context: string): Promise<string> {
    return this.callOpenAI(
      this.knowledge,
      `Create a personalized ${context} message for this prospect:
      Name: ${prospect.firstName} ${prospect.lastName}
      Company: ${prospect.company}
      Position: ${prospect.position}
      Industry: ${prospect.industry}

      The message should:
      - Be personalized and relevant
      - Focus on value proposition
      - Include a clear call-to-action
      - Be appropriate for the context (${context})
      - Be concise (under 200 words)`,
      800
    )
  }

  async generateEmailSubject(prospect: any, purpose: string): Promise<string> {
    return this.callOpenAI(
      'You are an expert at writing compelling email subject lines.',
      `Generate a compelling email subject line for ${purpose} to ${prospect.firstName} ${prospect.lastName} at ${prospect.company}. Make it personalized and attention-grabbing.`,
      200
    )
  }

  async analyzeProspectResponse(message: string): Promise<{
    sentiment: 'positive' | 'negative' | 'neutral'
    nextAction: string
    summary: string
  }> {
    const result = await this.callOpenAI(
      'You are an expert at analyzing prospect responses.',
      `Analyze this prospect response: "${message}"

      Return a JSON object with:
      - sentiment: "positive", "negative", or "neutral"
      - nextAction: recommended next step
      - summary: brief summary of the response

      Format as valid JSON only, no other text.`,
      500
    )

    try {
      return JSON.parse(result)
    } catch {
      return {
        sentiment: 'neutral',
        nextAction: 'Follow up with more information',
        summary: 'Response analysis failed'
      }
    }
  }

  async generateCallScript(prospect: any, objective: string): Promise<string> {
    return this.callOpenAI(
      this.knowledge,
      `Create a phone call script for calling ${prospect.firstName} ${prospect.lastName} at ${prospect.company}.

      Objective: ${objective}

      Include:
      - Opening introduction
      - Value proposition
      - Qualifying questions
      - Objection handling points
      - Clear call-to-action
      - Professional closing`,
      1000
    )
  }

  async generateVideoScript(topic: string, platform: string, duration: number = 60, supremeOneContent?: any[]): Promise<string> {
    let platformContent = ''
    if (supremeOneContent && supremeOneContent.length > 0) {
      platformContent = supremeOneContent.map(item =>
        `${item.title}: ${item.content.substring(0, 200)}...`
      ).join('\n\n')
    }

    const userPrompt = `${platformContent ? `SUPREME ONE PLATFORM CONTENT:\n${platformContent}\n\n` : ''}

    Create a video script for ${platform} about ${topic}. The video should be approximately ${duration} seconds long.

    Requirements:
    - Engaging hook in the first 3 seconds
    - Clear value proposition for dealerships
    - Professional yet conversational tone
    - Call-to-action for appointment booking
    - Reference specific Supreme One Training content naturally
    - Include industry-specific insights from the platform
    - Format as natural speech, not bullet points
    - Incorporate actual data/features from Supreme One platform when available

    Target audience: Automotive dealership executives and F&I professionals.`

    return this.callOpenAI(this.knowledge, userPrompt, 1000)
  }

  async generateProspectingEmail(prospect: any, campaign: string): Promise<{
    subject: string
    body: string
    followUpSuggestion: string
  }> {
    const result = await this.callOpenAI(
      this.knowledge,
      `Create a personalized prospecting email for this prospect:
      Name: ${prospect.firstName} ${prospect.lastName}
      Company: ${prospect.company}
      Position: ${prospect.position}
      Industry: ${prospect.industry}
      Campaign: ${campaign}

      Using Passionate Consulting principles, create:
      1. A compelling subject line that gets opened
      2. An email body (150-200 words) that:
         - Personalizes to their business situation
         - Focuses on value and outcomes
         - Includes a specific business insight
         - Has a clear, soft call-to-action
         - Mentions a relevant case study or result
      3. A follow-up suggestion for next touch

      Return as JSON with: subject, body, followUpSuggestion`,
      1200
    )

    try {
      return JSON.parse(result)
    } catch {
      return {
        subject: `Improving F&I Performance at ${prospect.company}`,
        body: `Hi ${prospect.firstName}, I noticed ${prospect.company} and wanted to share how we've helped similar dealerships increase F&I profits by 20-30% while improving customer satisfaction. Would you be open to a brief conversation about your current F&I results?`,
        followUpSuggestion: 'Follow up in 5 days with industry benchmark data'
      }
    }
  }

  async generateSocialMediaContent(platform: string, contentType: string, topic?: string): Promise<string> {
    return this.callOpenAI(
      this.knowledge,
      `Create ${contentType} content for ${platform} ${topic ? `about ${topic}` : 'that generates interest in F&I training'}.

      Platform-specific requirements:
      - LinkedIn: Professional, industry insights, 150-250 words
      - Instagram: Visual-friendly, engaging, 100-150 words
      - Facebook: Community-focused, relatable, 100-200 words
      - YouTube: Educational, comprehensive, 200-300 words

      Content should:
      - Provide genuine value to automotive professionals
      - Include relevant industry statistics or insights
      - Encourage engagement (questions, comments)
      - Subtly promote Supreme One Training expertise
      - Use appropriate hashtags for the platform
      - Include a soft call-to-action`,
      800
    )
  }

  async generateAppointmentRequest(prospect: any, context: string): Promise<string> {
    return this.callOpenAI(
      this.knowledge,
      `Create an appointment request message for ${prospect.firstName} ${prospect.lastName} at ${prospect.company}.

      Context: ${context}

      Using Passionate Consulting principles:
      - Focus on value they'll receive, not what we want to sell
      - Suggest a specific time commitment (15-20 minutes)
      - Offer flexibility in scheduling
      - Mention a specific insight or assessment we can provide
      - Make it feel consultative, not sales-y
      - Include 2-3 calendar time options

      Keep it under 100 words and very professional.`,
      600
    )
  }

  async analyzeDealershipNeeds(companyData: any): Promise<{
    challenges: string[]
    opportunities: string[]
    recommendedApproach: string
    valueProposition: string
  }> {
    const result = await this.callOpenAI(
      this.knowledge,
      `Analyze this dealership data and provide strategic insights:
      Company: ${companyData.name}
      Size: ${companyData.size || 'Unknown'}
      Location: ${companyData.location}
      Type: ${companyData.type || 'Automotive Dealership'}

      Provide analysis as JSON with:
      - challenges: Array of likely F&I challenges they face
      - opportunities: Array of improvement opportunities
      - recommendedApproach: Suggested engagement strategy
      - valueProposition: Tailored value prop for this specific dealer

      Base analysis on industry knowledge and Supreme One Training capabilities.
      Return valid JSON only.`,
      1000
    )

    try {
      return JSON.parse(result)
    } catch {
      return {
        challenges: ['F&I profit optimization', 'Customer satisfaction', 'Compliance requirements'],
        opportunities: ['Process improvement', 'Team training', 'Technology adoption'],
        recommendedApproach: 'Lead with ROI assessment and industry benchmarks',
        valueProposition: 'Measurable F&I profit increases with proven methodology'
      }
    }
  }

  async generateContentWithSupremeOneData(
    contentType: 'social_post' | 'email' | 'video_script' | 'prospect_message',
    topic: string,
    fiExpertise?: any,
    platformContent?: any[]
  ): Promise<string> {
    let supremeOneContext = ''

    if (fiExpertise) {
      supremeOneContext += `
SUPREME ONE F&I EXPERTISE:
- Key Practice Areas: ${fiExpertise.practice_tags?.slice(0, 8).join(', ') || 'N/A'}
- Compliance Focus: ${fiExpertise.compliance_tags?.slice(0, 5).join(', ') || 'N/A'}
- Common Objections: ${fiExpertise.objection_types?.slice(0, 5).join(', ') || 'N/A'}
- Training Scenarios: ${fiExpertise.roleplay_scenarios?.slice(0, 3).join(', ') || 'N/A'}
`
    }

    if (platformContent && platformContent.length > 0) {
      supremeOneContext += `
PLATFORM TRAINING CONTENT:
${platformContent.slice(0, 3).map(item =>
  `- ${item.title}: ${item.content.substring(0, 150)}...`
).join('\n')}
`
    }

    const contentRequirements: Record<string, string> = {
      social_post: `
- Professional LinkedIn tone
- Reference specific Supreme One F&I methodologies
- Include actual practice tags and techniques
- Mention compliance considerations
- Use industry-specific language
- Include relevant hashtags (#FinanceAndInsurance #DealershipTraining #SupremeOne)
- 200-300 words with engagement questions`,
      email: `
- Compelling subject line referencing F&I performance
- Personal opening with prospect's pain points
- Reference specific Supreme One training methods
- Include concrete examples from platform content
- Mention compliance and best practices
- Clear value proposition with ROI focus
- Strong call-to-action for free consultation/demo
- 250-350 words`,
      video_script: `
- 90-second engaging script
- Hook with industry statistics or pain points
- Showcase specific Supreme One methodologies
- Reference actual training scenarios
- Include compliance expertise
- Demonstrate ROI and results
- Clear next steps for engagement
- Natural conversational tone`,
      prospect_message: `
- Highly personalized approach
- Reference specific F&I challenges for their dealership type
- Mention relevant Supreme One training modules
- Include success stories from similar dealerships
- Address compliance concerns
- Offer specific value (audit, assessment, demo)
- Keep under 150 words, very direct`
    }

    return this.callOpenAI(
      this.knowledge,
      `${supremeOneContext}

Create ${contentType.replace('_', ' ')} content about ${topic} using the Supreme One platform expertise above.

Requirements for ${contentType}:
${contentRequirements[contentType]}

Use the actual Supreme One platform data to make content credible and specific. Reference real methodologies, not generic advice.`,
      1200
    )
  }

  async createSupremeOneProspectVideo(
    prospect: any,
    fiExpertise: any,
    platformScreenshots?: string[]
  ): Promise<string> {
    const relevantPractices = fiExpertise.practice_tags?.filter((tag: string) =>
      tag.includes('rapport') || tag.includes('value') || tag.includes('close') || tag.includes('objection')
    ).slice(0, 5) || []

    const relevantScenarios = fiExpertise.roleplay_scenarios?.filter((scenario: string) =>
      scenario.includes('prime') || scenario.includes('subprime') || scenario.includes('lease')
    ).slice(0, 3) || []

    return this.callOpenAI(
      this.knowledge,
      `Create a highly personalized 2-minute video script for ${prospect.firstName} ${prospect.lastName} at ${prospect.company}.

SUPREME ONE F&I EXPERTISE TO HIGHLIGHT:
- Key Training Areas: ${relevantPractices.join(', ')}
- Relevant Scenarios: ${relevantScenarios.join(', ')}
- Compliance Focus: ${fiExpertise.compliance_tags?.slice(0, 3).join(', ') || 'Full compliance training'}

${platformScreenshots ? `PLATFORM DEMONSTRATIONS AVAILABLE:
- Dashboard interface showing training progress
- Live roleplay training scenarios
- Real-time coaching feedback
- Performance analytics and reporting` : ''}

Video Script Requirements:
1. PERSONAL OPENING (15 seconds)
   - Address ${prospect.firstName} directly
   - Reference their company ${prospect.company}
   - Mention specific F&I challenges for their dealership type

2. SUPREME ONE VALUE PROPOSITION (45 seconds)
   - Highlight relevant training methodologies
   - Reference specific practice areas they need
   - Mention compliance expertise
   - Include success metrics from similar dealerships

3. PLATFORM DEMONSTRATION (45 seconds)
   - Showcase actual training interface
   - Mention specific scenarios they would practice
   - Reference real-time coaching capabilities
   - Show ROI tracking and analytics

4. CALL TO ACTION (15 seconds)
   - Offer free F&I assessment
   - Suggest specific next steps
   - Provide easy scheduling option

Format as natural speech with stage directions for visual elements and platform screenshots.`,
      1200
    )
  }

  async analyzeSupremeOneROI(dealershipData: any, fiExpertise: any): Promise<{
    currentState: string
    improvements: string[]
    projectedROI: string
    trainingRecommendations: string[]
  }> {
    const result = await this.callOpenAI(
      'You are an expert at analyzing dealership ROI for F&I training.',
      `Analyze this dealership for Supreme One F&I training ROI:

DEALERSHIP INFO:
- Name: ${dealershipData.name || 'Dealership'}
- Type: ${dealershipData.type || 'Unknown'}
- Size: ${dealershipData.size || 'Unknown'}
- Location: ${dealershipData.location || 'Unknown'}

SUPREME ONE TRAINING CAPABILITIES:
- Practice Areas: ${fiExpertise.practice_tags?.slice(0, 10).join(', ') || 'Comprehensive F&I training'}
- Compliance Training: ${fiExpertise.compliance_tags?.slice(0, 5).join(', ') || 'Full compliance coverage'}
- Objection Handling: ${fiExpertise.objection_types?.slice(0, 5).join(', ') || 'Complete objection training'}

Provide analysis as JSON with:
- currentState: Assessment of likely current F&I performance
- improvements: Array of specific improvements Supreme One would provide
- projectedROI: Estimated ROI percentage and timeline
- trainingRecommendations: Array of specific Supreme One modules to focus on

Base analysis on Supreme One's actual training capabilities. Return valid JSON only.`,
      1000
    )

    try {
      return JSON.parse(result)
    } catch {
      return {
        currentState: 'Likely below industry average F&I performance',
        improvements: ['Improved objection handling', 'Better compliance', 'Higher closing rates'],
        projectedROI: '15-30% increase in F&I profits within 90 days',
        trainingRecommendations: ['Value building techniques', 'Compliance training', 'Objection handling']
      }
    }
  }
}
