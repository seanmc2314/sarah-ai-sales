'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import ProspectsPanel from './ProspectsPanel'
import AppointmentsPanel from './AppointmentsPanel'
import SocialMediaPanel from './SocialMediaPanel'
import SettingsPanel from './SettingsPanel'
import DealershipsPanel from './DealershipsPanel'
import PipelinePanel from './PipelinePanel'
import ContactsPanel from './ContactsPanel'
import TasksPanel from './TasksPanel'
import DocumentsPanel from './DocumentsPanel'

interface Analytics {
  dealerships: {
    total: number
    live: number
    prospects: number
    active: number
    churned: number
  }
  deals: {
    total: number
    open: number
    won: number
    lost: number
    recentWon: number
    winRate: number
  }
  revenue: {
    pipelineValue: number
    weightedPipelineValue: number
    wonValue: number
    recentWonValue: number
    mrr: number
    arr: number
  }
  pipeline: Record<string, { count: number; value: number }>
  contacts: {
    total: number
    hotLeads: number
  }
  tasks: {
    dueToday: number
    overdue: number
    completedRecently: number
  }
  activities: {
    total: number
    recent: number
    byType: Record<string, number>
  }
  documents: {
    total: number
  }
  topDealerships: Array<{
    id: string
    name: string
    monthlyValue: number | null
    status: string
    _count: { deals: number; contacts: number }
  }>
  recentWins: Array<{
    id: string
    title: string
    value: number
    closedAt: string
    dealership: { id: string; name: string }
    owner: { id: string; name: string }
  }>
}

export default function Dashboard() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/analytics?period=30')
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: '📊' },
    { id: 'pipeline', name: 'Pipeline', icon: '📈' },
    { id: 'dealerships', name: 'Dealerships', icon: '🏢' },
    { id: 'contacts', name: 'Contacts', icon: '👥' },
    { id: 'tasks', name: 'Tasks', icon: '✅' },
    { id: 'appointments', name: 'Appointments', icon: '📅' },
    { id: 'social', name: 'Social Media', icon: '📱' },
    { id: 'documents', name: 'Documents', icon: '📁' },
    { id: 'settings', name: 'Settings', icon: '⚙️' }
  ]

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)' }}>
      {/* Supreme One Style Header */}
      <header className="bg-white shadow-lg border-b sticky top-0 z-50" style={{ height: '90px' }}>
        <div className="mx-auto px-4 sm:px-6 lg:px-8 h-full">
          <div className="flex justify-between items-center h-full">
            {/* Logo and Title Section */}
            <div className="flex items-center gap-4 h-full">
              <img
                src="/assets/logo.png"
                alt="Supreme One"
                style={{ height: '60px', width: 'auto' }}
              />
              <div>
                <h1 style={{
                  fontSize: '1.75rem',
                  fontWeight: 700,
                  color: '#1f2937',
                  margin: 0,
                  lineHeight: 1.2
                }}>
                  Supreme One CRM
                </h1>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#6b7280',
                  margin: 0,
                  marginTop: '2px'
                }}>
                  Powered by Sarah AI
                </p>
              </div>
            </div>

            {/* Navigation Tabs - Centered */}
            <nav className="flex gap-1 flex-1 justify-center overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-2 rounded-lg font-medium text-sm transition-all duration-300 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'text-white shadow-lg'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  style={activeTab === tab.id ? {
                    background: 'linear-gradient(135deg, #1e40af, #dc2626)'
                  } : {}}
                >
                  <span className="mr-1">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700 font-medium">
                {session?.user?.name || session?.user?.email}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 shadow-md hover:shadow-lg"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        {activeTab === 'dashboard' && (
          <div>
            {/* Welcome Section - Supreme One Style Gradient */}
            <div className="rounded-xl mb-6 p-8 shadow-2xl"
              style={{
                background: 'linear-gradient(135deg, #1e40af, #dc2626)',
                color: 'white'
              }}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-4xl font-bold">Welcome back, {session?.user?.name?.split(' ')[0] || 'User'}!</h1>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mb-6 bg-white p-6 rounded-xl shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 uppercase tracking-wider">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                  onClick={() => setActiveTab('pipeline')}
                  className="p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all flex flex-col items-center gap-2"
                >
                  <span className="text-2xl">🎯</span>
                  <span className="text-sm font-medium text-gray-700">Add Lead</span>
                </button>
                <button
                  onClick={() => setActiveTab('dealerships')}
                  className="p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-green-500 hover:bg-green-50 transition-all flex flex-col items-center gap-2"
                >
                  <span className="text-2xl">🏢</span>
                  <span className="text-sm font-medium text-gray-700">View Dealerships</span>
                </button>
                <button
                  onClick={() => setActiveTab('tasks')}
                  className="p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-purple-500 hover:bg-purple-50 transition-all flex flex-col items-center gap-2"
                >
                  <span className="text-2xl">✅</span>
                  <span className="text-sm font-medium text-gray-700">Add Task</span>
                </button>
                <button
                  onClick={() => setActiveTab('social')}
                  className="p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-orange-500 hover:bg-orange-50 transition-all flex flex-col items-center gap-2"
                >
                  <span className="text-2xl">📱</span>
                  <span className="text-sm font-medium text-gray-700">Create Post</span>
                </button>
              </div>
            </div>

            {/* Revenue & Pipeline Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Pipeline Value</div>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                    style={{ background: 'linear-gradient(135deg, #1e40af, #dc2626)' }}>
                    <span className="text-white">💰</span>
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {analytics ? formatCurrency(analytics.revenue.pipelineValue) : '$0'}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Weighted: {analytics ? formatCurrency(analytics.revenue.weightedPipelineValue) : '$0'}
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Won Revenue</div>
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-2xl">
                    🏆
                  </div>
                </div>
                <div className="text-3xl font-bold text-green-600">
                  {analytics ? formatCurrency(analytics.revenue.wonValue) : '$0'}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Last 30 days: {analytics ? formatCurrency(analytics.revenue.recentWonValue) : '$0'}
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Open Deals</div>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl">
                    📈
                  </div>
                </div>
                <div className="text-3xl font-bold text-blue-600">
                  {analytics?.deals.open || 0}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Win Rate: {analytics?.deals.winRate || 0}%
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Tasks Due</div>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                    (analytics?.tasks.overdue || 0) > 0 ? 'bg-red-100' : 'bg-yellow-100'
                  }`}>
                    {(analytics?.tasks.overdue || 0) > 0 ? '⚠️' : '✅'}
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {analytics?.tasks.dueToday || 0}
                </div>
                <div className="text-sm text-red-500 mt-1">
                  {(analytics?.tasks.overdue || 0) > 0 ? `${analytics?.tasks.overdue} overdue` : 'No overdue tasks'}
                </div>
              </div>
            </div>

            {/* Dealership & Contact Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Dealerships</div>
                  <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-2xl">
                    🏢
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {analytics?.dealerships.total || 0}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {analytics?.dealerships.prospects || 0} prospects
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Contacts</div>
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-2xl">
                    👥
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {analytics?.contacts.total || 0}
                </div>
                <div className="text-sm text-orange-500 mt-1">
                  {analytics?.contacts.hotLeads || 0} hot leads
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Documents</div>
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-2xl">
                    📁
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {analytics?.documents.total || 0}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Agreements & contracts
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Activities</div>
                  <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center text-2xl">
                    📋
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {analytics?.activities.recent || 0}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Last 30 days
                </div>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Top Dealerships */}
              <div className="bg-white p-6 rounded-xl shadow-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Live Customers
                </h3>
                {analytics?.topDealerships && analytics.topDealerships.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.topDealerships.map((dealership) => (
                      <div key={dealership.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold">
                            {dealership.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{dealership.name}</div>
                            <div className="text-sm text-gray-500">
                              {dealership._count.contacts} contacts • {dealership._count.deals} deals
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-green-600">
                            {dealership.monthlyValue ? formatCurrency(dealership.monthlyValue) : '-'}/mo
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-4xl mb-2">🏢</div>
                    <p className="text-gray-500">No live customers yet</p>
                    <button
                      onClick={() => setActiveTab('dealerships')}
                      className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Add your first dealership →
                    </button>
                  </div>
                )}
              </div>

              {/* Recent Wins */}
              <div className="bg-white p-6 rounded-xl shadow-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 uppercase tracking-wider">Recent Wins</h3>
                {analytics?.recentWins && analytics.recentWins.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.recentWins.map((deal) => (
                      <div key={deal.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">{deal.title}</div>
                          <div className="text-sm text-gray-500">
                            {deal.dealership.name} • {new Date(deal.closedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-green-600">
                            {formatCurrency(deal.value)}
                          </div>
                          <div className="text-xs text-gray-500">{deal.owner.name}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-4xl mb-2">🏆</div>
                    <p className="text-gray-500">No closed deals yet</p>
                    <button
                      onClick={() => setActiveTab('pipeline')}
                      className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      View pipeline →
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pipeline' && <PipelinePanel />}
        {activeTab === 'dealerships' && <DealershipsPanel />}
        {activeTab === 'contacts' && <ContactsPanel />}
        {activeTab === 'tasks' && <TasksPanel />}
        {activeTab === 'appointments' && <AppointmentsPanel />}
        {activeTab === 'social' && <SocialMediaPanel />}
        {activeTab === 'documents' && <DocumentsPanel />}
        {activeTab === 'settings' && <SettingsPanel />}
      </main>
    </div>
  )
}
