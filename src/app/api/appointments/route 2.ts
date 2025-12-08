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

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')

    let whereClause: any = {
      userId: session.user.id
    }

    if (date) {
      const startDate = new Date(date)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(date)
      endDate.setHours(23, 59, 59, 999)

      whereClause.startTime = {
        gte: startDate,
        lte: endDate
      }
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        prospect: {
          select: {
            firstName: true,
            lastName: true,
            company: true
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    })

    return NextResponse.json(appointments)

  } catch (error) {
    console.error('Appointments API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()

    const appointment = await prisma.appointment.create({
      data: {
        ...data,
        userId: session.user.id
      }
    })

    return NextResponse.json(appointment)

  } catch (error) {
    console.error('Create appointment API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}