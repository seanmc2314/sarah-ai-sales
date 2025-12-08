import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    // Check if admin user already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@supremeone.net' }
    })

    if (existingAdmin) {
      return NextResponse.json({
        message: 'Admin user already exists',
        credentials: {
          email: 'admin@supremeone.net',
          password: 'supreme123'
        }
      })
    }

    // Create default admin user
    const hashedPassword = await bcrypt.hash('supreme123', 12)

    const admin = await prisma.user.create({
      data: {
        name: 'Supreme One Admin',
        email: 'admin@supremeone.net',
        password: hashedPassword,
        role: 'ADMIN'
      }
    })

    // Create sample prospects
    const sampleProspects = [
      {
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@abcauto.com',
        company: 'ABC Auto Dealership',
        position: 'General Manager',
        industry: 'Automotive',
        source: 'demo_data',
        status: 'COLD',
        userId: admin.id
      },
      {
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.johnson@citydealer.com',
        company: 'City Dealership',
        position: 'F&I Manager',
        industry: 'Automotive',
        source: 'demo_data',
        status: 'CONTACTED',
        userId: admin.id
      }
    ]

    for (const prospect of sampleProspects) {
      await prisma.prospect.create({
        data: {
          ...prospect,
          status: prospect.status as any
        }
      })
    }

    return NextResponse.json({
      message: 'Setup completed successfully!',
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email
      },
      credentials: {
        email: 'admin@supremeone.net',
        password: 'supreme123'
      },
      prospectsCreated: sampleProspects.length
    })

  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json(
      { error: 'Failed to complete setup', details: error },
      { status: 500 }
    )
  }
}