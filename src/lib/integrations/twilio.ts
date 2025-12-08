import twilio from 'twilio'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

export class TwilioService {
  async sendSMS(to: string, message: string) {
    try {
      const result = await client.messages.create({
        body: message,
        from: process.env.TWILIO_FROM_NUMBER,
        to: to
      })
      return result
    } catch (error) {
      console.error('Error sending SMS:', error)
      throw error
    }
  }

  async makeCall(to: string, twimlUrl: string) {
    try {
      const call = await client.calls.create({
        url: twimlUrl,
        to: to,
        from: process.env.TWILIO_FROM_NUMBER
      })
      return call
    } catch (error) {
      console.error('Error making call:', error)
      throw error
    }
  }

  async createTwiMLResponse(script: string) {
    const VoiceResponse = twilio.twiml.VoiceResponse
    const response = new VoiceResponse()

    response.say({
      voice: 'alice',
      language: 'en-US'
    }, script)

    response.gather({
      input: ['speech'],
      action: '/api/voice/response',
      method: 'POST',
      speechTimeout: 'auto'
    })

    return response.toString()
  }

  async getCallDetails(callSid: string) {
    try {
      const call = await client.calls(callSid).fetch()
      return call
    } catch (error) {
      console.error('Error fetching call details:', error)
      throw error
    }
  }

  async getCallRecording(callSid: string) {
    try {
      const recordings = await client.recordings.list({
        callSid: callSid,
        limit: 1
      })
      return recordings[0]
    } catch (error) {
      console.error('Error fetching call recording:', error)
      throw error
    }
  }
}