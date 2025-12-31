import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/dealerships/[id] - Get a single dealership with all details
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

    const dealership = await prisma.dealership.findUnique({
      where: { id },
      include: {
        contacts: {
          orderBy: [
            { isPrimary: 'desc' },
            { createdAt: 'desc' }
          ]
        },
        deals: {
          include: {
            contact: true,
            owner: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        documents: {
          include: {
            uploadedBy: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        activities: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            },
            contact: true
          },
          orderBy: { createdAt: 'desc' },
          take: 50
        },
        tasks: {
          include: {
            assignedTo: {
              select: { id: true, name: true, email: true }
            },
            contact: true
          },
          where: {
            status: { in: ['PENDING', 'IN_PROGRESS'] }
          },
          orderBy: { dueDate: 'asc' }
        },
        assignedUser: {
          select: { id: true, name: true, email: true }
        },
        _count: {
          select: {
            contacts: true,
            deals: true,
            documents: true,
            activities: true,
            tasks: true
          }
        }
      }
    })

    if (!dealership) {
      return NextResponse.json({ error: 'Dealership not found' }, { status: 404 })
    }

    // Calculate deal metrics
    const dealMetrics = {
      totalDeals: dealership.deals.length,
      openDeals: dealership.deals.filter(d => !['CLOSED_WON', 'CLOSED_LOST'].includes(d.stage)).length,
      wonDeals: dealership.deals.filter(d => d.stage === 'CLOSED_WON').length,
      lostDeals: dealership.deals.filter(d => d.stage === 'CLOSED_LOST').length,
      totalValue: dealership.deals.reduce((sum, d) => sum + (d.value || 0), 0),
      wonValue: dealership.deals.filter(d => d.stage === 'CLOSED_WON').reduce((sum, d) => sum + (d.value || 0), 0),
      pipelineValue: dealership.deals.filter(d => !['CLOSED_WON', 'CLOSED_LOST'].includes(d.stage)).reduce((sum, d) => sum + (d.value || 0), 0),
    }

    return NextResponse.json({ dealership, dealMetrics })
  } catch (error) {
    console.error('Error fetching dealership:', error)
    return NextResponse.json({ error: 'Failed to fetch dealership' }, { status: 500 })
  }
}

// PUT /api/dealerships/[id] - Update a dealership
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

    // Get current dealership for comparison
    const currentDealership = await prisma.dealership.findUnique({
      where: { id }
    })

    if (!currentDealership) {
      return NextResponse.json({ error: 'Dealership not found' }, { status: 404 })
    }

    // Check if status is changing to ACTIVE_CUSTOMER
    const becomingLive = data.status === 'ACTIVE_CUSTOMER' && currentDealership.status !== 'ACTIVE_CUSTOMER'

    const dealership = await prisma.dealership.update({
      where: { id },
      data: {
        name: data.name,
        legalName: data.legalName,
        status: data.status,
        website: data.website,
        phone: data.phone,
        email: data.email,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        country: data.country,
        dealerGroup: data.dealerGroup,
        brands: data.brands,
        employeeCount: data.employeeCount,
        annualRevenue: data.annualRevenue,
        fiManagerCount: data.fiManagerCount,
        customerSince: data.customerSince ? new Date(data.customerSince) : undefined,
        contractEndDate: data.contractEndDate ? new Date(data.contractEndDate) : undefined,
        monthlyValue: data.monthlyValue,
        contractType: data.contractType,
        isLive: becomingLive ? true : data.isLive,
        liveActivatedAt: becomingLive ? new Date() : data.liveActivatedAt,
        notes: data.notes,
        tags: data.tags,
        assignedUserId: data.assignedUserId,
      },
      include: {
        contacts: true,
        _count: {
          select: {
            contacts: true,
            deals: true,
            documents: true
          }
        }
      }
    })

    // Log status change activity
    if (data.status && data.status !== currentDealership.status) {
      await prisma.activity.create({
        data: {
          type: 'STATUS_CHANGE',
          subject: 'Status Changed',
          description: `Dealership status changed from ${currentDealership.status} to ${data.status}`,
          dealershipId: dealership.id,
          userId: session.user.id,
          completedAt: new Date()
        }
      })
    }

    return NextResponse.json({ dealership })
  } catch (error) {
    console.error('Error updating dealership:', error)
    return NextResponse.json({ error: 'Failed to update dealership' }, { status: 500 })
  }
}

// DELETE /api/dealerships/[id] - Delete a dealership
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

    // Check if dealership exists
    const dealership = await prisma.dealership.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            deals: true,
            documents: true
          }
        }
      }
    })

    if (!dealership) {
      return NextResponse.json({ error: 'Dealership not found' }, { status: 404 })
    }

    // Prevent deletion if has active deals
    if (dealership._count.deals > 0) {
      return NextResponse.json({
        error: 'Cannot delete dealership with existing deals. Close or delete deals first.'
      }, { status: 400 })
    }

    // Delete related records first
    await prisma.$transaction([
      prisma.activity.deleteMany({ where: { dealershipId: id } }),
      prisma.task.deleteMany({ where: { dealershipId: id } }),
      prisma.contact.deleteMany({ where: { dealershipId: id } }),
      prisma.dealership.delete({ where: { id } })
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting dealership:', error)
    return NextResponse.json({ error: 'Failed to delete dealership' }, { status: 500 })
  }
}
