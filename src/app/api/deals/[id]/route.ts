import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/deals/[id] - Get a single deal with details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const deal = await prisma.deal.findUnique({
      where: { id },
      include: {
        dealership: {
          select: {
            id: true,
            name: true,
            status: true,
            isLive: true,
            website: true,
            phone: true,
            email: true
          }
        },
        contact: true,
        owner: {
          select: { id: true, name: true, email: true }
        },
        activities: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 50
        },
        tasks: {
          include: {
            assignedTo: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { dueDate: 'asc' }
        },
        _count: {
          select: {
            activities: true,
            tasks: true
          }
        }
      }
    })

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    return NextResponse.json({ deal })
  } catch (error) {
    console.error('Error fetching deal:', error)
    return NextResponse.json({ error: 'Failed to fetch deal' }, { status: 500 })
  }
}

// PUT /api/deals/[id] - Update a deal
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const data = await request.json()

    const currentDeal = await prisma.deal.findUnique({
      where: { id }
    })

    if (!currentDeal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    // Check if deal is being closed
    const isClosing = ['CLOSED_WON', 'CLOSED_LOST'].includes(data.stage) &&
                      !['CLOSED_WON', 'CLOSED_LOST'].includes(currentDeal.stage)

    // If closing as won and dealership not yet a customer, update dealership status
    if (data.stage === 'CLOSED_WON' && currentDeal.stage !== 'CLOSED_WON') {
      const dealership = await prisma.dealership.findUnique({
        where: { id: currentDeal.dealershipId }
      })

      if (dealership && dealership.status !== 'ACTIVE_CUSTOMER') {
        await prisma.dealership.update({
          where: { id: currentDeal.dealershipId },
          data: {
            status: 'ACTIVE_CUSTOMER',
            isLive: true,
            liveActivatedAt: new Date(),
            customerSince: new Date()
          }
        })
      }
    }

    const deal = await prisma.deal.update({
      where: { id },
      data: {
        title: data.title,
        value: data.value,
        monthlyRecurring: data.monthlyRecurring,
        stage: data.stage,
        probability: data.probability,
        expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : null,
        actualCloseDate: isClosing ? new Date() : data.actualCloseDate,
        closedAt: isClosing ? new Date() : data.closedAt,
        dealType: data.dealType,
        source: data.source,
        lostReason: data.lostReason,
        notes: data.notes,
        tags: data.tags,
        contactId: data.contactId,
        ownerId: data.ownerId,
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

    // Log stage change activity
    if (data.stage && data.stage !== currentDeal.stage) {
      await prisma.activity.create({
        data: {
          type: 'STATUS_CHANGE',
          subject: 'Deal Stage Changed',
          description: `Deal moved from ${currentDeal.stage} to ${data.stage}`,
          dealershipId: deal.dealershipId,
          dealId: deal.id,
          contactId: deal.contactId,
          userId: session.user.id,
          completedAt: new Date()
        }
      })
    }

    return NextResponse.json({ deal })
  } catch (error) {
    console.error('Error updating deal:', error)
    return NextResponse.json({ error: 'Failed to update deal' }, { status: 500 })
  }
}

// PATCH /api/deals/[id] - Update deal stage (quick stage update)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const data = await request.json()

    if (!data.stage) {
      return NextResponse.json({ error: 'Stage is required' }, { status: 400 })
    }

    const currentDeal = await prisma.deal.findUnique({
      where: { id }
    })

    if (!currentDeal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
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

    const isClosing = ['CLOSED_WON', 'CLOSED_LOST'].includes(data.stage) &&
                      !['CLOSED_WON', 'CLOSED_LOST'].includes(currentDeal.stage)

    const deal = await prisma.deal.update({
      where: { id },
      data: {
        stage: data.stage,
        probability: stageProbabilities[data.stage],
        actualCloseDate: isClosing ? new Date() : undefined,
        closedAt: isClosing ? new Date() : undefined,
        lostReason: data.stage === 'CLOSED_LOST' ? data.lostReason : undefined,
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
        subject: 'Deal Stage Changed',
        description: `Deal moved from ${currentDeal.stage} to ${data.stage}`,
        dealershipId: deal.dealershipId,
        dealId: deal.id,
        contactId: deal.contactId,
        userId: session.user.id,
        completedAt: new Date()
      }
    })

    return NextResponse.json({ deal })
  } catch (error) {
    console.error('Error updating deal stage:', error)
    return NextResponse.json({ error: 'Failed to update deal stage' }, { status: 500 })
  }
}

// DELETE /api/deals/[id] - Delete a deal
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const deal = await prisma.deal.findUnique({
      where: { id }
    })

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    // Delete related records first
    await prisma.$transaction([
      prisma.activity.deleteMany({ where: { dealId: id } }),
      prisma.task.deleteMany({ where: { dealId: id } }),
      prisma.deal.delete({ where: { id } })
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting deal:', error)
    return NextResponse.json({ error: 'Failed to delete deal' }, { status: 500 })
  }
}
