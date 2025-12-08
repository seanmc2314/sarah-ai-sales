import axios from 'axios'

export interface SocialMediaPost {
  platform: 'LINKEDIN' | 'INSTAGRAM' | 'FACEBOOK' | 'YOUTUBE'
  content: string
  mediaUrl?: string
  mediaType?: 'image' | 'video'
  scheduledAt?: Date
  hashtags?: string[]
}

export interface InstagramAPI {
  accessToken: string
  userId: string
}

export interface FacebookAPI {
  accessToken: string
  pageId: string
}

export interface YouTubeAPI {
  accessToken: string
  channelId: string
}

export class SocialMediaService {
  private instagramConfig?: InstagramAPI
  private facebookConfig?: FacebookAPI
  private youtubeConfig?: YouTubeAPI

  constructor(configs: {
    instagram?: InstagramAPI
    facebook?: FacebookAPI
    youtube?: YouTubeAPI
  }) {
    this.instagramConfig = configs.instagram
    this.facebookConfig = configs.facebook
    this.youtubeConfig = configs.youtube
  }

  async postToInstagram(post: SocialMediaPost): Promise<string> {
    if (!this.instagramConfig) {
      throw new Error('Instagram configuration not provided')
    }

    try {
      if (post.mediaUrl && post.mediaType === 'video') {
        // Instagram Video Post
        const mediaResponse = await axios.post(
          `https://graph.facebook.com/v18.0/${this.instagramConfig.userId}/media`,
          {
            media_type: 'VIDEO',
            video_url: post.mediaUrl,
            caption: post.content,
            access_token: this.instagramConfig.accessToken
          }
        )

        const mediaId = mediaResponse.data.id

        // Publish the video
        const publishResponse = await axios.post(
          `https://graph.facebook.com/v18.0/${this.instagramConfig.userId}/media_publish`,
          {
            creation_id: mediaId,
            access_token: this.instagramConfig.accessToken
          }
        )

        return publishResponse.data.id
      } else {
        throw new Error('Instagram requires video content for this implementation')
      }
    } catch (error) {
      console.error('Error posting to Instagram:', error)
      throw new Error('Failed to post to Instagram')
    }
  }

  async postToFacebook(post: SocialMediaPost): Promise<string> {
    if (!this.facebookConfig) {
      throw new Error('Facebook configuration not provided')
    }

    try {
      if (post.mediaUrl && post.mediaType === 'video') {
        // Facebook Video Post
        const response = await axios.post(
          `https://graph.facebook.com/v18.0/${this.facebookConfig.pageId}/videos`,
          {
            description: post.content,
            file_url: post.mediaUrl,
            access_token: this.facebookConfig.accessToken
          }
        )

        return response.data.id
      } else {
        // Text-only Facebook Post
        const response = await axios.post(
          `https://graph.facebook.com/v18.0/${this.facebookConfig.pageId}/feed`,
          {
            message: post.content,
            access_token: this.facebookConfig.accessToken
          }
        )

        return response.data.id
      }
    } catch (error) {
      console.error('Error posting to Facebook:', error)
      throw new Error('Failed to post to Facebook')
    }
  }

  async uploadToYouTube(post: SocialMediaPost): Promise<string> {
    if (!this.youtubeConfig || !post.mediaUrl || post.mediaType !== 'video') {
      throw new Error('YouTube requires video content and configuration')
    }

    try {
      // YouTube video upload requires OAuth2 and multipart upload
      // This is a simplified version - full implementation requires Google API client
      const response = await axios.post(
        'https://www.googleapis.com/upload/youtube/v3/videos',
        {
          snippet: {
            title: post.content.split('\\n')[0] || 'Sarah AI Video',
            description: post.content,
            tags: post.hashtags,
            categoryId: '22' // People & Blogs category
          },
          status: {
            privacyStatus: 'public'
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.youtubeConfig.accessToken}`,
            'Content-Type': 'application/json'
          },
          params: {
            part: 'snippet,status'
          }
        }
      )

      return response.data.id
    } catch (error) {
      console.error('Error uploading to YouTube:', error)
      throw new Error('Failed to upload to YouTube')
    }
  }

  async postToAllPlatforms(post: SocialMediaPost): Promise<{
    instagram?: string
    facebook?: string
    youtube?: string
    errors: string[]
  }> {
    const results: any = { errors: [] }

    // Post to Instagram
    if (this.instagramConfig && post.mediaUrl && post.mediaType === 'video') {
      try {
        results.instagram = await this.postToInstagram(post)
      } catch (error) {
        results.errors.push(`Instagram: ${error}`)
      }
    }

    // Post to Facebook
    if (this.facebookConfig) {
      try {
        results.facebook = await this.postToFacebook(post)
      } catch (error) {
        results.errors.push(`Facebook: ${error}`)
      }
    }

    // Upload to YouTube
    if (this.youtubeConfig && post.mediaUrl && post.mediaType === 'video') {
      try {
        results.youtube = await this.uploadToYouTube(post)
      } catch (error) {
        results.errors.push(`YouTube: ${error}`)
      }
    }

    return results
  }

  async validateTokens(): Promise<{
    instagram: boolean
    facebook: boolean
    youtube: boolean
  }> {
    const validation = {
      instagram: false,
      facebook: false,
      youtube: false
    }

    // Validate Instagram token
    if (this.instagramConfig) {
      try {
        await axios.get(
          `https://graph.facebook.com/v18.0/${this.instagramConfig.userId}`,
          {
            params: { access_token: this.instagramConfig.accessToken }
          }
        )
        validation.instagram = true
      } catch (error) {
        console.error('Instagram token validation failed:', error)
      }
    }

    // Validate Facebook token
    if (this.facebookConfig) {
      try {
        await axios.get(
          `https://graph.facebook.com/v18.0/${this.facebookConfig.pageId}`,
          {
            params: { access_token: this.facebookConfig.accessToken }
          }
        )
        validation.facebook = true
      } catch (error) {
        console.error('Facebook token validation failed:', error)
      }
    }

    // Validate YouTube token
    if (this.youtubeConfig) {
      try {
        await axios.get(
          'https://www.googleapis.com/youtube/v3/channels',
          {
            headers: { 'Authorization': `Bearer ${this.youtubeConfig.accessToken}` },
            params: { part: 'snippet', mine: true }
          }
        )
        validation.youtube = true
      } catch (error) {
        console.error('YouTube token validation failed:', error)
      }
    }

    return validation
  }
}