import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Get total prospects
    const totalProspects = await prisma.prospect.count({
      where: {
        userId: session.user.id
      }
    })

    // Get appointments today
    const appointmentsToday = await prisma.appointment.count({
      where: {
        userId: session.user.id,
        startTime: {
          gte: today,
          lt: tomorrow
        }
      }
    })

    // Get active campaigns
    const activeCampaigns = await prisma.campaign.count({
      where: {
        userId: session.user.id,
        status: 'ACTIVE'
      }
    })

    // Calculate response rate (simplified)
    const totalContacted = await prisma.prospect.count({
      where: {
        userId: session.user.id,
        status: {
          not: 'COLD'
        }
      }
    })

    const totalResponded = await prisma.prospect.count({
      where: {
        userId: session.user.id,
        status: {
          in: ['INTERESTED', 'APPOINTMENT_SET', 'PROPOSAL_SENT', 'CLOSED_WON']
        }
      }
    })

    const responseRate = totalContacted > 0 ? Math.round((totalResponded / totalContacted) * 100) : 0

    return NextResponse.json({
      totalProspects,
      appointmentsToday,
      activeCampaigns,
      responseRate
    })

  } catch (error) {
    console.error('Dashboard stats API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}