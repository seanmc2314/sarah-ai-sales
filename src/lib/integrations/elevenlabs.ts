// ElevenLabs Voice Synthesis for Sarah AI
// Sarah's voice for all Supreme One programs

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1'

export interface ElevenLabsVoice {
  voice_id: string
  name: string
  preview_url?: string
  category?: string
}

export interface SpeechOptions {
  voiceId?: string
  modelId?: string
  stability?: number
  similarityBoost?: number
  style?: number
  useSpeakerBoost?: boolean
}

// Sarah's voice configuration - update this with your cloned/selected voice
const SARAH_VOICE_ID = process.env.ELEVENLABS_SARAH_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL' // Default: Sarah (ElevenLabs stock)

export class ElevenLabsService {
  private apiKey: string
  private sarahVoiceId: string

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || ''
    this.sarahVoiceId = SARAH_VOICE_ID

    if (!this.apiKey) {
      console.warn('ElevenLabs API key not configured')
    }
  }

  /**
   * Generate speech audio from text using Sarah's voice
   */
  async textToSpeech(text: string, options?: SpeechOptions): Promise<ArrayBuffer> {
    const voiceId = options?.voiceId || this.sarahVoiceId

    const response = await fetch(
      `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: options?.modelId || 'eleven_turbo_v2_5', // Fast + high quality
          voice_settings: {
            stability: options?.stability ?? 0.5,
            similarity_boost: options?.similarityBoost ?? 0.75,
            style: options?.style ?? 0.5,
            use_speaker_boost: options?.useSpeakerBoost ?? true,
          },
        }),
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(`ElevenLabs API error: ${response.status} - ${JSON.stringify(error)}`)
    }

    return response.arrayBuffer()
  }

  /**
   * Generate speech and return as base64 string (for easy frontend use)
   */
  async textToSpeechBase64(text: string, options?: SpeechOptions): Promise<string> {
    const audioBuffer = await this.textToSpeech(text, options)
    const base64 = Buffer.from(audioBuffer).toString('base64')
    return `data:audio/mpeg;base64,${base64}`
  }

  /**
   * Stream speech audio for real-time playback
   */
  async textToSpeechStream(text: string, options?: SpeechOptions): Promise<ReadableStream<Uint8Array>> {
    const voiceId = options?.voiceId || this.sarahVoiceId

    const response = await fetch(
      `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}/stream`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: options?.modelId || 'eleven_turbo_v2_5',
          voice_settings: {
            stability: options?.stability ?? 0.5,
            similarity_boost: options?.similarityBoost ?? 0.75,
            style: options?.style ?? 0.5,
            use_speaker_boost: options?.useSpeakerBoost ?? true,
          },
        }),
      }
    )

    if (!response.ok || !response.body) {
      throw new Error(`ElevenLabs streaming error: ${response.status}`)
    }

    return response.body
  }

  /**
   * Get list of available voices
   */
  async getVoices(): Promise<ElevenLabsVoice[]> {
    const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
      headers: {
        'xi-api-key': this.apiKey,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch voices: ${response.status}`)
    }

    const data = await response.json()
    return data.voices || []
  }

  /**
   * Get Sarah's configured voice ID
   */
  getSarahVoiceId(): string {
    return this.sarahVoiceId
  }

  /**
   * Check API key status and usage
   */
  async getSubscriptionInfo(): Promise<{
    character_count: number
    character_limit: number
    remaining: number
  }> {
    const response = await fetch(`${ELEVENLABS_API_URL}/user/subscription`, {
      headers: {
        'xi-api-key': this.apiKey,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch subscription: ${response.status}`)
    }

    const data = await response.json()
    return {
      character_count: data.character_count || 0,
      character_limit: data.character_limit || 0,
      remaining: (data.character_limit || 0) - (data.character_count || 0),
    }
  }
}

// Singleton instance
let elevenlabsInstance: ElevenLabsService | null = null

export function getElevenLabsService(): ElevenLabsService {
  if (!elevenlabsInstance) {
    elevenlabsInstance = new ElevenLabsService()
  }
  return elevenlabsInstance
}
