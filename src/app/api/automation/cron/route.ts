import { NextRequest, NextResponse } from 'next/server'
import { processDueFollowUps, checkAndEnrollProspects } from '@/lib/automation/followUpEngine'

// This endpoint should be called by a cron job (e.g., Vercel Cron, or external service)
// Call every 15 minutes to process follow-ups
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'default-secret-change-this'

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[CRON] Starting automation tasks...')

    // Process due follow-ups
    const followUpResults = await processDueFollowUps()
    console.log(`[CRON] Processed ${followUpResults.length} follow-ups`)

    // Check for prospects to auto-enroll in sequences
    const enrollmentResults = await checkAndEnrollProspects()
    console.log(`[CRON] Auto-enrolled ${enrollmentResults.enrolled} prospects`)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results: {
        followUpsProcessed: followUpResults.length,
        prospectsEnrolled: enrollmentResults.enrolled
      }
    })
  } catch (error) {
    console.error('[CRON] Automation error:', error)
    return NextResponse.json(
      { error: 'Automation failed', details: error },
      { status: 500 }
    )
  }
}

// GET endpoint for manual triggering (development only)
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  return POST(request)
}
