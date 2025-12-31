import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/contacts - List all contacts with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const dealershipId = searchParams.get('dealershipId')
    const search = searchParams.get('search')
    const isPrimary = searchParams.get('isPrimary')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = {}

    if (dealershipId) {
      where.dealershipId = dealershipId
    }

    if (isPrimary === 'true') {
      where.isPrimary = true
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { position: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        include: {
          dealership: {
            select: {
              id: true,
              name: true,
              status: true,
              isLive: true
            }
          },
          _count: {
            select: {
              activities: true,
              deals: true,
              tasks: true
            }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.contact.count({ where })
    ])

    return NextResponse.json({
      contacts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching contacts:', error)
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 })
  }
}

// POST /api/contacts - Create a new contact
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()

    // If marking as primary, unset other primary contacts for this dealership
    if (data.isPrimary && data.dealershipId) {
      await prisma.contact.updateMany({
        where: {
          dealershipId: data.dealershipId,
          isPrimary: true
        },
        data: { isPrimary: false }
      })
    }

    const contact = await prisma.contact.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        mobile: data.mobile,
        role: data.role || 'OTHER',
        position: data.position,
        department: data.department,
        isPrimary: data.isPrimary || false,
        linkedinUrl: data.linkedinUrl,
        facebookUrl: data.facebookUrl,
        twitterUrl: data.twitterUrl,
        preferredChannel: data.preferredChannel,
        timezone: data.timezone,
        notes: data.notes,
        tags: data.tags || [],
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

    // Log activity
    if (data.dealershipId) {
      await prisma.activity.create({
        data: {
          type: 'NOTE',
          subject: 'Contact Added',
          description: `New contact "${contact.firstName} ${contact.lastName}" was added`,
          dealershipId: data.dealershipId,
          contactId: contact.id,
          userId: session.user.id,
          completedAt: new Date()
        }
      })
    }

    return NextResponse.json({ contact }, { status: 201 })
  } catch (error) {
    console.error('Error creating contact:', error)
    return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 })
  }
}
