import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sendProposal } from '@/lib/ai/proposalGenerator'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify proposal belongs to user
    const proposal = await prisma.proposal.findUnique({
      where: { id }
    })

    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
    }

    if (proposal.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Send the proposal
    const sentProposal = await sendProposal(id)

    return NextResponse.json({
      success: true,
      proposal: sentProposal
    })
  } catch (error) {
    console.error('Send proposal API error:', error)
    return NextResponse.json(
      { error: 'Failed to send proposal' },
      { status: 500 }
    )
  }
}
