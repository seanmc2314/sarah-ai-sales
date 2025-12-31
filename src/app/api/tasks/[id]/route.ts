import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/tasks/[id] - Get a single task
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

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        dealership: {
          select: { id: true, name: true }
        },
        contact: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        deal: {
          select: { id: true, title: true, stage: true }
        },
        assignedTo: {
          select: { id: true, name: true, email: true }
        },
        createdBy: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    return NextResponse.json({ task })
  } catch (error) {
    console.error('Error fetching task:', error)
    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 })
  }
}

// PUT /api/tasks/[id] - Update a task
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

    const currentTask = await prisma.task.findUnique({
      where: { id }
    })

    if (!currentTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const isCompleting = data.status === 'COMPLETED' && currentTask.status !== 'COMPLETED'

    const task = await prisma.task.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        dueTime: data.dueTime,
        reminderAt: data.reminderAt ? new Date(data.reminderAt) : null,
        priority: data.priority,
        status: data.status,
        completedAt: isCompleting ? new Date() : data.completedAt,
        taskType: data.taskType,
        dealershipId: data.dealershipId,
        contactId: data.contactId,
        dealId: data.dealId,
        assignedToId: data.assignedToId,
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

    // Log activity if task completed
    if (isCompleting && (task.dealershipId || task.dealId)) {
      await prisma.activity.create({
        data: {
          type: 'TASK_COMPLETED',
          subject: 'Task Completed',
          description: `Task "${task.title}" was completed`,
          dealershipId: task.dealershipId,
          contactId: task.contactId,
          dealId: task.dealId,
          userId: session.user.id,
          completedAt: new Date()
        }
      })
    }

    return NextResponse.json({ task })
  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}

// PATCH /api/tasks/[id] - Quick complete/update task
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

    const currentTask = await prisma.task.findUnique({
      where: { id }
    })

    if (!currentTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const updateData: any = {}

    if (data.status) {
      updateData.status = data.status
      if (data.status === 'COMPLETED') {
        updateData.completedAt = new Date()
      }
    }

    if (data.priority) {
      updateData.priority = data.priority
    }

    if (data.assignedToId) {
      updateData.assignedToId = data.assignedToId
    }

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
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
        }
      }
    })

    // Log activity if task completed
    if (data.status === 'COMPLETED' && (task.dealershipId || task.dealId)) {
      await prisma.activity.create({
        data: {
          type: 'TASK_COMPLETED',
          subject: 'Task Completed',
          description: `Task "${task.title}" was completed`,
          dealershipId: task.dealershipId,
          contactId: task.contactId,
          dealId: task.dealId,
          userId: session.user.id,
          completedAt: new Date()
        }
      })
    }

    return NextResponse.json({ task })
  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}

// DELETE /api/tasks/[id] - Delete a task
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

    const task = await prisma.task.findUnique({
      where: { id }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    await prisma.task.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting task:', error)
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
  }
}
