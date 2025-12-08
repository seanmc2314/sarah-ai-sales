import axios from 'axios'
import * as cheerio from 'cheerio'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

interface DealershipLead {
  dealershipName?: string
  website?: string
  location?: string
  phone?: string
  email?: string
  contactName?: string
  position?: string
}

// Scrape a dealership website for contact information
export async function scrapeDealershipWebsite(url: string): Promise<DealershipLead> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    })

    const $ = cheerio.load(response.data)
    const text = $('body').text()

    // Extract phone numbers
    const phoneRegex = /(\+?1[-.]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g
    const phones = text.match(phoneRegex) || []

    // Extract emails
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
    const emails = text.match(emailRegex) || []

    // Get page title for dealership name
    const title = $('title').text()

    // Extract location information
    const addressRegex = /\d+\s+[\w\s]+,\s*[\w\s]+,\s*[A-Z]{2}\s*\d{5}/g
    const addresses = text.match(addressRegex) || []

    // Look for "about us" or "contact" page
    const aboutLink = $('a[href*="about"], a[href*="contact"]').first().attr('href')
    const contactPage = aboutLink ? new URL(aboutLink, url).href : null

    const lead: DealershipLead = {
      dealershipName: title.replace(/\|.*/, '').trim(),
      website: url,
      phone: phones[0] || undefined,
      email: emails.find(e => !e.includes('example.com')),
      location: addresses[0] || undefined
    }

    // If we found a contact page, try to scrape it for more info
    if (contactPage && contactPage !== url) {
      try {
        const contactData = await scrapeDealershipWebsite(contactPage)
        Object.assign(lead, contactData)
      } catch (error) {
        console.log('Could not scrape contact page:', error)
      }
    }

    return lead
  } catch (error) {
    console.error('Error scraping website:', url, error)
    throw error
  }
}

// Use AI to enrich prospect data from website content
export async function enrichProspectWithAI(
  prospectId: string,
  dealershipWebsite: string
): Promise<void> {
  try {
    const leadData = await scrapeDealershipWebsite(dealershipWebsite)

    // Use AI to extract decision maker information
    const aiPrompt = `Based on this dealership information, identify likely decision makers (GM, President, Owner):
Website: ${dealershipWebsite}
Dealership: ${leadData.dealershipName}
Location: ${leadData.location}
Phone: ${leadData.phone}

Return a JSON object with: { contactName: "name or 'Unknown'", position: "likely position", insights: "any useful notes" }`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: aiPrompt
      }],
      response_format: { type: 'json_object' },
      temperature: 0.3
    })

    const aiData = JSON.parse(completion.choices[0].message.content || '{}')

    // Update prospect with enriched data
    await prisma.prospect.update({
      where: { id: prospectId },
      data: {
        dealership: leadData.dealershipName || undefined,
        dealershipWebsite,
        location: leadData.location || undefined,
        phone: leadData.phone || undefined,
        email: leadData.email || undefined,
        notes: aiData.insights || undefined,
        enriched: true,
        enrichedAt: new Date()
      }
    })

    console.log(`Enriched prospect ${prospectId} with data from ${dealershipWebsite}`)
  } catch (error) {
    console.error('Error enriching prospect:', error)
    throw error
  }
}

// Search Google for dealerships in a specific location
export async function searchDealerships(
  location: string,
  limit: number = 10
): Promise<DealershipLead[]> {
  // Note: This is a placeholder. In production, you would use:
  // 1. Google Places API (requires API key)
  // 2. Bing Search API
  // 3. Third-party dealership directories

  const leads: DealershipLead[] = []

  // For now, return a message that this needs API integration
  console.log(`Searching for dealerships in ${location} (requires API integration)`)

  // TODO: Integrate with Google Places API or similar service
  // Example with Google Places API:
  // const response = await fetch(
  //   `https://maps.googleapis.com/maps/api/place/textsearch/json?query=car+dealership+in+${location}&key=${process.env.GOOGLE_PLACES_API_KEY}`
  // )

  return leads
}

// Bulk enrich prospects that have websites but aren't enriched yet
export async function bulkEnrichProspects(userId: string, limit: number = 10) {
  const prospects = await prisma.prospect.findMany({
    where: {
      userId,
      enriched: false,
      dealershipWebsite: {
        not: null
      }
    },
    take: limit
  })

  const results = {
    processed: 0,
    enriched: 0,
    failed: 0
  }

  for (const prospect of prospects) {
    try {
      if (prospect.dealershipWebsite) {
        await enrichProspectWithAI(prospect.id, prospect.dealershipWebsite)
        results.enriched++
      }
    } catch (error) {
      console.error(`Failed to enrich prospect ${prospect.id}:`, error)
      results.failed++
    }
    results.processed++
  }

  return results
}
