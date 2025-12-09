import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Delete the LinkedIn account connection
    await prisma.linkedInAccount.delete({
      where: { userId: session.user.id }
    }).catch(() => {
      // Ignore if doesn't exist
    })

    return NextResponse.json({ success: true, message: 'LinkedIn disconnected' })
  } catch (error) {
    console.error('LinkedIn disconnect error:', error)
    return NextResponse.json({
      error: 'Failed to disconnect LinkedIn',
      details: String(error)
    }, { status: 500 })
  }
}
