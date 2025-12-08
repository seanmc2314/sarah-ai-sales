import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// PUT - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const { name, email, password, role } = await request.json()

    // Validate required fields (password is optional for updates)
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      )
    }

    // Check if email is taken by another user
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        NOT: { id }
      }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email is already in use by another user' },
        { status: 400 }
      )
    }

    // Prepare update data
    const updateData: any = {
      name,
      email,
      role: role || 'USER'
    }

    // Only update password if provided
    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password, 10)
    }

    // Update user
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    })

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      user
    })

  } catch (error) {
    console.error('Update user API error:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

// DELETE - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Prevent deleting yourself
    if (session.user.id === id) {
      return NextResponse.json(
        { error: 'You cannot delete your own account' },
        { status: 400 }
      )
    }

    // Delete user
    await prisma.user.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    })

  } catch (error) {
    console.error('Delete user API error:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}
