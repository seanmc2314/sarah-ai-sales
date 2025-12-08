import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST /api/prospects/score - Calculate lead score for prospects
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
    const { prospectId, prospectIds } = body;

    const idsToScore = prospectId ? [prospectId] : prospectIds;

    if (!idsToScore || idsToScore.length === 0) {
      return NextResponse.json(
        { error: 'prospectId or prospectIds required' },
        { status: 400 }
      );
    }

    const prospects = await prisma.prospect.findMany({
      where: {
        id: { in: idsToScore },
        userId: user.id,
      },
      include: {
        interactions: true,
        appointments: true,
      },
    });

    const scoredProspects = [];

    for (const prospect of prospects) {
      const score = calculateLeadScore(prospect);

      await prisma.prospect.update({
        where: { id: prospect.id },
        data: { leadScore: score },
      });

      scoredProspects.push({
        prospectId: prospect.id,
        firstName: prospect.firstName,
        lastName: prospect.lastName,
        company: prospect.company,
        previousScore: prospect.leadScore,
        newScore: score,
        scoreBreakdown: getScoreBreakdown(prospect),
      });
    }

    return NextResponse.json({
      success: true,
      prospects: scoredProspects,
    });
  } catch (error) {
    console.error('Error scoring prospects:', error);
    return NextResponse.json(
      { error: 'Failed to score prospects' },
      { status: 500 }
    );
  }
}

function calculateLeadScore(prospect: any): number {
  let score = 0;

  // 1. Profile Completeness (max 20 points)
  if (prospect.email) score += 5;
  if (prospect.phone) score += 5;
  if (prospect.linkedinUrl) score += 5;
  if (prospect.position) score += 3;
  if (prospect.company) score += 2;

  // 2. Job Title/Position Quality (max 25 points)
  const position = (prospect.position || '').toLowerCase();
  if (position.includes('owner') || position.includes('president') || position.includes('ceo')) {
    score += 25; // Decision maker
  } else if (position.includes('gm') || position.includes('general manager') || position.includes('director')) {
    score += 20; // High-level decision maker
  } else if (position.includes('f&i') || position.includes('finance') || position.includes('manager')) {
    score += 15; // Direct target
  } else if (position.includes('sales')) {
    score += 10; // Secondary target
  }

  // 3. Company Size/Type (max 15 points)
  if (prospect.employeeCount) {
    if (prospect.employeeCount > 100) score += 15;
    else if (prospect.employeeCount > 50) score += 12;
    else if (prospect.employeeCount > 20) score += 10;
    else if (prospect.employeeCount > 10) score += 7;
    else score += 5;
  }

  // 4. Industry Fit (max 10 points)
  const industry = (prospect.industry || '').toLowerCase();
  if (industry.includes('automotive') || industry.includes('auto') || industry.includes('dealer')) {
    score += 10;
  } else if (industry.includes('retail') || industry.includes('sales')) {
    score += 5;
  }

  // 5. Engagement Level (max 20 points)
  const emailInteractions = prospect.interactions?.filter((i: any) => i.type === 'EMAIL') || [];
  const linkedinInteractions = prospect.interactions?.filter(
    (i: any) => i.type === 'LINKEDIN_MESSAGE' || i.type === 'LINKEDIN_CONNECTION'
  ) || [];

  if (emailInteractions.length > 0) score += 5;
  if (emailInteractions.length > 2) score += 5;
  if (linkedinInteractions.length > 0) score += 5;
  if (prospect.appointments && prospect.appointments.length > 0) score += 5;

  // 6. LinkedIn Profile (max 10 points)
  if (prospect.enriched) score += 5;
  if (prospect.linkedinData) {
    const linkedinData = prospect.linkedinData as any;
    if (linkedinData.connections > 500) score += 5;
    else if (linkedinData.connections > 200) score += 3;
  }

  // Cap at 100
  return Math.min(score, 100);
}

function getScoreBreakdown(prospect: any) {
  const breakdown: any = {};

  // Profile completeness
  breakdown.profileCompleteness = {
    score: 0,
    max: 20,
    details: {},
  };
  if (prospect.email) {
    breakdown.profileCompleteness.score += 5;
    breakdown.profileCompleteness.details.email = true;
  }
  if (prospect.phone) {
    breakdown.profileCompleteness.score += 5;
    breakdown.profileCompleteness.details.phone = true;
  }
  if (prospect.linkedinUrl) {
    breakdown.profileCompleteness.score += 5;
    breakdown.profileCompleteness.details.linkedin = true;
  }
  if (prospect.position) {
    breakdown.profileCompleteness.score += 3;
    breakdown.profileCompleteness.details.position = true;
  }
  if (prospect.company) {
    breakdown.profileCompleteness.score += 2;
    breakdown.profileCompleteness.details.company = true;
  }

  // Job title quality
  const position = (prospect.position || '').toLowerCase();
  breakdown.jobTitle = {
    score: 0,
    max: 25,
    title: prospect.position,
  };
  if (position.includes('owner') || position.includes('president') || position.includes('ceo')) {
    breakdown.jobTitle.score = 25;
    breakdown.jobTitle.level = 'Decision Maker';
  } else if (position.includes('gm') || position.includes('general manager') || position.includes('director')) {
    breakdown.jobTitle.score = 20;
    breakdown.jobTitle.level = 'High-Level';
  } else if (position.includes('f&i') || position.includes('finance') || position.includes('manager')) {
    breakdown.jobTitle.score = 15;
    breakdown.jobTitle.level = 'Direct Target';
  }

  // Engagement
  breakdown.engagement = {
    score: 0,
    max: 20,
    interactions: prospect.interactions?.length || 0,
    appointments: prospect.appointments?.length || 0,
  };

  return breakdown;
}
