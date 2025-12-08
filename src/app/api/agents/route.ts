import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/agents - Get all agents
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

    const agents = await prisma.agent.findMany({
      where: { userId: user.id },
      include: {
        _count: {
          select: {
            prospects: true,
            campaigns: true,
            emailTemplates: true,
            followUpSequences: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(agents);
  } catch (error) {
    console.error('Error fetching agents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    );
  }
}

// POST /api/agents - Create a new agent
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
    const { name, slug, description, persona, targetAudience, products, color, icon, settings } = body;

    // Check if slug already exists
    const existingAgent = await prisma.agent.findUnique({
      where: { slug },
    });

    if (existingAgent) {
      return NextResponse.json(
        { error: 'Agent with this slug already exists' },
        { status: 400 }
      );
    }

    const agent = await prisma.agent.create({
      data: {
        name,
        slug,
        description,
        persona,
        targetAudience,
        products,
        color,
        icon,
        settings,
        userId: user.id,
      },
    });

    return NextResponse.json(agent, { status: 201 });
  } catch (error) {
    console.error('Error creating agent:', error);
    return NextResponse.json(
      { error: 'Failed to create agent' },
      { status: 500 }
    );
  }
}
