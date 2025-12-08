'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import ProspectsPanel from './ProspectsPanel'
import AppointmentsPanel from './AppointmentsPanel'
import SocialMediaPanel from './SocialMediaPanel'
import SettingsPanel from './SettingsPanel'

export default function Dashboard() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [stats, setStats] = useState({
    totalProspects: 0,
    appointmentsToday: 0,
    activeCampaigns: 0,
    responseRate: 0
  })

  useEffect(() => {
    // Load dashboard stats
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: '📊' },
    { id: 'prospects', name: 'Prospects', icon: '👥' },
    { id: 'appointments', name: 'Appointments', icon: '📅' },
    { id: 'social', name: 'Social Media', icon: '📱' },
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
                  Supreme One Sales AI
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
            <nav className="flex gap-2 flex-1 justify-center">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'text-white shadow-lg'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  style={activeTab === tab.id ? {
                    background: 'linear-gradient(135deg, #1e40af, #dc2626)'
                  } : {}}
                >
                  <span className="mr-2">{tab.icon}</span>
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
                  <h1 className="text-4xl font-bold mb-2">Welcome back, {session?.user?.name?.split(' ')[0] || 'User'}!</h1>
                  <p className="text-lg opacity-90">SarahAI - Your F&I Sales Automation Platform</p>
                </div>
                <div className="bg-white bg-opacity-20 backdrop-blur-lg px-6 py-3 rounded-lg">
                  <div className="text-sm opacity-90 mb-1">Active System</div>
                  <div className="text-xl font-semibold">Supreme One Training</div>
                </div>
              </div>
            </div>

            {/* Stats Cards - Supreme One Style */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Prospects</div>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                    style={{ background: 'linear-gradient(135deg, #1e40af, #dc2626)' }}>
                    <span className="text-white">👥</span>
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900">{stats.totalProspects}</div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Appointments Today</div>
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-2xl">
                    📅
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900">{stats.appointmentsToday}</div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Active Campaigns</div>
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-2xl">
                    🚀
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900">{stats.activeCampaigns}</div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Response Rate</div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center text-2xl">
                    📈
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900">{stats.responseRate}%</div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white p-6 rounded-xl shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 uppercase tracking-wider">Recent Activity</h3>
              <div className="text-center py-12">
                <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-gray-500 font-medium">No recent activity</p>
                <p className="text-sm text-gray-400 mt-2">Start by adding prospects or creating campaigns</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'prospects' && <ProspectsPanel />}
        {activeTab === 'appointments' && <AppointmentsPanel />}
        {activeTab === 'social' && <SocialMediaPanel />}

        {activeTab === 'settings' && <SettingsPanel />}
      </main>
    </div>
  )
}
