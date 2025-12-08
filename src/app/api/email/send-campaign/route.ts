import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// POST /api/email/send-campaign - Send email campaign to prospects
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
    const { agentId, prospectIds, templateId, customSubject, customBody } = body;

    if (!agentId || (!prospectIds || prospectIds.length === 0)) {
      return NextResponse.json(
        { error: 'agentId and prospectIds are required' },
        { status: 400 }
      );
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

    // Get template if provided
    let template = null;
    if (templateId) {
      template = await prisma.emailTemplate.findFirst({
        where: {
          id: templateId,
          userId: user.id,
        },
      });
    }

    // Get prospects
    const prospects = await prisma.prospect.findMany({
      where: {
        id: { in: prospectIds },
        userId: user.id,
      },
    });

    if (prospects.length === 0) {
      return NextResponse.json({ error: 'No prospects found' }, { status: 404 });
    }

    // Create email transporter
    const transporter = nodemailer.createTransport({
      host: user.emailHost || process.env.EMAIL_HOST || 'smtp.office365.com',
      port: user.emailPort || parseInt(process.env.EMAIL_PORT || '587'),
      secure: false,
      auth: {
        user: user.emailUser || process.env.EMAIL_USER || '',
        pass: user.emailPassword || process.env.EMAIL_PASSWORD || '',
      },
    });

    const results = [];

    // Send emails to each prospect
    for (const prospect of prospects) {
      try {
        // Generate personalized email
        const { subject, body } = await generatePersonalizedEmail({
          prospect,
          agent,
          template,
          customSubject,
          customBody,
        });

        // Send email
        await transporter.sendMail({
          from: `${agent.name} <${user.emailUser || process.env.EMAIL_USER}>`,
          to: prospect.email || '',
          subject,
          html: body,
        });

        // Log interaction
        await prisma.interaction.create({
          data: {
            type: 'EMAIL',
            content: `Subject: ${subject}\n\n${body}`,
            prospectId: prospect.id,
            completedAt: new Date(),
            successful: true,
          },
        });

        // Update prospect
        await prisma.prospect.update({
          where: { id: prospect.id },
          data: {
            status: 'CONTACTED',
            lastContactDate: new Date(),
          },
        });

        results.push({
          prospectId: prospect.id,
          success: true,
          email: prospect.email,
        });
      } catch (error) {
        console.error(`Error sending email to ${prospect.email}:`, error);
        results.push({
          prospectId: prospect.id,
          success: false,
          email: prospect.email,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalSent: results.filter((r) => r.success).length,
      totalFailed: results.filter((r) => !r.success).length,
      results,
    });
  } catch (error) {
    console.error('Error sending campaign:', error);
    return NextResponse.json(
      { error: 'Failed to send campaign' },
      { status: 500 }
    );
  }
}

interface GenerateEmailParams {
  prospect: any;
  agent: any;
  template: any;
  customSubject?: string;
  customBody?: string;
}

async function generatePersonalizedEmail({
  prospect,
  agent,
  template,
  customSubject,
  customBody,
}: GenerateEmailParams) {
  // If custom subject/body provided, use those with variable replacement
  if (customSubject && customBody) {
    return {
      subject: replaceVariables(customSubject, prospect),
      body: replaceVariables(customBody, prospect),
    };
  }

  // If template provided, use it with AI personalization
  if (template) {
    const subject = replaceVariables(template.subject, prospect);
    const body = await personalizeEmailWithAI({
      templateBody: template.body,
      prospect,
      agent,
    });
    return { subject, body };
  }

  // Generate from scratch with AI
  return await generateEmailFromScratch({ prospect, agent });
}

function replaceVariables(text: string, prospect: any): string {
  return text
    .replace(/\{\{firstName\}\}/g, prospect.firstName)
    .replace(/\{\{lastName\}\}/g, prospect.lastName)
    .replace(/\{\{company\}\}/g, prospect.company || 'your company')
    .replace(/\{\{position\}\}/g, prospect.position || 'your position')
    .replace(/\{\{location\}\}/g, prospect.location || '')
    .replace(/\{\{dealership\}\}/g, prospect.dealership || prospect.company || 'your dealership');
}

async function personalizeEmailWithAI({
  templateBody,
  prospect,
  agent,
}: {
  templateBody: string;
  prospect: any;
  agent: any;
}) {
  // Replace variables first
  let body = replaceVariables(templateBody, prospect);

  // Then add AI personalization for specific sections if needed
  const prompt = `You are ${agent.name}. Personalize this email for the prospect while keeping the core message:

Prospect: ${prospect.firstName} ${prospect.lastName}
Company: ${prospect.company || 'Unknown'}
Position: ${prospect.position || 'Unknown'}

Email template:
${body}

Make small, natural personalizations based on their company and position. Keep the same structure and length. Return only the personalized email body as HTML.`;

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2048,
    temperature: 0.7,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    return body; // Fallback to template
  }

  return content.text.trim();
}

async function generateEmailFromScratch({
  prospect,
  agent,
}: {
  prospect: any;
  agent: any;
}) {
  const prompt = `You are ${agent.name}, an AI sales agent.

Your persona: ${agent.persona}

Products/Services: ${JSON.stringify(agent.products, null, 2)}

Write a personalized cold outreach email for this prospect:

Name: ${prospect.firstName} ${prospect.lastName}
Company: ${prospect.company || 'Unknown'}
Position: ${prospect.position || 'Unknown'}
Location: ${prospect.location || 'Unknown'}

Requirements:
1. Professional subject line (under 60 characters)
2. Brief, value-focused email (200-300 words)
3. Personalized to their role and company
4. Clear value proposition
5. Soft call-to-action (request a brief call)
6. Format as HTML with proper paragraphs
7. End with "Best regards, Sean McNally"

Return in this exact JSON format:
{
  "subject": "...",
  "body": "HTML email body here"
}`;

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2048,
    temperature: 0.7,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type');
  }

  try {
    const parsed = JSON.parse(content.text);
    return {
      subject: parsed.subject,
      body: parsed.body,
    };
  } catch {
    // Fallback if JSON parsing fails
    return {
      subject: `Quick question for ${prospect.firstName}`,
      body: content.text,
    };
  }
}
