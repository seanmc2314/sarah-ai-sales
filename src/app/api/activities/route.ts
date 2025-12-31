import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/activities - List activities with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const dealershipId = searchParams.get('dealershipId')
    const contactId = searchParams.get('contactId')
    const dealId = searchParams.get('dealId')
    const type = searchParams.get('type')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = {}

    if (dealershipId) {
      where.dealershipId = dealershipId
    }

    if (contactId) {
      where.contactId = contactId
    }

    if (dealId) {
      where.dealId = dealId
    }

    if (type) {
      where.type = type
    }

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true }
          },
          dealership: {
            select: { id: true, name: true }
          },
          contact: {
            select: { id: true, firstName: true, lastName: true }
          },
          deal: {
            select: { id: true, title: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.activity.count({ where })
    ])

    return NextResponse.json({
      activities,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching activities:', error)
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 })
  }
}

// POST /api/activities - Log a new activity
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()

    if (!data.type || !data.subject) {
      return NextResponse.json({ error: 'Type and subject are required' }, { status: 400 })
    }

    const activity = await prisma.activity.create({
      data: {
        type: data.type,
        subject: data.subject,
        description: data.description,
        duration: data.duration,
        outcome: data.outcome,
        emailSubject: data.emailSubject,
        emailContent: data.emailContent,
        emailSentAt: data.emailSentAt ? new Date(data.emailSentAt) : null,
        aiPrompt: data.aiPrompt,
        aiResponse: data.aiResponse,
        aiModel: data.aiModel,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        completedAt: data.completedAt ? new Date(data.completedAt) : new Date(),
        notes: data.notes,
        metadata: data.metadata,
        dealershipId: data.dealershipId,
        contactId: data.contactId,
        dealId: data.dealId,
        userId: session.user.id,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        dealership: {
          select: { id: true, name: true }
        },
        contact: {
          select: { id: true, firstName: true, lastName: true }
        },
        deal: {
          select: { id: true, title: true }
        }
      }
    })

    return NextResponse.json({ activity }, { status: 201 })
  } catch (error) {
    console.error('Error creating activity:', error)
    return NextResponse.json({ error: 'Failed to create activity' }, { status: 500 })
  }
}
