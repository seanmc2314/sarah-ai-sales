import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Pipeline stages (in order)
const PIPELINE_STAGES = ['PROSPECT', 'QUALIFIED', 'MEETING_SCHEDULED', 'PROPOSAL_SENT', 'NEGOTIATION']

// GET /api/dealerships/pipeline - Get dealerships grouped by status for pipeline view
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

    // Parse query params for filtering
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const assignedUserId = searchParams.get('assignedUserId')
    const minValue = searchParams.get('minValue')
    const maxValue = searchParams.get('maxValue')

    // Build where clause based on role
    const where: any = {
      status: { in: PIPELINE_STAGES }
    }

    // Role-based filtering: Users only see their territory, Admins see all
    if (user.role === 'USER') {
      where.OR = [
        { assignedUserId: user.id },
        ...(user.territoryId ? [{ territoryId: user.territoryId }] : [])
      ]
    }

    // Apply filters
    if (search) {
      where.name = { contains: search, mode: 'insensitive' }
    }
    if (assignedUserId) {
      where.assignedUserId = assignedUserId
    }
    if (minValue) {
      where.monthlyValue = { ...where.monthlyValue, gte: parseFloat(minValue) }
    }
    if (maxValue) {
      where.monthlyValue = { ...where.monthlyValue, lte: parseFloat(maxValue) }
    }

    // Fetch all pipeline dealerships with last activity and next task
    const dealerships = await prisma.dealership.findMany({
      where,
      include: {
        contacts: {
          orderBy: { isPrimary: 'desc' },
          take: 3
        },
        assignedUser: {
          select: { id: true, name: true, email: true }
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            type: true,
            subject: true,
            createdAt: true
          }
        },
        tasks: {
          where: {
            status: { in: ['PENDING', 'IN_PROGRESS'] },
            dueDate: { gte: new Date() }
          },
          orderBy: { dueDate: 'asc' },
          take: 1,
          select: {
            id: true,
            title: true,
            dueDate: true,
            priority: true
          }
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
      orderBy: { updatedAt: 'desc' }
    })

    // Get all users for filter dropdown (admins only)
    let users: { id: string; name: string | null; email: string }[] = []
    if (user.role === 'ADMIN') {
      users = await prisma.user.findMany({
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' }
      })
    }

    // Group by status
    const pipeline: Record<string, typeof dealerships> = {}
    const stageTotals: Record<string, { count: number; value: number }> = {}

    PIPELINE_STAGES.forEach(stage => {
      pipeline[stage] = []
      stageTotals[stage] = { count: 0, value: 0 }
    })

    dealerships.forEach(dealership => {
      if (pipeline[dealership.status]) {
        pipeline[dealership.status].push(dealership)
        stageTotals[dealership.status].count++
        stageTotals[dealership.status].value += dealership.monthlyValue || 0
      }
    })

    // Calculate summary
    const totalDealerships = dealerships.length
    const totalPipelineValue = dealerships.reduce((sum, d) => sum + (d.monthlyValue || 0), 0)

    return NextResponse.json({
      pipeline,
      stageTotals,
      summary: {
        totalDealerships,
        totalPipelineValue
      },
      users
    })
  } catch (error) {
    console.error('Error fetching pipeline:', error)
    return NextResponse.json({ error: 'Failed to fetch pipeline' }, { status: 500 })
  }
}
