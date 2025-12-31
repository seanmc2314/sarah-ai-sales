import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/deals - List all deals with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user with role and territory info
    const user = await prisma.user.findUnique({
      where: { email: session.user?.email || '' },
      select: { id: true, role: true, territoryId: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const dealershipId = searchParams.get('dealershipId')
    const stage = searchParams.get('stage')
    const ownerId = searchParams.get('ownerId')
    const view = searchParams.get('view') // 'pipeline' or 'list'
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = {}

    // Role-based filtering: Users only see their deals or deals in their territory
    if (user.role === 'USER') {
      where.OR = [
        { ownerId: user.id },
        { dealership: { assignedUserId: user.id } },
        ...(user.territoryId ? [{ dealership: { territoryId: user.territoryId } }] : [])
      ]
    }

    if (dealershipId) {
      where.dealershipId = dealershipId
    }

    if (stage) {
      where.stage = stage
    }

    if (ownerId) {
      where.ownerId = ownerId
    }

    // For pipeline view, get all open deals grouped by stage
    if (view === 'pipeline') {
      const deals = await prisma.deal.findMany({
        where: {
          ...where,
          stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] }
        },
        include: {
          dealership: {
            select: {
              id: true,
              name: true,
              isLive: true
            }
          },
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          owner: {
            select: { id: true, name: true, email: true }
          },
          _count: {
            select: {
              activities: true,
              tasks: true
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      })

      // Group by stage
      const pipeline = {
        LEAD: deals.filter(d => d.stage === 'LEAD'),
        QUALIFIED: deals.filter(d => d.stage === 'QUALIFIED'),
        MEETING_SCHEDULED: deals.filter(d => d.stage === 'MEETING_SCHEDULED'),
        PROPOSAL_SENT: deals.filter(d => d.stage === 'PROPOSAL_SENT'),
        NEGOTIATION: deals.filter(d => d.stage === 'NEGOTIATION'),
      }

      // Calculate stage totals
      const stageTotals = {
        LEAD: { count: pipeline.LEAD.length, value: pipeline.LEAD.reduce((sum, d) => sum + d.value, 0) },
        QUALIFIED: { count: pipeline.QUALIFIED.length, value: pipeline.QUALIFIED.reduce((sum, d) => sum + d.value, 0) },
        MEETING_SCHEDULED: { count: pipeline.MEETING_SCHEDULED.length, value: pipeline.MEETING_SCHEDULED.reduce((sum, d) => sum + d.value, 0) },
        PROPOSAL_SENT: { count: pipeline.PROPOSAL_SENT.length, value: pipeline.PROPOSAL_SENT.reduce((sum, d) => sum + d.value, 0) },
        NEGOTIATION: { count: pipeline.NEGOTIATION.length, value: pipeline.NEGOTIATION.reduce((sum, d) => sum + d.value, 0) },
      }

      const totalPipelineValue = Object.values(stageTotals).reduce((sum, s) => sum + s.value, 0)
      const totalDeals = Object.values(stageTotals).reduce((sum, s) => sum + s.count, 0)

      return NextResponse.json({
        pipeline,
        stageTotals,
        summary: {
          totalDeals,
          totalPipelineValue,
          weightedValue: deals.reduce((sum, d) => sum + (d.value * d.probability / 100), 0)
        }
      })
    }

    // Regular list view
    const [deals, total] = await Promise.all([
      prisma.deal.findMany({
        where,
        include: {
          dealership: {
            select: {
              id: true,
              name: true,
              isLive: true
            }
          },
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          owner: {
            select: { id: true, name: true, email: true }
          },
          _count: {
            select: {
              activities: true,
              tasks: true
            }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.deal.count({ where })
    ])

    return NextResponse.json({
      deals,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching deals:', error)
    return NextResponse.json({ error: 'Failed to fetch deals' }, { status: 500 })
  }
}

// POST /api/deals - Create a new deal
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()

    if (!data.dealershipId) {
      return NextResponse.json({ error: 'Dealership is required' }, { status: 400 })
    }

    // Set probability based on stage
    const stageProbabilities: Record<string, number> = {
      LEAD: 10,
      QUALIFIED: 25,
      MEETING_SCHEDULED: 40,
      PROPOSAL_SENT: 60,
      NEGOTIATION: 80,
      CLOSED_WON: 100,
      CLOSED_LOST: 0
    }

    const deal = await prisma.deal.create({
      data: {
        title: data.title,
        value: data.value || 0,
        monthlyRecurring: data.monthlyRecurring,
        stage: data.stage || 'LEAD',
        probability: data.probability || stageProbabilities[data.stage || 'LEAD'],
        expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : null,
        dealType: data.dealType,
        source: data.source,
        notes: data.notes,
        tags: data.tags || [],
        dealershipId: data.dealershipId,
        contactId: data.contactId,
        ownerId: session.user.id,
      },
      include: {
        dealership: {
          select: {
            id: true,
            name: true
          }
        },
        contact: true,
        owner: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'STATUS_CHANGE',
        subject: 'Deal Created',
        description: `New deal "${deal.title}" was created with value $${deal.value.toLocaleString()}`,
        dealershipId: data.dealershipId,
        dealId: deal.id,
        contactId: data.contactId,
        userId: session.user.id,
        completedAt: new Date()
      }
    })

    return NextResponse.json({ deal }, { status: 201 })
  } catch (error) {
    console.error('Error creating deal:', error)
    return NextResponse.json({ error: 'Failed to create deal' }, { status: 500 })
  }
}
