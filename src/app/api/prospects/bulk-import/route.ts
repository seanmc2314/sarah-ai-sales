import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Helper function to parse CSV
function parseCSV(csvText: string): any[] {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
  const prospects = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
    if (values.length !== headers.length) continue

    const prospect: any = {}
    headers.forEach((header, index) => {
      prospect[header] = values[index]
    })
    prospects.push(prospect)
  }

  return prospects
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      )
    }

    const csvText = await file.text()
    const prospects = parseCSV(csvText)

    if (prospects.length === 0) {
      return NextResponse.json(
        { error: 'No valid prospects found in CSV' },
        { status: 400 }
      )
    }

    const results = {
      imported: 0,
      failed: 0,
      duplicates: 0,
      errors: [] as string[]
    }

    for (const prospectData of prospects) {
      try {
        // Validate required fields
        if (!prospectData.firstName || !prospectData.lastName) {
          results.failed++
          results.errors.push(`Missing required fields for row: ${JSON.stringify(prospectData)}`)
          continue
        }

        // Check for duplicates by email if provided
        if (prospectData.email) {
          const existingProspect = await prisma.prospect.findFirst({
            where: {
              email: prospectData.email,
              userId: session.user.id
            }
          })

          if (existingProspect) {
            results.duplicates++
            continue
          }
        }

        // Create prospect
        await prisma.prospect.create({
          data: {
            firstName: prospectData.firstName,
            lastName: prospectData.lastName,
            email: prospectData.email || null,
            phone: prospectData.phone || null,
            company: prospectData.company || null,
            position: prospectData.position || null,
            industry: prospectData.industry || 'Automotive',
            linkedinUrl: prospectData.linkedinUrl || null,
            source: prospectData.source || 'csv_import',
            status: 'COLD',
            notes: prospectData.notes || null,
            dealership: prospectData.dealership || prospectData.company || null,
            userId: session.user.id
          }
        })

        results.imported++

      } catch (error) {
        results.failed++
        results.errors.push(`Failed to create prospect: ${error}`)
      }
    }

    return NextResponse.json({
      imported: results.imported,
      failed: results.failed,
      duplicates: results.duplicates,
      total: prospects.length,
      errors: results.errors.slice(0, 10), // Return first 10 errors
      message: `Import completed: ${results.imported} imported, ${results.failed} failed, ${results.duplicates} duplicates`
    })

  } catch (error) {
    console.error('Bulk import error:', error)
    return NextResponse.json(
      { error: 'Failed to import prospects' },
      { status: 500 }
    )
  }
}

export async function GET() {
  // Return CSV template
  const csvTemplate = `firstName,lastName,email,phone,company,position,industry,dealership,source
John,Smith,john.smith@abcauto.com,555-123-4567,ABC Auto Dealership,General Manager,Automotive,ABC Auto,linkedin
Jane,Doe,jane.doe@citydealer.com,555-987-6543,City Dealership,F&I Manager,Automotive,City Dealer,referral`

  return new NextResponse(csvTemplate, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="prospects_template.csv"'
    }
  })
}
