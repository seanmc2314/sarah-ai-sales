import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/dealerships - List all dealerships with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user with role and territory info
    const user = await prisma.user.findUnique({
      where: { email: session.user?.email || '' },
      select: { id: true, role: true, territoryId: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const isLive = searchParams.get('isLive')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = {}

    // Role-based filtering: Users only see their territory, Admins see all
    if (user.role === 'USER') {
      where.OR = [
        { assignedUserId: user.id },
        ...(user.territoryId ? [{ territoryId: user.territoryId }] : [])
      ]
    }

    if (status) {
      where.status = status
    }

    if (isLive === 'true') {
      where.isLive = true
    } else if (isLive === 'false') {
      where.isLive = false
    }

    if (search) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { city: { contains: search, mode: 'insensitive' } },
            { state: { contains: search, mode: 'insensitive' } },
          ]
        }
      ]
    }

    const [dealerships, total] = await Promise.all([
      prisma.dealership.findMany({
        where,
        include: {
          contacts: {
            take: 3,
            orderBy: { isPrimary: 'desc' }
          },
          _count: {
            select: {
              contacts: true,
              deals: true,
              documents: true,
              activities: true
            }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.dealership.count({ where })
    ])

    return NextResponse.json({
      dealerships,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching dealerships:', error)
    return NextResponse.json({ error: 'Failed to fetch dealerships' }, { status: 500 })
  }
}

// POST /api/dealerships - Create a new dealership
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user with territory info
    const user = await prisma.user.findUnique({
      where: { email: session.user?.email || '' },
      select: { id: true, territoryId: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const data = await request.json()

    const dealership = await prisma.dealership.create({
      data: {
        name: data.name,
        legalName: data.legalName,
        status: data.status || 'PROSPECT',
        website: data.website,
        phone: data.phone,
        email: data.email,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        country: data.country || 'USA',
        dealerGroup: data.dealerGroup,
        brands: data.brands || [],
        employeeCount: data.employeeCount,
        annualRevenue: data.annualRevenue,
        fiManagerCount: data.fiManagerCount,
        monthlyValue: data.monthlyValue,
        contractType: data.contractType,
        notes: data.notes,
        tags: data.tags || [],
        assignedUserId: user.id,
        territoryId: data.territoryId || user.territoryId,
      },
      include: {
        contacts: true,
        _count: {
          select: {
            contacts: true,
            deals: true,
            documents: true
          }
        }
      }
    })

    // Log activity for dealership creation
    await prisma.activity.create({
      data: {
        type: 'STATUS_CHANGE',
        subject: 'Dealership Created',
        description: `New dealership "${dealership.name}" was created`,
        dealershipId: dealership.id,
        userId: user.id,
        completedAt: new Date()
      }
    })

    return NextResponse.json({ dealership }, { status: 201 })
  } catch (error) {
    console.error('Error creating dealership:', error)
    return NextResponse.json({ error: 'Failed to create dealership' }, { status: 500 })
  }
}
