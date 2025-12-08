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

    const prospects = await prisma.prospect.findMany({
      where: {
        userId: session.user.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ prospects })

  } catch (error) {
    console.error('Prospects API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch prospects' },
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

    const prospect = await prisma.prospect.create({
      data: {
        ...data,
        userId: session.user.id
      }
    })

    return NextResponse.json(prospect)

  } catch (error) {
    console.error('Create prospect API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}