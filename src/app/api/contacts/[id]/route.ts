import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/contacts/[id] - Get a single contact with details
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

    const contact = await prisma.contact.findUnique({
      where: { id },
      include: {
        dealership: {
          select: {
            id: true,
            name: true,
            status: true,
            isLive: true,
            website: true,
            phone: true
          }
        },
        activities: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 50
        },
        deals: {
          include: {
            owner: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        tasks: {
          include: {
            assignedTo: {
              select: { id: true, name: true, email: true }
            }
          },
          where: {
            status: { in: ['PENDING', 'IN_PROGRESS'] }
          },
          orderBy: { dueDate: 'asc' }
        },
        _count: {
          select: {
            activities: true,
            deals: true,
            tasks: true
          }
        }
      }
    })

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    return NextResponse.json({ contact })
  } catch (error) {
    console.error('Error fetching contact:', error)
    return NextResponse.json({ error: 'Failed to fetch contact' }, { status: 500 })
  }
}

// PUT /api/contacts/[id] - Update a contact
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

    // Get current contact
    const currentContact = await prisma.contact.findUnique({
      where: { id }
    })

    if (!currentContact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    // If marking as primary, unset other primary contacts for this dealership
    if (data.isPrimary && currentContact.dealershipId) {
      await prisma.contact.updateMany({
        where: {
          dealershipId: currentContact.dealershipId,
          isPrimary: true,
          NOT: { id }
        },
        data: { isPrimary: false }
      })
    }

    const contact = await prisma.contact.update({
      where: { id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        mobile: data.mobile,
        position: data.position,
        department: data.department,
        isPrimary: data.isPrimary,
        linkedinUrl: data.linkedinUrl,
        facebookUrl: data.facebookUrl,
        twitterUrl: data.twitterUrl,
        leadScore: data.leadScore,
        leadScoreReason: data.leadScoreReason,
        scoredAt: data.leadScore !== currentContact.leadScore ? new Date() : undefined,
        preferredChannel: data.preferredChannel,
        timezone: data.timezone,
        doNotContact: data.doNotContact,
        notes: data.notes,
        tags: data.tags,
        dealershipId: data.dealershipId,
      },
      include: {
        dealership: {
          select: {
            id: true,
            name: true,
            status: true
          }
        }
      }
    })

    return NextResponse.json({ contact })
  } catch (error) {
    console.error('Error updating contact:', error)
    return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 })
  }
}

// DELETE /api/contacts/[id] - Delete a contact
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

    // Check if contact exists
    const contact = await prisma.contact.findUnique({
      where: { id }
    })

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    // Delete related records first
    await prisma.$transaction([
      prisma.activity.deleteMany({ where: { contactId: id } }),
      prisma.task.deleteMany({ where: { contactId: id } }),
      prisma.contact.delete({ where: { id } })
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting contact:', error)
    return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 })
  }
}
