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

    // Count total prospects
    const totalProspects = await prisma.prospect.count({
      where: { userId: session.user.id }
    })

    // Count appointments today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const appointmentsToday = await prisma.appointment.count({
      where: {
        userId: session.user.id,
        startTime: {
          gte: today,
          lt: tomorrow
        }
      }
    })

    // Count active campaigns
    const activeCampaigns = await prisma.campaign.count({
      where: {
        userId: session.user.id,
        status: 'ACTIVE'
      }
    })

    // Calculate response rate (simplified for now)
    const responseRate = 0

    return NextResponse.json({
      totalProspects,
      appointmentsToday,
      activeCampaigns,
      responseRate
    })

  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}
