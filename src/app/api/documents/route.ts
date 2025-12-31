import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'documents')

// GET /api/documents - List documents with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const dealershipId = searchParams.get('dealershipId')
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = {}

    if (dealershipId) {
      where.dealershipId = dealershipId
    }

    if (category) {
      where.category = category
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          dealership: {
            select: { id: true, name: true }
          },
          uploadedBy: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.document.count({ where })
    ])

    return NextResponse.json({
      documents,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
  }
}

// POST /api/documents - Upload a new document
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const dealershipId = formData.get('dealershipId') as string
    const category = formData.get('category') as string || 'OTHER'
    const description = formData.get('description') as string
    const name = formData.get('name') as string
    const validFrom = formData.get('validFrom') as string
    const validUntil = formData.get('validUntil') as string
    const signedAt = formData.get('signedAt') as string
    const signedBy = formData.get('signedBy') as string
    const tags = formData.get('tags') as string

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    if (!dealershipId) {
      return NextResponse.json({ error: 'Dealership ID is required' }, { status: 400 })
    }

    // Verify dealership exists
    const dealership = await prisma.dealership.findUnique({
      where: { id: dealershipId }
    })

    if (!dealership) {
      return NextResponse.json({ error: 'Dealership not found' }, { status: 404 })
    }

    // Create dealership directory if not exists
    const dealerDir = path.join(UPLOAD_DIR, dealershipId)
    await mkdir(dealerDir, { recursive: true })

    // Generate unique filename
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filename = `${timestamp}_${sanitizedName}`
    const filePath = path.join(dealerDir, filename)

    // Write file
    const bytes = await file.arrayBuffer()
    await writeFile(filePath, Buffer.from(bytes))

    // Get file extension
    const fileExtension = path.extname(file.name).toLowerCase()

    // Save to database
    const document = await prisma.document.create({
      data: {
        name: name || file.name.replace(/\.[^/.]+$/, ''),
        originalName: file.name,
        description,
        filePath: `/uploads/documents/${dealershipId}/${filename}`,
        fileSize: file.size,
        mimeType: file.type,
        fileExtension,
        category: category as any,
        tags: tags ? tags.split(',').map(t => t.trim()) : [],
        validFrom: validFrom ? new Date(validFrom) : null,
        validUntil: validUntil ? new Date(validUntil) : null,
        signedAt: signedAt ? new Date(signedAt) : null,
        signedBy,
        dealershipId,
        uploadedById: session.user.id
      },
      include: {
        dealership: {
          select: { id: true, name: true }
        },
        uploadedBy: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'DOCUMENT_UPLOAD',
        subject: 'Document Uploaded',
        description: `Document "${document.name}" was uploaded (${category})`,
        dealershipId,
        userId: session.user.id,
        completedAt: new Date()
      }
    })

    return NextResponse.json({ document }, { status: 201 })
  } catch (error) {
    console.error('Error uploading document:', error)
    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 })
  }
}
