import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// In a real implementation, this would be stored in database
// For demo purposes, using in-memory storage
let activeTasks: any[] = []

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Return active tasks for the user
    const userTasks = activeTasks.filter(task => task.userId === session.user.id)

    return NextResponse.json(userTasks)

  } catch (error) {
    console.error('Tasks API error:', error)
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

    const taskData = await request.json()

    const newTask = {
      id: Date.now().toString(),
      userId: session.user.id,
      createdAt: new Date(),
      ...taskData
    }

    activeTasks.push(newTask)

    return NextResponse.json(newTask)

  } catch (error) {
    console.error('Create task API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}