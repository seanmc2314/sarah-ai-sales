import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateProposal, saveProposal } from '@/lib/ai/proposalGenerator'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { prospectId, options } = await request.json()

    if (!prospectId) {
      return NextResponse.json({ error: 'Prospect ID is required' }, { status: 400 })
    }

    // Get prospect data
    const prospect = await prisma.prospect.findUnique({
      where: { id: prospectId }
    })

    if (!prospect) {
      return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })
    }

    // Verify prospect belongs to user
    if (prospect.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Generate the proposal using AI
    const proposalData = await generateProposal({
      firstName: prospect.firstName,
      lastName: prospect.lastName,
      position: prospect.position || undefined,
      dealership: prospect.dealership || undefined,
      dealershipWebsite: prospect.dealershipWebsite || undefined,
      location: prospect.location || undefined,
      employeeCount: prospect.employeeCount || undefined,
      revenue: prospect.revenue || undefined,
      industry: prospect.industry || undefined,
      notes: prospect.notes || undefined
    }, options)

    // Save the proposal to database
    const savedProposal = await saveProposal(
      session.user.id,
      prospectId,
      proposalData
    )

    return NextResponse.json({
      success: true,
      proposal: savedProposal
    })
  } catch (error) {
    console.error('Generate proposal API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate proposal' },
      { status: 500 }
    )
  }
}
