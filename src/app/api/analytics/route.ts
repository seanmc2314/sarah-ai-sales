import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/analytics - Get comprehensive CRM analytics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30' // days

    const periodDays = parseInt(period)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - periodDays)

    // Get dealership stats
    const [
      totalDealerships,
      liveDealerships,
      prospectDealerships,
      activeDealerships,
      churnedDealerships
    ] = await Promise.all([
      prisma.dealership.count(),
      prisma.dealership.count({ where: { isLive: true } }),
      prisma.dealership.count({ where: { status: 'PROSPECT' } }),
      prisma.dealership.count({ where: { status: 'ACTIVE_CUSTOMER' } }),
      prisma.dealership.count({ where: { status: 'CHURNED' } })
    ])

    // Get deal stats
    const deals = await prisma.deal.findMany({
      select: {
        id: true,
        stage: true,
        value: true,
        monthlyRecurring: true,
        probability: true,
        createdAt: true,
        closedAt: true
      }
    })

    const openDeals = deals.filter(d => !['CLOSED_WON', 'CLOSED_LOST'].includes(d.stage))
    const wonDeals = deals.filter(d => d.stage === 'CLOSED_WON')
    const lostDeals = deals.filter(d => d.stage === 'CLOSED_LOST')
    const recentWonDeals = wonDeals.filter(d => d.closedAt && d.closedAt >= startDate)

    const pipelineValue = openDeals.reduce((sum, d) => sum + d.value, 0)
    const weightedPipelineValue = openDeals.reduce((sum, d) => sum + (d.value * d.probability / 100), 0)
    const wonValue = wonDeals.reduce((sum, d) => sum + d.value, 0)
    const recentWonValue = recentWonDeals.reduce((sum, d) => sum + d.value, 0)
    const mrr = wonDeals.reduce((sum, d) => sum + (d.monthlyRecurring || 0), 0)

    // Pipeline breakdown
    const pipelineBreakdown = {
      LEAD: { count: 0, value: 0 },
      QUALIFIED: { count: 0, value: 0 },
      MEETING_SCHEDULED: { count: 0, value: 0 },
      PROPOSAL_SENT: { count: 0, value: 0 },
      NEGOTIATION: { count: 0, value: 0 }
    }

    openDeals.forEach(deal => {
      if (pipelineBreakdown[deal.stage as keyof typeof pipelineBreakdown]) {
        pipelineBreakdown[deal.stage as keyof typeof pipelineBreakdown].count++
        pipelineBreakdown[deal.stage as keyof typeof pipelineBreakdown].value += deal.value
      }
    })

    // Win rate
    const closedDeals = wonDeals.length + lostDeals.length
    const winRate = closedDeals > 0 ? (wonDeals.length / closedDeals * 100) : 0

    // Contact stats
    const [totalContacts, contactsWithScore] = await Promise.all([
      prisma.contact.count(),
      prisma.contact.count({ where: { leadScore: { gte: 70 } } })
    ])

    // Task stats
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const [tasksDueToday, tasksOverdue, tasksCompleted] = await Promise.all([
      prisma.task.count({
        where: {
          dueDate: { gte: today, lt: tomorrow },
          status: { in: ['PENDING', 'IN_PROGRESS'] }
        }
      }),
      prisma.task.count({
        where: {
          dueDate: { lt: today },
          status: { in: ['PENDING', 'IN_PROGRESS'] }
        }
      }),
      prisma.task.count({
        where: {
          completedAt: { gte: startDate }
        }
      })
    ])

    // Activity stats
    const [totalActivities, recentActivities] = await Promise.all([
      prisma.activity.count(),
      prisma.activity.count({
        where: { createdAt: { gte: startDate } }
      })
    ])

    // Recent activity by type
    const activityByType = await prisma.activity.groupBy({
      by: ['type'],
      where: { createdAt: { gte: startDate } },
      _count: { id: true }
    })

    // Document stats
    const totalDocuments = await prisma.document.count()

    // Top dealerships by value
    const topDealerships = await prisma.dealership.findMany({
      where: { isLive: true },
      select: {
        id: true,
        name: true,
        monthlyValue: true,
        status: true,
        _count: {
          select: { deals: true, contacts: true }
        }
      },
      orderBy: { monthlyValue: 'desc' },
      take: 5
    })

    // Recent won deals
    const recentWins = await prisma.deal.findMany({
      where: {
        stage: 'CLOSED_WON',
        closedAt: { gte: startDate }
      },
      include: {
        dealership: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true } }
      },
      orderBy: { closedAt: 'desc' },
      take: 5
    })

    return NextResponse.json({
      dealerships: {
        total: totalDealerships,
        live: liveDealerships,
        prospects: prospectDealerships,
        active: activeDealerships,
        churned: churnedDealerships
      },
      deals: {
        total: deals.length,
        open: openDeals.length,
        won: wonDeals.length,
        lost: lostDeals.length,
        recentWon: recentWonDeals.length,
        winRate: Math.round(winRate * 10) / 10
      },
      revenue: {
        pipelineValue,
        weightedPipelineValue,
        wonValue,
        recentWonValue,
        mrr,
        arr: mrr * 12
      },
      pipeline: pipelineBreakdown,
      contacts: {
        total: totalContacts,
        hotLeads: contactsWithScore
      },
      tasks: {
        dueToday: tasksDueToday,
        overdue: tasksOverdue,
        completedRecently: tasksCompleted
      },
      activities: {
        total: totalActivities,
        recent: recentActivities,
        byType: activityByType.reduce((acc, item) => {
          acc[item.type] = item._count.id
          return acc
        }, {} as Record<string, number>)
      },
      documents: {
        total: totalDocuments
      },
      topDealerships,
      recentWins,
      period: periodDays
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
