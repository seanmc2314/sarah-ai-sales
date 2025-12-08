import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';

const prisma = new PrismaClient();
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// POST /api/linkedin/generate-message - Generate LinkedIn connection request or message
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const { prospectId, agentId, messageType, customContext } = body;

    if (!prospectId || !agentId) {
      return NextResponse.json(
        { error: 'prospectId and agentId are required' },
        { status: 400 }
      );
    }

    // Get prospect
    const prospect = await prisma.prospect.findFirst({
      where: {
        id: prospectId,
        userId: user.id,
      },
    });

    if (!prospect) {
      return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
    }

    // Get agent
    const agent = await prisma.agent.findFirst({
      where: {
        id: agentId,
        userId: user.id,
      },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Generate message using Claude
    const message = await generateLinkedInMessage({
      prospect,
      agent,
      messageType: messageType || 'connection_request',
      customContext,
    });

    // Log this as an interaction
    await prisma.interaction.create({
      data: {
        type: messageType === 'connection_request' ? 'LINKEDIN_CONNECTION' : 'LINKEDIN_MESSAGE',
        content: message,
        prospectId: prospect.id,
      },
    });

    return NextResponse.json({
      success: true,
      message,
      prospect: {
        firstName: prospect.firstName,
        lastName: prospect.lastName,
        company: prospect.company,
        position: prospect.position,
      },
    });
  } catch (error) {
    console.error('Error generating LinkedIn message:', error);
    return NextResponse.json(
      { error: 'Failed to generate message' },
      { status: 500 }
    );
  }
}

interface GenerateMessageParams {
  prospect: any;
  agent: any;
  messageType: 'connection_request' | 'message' | 'follow_up';
  customContext?: string;
}

async function generateLinkedInMessage({
  prospect,
  agent,
  messageType,
  customContext,
}: GenerateMessageParams): Promise<string> {
  const charLimit = messageType === 'connection_request' ? 300 : 1000;

  const prompt = `You are ${agent.name}, an AI sales agent for Supreme One.

Your persona: ${agent.persona}

Target audience: ${agent.targetAudience}

Products/Services you offer:
${JSON.stringify(agent.products, null, 2)}

Generate a ${messageType === 'connection_request' ? 'LinkedIn connection request note' : 'LinkedIn message'} for this prospect:

Name: ${prospect.firstName} ${prospect.lastName}
Company: ${prospect.company || 'Unknown'}
Position: ${prospect.position || 'Unknown'}
Location: ${prospect.location || 'Unknown'}
LinkedIn: ${prospect.linkedinUrl || 'Unknown'}

${customContext ? `Additional context: ${customContext}` : ''}

Requirements:
1. Maximum ${charLimit} characters
2. Professional and personalized (reference their company/position)
3. ${messageType === 'connection_request' ? 'Very brief and to the point' : 'Clear value proposition'}
4. Focus on how you can help them, not on selling
5. Natural, conversational tone (not overly salesy)
6. Include a soft call-to-action
${messageType === 'connection_request' ? '7. NO emojis for connection requests' : '7. Use emojis sparingly if appropriate'}
8. Do NOT include your name or signature (LinkedIn adds that automatically)

Generate the ${messageType} now:`;

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    temperature: 0.7,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const messageContent = response.content[0];
  if (messageContent.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  return messageContent.text.trim();
}
