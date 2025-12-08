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

    const posts = await prisma.socialPost.findMany({
      where: {
        userId: session.user.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(posts)

  } catch (error) {
    console.error('Social posts API error:', error)
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

    const post = await prisma.socialPost.create({
      data: {
        ...data,
        userId: session.user.id
      }
    })

    return NextResponse.json(post)

  } catch (error) {
    console.error('Create social post API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}