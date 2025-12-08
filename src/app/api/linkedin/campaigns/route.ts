import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/linkedin/campaigns - Get LinkedIn campaigns
export async function GET(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');

    const campaigns = await prisma.campaign.findMany({
      where: {
        userId: user.id,
        type: 'LINKEDIN_OUTREACH',
        ...(agentId && { agentId }),
      },
      include: {
        agent: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(campaigns);
  } catch (error) {
    console.error('Error fetching LinkedIn campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}

// POST /api/linkedin/campaigns - Create LinkedIn outreach campaign
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
    const { name, description, agentId, targetAudience, prospectIds } = body;

    if (!name || !agentId) {
      return NextResponse.json(
        { error: 'name and agentId are required' },
        { status: 400 }
      );
    }

    // Verify agent exists and belongs to user
    const agent = await prisma.agent.findFirst({
      where: {
        id: agentId,
        userId: user.id,
      },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Create campaign
    const campaign = await prisma.campaign.create({
      data: {
        name,
        description,
        type: 'LINKEDIN_OUTREACH',
        status: 'DRAFT',
        targetAudience,
        userId: user.id,
        agentId,
        stats: {
          totalProspects: prospectIds?.length || 0,
          sent: 0,
          accepted: 0,
          replied: 0,
          appointments: 0,
        },
      },
      include: {
        agent: true,
      },
    });

    // If prospect IDs provided, link them to this campaign's agent
    if (prospectIds && prospectIds.length > 0) {
      await prisma.prospect.updateMany({
        where: {
          id: { in: prospectIds },
          userId: user.id,
        },
        data: {
          agentId,
        },
      });
    }

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    console.error('Error creating LinkedIn campaign:', error);
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    );
  }
}
