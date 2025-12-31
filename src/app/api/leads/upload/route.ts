import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

interface LeadRow {
  dealershipName: string
  contactFirstName?: string
  contactLastName?: string
  contactEmail?: string
  contactPhone?: string
  contactTitle?: string
  city?: string
  state?: string
  zipCode?: string
  website?: string
  phone?: string
  brands?: string
  employeeCount?: string
  notes?: string
  dealValue?: string
  source?: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true, territoryId: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const assignToTerritory = formData.get('assignToTerritory') === 'true'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Read CSV content
    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())

    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV file must have a header row and at least one data row' }, { status: 400 })
    }

    // Parse header
    const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ''))

    // Map common header variations
    const headerMap: Record<string, keyof LeadRow> = {
      'dealershipname': 'dealershipName',
      'dealership': 'dealershipName',
      'company': 'dealershipName',
      'companyname': 'dealershipName',
      'name': 'dealershipName',
      'firstname': 'contactFirstName',
      'contactfirstname': 'contactFirstName',
      'first': 'contactFirstName',
      'lastname': 'contactLastName',
      'contactlastname': 'contactLastName',
      'last': 'contactLastName',
      'email': 'contactEmail',
      'contactemail': 'contactEmail',
      'phone': 'phone',
      'contactphone': 'contactPhone',
      'title': 'contactTitle',
      'jobtitle': 'contactTitle',
      'position': 'contactTitle',
      'city': 'city',
      'state': 'state',
      'zip': 'zipCode',
      'zipcode': 'zipCode',
      'website': 'website',
      'url': 'website',
      'brands': 'brands',
      'brand': 'brands',
      'employees': 'employeeCount',
      'employeecount': 'employeeCount',
      'size': 'employeeCount',
      'notes': 'notes',
      'note': 'notes',
      'comments': 'notes',
      'dealvalue': 'dealValue',
      'value': 'dealValue',
      'source': 'source',
      'leadsource': 'source'
    }

    // Parse rows
    const leads: LeadRow[] = []
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
      if (values.length === 0) continue

      const lead: LeadRow = { dealershipName: '' }

      header.forEach((h, idx) => {
        const mappedKey = headerMap[h]
        if (mappedKey && values[idx]) {
          (lead as unknown as Record<string, string>)[mappedKey] = values[idx].trim()
        }
      })

      if (lead.dealershipName) {
        leads.push(lead)
      }
    }

    if (leads.length === 0) {
      return NextResponse.json({ error: 'No valid leads found in file. Ensure there is a column for dealership/company name.' }, { status: 400 })
    }

    // Create dealerships and deals
    const results = {
      created: 0,
      skipped: 0,
      errors: [] as string[]
    }

    for (const lead of leads) {
      try {
        // Check if dealership already exists
        const existing = await prisma.dealership.findFirst({
          where: {
            name: { equals: lead.dealershipName, mode: 'insensitive' }
          }
        })

        if (existing) {
          results.skipped++
          continue
        }

        // Create dealership
        const dealership = await prisma.dealership.create({
          data: {
            name: lead.dealershipName,
            website: lead.website || null,
            phone: lead.phone || null,
            city: lead.city || null,
            state: lead.state || null,
            zipCode: lead.zipCode || null,
            brands: lead.brands ? lead.brands.split(/[,;]/).map(b => b.trim()) : [],
            employeeCount: lead.employeeCount ? parseInt(lead.employeeCount) || null : null,
            notes: lead.notes || null,
            status: 'PROSPECT',
            assignedUserId: user.id,
            territoryId: assignToTerritory && user.territoryId ? user.territoryId : null
          }
        })

        // Create contact if contact info provided
        if (lead.contactFirstName || lead.contactEmail) {
          await prisma.contact.create({
            data: {
              firstName: lead.contactFirstName || 'Unknown',
              lastName: lead.contactLastName || '',
              email: lead.contactEmail || null,
              phone: lead.contactPhone || null,
              position: lead.contactTitle || null,
              dealershipId: dealership.id,
              isPrimary: true
            }
          })
        }

        // Log activity
        await prisma.activity.create({
          data: {
            type: 'NOTE',
            subject: 'Lead imported from CSV',
            description: `Lead imported via CSV upload`,
            dealershipId: dealership.id,
            userId: user.id
          }
        })

        results.created++
      } catch (error) {
        results.errors.push(`Failed to create ${lead.dealershipName}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Imported ${results.created} leads. ${results.skipped} duplicates skipped.`,
      results
    })

  } catch (error) {
    console.error('Lead upload error:', error)
    return NextResponse.json(
      { error: 'Failed to process lead upload' },
      { status: 500 }
    )
  }
}

// Helper to parse CSV lines properly (handles quoted values)
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}
