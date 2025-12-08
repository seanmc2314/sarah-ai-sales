'use client'

import { useState, useEffect, useRef } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface SarahTask {
  id: string
  type: 'prospect_research' | 'content_generation' | 'appointment_setting' | 'follow_up'
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  progress?: number
  result?: string
}

export default function SarahAIChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hello! I'm SarahAI, your F&I sales automation assistant. I can help you with:

• 📊 Prospect research and lead qualification
• ✍️ Content creation for LinkedIn, emails, and social media
• 📅 Appointment scheduling and follow-ups
• 📞 Phone call scripts and conversation planning
• 💼 F&I training content and sales strategies

What would you like me to help you with today?`,
      timestamp: new Date()
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [activeTasks, setActiveTasks] = useState<SarahTask[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    fetchActiveTasks()
  }, [])

  const fetchActiveTasks = async () => {
    try {
      const response = await fetch('/api/sarah/tasks')
      if (response.ok) {
        const data = await response.json()
        setActiveTasks(data)
      }
    } catch (error) {
      console.error('Error fetching tasks:', error)
    }
  }

  const sendMessage = async () => {
    if (!inputMessage.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/sarah/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: inputMessage, history: messages })
      })

      if (response.ok) {
        const data = await response.json()
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])

        if (data.task) {
          setActiveTasks(prev => [...prev, data.task])
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const quickActions = [
    {
      title: 'Generate LinkedIn Post',
      description: 'Create engaging F&I content for LinkedIn',
      action: 'Create a LinkedIn post about the benefits of professional F&I training'
    },
    {
      title: 'Research Prospects',
      description: 'Find automotive dealership contacts',
      action: 'Help me find automotive dealership executives in Texas'
    },
    {
      title: 'Schedule Follow-ups',
      description: 'Plan prospect follow-up strategy',
      action: 'Create a follow-up sequence for prospects who showed interest'
    },
    {
      title: 'Call Script',
      description: 'Generate phone call scripts',
      action: 'Create a phone script for calling automotive dealership GMs'
    }
  ]

  const taskIcons = {
    prospect_research: '🔍',
    content_generation: '✍️',
    appointment_setting: '📅',
    follow_up: '📧'
  }

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800'
  }

  return (
    <div className="flex h-[calc(100vh-8rem)]">
      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="bg-white rounded-lg shadow flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="border-b border-gray-200 p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-2xl">🤖</span>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">SarahAI</h3>
                <p className="text-sm text-gray-500">F&I Sales Assistant</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-4 py-2">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-gray-600">SarahAI is typing...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          {messages.length === 1 && (
            <div className="border-t border-gray-200 p-4">
              <p className="text-sm text-gray-600 mb-3">Quick Actions:</p>
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => setInputMessage(action.action)}
                    className="text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="text-sm font-medium text-gray-900">{action.title}</div>
                    <div className="text-xs text-gray-500">{action.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type your message..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !inputMessage.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Active Tasks Sidebar */}
      <div className="w-80 ml-6">
        <div className="bg-white rounded-lg shadow h-full">
          <div className="border-b border-gray-200 p-4">
            <h3 className="text-lg font-medium text-gray-900">Active Tasks</h3>
          </div>

          <div className="p-4 space-y-4 overflow-y-auto">
            {activeTasks.length > 0 ? (
              activeTasks.map((task) => (
                <div key={task.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center">
                      <span className="text-lg mr-2">
                        {taskIcons[task.type]}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {task.type.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      statusColors[task.status]
                    }`}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-3">{task.description}</p>

                  {task.status === 'in_progress' && task.progress !== undefined && (
                    <div className="mb-2">
                      <div className="bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${task.progress}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{task.progress}% complete</p>
                    </div>
                  )}

                  {task.result && (
                    <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                      {task.result}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No active tasks</h3>
                <p className="mt-1 text-sm text-gray-500">Start a conversation to see tasks here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}