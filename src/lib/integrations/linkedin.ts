import axios from 'axios'

export class LinkedInService {
  private accessToken: string

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  async getProfile() {
    try {
      const response = await axios.get('https://api.linkedin.com/v2/people/~', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      })
      return response.data
    } catch (error) {
      console.error('Error fetching LinkedIn profile:', error)
      throw error
    }
  }

  async sharePost(content: string, visibility: 'PUBLIC' | 'CONNECTIONS' = 'PUBLIC') {
    try {
      const profileResponse = await this.getProfile()
      const authorUrn = `urn:li:person:${profileResponse.id}`

      const postData = {
        author: authorUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: content
            },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': visibility
        }
      }

      const response = await axios.post('https://api.linkedin.com/v2/ugcPosts', postData, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0'
        }
      })

      return response.data
    } catch (error) {
      console.error('Error sharing LinkedIn post:', error)
      throw error
    }
  }

  async searchPeople(keywords: string, companyId?: string, industry?: string) {
    try {
      let searchUrl = `https://api.linkedin.com/v2/people?q=firstName&firstName=${encodeURIComponent(keywords)}`

      if (companyId) {
        searchUrl += `&currentCompany=${companyId}`
      }

      const response = await axios.get(searchUrl, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      return response.data.elements || []
    } catch (error) {
      console.error('Error searching LinkedIn people:', error)
      throw error
    }
  }

  async sendConnectionRequest(personId: string, message?: string) {
    try {
      const invitationData = {
        invitee: {
          'com.linkedin.voyager.growth.invitation.InviteeProfile': {
            profileId: personId
          }
        },
        message: message || 'Hi, I would like to connect with you.'
      }

      const response = await axios.post('https://api.linkedin.com/v2/invitations', invitationData, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      return response.data
    } catch (error) {
      console.error('Error sending connection request:', error)
      throw error
    }
  }

  async sendMessage(personId: string, message: string) {
    try {
      const messageData = {
        recipients: [`urn:li:person:${personId}`],
        message: {
          body: message
        }
      }

      const response = await axios.post('https://api.linkedin.com/v2/messages', messageData, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      return response.data
    } catch (error) {
      console.error('Error sending LinkedIn message:', error)
      throw error
    }
  }

  async getConnections() {
    try {
      const response = await axios.get('https://api.linkedin.com/v2/connections', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      return response.data.elements || []
    } catch (error) {
      console.error('Error fetching connections:', error)
      throw error
    }
  }

  async getCompanies(query: string) {
    try {
      const response = await axios.get(`https://api.linkedin.com/v2/companies?q=name&name=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      return response.data.elements || []
    } catch (error) {
      console.error('Error searching companies:', error)
      throw error
    }
  }

  async getPostAnalytics(postId: string) {
    try {
      const response = await axios.get(`https://api.linkedin.com/v2/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=${postId}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      return response.data
    } catch (error) {
      console.error('Error fetching post analytics:', error)
      throw error
    }
  }
}