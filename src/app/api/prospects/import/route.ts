import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Papa from 'papaparse'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const autoEnroll = formData.get('autoEnroll') === 'true'
    const sequenceId = formData.get('sequenceId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Read file content
    const text = await file.text()

    // Parse CSV
    const parsed = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, '_')
    })

    if (parsed.errors.length > 0) {
      return NextResponse.json({
        error: 'CSV parsing error',
        details: parsed.errors
      }, { status: 400 })
    }

    const data = parsed.data as any[]

    // Validate required fields
    const requiredFields = ['first_name', 'last_name']
    const hasRequiredFields = requiredFields.every(field =>
      data.length > 0 && field in data[0]
    )

    if (!hasRequiredFields) {
      return NextResponse.json({
        error: 'CSV must contain at least first_name and last_name columns',
        receivedHeaders: Object.keys(data[0] || {})
      }, { status: 400 })
    }

    // Process prospects
    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as any[]
    }

    for (const row of data) {
      try {
        // Map CSV fields to prospect fields
        const prospectData = {
          firstName: row.first_name || row.firstname || '',
          lastName: row.last_name || row.lastname || '',
          email: row.email || null,
          phone: row.phone || row.phone_number || null,
          company: row.company || row.dealership || null,
          position: row.position || row.title || row.role || null,
          dealership: row.dealership || row.company || null,
          dealershipWebsite: row.website || row.dealership_website || null,
          location: row.location || row.city || row.state || null,
          linkedinUrl: row.linkedin || row.linkedin_url || null,
          facebookUrl: row.facebook || row.facebook_url || null,
          twitterUrl: row.twitter || row.twitter_url || null,
          industry: row.industry || 'Automotive',
          source: 'csv_import',
          status: 'COLD' as const,
          notes: row.notes || null,
          userId: session.user.id
        }

        // Skip if missing required fields
        if (!prospectData.firstName || !prospectData.lastName) {
          results.skipped++
          continue
        }

        // Create prospect
        const prospect = await prisma.prospect.create({
          data: prospectData
        })

        results.imported++

        // Auto-enroll in sequence if requested
        if (autoEnroll && sequenceId) {
          try {
            const { enrollInSequence } = await import('@/lib/automation/followUpEngine')
            await enrollInSequence(prospect.id, sequenceId, false)
          } catch (enrollError) {
            console.error('Error enrolling prospect:', enrollError)
          }
        }

      } catch (error: any) {
        results.errors.push({
          row: row,
          error: error.message
        })
      }
    }

    return NextResponse.json({
      success: true,
      results: {
        total: data.length,
        imported: results.imported,
        skipped: results.skipped,
        errors: results.errors.length
      },
      errors: results.errors.slice(0, 10) // Return first 10 errors only
    })

  } catch (error) {
    console.error('Import prospects API error:', error)
    return NextResponse.json(
      { error: 'Failed to import prospects' },
      { status: 500 }
    )
  }
}
