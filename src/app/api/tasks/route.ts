import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/tasks - List tasks with filters
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
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const assignedToId = searchParams.get('assignedToId')
    const dueToday = searchParams.get('dueToday')
    const overdue = searchParams.get('overdue')
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

    if (status) {
      where.status = status
    }

    if (priority) {
      where.priority = priority
    }

    if (assignedToId) {
      where.assignedToId = assignedToId
    }

    // Filter for today's tasks
    if (dueToday === 'true') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      where.dueDate = {
        gte: today,
        lt: tomorrow
      }
      where.status = { in: ['PENDING', 'IN_PROGRESS'] }
    }

    // Filter for overdue tasks
    if (overdue === 'true') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      where.dueDate = { lt: today }
      where.status = { in: ['PENDING', 'IN_PROGRESS'] }
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          dealership: {
            select: { id: true, name: true }
          },
          contact: {
            select: { id: true, firstName: true, lastName: true }
          },
          deal: {
            select: { id: true, title: true }
          },
          assignedTo: {
            select: { id: true, name: true, email: true }
          },
          createdBy: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: [
          { priority: 'desc' },
          { dueDate: 'asc' },
          { createdAt: 'desc' }
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.task.count({ where })
    ])

    // Get summary counts
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const [dueTodayCount, overdueCount, pendingCount] = await Promise.all([
      prisma.task.count({
        where: {
          ...where,
          dueDate: { gte: today, lt: tomorrow },
          status: { in: ['PENDING', 'IN_PROGRESS'] }
        }
      }),
      prisma.task.count({
        where: {
          ...where,
          dueDate: { lt: today },
          status: { in: ['PENDING', 'IN_PROGRESS'] }
        }
      }),
      prisma.task.count({
        where: {
          ...where,
          status: { in: ['PENDING', 'IN_PROGRESS'] }
        }
      })
    ])

    return NextResponse.json({
      tasks,
      summary: {
        dueToday: dueTodayCount,
        overdue: overdueCount,
        pending: pendingCount
      },
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

// POST /api/tasks - Create a new task
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()

    if (!data.title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        dueTime: data.dueTime,
        reminderAt: data.reminderAt ? new Date(data.reminderAt) : null,
        priority: data.priority || 'MEDIUM',
        status: data.status || 'PENDING',
        taskType: data.taskType,
        dealershipId: data.dealershipId,
        contactId: data.contactId,
        dealId: data.dealId,
        assignedToId: data.assignedToId || session.user.id,
        createdById: session.user.id,
      },
      include: {
        dealership: {
          select: { id: true, name: true }
        },
        contact: {
          select: { id: true, firstName: true, lastName: true }
        },
        deal: {
          select: { id: true, title: true }
        },
        assignedTo: {
          select: { id: true, name: true, email: true }
        },
        createdBy: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    return NextResponse.json({ task }, { status: 201 })
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}
