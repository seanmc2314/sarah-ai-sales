import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/dealerships/closed - Get closed deals (won customers)
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
    const stateFilter = searchParams.get('state')

    // Build where clause
    const where: any = {
      status: 'ACTIVE_CUSTOMER'
    }

    // Role-based filtering: Users only see their territory, Admins see all
    if (user.role === 'USER') {
      where.OR = [
        { assignedUserId: user.id },
        ...(user.territoryId ? [{ territoryId: user.territoryId }] : [])
      ]
    }

    // State filter
    if (stateFilter && stateFilter !== 'ALL') {
      where.state = stateFilter
    }

    // Fetch closed dealerships
    const dealerships = await prisma.dealership.findMany({
      where,
      include: {
        contacts: {
          orderBy: { isPrimary: 'desc' },
          take: 1
        },
        assignedUser: {
          select: { id: true, name: true, email: true }
        },
        _count: {
          select: {
            contacts: true,
            deals: true,
            activities: true,
            documents: true
          }
        }
      },
      orderBy: { liveActivatedAt: 'desc' }
    })

    // Get unique states for filter dropdown
    const allStates = await prisma.dealership.findMany({
      where: {
        status: 'ACTIVE_CUSTOMER',
        state: { not: null }
      },
      select: { state: true },
      distinct: ['state']
    })

    const states = allStates
      .map(d => d.state)
      .filter(Boolean)
      .sort() as string[]

    // Calculate totals
    const totalValue = dealerships.reduce((sum, d) => sum + (d.monthlyValue || 0), 0)

    return NextResponse.json({
      dealerships,
      states,
      summary: {
        totalCount: dealerships.length,
        totalMonthlyValue: totalValue
      }
    })
  } catch (error) {
    console.error('Error fetching closed deals:', error)
    return NextResponse.json({ error: 'Failed to fetch closed deals' }, { status: 500 })
  }
}
