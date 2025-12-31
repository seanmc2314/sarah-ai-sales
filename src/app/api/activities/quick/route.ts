import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/activities/quick - Quick log an activity
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { type, dealershipId, contactId, subject, description, duration } = await request.json()

    if (!type || !dealershipId) {
      return NextResponse.json({ error: 'Type and dealershipId required' }, { status: 400 })
    }

    // Create the activity
    const activity = await prisma.activity.create({
      data: {
        type,
        subject: subject || getDefaultSubject(type),
        description: description || null,
        duration: duration || null,
        dealershipId,
        contactId: contactId || null,
        userId: user.id,
        completedAt: new Date()
      }
    })

    // Update dealership's updatedAt timestamp
    await prisma.dealership.update({
      where: { id: dealershipId },
      data: { updatedAt: new Date() }
    })

    return NextResponse.json({ activity })
  } catch (error) {
    console.error('Quick activity error:', error)
    return NextResponse.json({ error: 'Failed to log activity' }, { status: 500 })
  }
}

function getDefaultSubject(type: string): string {
  switch (type) {
    case 'CALL':
      return 'Phone call'
    case 'EMAIL':
      return 'Email sent'
    case 'MEETING':
      return 'Meeting held'
    case 'NOTE':
      return 'Note added'
    case 'LINKEDIN_MESSAGE':
      return 'LinkedIn message'
    default:
      return 'Activity logged'
  }
}
