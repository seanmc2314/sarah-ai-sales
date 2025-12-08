'use client'

import { useState, useEffect } from 'react'

interface SocialPost {
  id: string
  platform: 'LINKEDIN' | 'INSTAGRAM' | 'FACEBOOK' | 'YOUTUBE'
  content: string
  status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED'
  scheduledAt?: string
  publishedAt?: string
  engagement?: {
    likes: number
    comments: number
    shares: number
    views?: number
  }
}

export default function SocialMediaPanel() {
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all')
  const [postContent, setPostContent] = useState('')
  const [isGeneratingContent, setIsGeneratingContent] = useState(false)

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/social-posts')
      if (response.ok) {
        const data = await response.json()
        setPosts(data)
      }
    } catch (error) {
      console.error('Error fetching posts:', error)
    }
  }

  const generateAIContent = async (topic: string, platform: string) => {
    setIsGeneratingContent(true)
    try {
      const response = await fetch('/api/ai/generate-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, platform })
      })

      if (response.ok) {
        const data = await response.json()
        setPostContent(data.content)
      }
    } catch (error) {
      console.error('Error generating content:', error)
    } finally {
      setIsGeneratingContent(false)
    }
  }

  const publishPost = async (postId: string) => {
    try {
      const response = await fetch(`/api/social-posts/${postId}/publish`, {
        method: 'POST'
      })

      if (response.ok) {
        fetchPosts()
      }
    } catch (error) {
      console.error('Error publishing post:', error)
    }
  }

  const platformIcons = {
    LINKEDIN: '💼',
    INSTAGRAM: '📸',
    FACEBOOK: '📘',
    YOUTUBE: '🎥'
  }

  const statusColors = {
    DRAFT: 'bg-gray-100 text-gray-800',
    SCHEDULED: 'bg-blue-100 text-blue-800',
    PUBLISHED: 'bg-green-100 text-green-800',
    FAILED: 'bg-red-100 text-red-800'
  }

  const filteredPosts = posts.filter(post =>
    selectedPlatform === 'all' || post.platform === selectedPlatform
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Social Media Management</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          Create Post
        </button>
      </div>

      {/* Platform Filter */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedPlatform('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              selectedPlatform === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Platforms
          </button>
          {Object.entries(platformIcons).map(([platform, icon]) => (
            <button
              key={platform}
              onClick={() => setSelectedPlatform(platform)}
              className={`px-4 py-2 rounded-md text-sm font-medium flex items-center ${
                selectedPlatform === platform
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="mr-2">{icon}</span>
              {platform}
            </button>
          ))}
        </div>
      </div>

      {/* Posts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPosts.map((post) => (
          <div key={post.id} className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <span className="text-2xl mr-2">
                  {platformIcons[post.platform]}
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {post.platform}
                </span>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                statusColors[post.status]
              }`}>
                {post.status}
              </span>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 line-clamp-4">
                {post.content}
              </p>
            </div>

            {post.scheduledAt && (
              <div className="text-xs text-gray-500 mb-2">
                Scheduled for: {new Date(post.scheduledAt).toLocaleString()}
              </div>
            )}

            {post.publishedAt && (
              <div className="text-xs text-gray-500 mb-2">
                Published: {new Date(post.publishedAt).toLocaleString()}
              </div>
            )}

            {post.engagement && (
              <div className="flex justify-between text-xs text-gray-500 mb-4">
                <span>❤️ {post.engagement.likes}</span>
                <span>💬 {post.engagement.comments}</span>
                <span>🔄 {post.engagement.shares}</span>
                {post.engagement.views && <span>👁️ {post.engagement.views}</span>}
              </div>
            )}

            <div className="flex justify-between">
              {post.status === 'DRAFT' && (
                <button
                  onClick={() => publishPost(post.id)}
                  className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                >
                  Publish Now
                </button>
              )}
              {post.status === 'SCHEDULED' && (
                <button className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">
                  Edit Schedule
                </button>
              )}
              <button className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700">
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredPosts.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No posts found for the selected platform.</p>
        </div>
      )}

      {/* Create Post Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-[600px] shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create Social Media Post</h3>

              {/* AI Content Generation */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-2">AI Content Generator</h4>
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => generateAIContent('F&I training benefits', 'LINKEDIN')}
                    disabled={isGeneratingContent}
                    className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    F&I Training Post
                  </button>
                  <button
                    onClick={() => generateAIContent('automotive industry insights', 'LINKEDIN')}
                    disabled={isGeneratingContent}
                    className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    Industry Insights
                  </button>
                  <button
                    onClick={() => generateAIContent('sales success tips', 'LINKEDIN')}
                    disabled={isGeneratingContent}
                    className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    Sales Tips
                  </button>
                </div>
                {isGeneratingContent && (
                  <div className="text-sm text-blue-600">Generating content...</div>
                )}
              </div>

              <form onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                // Handle form submission
                setShowCreateForm(false)
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Platform
                    </label>
                    <select
                      name="platform"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                    >
                      <option value="">Select Platform</option>
                      <option value="LINKEDIN">LinkedIn</option>
                      <option value="INSTAGRAM">Instagram</option>
                      <option value="FACEBOOK">Facebook</option>
                      <option value="YOUTUBE">YouTube</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Content
                    </label>
                    <textarea
                      name="content"
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                      rows={6}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                      placeholder="Write your post content here..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Schedule (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      name="scheduledAt"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Save as Draft
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Publish Now
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}