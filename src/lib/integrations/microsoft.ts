import { Client } from '@microsoft/microsoft-graph-client'
import { AuthenticationProvider } from '@microsoft/microsoft-graph-client'

class CustomAuthProvider implements AuthenticationProvider {
  private accessToken: string

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  async getAccessToken(): Promise<string> {
    return this.accessToken
  }
}

export class MicrosoftCalendarService {
  private client: Client

  constructor(accessToken: string) {
    const authProvider = new CustomAuthProvider(accessToken)
    this.client = Client.initWithMiddleware({ authProvider })
  }

  async createEvent(event: {
    subject: string
    body: string
    start: string
    end: string
    attendees?: string[]
    location?: string
  }) {
    const calendarEvent = {
      subject: event.subject,
      body: {
        contentType: 'HTML',
        content: event.body
      },
      start: {
        dateTime: event.start,
        timeZone: 'UTC'
      },
      end: {
        dateTime: event.end,
        timeZone: 'UTC'
      },
      location: event.location ? {
        displayName: event.location
      } : undefined,
      attendees: event.attendees?.map(email => ({
        emailAddress: {
          address: email,
          name: email
        }
      }))
    }

    try {
      const response = await this.client.api('/me/events').post(calendarEvent)
      return response
    } catch (error) {
      console.error('Error creating calendar event:', error)
      throw error
    }
  }

  async getEvents(startDate: string, endDate: string) {
    try {
      const events = await this.client
        .api('/me/events')
        .filter(`start/dateTime ge '${startDate}' and end/dateTime le '${endDate}'`)
        .select('id,subject,start,end,location,attendees')
        .get()

      return events.value
    } catch (error) {
      console.error('Error fetching calendar events:', error)
      throw error
    }
  }

  async updateEvent(eventId: string, updates: any) {
    try {
      const response = await this.client.api(`/me/events/${eventId}`).patch(updates)
      return response
    } catch (error) {
      console.error('Error updating calendar event:', error)
      throw error
    }
  }

  async deleteEvent(eventId: string) {
    try {
      await this.client.api(`/me/events/${eventId}`).delete()
      return true
    } catch (error) {
      console.error('Error deleting calendar event:', error)
      throw error
    }
  }
}

export class MicrosoftEmailService {
  private client: Client

  constructor(accessToken: string) {
    const authProvider = new CustomAuthProvider(accessToken)
    this.client = Client.initWithMiddleware({ authProvider })
  }

  async sendEmail(email: {
    to: string[]
    subject: string
    body: string
    isHtml?: boolean
  }) {
    const message = {
      message: {
        subject: email.subject,
        body: {
          contentType: email.isHtml ? 'HTML' : 'Text',
          content: email.body
        },
        toRecipients: email.to.map(address => ({
          emailAddress: {
            address
          }
        }))
      }
    }

    try {
      await this.client.api('/me/sendMail').post(message)
      return true
    } catch (error) {
      console.error('Error sending email:', error)
      throw error
    }
  }
}