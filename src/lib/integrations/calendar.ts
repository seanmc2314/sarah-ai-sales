import { Client } from '@microsoft/microsoft-graph-client'

export interface CalendarEvent {
  id?: string
  subject: string
  body: string
  start: Date
  end: Date
  attendees: string[]
  location?: string
  onlineUrl?: string
  isOnline?: boolean
}

export interface TimeSlot {
  start: Date
  end: Date
  available: boolean
}

export interface AvailabilityRequest {
  date: string // YYYY-MM-DD
  timeZone?: string
  workingHours?: {
    start: string // HH:MM
    end: string // HH:MM
  }
}

export class CalendarService {
  private client: Client
  private accessToken: string

  constructor(accessToken: string) {
    this.accessToken = accessToken
    this.client = Client.init({
      authProvider: (done) => {
        done(null, this.accessToken)
      }
    })
  }

  async getAvailability(request: AvailabilityRequest): Promise<TimeSlot[]> {
    try {
      const { date, timeZone = 'UTC', workingHours = { start: '09:00', end: '17:00' } } = request

      const startTime = new Date(`${date}T${workingHours.start}:00`)
      const endTime = new Date(`${date}T${workingHours.end}:00`)

      // Get calendar view for the specified date
      const events = await this.client
        .api('/me/calendarview')
        .query({
          startdatetime: startTime.toISOString(),
          enddatetime: endTime.toISOString(),
          $select: 'subject,start,end,showAs'
        })
        .get()

      // Generate 30-minute time slots
      const slots: TimeSlot[] = []
      const current = new Date(startTime)

      while (current < endTime) {
        const slotEnd = new Date(current.getTime() + 30 * 60 * 1000) // 30 minutes

        // Check if this slot conflicts with any existing events
        const hasConflict = events.value.some((event: any) => {
          const eventStart = new Date(event.start.dateTime)
          const eventEnd = new Date(event.end.dateTime)

          return (
            (current >= eventStart && current < eventEnd) ||
            (slotEnd > eventStart && slotEnd <= eventEnd) ||
            (current <= eventStart && slotEnd >= eventEnd)
          )
        })

        slots.push({
          start: new Date(current),
          end: new Date(slotEnd),
          available: !hasConflict
        })

        current.setTime(current.getTime() + 30 * 60 * 1000)
      }

      return slots
    } catch (error) {
      console.error('Error getting availability:', error)
      throw new Error('Failed to check calendar availability')
    }
  }

  async createAppointment(event: CalendarEvent): Promise<string> {
    try {
      const microsoftEvent = {
        subject: event.subject,
        body: {
          contentType: 'HTML',
          content: event.body
        },
        start: {
          dateTime: event.start.toISOString(),
          timeZone: 'UTC'
        },
        end: {
          dateTime: event.end.toISOString(),
          timeZone: 'UTC'
        },
        attendees: event.attendees.map(email => ({
          emailAddress: {
            address: email,
            name: email.split('@')[0]
          }
        })),
        location: event.location ? {
          displayName: event.location
        } : undefined,
        isOnlineMeeting: event.isOnline || false,
        onlineMeetingProvider: event.isOnline ? 'teamsForBusiness' : undefined
      }

      const createdEvent = await this.client
        .api('/me/events')
        .post(microsoftEvent)

      return createdEvent.id
    } catch (error) {
      console.error('Error creating appointment:', error)
      throw new Error('Failed to create calendar appointment')
    }
  }

  async updateAppointment(eventId: string, updates: Partial<CalendarEvent>): Promise<void> {
    try {
      const updateData: any = {}

      if (updates.subject) updateData.subject = updates.subject
      if (updates.body) {
        updateData.body = {
          contentType: 'HTML',
          content: updates.body
        }
      }
      if (updates.start) {
        updateData.start = {
          dateTime: updates.start.toISOString(),
          timeZone: 'UTC'
        }
      }
      if (updates.end) {
        updateData.end = {
          dateTime: updates.end.toISOString(),
          timeZone: 'UTC'
        }
      }
      if (updates.location) {
        updateData.location = {
          displayName: updates.location
        }
      }

      await this.client
        .api(`/me/events/${eventId}`)
        .patch(updateData)

    } catch (error) {
      console.error('Error updating appointment:', error)
      throw new Error('Failed to update calendar appointment')
    }
  }

  async cancelAppointment(eventId: string): Promise<void> {
    try {
      await this.client
        .api(`/me/events/${eventId}`)
        .delete()

    } catch (error) {
      console.error('Error canceling appointment:', error)
      throw new Error('Failed to cancel calendar appointment')
    }
  }

  async sendMeetingInvite(event: CalendarEvent, message?: string): Promise<void> {
    try {
      const invitation = {
        message: {
          subject: `Meeting Invitation: ${event.subject}`,
          body: {
            contentType: 'HTML',
            content: `
              <div>
                <h3>${event.subject}</h3>
                <p><strong>Date:</strong> ${event.start.toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${event.start.toLocaleTimeString()} - ${event.end.toLocaleTimeString()}</p>
                ${event.location ? `<p><strong>Location:</strong> ${event.location}</p>` : ''}
                ${event.onlineUrl ? `<p><strong>Join Online:</strong> <a href="${event.onlineUrl}">${event.onlineUrl}</a></p>` : ''}
                <div>${event.body}</div>
                ${message ? `<div style="margin-top: 20px;"><p>${message}</p></div>` : ''}
                <p>Best regards,<br>Sarah AI<br>Supreme One Training</p>
              </div>
            `
          },
          toRecipients: event.attendees.map(email => ({
            emailAddress: {
              address: email
            }
          }))
        }
      }

      await this.client
        .api('/me/sendMail')
        .post(invitation)

    } catch (error) {
      console.error('Error sending meeting invite:', error)
      throw new Error('Failed to send meeting invitation')
    }
  }

  async getUpcomingAppointments(days: number = 7): Promise<any[]> {
    try {
      const startTime = new Date()
      const endTime = new Date(Date.now() + days * 24 * 60 * 60 * 1000)

      const events = await this.client
        .api('/me/calendarview')
        .query({
          startdatetime: startTime.toISOString(),
          enddatetime: endTime.toISOString(),
          $select: 'id,subject,start,end,attendees,location,webLink',
          $orderby: 'start/dateTime'
        })
        .get()

      return events.value
    } catch (error) {
      console.error('Error getting upcoming appointments:', error)
      throw new Error('Failed to get upcoming appointments')
    }
  }

  async generateCalendlyAlternative(availableSlots: TimeSlot[]): Promise<{
    bookingUrl: string
    embedCode: string
  }> {
    // This would integrate with your own booking system
    // For now, return a placeholder that could be implemented
    const availableTimesHtml = availableSlots
      .filter(slot => slot.available)
      .map(slot => `
        <button onclick="bookSlot('${slot.start.toISOString()}', '${slot.end.toISOString()}')"
                style="display: block; width: 100%; margin: 5px 0; padding: 10px;
                       background: #3498db; color: white; border: none; border-radius: 5px;">
          ${slot.start.toLocaleTimeString()} - ${slot.end.toLocaleTimeString()}
        </button>
      `).join('')

    const embedCode = `
      <div id="sarah-ai-booking" style="max-width: 400px; margin: 0 auto; padding: 20px;">
        <h3>Schedule a Consultation with Sarah AI</h3>
        <p>Select an available time slot:</p>
        ${availableTimesHtml}
        <script>
          function bookSlot(start, end) {
            // This would make an API call to book the appointment
            alert('Booking system would be integrated here');
          }
        </script>
      </div>
    `

    return {
      bookingUrl: 'https://your-domain.com/book-sarah-ai',
      embedCode
    }
  }
}