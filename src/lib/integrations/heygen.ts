import axios from 'axios'

export interface HeyGenAvatar {
  avatar_id: string
  avatar_name: string
  preview_image: string
  gender: string
}

export interface HeyGenVoice {
  voice_id: string
  language: string
  gender: string
  name: string
  preview_audio: string
}

export interface VideoGenerationRequest {
  avatar_id: string
  voice_id: string
  script: string
  title?: string
  dimension?: {
    width: number
    height: number
  }
}

export interface VideoStatus {
  video_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  video_url?: string
  error?: string
  duration?: number
}

export class HeyGenService {
  private apiKey: string
  private baseUrl = 'https://api.heygen.com'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  private getHeaders() {
    return {
      'X-API-KEY': this.apiKey,
      'Content-Type': 'application/json'
    }
  }

  async getAvatars(): Promise<HeyGenAvatar[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/v2/avatars`, {
        headers: this.getHeaders()
      })
      return response.data.data || []
    } catch (error) {
      console.error('Error fetching HeyGen avatars:', error)
      throw new Error('Failed to fetch avatars from HeyGen')
    }
  }

  async getVoices(): Promise<HeyGenVoice[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/v2/voices`, {
        headers: this.getHeaders()
      })
      return response.data.data || []
    } catch (error) {
      console.error('Error fetching HeyGen voices:', error)
      throw new Error('Failed to fetch voices from HeyGen')
    }
  }

  async generateVideo(request: VideoGenerationRequest): Promise<string> {
    try {
      const payload = {
        video_inputs: [{
          character: {
            type: 'avatar',
            avatar_id: request.avatar_id
          },
          voice: {
            type: 'text',
            input_text: request.script,
            voice_id: request.voice_id
          }
        }],
        dimension: request.dimension || { width: 1280, height: 720 },
        title: request.title || 'Sarah AI Video'
      }

      const response = await axios.post(`${this.baseUrl}/v2/video/generate`, payload, {
        headers: this.getHeaders()
      })

      return response.data.data.video_id
    } catch (error) {
      console.error('Error generating video:', error)
      throw new Error('Failed to generate video with HeyGen')
    }
  }

  async getVideoStatus(videoId: string): Promise<VideoStatus> {
    try {
      const response = await axios.get(`${this.baseUrl}/v1/video_status.get?video_id=${videoId}`, {
        headers: this.getHeaders()
      })

      const data = response.data.data
      return {
        video_id: videoId,
        status: data.status,
        video_url: data.video_url,
        error: data.error,
        duration: data.duration
      }
    } catch (error) {
      console.error('Error checking video status:', error)
      throw new Error('Failed to check video status')
    }
  }

  async waitForVideoCompletion(videoId: string, maxWaitTime = 300000): Promise<VideoStatus> {
    const startTime = Date.now()

    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.getVideoStatus(videoId)

      if (status.status === 'completed') {
        return status
      } else if (status.status === 'failed') {
        throw new Error(`Video generation failed: ${status.error}`)
      }

      // Wait 10 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 10000))
    }

    throw new Error('Video generation timed out')
  }

  async generateVideoComplete(request: VideoGenerationRequest): Promise<VideoStatus> {
    const videoId = await this.generateVideo(request)
    return this.waitForVideoCompletion(videoId)
  }
}