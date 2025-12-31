// D-ID Avatar Streaming for Sarah AI
// Real-time lip-synced avatar for interactive presentations

const DID_API_URL = 'https://api.d-id.com'

export interface DIDTalkConfig {
  script: {
    type: 'text' | 'audio'
    input?: string        // Text to speak
    audio_url?: string    // Or audio URL
    provider?: {
      type: 'elevenlabs'
      voice_id: string
    }
  }
  source_url?: string    // Sarah's image URL
  driver_url?: string    // Optional driver video
  config?: {
    stitch?: boolean
    fluent?: boolean
    pad_audio?: number
    result_format?: 'mp4' | 'gif' | 'webm'
  }
}

export interface DIDStreamConfig {
  source_url: string     // Sarah's image
  driver_url?: string
  stream_warmup?: boolean
}

export interface DIDSession {
  id: string
  session_id: string
  stream_url?: string
  ice_servers?: RTCIceServer[]
  offer?: RTCSessionDescriptionInit
}

// Sarah's avatar image - update with actual hosted image
const SARAH_IMAGE_URL = process.env.DID_SARAH_IMAGE_URL || ''

export class DIDService {
  private apiKey: string
  private sarahImageUrl: string
  private activeSession: DIDSession | null = null

  constructor() {
    this.apiKey = process.env.DID_API_KEY || ''
    this.sarahImageUrl = SARAH_IMAGE_URL

    if (!this.apiKey) {
      console.warn('D-ID API key not configured')
    }
  }

  /**
   * Create a video of Sarah speaking the given text
   * Good for pre-recorded content
   */
  async createTalkVideo(text: string, voiceId?: string): Promise<{
    id: string
    status: string
    result_url?: string
  }> {
    const response = await fetch(`${DID_API_URL}/talks`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        script: {
          type: 'text',
          input: text,
          provider: voiceId ? {
            type: 'elevenlabs',
            voice_id: voiceId,
          } : undefined,
        },
        source_url: this.sarahImageUrl,
        config: {
          fluent: true,
          pad_audio: 0.5,
          result_format: 'mp4',
        },
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(`D-ID API error: ${response.status} - ${JSON.stringify(error)}`)
    }

    return response.json()
  }

  /**
   * Create a streaming session for real-time conversation
   * This is what we need for interactive Sarah
   */
  async createStreamSession(): Promise<DIDSession> {
    const response = await fetch(`${DID_API_URL}/talks/streams`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_url: this.sarahImageUrl,
        stream_warmup: true,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(`D-ID stream creation failed: ${response.status} - ${JSON.stringify(error)}`)
    }

    const session = await response.json()
    this.activeSession = session
    return session
  }

  /**
   * Start streaming with WebRTC SDP exchange
   */
  async startStream(sessionId: string, sdpAnswer: RTCSessionDescriptionInit): Promise<void> {
    const response = await fetch(`${DID_API_URL}/talks/streams/${sessionId}/sdp`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        answer: sdpAnswer,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to start stream: ${response.status}`)
    }
  }

  /**
   * Send ICE candidate for WebRTC connection
   */
  async sendIceCandidate(sessionId: string, candidate: RTCIceCandidate): Promise<void> {
    const response = await fetch(`${DID_API_URL}/talks/streams/${sessionId}/ice`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        candidate: candidate.candidate,
        sdpMid: candidate.sdpMid,
        sdpMLineIndex: candidate.sdpMLineIndex,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to send ICE candidate: ${response.status}`)
    }
  }

  /**
   * Make Sarah speak during an active stream session
   */
  async streamSpeak(sessionId: string, text: string, voiceId?: string): Promise<void> {
    const response = await fetch(`${DID_API_URL}/talks/streams/${sessionId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        script: {
          type: 'text',
          input: text,
          provider: voiceId ? {
            type: 'elevenlabs',
            voice_id: voiceId,
          } : undefined,
        },
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(`Stream speak failed: ${response.status} - ${JSON.stringify(error)}`)
    }
  }

  /**
   * Make Sarah speak using pre-generated audio
   */
  async streamSpeakWithAudio(sessionId: string, audioUrl: string): Promise<void> {
    const response = await fetch(`${DID_API_URL}/talks/streams/${sessionId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        script: {
          type: 'audio',
          audio_url: audioUrl,
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`Stream speak with audio failed: ${response.status}`)
    }
  }

  /**
   * Close the streaming session
   */
  async closeStream(sessionId: string): Promise<void> {
    const response = await fetch(`${DID_API_URL}/talks/streams/${sessionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Basic ${this.apiKey}`,
      },
    })

    if (!response.ok) {
      console.warn(`Failed to close stream: ${response.status}`)
    }

    if (this.activeSession?.session_id === sessionId) {
      this.activeSession = null
    }
  }

  /**
   * Get status of a talk video
   */
  async getTalkStatus(talkId: string): Promise<{
    id: string
    status: string
    result_url?: string
    error?: string
  }> {
    const response = await fetch(`${DID_API_URL}/talks/${talkId}`, {
      headers: {
        'Authorization': `Basic ${this.apiKey}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to get talk status: ${response.status}`)
    }

    return response.json()
  }

  /**
   * Wait for talk video to complete
   */
  async waitForTalkCompletion(talkId: string, maxWaitMs: number = 60000): Promise<string> {
    const startTime = Date.now()

    while (Date.now() - startTime < maxWaitMs) {
      const status = await this.getTalkStatus(talkId)

      if (status.status === 'done' && status.result_url) {
        return status.result_url
      }

      if (status.status === 'error') {
        throw new Error(`Talk generation failed: ${status.error}`)
      }

      // Wait 2 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    throw new Error('Talk generation timed out')
  }

  /**
   * Check API credits
   */
  async getCredits(): Promise<{
    remaining: number
    total: number
  }> {
    const response = await fetch(`${DID_API_URL}/credits`, {
      headers: {
        'Authorization': `Basic ${this.apiKey}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to get credits: ${response.status}`)
    }

    const data = await response.json()
    return {
      remaining: data.remaining || 0,
      total: data.total || 0,
    }
  }

  /**
   * Get Sarah's configured image URL
   */
  getSarahImageUrl(): string {
    return this.sarahImageUrl
  }

  /**
   * Set Sarah's image URL (for dynamic configuration)
   */
  setSarahImageUrl(url: string): void {
    this.sarahImageUrl = url
  }

  /**
   * Get active session if any
   */
  getActiveSession(): DIDSession | null {
    return this.activeSession
  }
}

// Singleton instance
let didInstance: DIDService | null = null

export function getDIDService(): DIDService {
  if (!didInstance) {
    didInstance = new DIDService()
  }
  return didInstance
}
