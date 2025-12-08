import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CalendarService } from '@/lib/integrations/calendar'
import { SarahAI } from '@/lib/ai'
import { EmailService } from '@/lib/integrations/email'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const availability = searchParams.get('availability')

    // Check availability for a specific date
    if (availability === 'true' && date) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id }
      })

      if (user?.microsoftAccessToken) {
        try {
          const calendar = new CalendarService(user.microsoftAccessToken)
          const timeSlots = await calendar.getAvailability({ date })
          return NextResponse.json({ timeSlots })
        } catch (error) {
          console.error('Calendar availability error:', error)
          // Return default business hours if calendar fails
          const defaultSlots = generateDefaultTimeSlots(date)
          return NextResponse.json({ timeSlots: defaultSlots })
        }
      } else {
        // Return default business hours if no calendar integration
        const defaultSlots = generateDefaultTimeSlots(date)
        return NextResponse.json({ timeSlots: defaultSlots })
      }
    }

    let whereClause: any = {
      userId: session.user.id
    }

    if (date) {
      const startDate = new Date(date)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(date)
      endDate.setHours(23, 59, 59, 999)

      whereClause.startTime = {
        gte: startDate,
        lte: endDate
      }
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        prospect: {
          select: {
            firstName: true,
            lastName: true,
            company: true,
            email: true
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    })

    return NextResponse.json(appointments)

  } catch (error) {
    console.error('Appointments API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      title,
      description,
      startTime,
      endTime,
      prospectId,
      location,
      meetingLink,
      notes,
      sendInvite,
      createCalendarEvent
    } = await request.json()

    if (!title || !startTime || !endTime || !prospectId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify prospect belongs to user
    const prospect = await prisma.prospect.findFirst({
      where: {
        id: prospectId,
        userId: session.user.id
      }
    })

    if (!prospect) {
      return NextResponse.json(
        { error: 'Prospect not found' },
        { status: 404 }
      )
    }

    const appointment = await prisma.appointment.create({
      data: {
        title,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        location,
        meetingLink,
        notes,
        status: 'SCHEDULED',
        prospectId,
        userId: session.user.id
      },
      include: {
        prospect: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            company: true,
            position: true
          }
        }
      }
    })

    // Get user for integrations
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    let calendarEventId: string | undefined

    // Create calendar event if requested and token available
    if (createCalendarEvent && user?.microsoftAccessToken) {
      try {
        const calendar = new CalendarService(user.microsoftAccessToken)
        const calendarEvent = {
          subject: title,
          body: description || '',
          start: new Date(startTime),
          end: new Date(endTime),
          attendees: prospect.email ? [prospect.email] : [],
          location,
          onlineUrl: meetingLink,
          isOnline: !!meetingLink
        }

        calendarEventId = await calendar.createAppointment(calendarEvent)

        // Update appointment with calendar event ID
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: { notes: `${notes || ''}\\nCalendar Event ID: ${calendarEventId}` }
        })
      } catch (error) {
        console.error('Failed to create calendar event:', error)
      }
    }

    // Send invitation email if requested
    if (sendInvite && prospect.email && user) {
      try {
        const emailConfig = {
          host: process.env.EMAIL_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.EMAIL_PORT || '587'),
          secure: false,
          user: process.env.EMAIL_USER || '',
          password: process.env.EMAIL_PASSWORD || '',
          fromName: 'Sarah AI - Supreme One Training',
          fromEmail: process.env.EMAIL_USER || ''
        }

        const emailService = new EmailService(emailConfig)
        const emailTemplate = {
          subject: `Appointment Confirmation: ${title}`,
          htmlBody: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Appointment Confirmation</h2>
              <p>Hi ${prospect.firstName},</p>
              <p>This confirms our scheduled consultation:</p>
              <div style="background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <strong>Subject:</strong> ${title}<br>
                <strong>Date:</strong> ${new Date(startTime).toLocaleDateString()}<br>
                <strong>Time:</strong> ${new Date(startTime).toLocaleTimeString()} - ${new Date(endTime).toLocaleTimeString()}<br>
                ${location ? `<strong>Location:</strong> ${location}<br>` : ''}
                ${meetingLink ? `<strong>Join Online:</strong> <a href="${meetingLink}">${meetingLink}</a><br>` : ''}
              </div>
              <p>${description || ''}</p>
              <p>I'm looking forward to discussing how Supreme One Training can help ${prospect.company} achieve improved F&I performance.</p>
              <p>Best regards,<br>Sarah AI<br>Supreme One Training</p>
            </div>
          `,
          textBody: `
Hi ${prospect.firstName},

This confirms our scheduled consultation:

Subject: ${title}
Date: ${new Date(startTime).toLocaleDateString()}
Time: ${new Date(startTime).toLocaleTimeString()} - ${new Date(endTime).toLocaleTimeString()}
${location ? `Location: ${location}` : ''}
${meetingLink ? `Join Online: ${meetingLink}` : ''}

${description || ''}

I'm looking forward to discussing how Supreme One Training can help ${prospect.company} achieve improved F&I performance.

Best regards,
Sarah AI
Supreme One Training
          `
        }

        const recipient = {
          email: prospect.email,
          firstName: prospect.firstName,
          lastName: prospect.lastName,
          company: prospect.company || ''
        }

        await emailService.sendEmail(recipient, emailTemplate)

        // Create interaction record for the invitation
        await prisma.interaction.create({
          data: {
            type: 'EMAIL',
            content: 'Appointment confirmation sent',
            result: 'Email sent successfully',
            completedAt: new Date(),
            successful: true,
            prospectId: prospect.id
          }
        })

      } catch (error) {
        console.error('Failed to send appointment invitation:', error)
      }
    }

    // Update prospect status
    await prisma.prospect.update({
      where: { id: prospectId },
      data: {
        status: 'APPOINTMENT_SET',
        lastContactDate: new Date()
      }
    })

    return NextResponse.json({ ...appointment, calendarEventId }, { status: 201 })

  } catch (error) {
    console.error('Create appointment API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function generateDefaultTimeSlots(date: string) {
  const slots = []
  const startHour = 9 // 9 AM
  const endHour = 17 // 5 PM
  const slotDuration = 30 // 30 minutes

  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += slotDuration) {
      const start = new Date(`${date}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`)
      const end = new Date(start.getTime() + slotDuration * 60 * 1000)

      slots.push({
        start,
        end,
        available: true // Default to available
      })
    }
  }

  return slots
}