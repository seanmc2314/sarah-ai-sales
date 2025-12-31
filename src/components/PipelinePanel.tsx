'use client'

import { useState, useEffect, useCallback } from 'react'

interface Contact {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  role: string
  position: string | null
  isPrimary: boolean
}

// Contact roles that should be shown as primary on pipeline cards
const PRIMARY_ROLES = ['OWNER', 'GM', 'GSM']

const roleLabels: Record<string, string> = {
  OWNER: 'Owner/Principal',
  GM: 'General Manager',
  GSM: 'General Sales Manager',
  F_AND_I_DIRECTOR: 'F&I Director',
  F_AND_I_MANAGER: 'F&I Manager',
  SALES_MANAGER: 'Sales Manager',
  SERVICE_MANAGER: 'Service Manager',
  CONTROLLER: 'Controller/CFO',
  OTHER: 'Other'
}

interface Activity {
  id: string
  type: string
  subject: string
  createdAt: string
}

interface Task {
  id: string
  title: string
  dueDate: string
  priority: string
}

interface User {
  id: string
  name: string | null
  email: string
}

interface Dealership {
  id: string
  name: string
  status: string
  city: string | null
  state: string | null
  phone: string | null
  email: string | null
  website: string | null
  brands: string[]
  employeeCount: number | null
  monthlyValue: number | null
  notes: string | null
  isLive: boolean
  createdAt: string
  updatedAt: string
  contacts: Contact[]
  activities: Activity[]
  tasks: Task[]
  assignedUser: {
    id: string
    name: string | null
    email: string
  } | null
  _count: {
    contacts: number
    deals: number
    activities: number
    documents: number
  }
}

interface PipelineData {
  pipeline: Record<string, Dealership[]>
  stageTotals: Record<string, { count: number; value: number }>
  summary: {
    totalDealerships: number
    totalPipelineValue: number
  }
  users: User[]
}

// Pipeline stages (excludes ACTIVE_CUSTOMER, CHURNED, DO_NOT_CONTACT - those are outcomes)
const stageConfig = {
  PROSPECT: { label: 'Prospects', color: 'bg-gray-50 border-gray-300', headerColor: 'bg-gray-700' },
  QUALIFIED: { label: 'Qualified', color: 'bg-gray-50 border-gray-300', headerColor: 'bg-gray-600' },
  MEETING_SCHEDULED: { label: 'Meeting Scheduled', color: 'bg-slate-50 border-slate-300', headerColor: 'bg-slate-500' },
  PROPOSAL_SENT: { label: 'Proposal Sent', color: 'bg-blue-50 border-blue-200', headerColor: 'bg-blue-500' },
  NEGOTIATION: { label: 'Negotiation', color: 'bg-blue-50 border-blue-300', headerColor: 'bg-blue-600' }
}

interface ClosedDealsData {
  dealerships: Dealership[]
  states: string[]
  summary: {
    totalCount: number
    totalMonthlyValue: number
  }
}

export default function PipelinePanel() {
  const [pipelineData, setPipelineData] = useState<PipelineData | null>(null)
  const [closedDealsData, setClosedDealsData] = useState<ClosedDealsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedDealership, setSelectedDealership] = useState<Dealership | null>(null)
  const [draggedDealership, setDraggedDealership] = useState<Dealership | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(null)
  const [stateFilter, setStateFilter] = useState<string>('ALL')

  // Search and filters
  const [searchTerm, setSearchTerm] = useState('')
  const [assignedUserFilter, setAssignedUserFilter] = useState('')

  // AI Modal states
  const [showAIModal, setShowAIModal] = useState(false)
  const [aiAction, setAIAction] = useState<string>('')
  const [aiResult, setAIResult] = useState<string>('')
  const [aiLoading, setAILoading] = useState(false)
  const [aiDealership, setAIDealership] = useState<Dealership | null>(null)

  // Quick action modal
  const [showQuickActionModal, setShowQuickActionModal] = useState(false)
  const [quickActionType, setQuickActionType] = useState('')
  const [quickActionNote, setQuickActionNote] = useState('')
  const [quickActionDealership, setQuickActionDealership] = useState<Dealership | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    city: '',
    state: '',
    phone: '',
    email: '',
    website: '',
    brands: '',
    employeeCount: '',
    monthlyValue: '',
    notes: '',
    status: 'PROSPECT',
    // Contact info
    contactFirstName: '',
    contactLastName: '',
    contactEmail: '',
    contactPhone: '',
    contactRole: 'OWNER',
    contactPosition: ''
  })

  const fetchPipeline = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.set('search', searchTerm)
      if (assignedUserFilter) params.set('assignedUserId', assignedUserFilter)

      const response = await fetch(`/api/dealerships/pipeline?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setPipelineData(data)
      }
    } catch (error) {
      console.error('Error fetching pipeline:', error)
    } finally {
      setLoading(false)
    }
  }, [searchTerm, assignedUserFilter])

  const fetchClosedDeals = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (stateFilter !== 'ALL') {
        params.set('state', stateFilter)
      }
      const response = await fetch(`/api/dealerships/closed?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setClosedDealsData(data)
      }
    } catch (error) {
      console.error('Error fetching closed deals:', error)
    }
  }, [stateFilter])

  useEffect(() => {
    fetchPipeline()
    fetchClosedDeals()
  }, [fetchPipeline, fetchClosedDeals])

  useEffect(() => {
    fetchClosedDeals()
  }, [fetchClosedDeals])

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPipeline()
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm, assignedUserFilter, fetchPipeline])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = selectedDealership ? `/api/dealerships/${selectedDealership.id}` : '/api/dealerships'

      const dealershipData = {
        name: formData.name,
        city: formData.city || null,
        state: formData.state || null,
        phone: formData.phone || null,
        email: formData.email || null,
        website: formData.website || null,
        brands: formData.brands ? formData.brands.split(',').map(b => b.trim()) : [],
        employeeCount: formData.employeeCount ? parseInt(formData.employeeCount) : null,
        monthlyValue: formData.monthlyValue ? parseFloat(formData.monthlyValue) : null,
        notes: formData.notes || null,
        status: formData.status
      }

      const response = await fetch(url, {
        method: selectedDealership ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dealershipData)
      })

      if (response.ok) {
        const { dealership } = await response.json()

        // Create contact if provided
        if (!selectedDealership && formData.contactFirstName) {
          await fetch('/api/contacts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              firstName: formData.contactFirstName,
              lastName: formData.contactLastName,
              email: formData.contactEmail || null,
              phone: formData.contactPhone || null,
              role: formData.contactRole,
              position: formData.contactPosition || null,
              dealershipId: dealership.id,
              isPrimary: PRIMARY_ROLES.includes(formData.contactRole)
            })
          })
        }

        setShowModal(false)
        resetForm()
        fetchPipeline()
        fetchClosedDeals()
      }
    } catch (error) {
      console.error('Error saving dealership:', error)
    }
  }

  const updateDealershipStatus = async (dealershipId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/dealerships/${dealershipId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        fetchPipeline()
        fetchClosedDeals()
      }
    } catch (error) {
      console.error('Error updating dealership status:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      city: '',
      state: '',
      phone: '',
      email: '',
      website: '',
      brands: '',
      employeeCount: '',
      monthlyValue: '',
      notes: '',
      status: 'PROSPECT',
      contactFirstName: '',
      contactLastName: '',
      contactEmail: '',
      contactPhone: '',
      contactRole: 'OWNER',
      contactPosition: ''
    })
    setSelectedDealership(null)
  }

  const openEditModal = (dealership: Dealership) => {
    setSelectedDealership(dealership)
    // Find primary contact: prefer Owner/GM roles, then isPrimary flag, then first contact
    const primaryContact = dealership.contacts?.find(c => PRIMARY_ROLES.includes(c.role))
      || dealership.contacts?.find(c => c.isPrimary)
      || dealership.contacts?.[0]
    setFormData({
      name: dealership.name,
      city: dealership.city || '',
      state: dealership.state || '',
      phone: dealership.phone || '',
      email: dealership.email || '',
      website: dealership.website || '',
      brands: dealership.brands?.join(', ') || '',
      employeeCount: dealership.employeeCount?.toString() || '',
      monthlyValue: dealership.monthlyValue?.toString() || '',
      notes: dealership.notes || '',
      status: dealership.status,
      contactFirstName: primaryContact?.firstName || '',
      contactLastName: primaryContact?.lastName || '',
      contactEmail: primaryContact?.email || '',
      contactPhone: primaryContact?.phone || '',
      contactRole: primaryContact?.role || 'OTHER',
      contactPosition: primaryContact?.position || ''
    })
    setShowModal(true)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value)
  }

  // Calculate days since a date
  const daysSince = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  }

  // Get temperature indicator
  const getLeadTemperature = (dealership: Dealership) => {
    const lastActivity = dealership.activities?.[0]
    if (!lastActivity) return { icon: '❄️', label: 'Cold', color: 'text-blue-500' }

    const days = daysSince(lastActivity.createdAt)
    if (days <= 3) return { icon: '🔥', label: 'Hot', color: 'text-red-500' }
    if (days <= 7) return { icon: '☀️', label: 'Warm', color: 'text-orange-500' }
    return { icon: '❄️', label: 'Cold', color: 'text-blue-500' }
  }

  // AI Action handler
  const handleAIAction = async (action: string, dealership: Dealership) => {
    setAIDealership(dealership)
    setAIAction(action)
    setAIResult('')
    setShowAIModal(true)
    setAILoading(true)

    try {
      const response = await fetch('/api/ai/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, dealershipId: dealership.id })
      })

      const data = await response.json()
      if (response.ok) {
        setAIResult(data.result)
      } else {
        setAIResult('Error: ' + (data.error || 'Failed to process request'))
      }
    } catch (error) {
      setAIResult('Error: Failed to connect to AI service')
    } finally {
      setAILoading(false)
    }
  }

  // Quick action handler
  const openQuickAction = (type: string, dealership: Dealership, e: React.MouseEvent) => {
    e.stopPropagation()
    setQuickActionType(type)
    setQuickActionDealership(dealership)
    setQuickActionNote('')
    setShowQuickActionModal(true)
  }

  const submitQuickAction = async () => {
    if (!quickActionDealership) return

    try {
      const response = await fetch('/api/activities/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: quickActionType,
          dealershipId: quickActionDealership.id,
          contactId: quickActionDealership.contacts?.[0]?.id,
          description: quickActionNote || null
        })
      })

      if (response.ok) {
        setShowQuickActionModal(false)
        fetchPipeline()
      }
    } catch (error) {
      console.error('Quick action error:', error)
    }
  }

  const getAIActionTitle = (action: string) => {
    switch (action) {
      case 'research': return '🔍 Research Lead'
      case 'outreach': return '✉️ Generate Outreach'
      case 'suggest': return '💡 Suggested Action'
      case 'score': return '📊 Lead Score'
      default: return 'AI Analysis'
    }
  }

  const handleUpload = async () => {
    if (!uploadFile) return

    setUploading(true)
    setUploadResult(null)

    try {
      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('assignToTerritory', 'true')

      const response = await fetch('/api/leads/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (response.ok) {
        setUploadResult({ success: true, message: data.message })
        fetchPipeline()
        fetchClosedDeals()
      } else {
        setUploadResult({ success: false, message: data.error || 'Upload failed' })
      }
    } catch (error) {
      setUploadResult({ success: false, message: 'Failed to upload file' })
    } finally {
      setUploading(false)
    }
  }

  const handleDragStart = (e: React.DragEvent, dealership: Dealership) => {
    setDraggedDealership(dealership)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault()
    if (draggedDealership && draggedDealership.status !== targetStatus) {
      updateDealershipStatus(draggedDealership.id, targetStatus)
    }
    setDraggedDealership(null)
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-500">Loading pipeline...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Sales Pipeline</h2>
          <p className="text-gray-500">
            {pipelineData?.summary.totalDealerships || 0} dealerships in pipeline
            {pipelineData?.summary.totalPipelineValue ? (
              <span className="ml-2">
                • Est. Value: {formatCurrency(pipelineData.summary.totalPipelineValue)}
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 rounded-lg font-medium shadow-md hover:shadow-lg transition-all border-2 border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50"
          >
            Upload Leads
          </button>
          <button
            onClick={() => { resetForm(); setShowModal(true) }}
            className="px-4 py-2 rounded-lg text-white font-medium shadow-md hover:shadow-lg transition-all"
            style={{ background: 'linear-gradient(135deg, #1e40af, #dc2626)' }}
          >
            + Add Lead
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl shadow-md mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search leads by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>
          {pipelineData?.users && pipelineData.users.length > 0 && (
            <select
              value={assignedUserFilter}
              onChange={(e) => setAssignedUserFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="">All Assignees</option>
              {pipelineData.users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name || user.email}
                </option>
              ))}
            </select>
          )}
          <div className="text-sm text-gray-500">
            🔥 Hot (0-3 days) | ☀️ Warm (4-7 days) | ❄️ Cold (8+ days)
          </div>
        </div>
      </div>

      {/* Pipeline Kanban */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {Object.entries(stageConfig).map(([status, config]) => {
          const dealerships = pipelineData?.pipeline[status] || []
          const stageTotal = pipelineData?.stageTotals[status] || { count: 0, value: 0 }

          return (
            <div
              key={status}
              className={`flex-shrink-0 w-72 rounded-xl border-2 ${config.color}`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, status)}
            >
              {/* Stage Header */}
              <div className={`${config.headerColor} text-white p-3 rounded-t-lg`}>
                <div className="flex justify-between items-center">
                  <span className="font-semibold">{config.label}</span>
                  <span className="bg-white bg-opacity-20 px-2 py-0.5 rounded text-sm">
                    {stageTotal.count}
                  </span>
                </div>
                {stageTotal.value > 0 && (
                  <div className="text-sm opacity-90 mt-1">
                    {formatCurrency(stageTotal.value)}
                  </div>
                )}
              </div>

              {/* Dealerships */}
              <div className="p-3 space-y-3 min-h-[400px]">
                {dealerships.map((dealership) => {
                  // Find primary contact: prefer Owner/GM roles, then isPrimary flag, then first contact
                  const primaryContact = dealership.contacts?.find(c => PRIMARY_ROLES.includes(c.role))
                    || dealership.contacts?.find(c => c.isPrimary)
                    || dealership.contacts?.[0]
                  const lastActivity = dealership.activities?.[0]
                  const nextTask = dealership.tasks?.[0]
                  const temperature = getLeadTemperature(dealership)
                  const daysInStage = daysSince(dealership.updatedAt)
                  const daysSinceContact = lastActivity ? daysSince(lastActivity.createdAt) : null

                  return (
                    <div
                      key={dealership.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, dealership)}
                      className={`bg-white rounded-lg shadow-sm border p-3 hover:shadow-md transition-all ${
                        draggedDealership?.id === dealership.id ? 'opacity-50' : ''
                      }`}
                    >
                      {/* Header with name and temperature */}
                      <div className="flex justify-between items-start mb-2">
                        <div
                          className="font-medium text-gray-900 flex items-center gap-2 cursor-pointer flex-1"
                          onClick={() => openEditModal(dealership)}
                        >
                          <span className={temperature.color} title={temperature.label}>{temperature.icon}</span>
                          {dealership.name}
                          {dealership.isLive && (
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                          )}
                        </div>
                      </div>

                      {/* Stage time and location */}
                      <div className="flex justify-between text-xs text-gray-500 mb-2">
                        <span>{daysInStage}d in stage</span>
                        {(dealership.city || dealership.state) && (
                          <span>{[dealership.city, dealership.state].filter(Boolean).join(', ')}</span>
                        )}
                      </div>

                      {/* Last contact indicator */}
                      {daysSinceContact !== null && (
                        <div className={`text-xs mb-2 ${daysSinceContact > 7 ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                          Last contact: {daysSinceContact === 0 ? 'Today' : `${daysSinceContact}d ago`}
                        </div>
                      )}

                      {/* Next task */}
                      {nextTask && (
                        <div className="text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded mb-2">
                          📅 {nextTask.title} - {new Date(nextTask.dueDate).toLocaleDateString()}
                        </div>
                      )}

                      {/* Contact info */}
                      {primaryContact && (
                        <div
                          className="text-sm text-gray-600 mb-2 border-t pt-2 cursor-pointer"
                          onClick={() => openEditModal(dealership)}
                        >
                          <div className="font-medium">
                            {primaryContact.firstName} {primaryContact.lastName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {roleLabels[primaryContact.role] || primaryContact.position || 'Contact'}
                          </div>
                        </div>
                      )}

                      {/* Quick Actions */}
                      <div className="flex gap-1 mb-2 border-t pt-2">
                        <button
                          onClick={(e) => openQuickAction('CALL', dealership, e)}
                          className="flex-1 text-xs py-1 px-2 rounded bg-green-50 text-green-700 hover:bg-green-100"
                          title="Log Call"
                        >
                          📞
                        </button>
                        <button
                          onClick={(e) => openQuickAction('EMAIL', dealership, e)}
                          className="flex-1 text-xs py-1 px-2 rounded bg-blue-50 text-blue-700 hover:bg-blue-100"
                          title="Log Email"
                        >
                          ✉️
                        </button>
                        <button
                          onClick={(e) => openQuickAction('NOTE', dealership, e)}
                          className="flex-1 text-xs py-1 px-2 rounded bg-gray-50 text-gray-700 hover:bg-gray-100"
                          title="Add Note"
                        >
                          📝
                        </button>
                        <button
                          onClick={(e) => openQuickAction('MEETING', dealership, e)}
                          className="flex-1 text-xs py-1 px-2 rounded bg-purple-50 text-purple-700 hover:bg-purple-100"
                          title="Log Meeting"
                        >
                          📅
                        </button>
                      </div>

                      {/* Sarah AI Actions */}
                      <div className="flex gap-1 mb-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAIAction('research', dealership) }}
                          className="flex-1 text-xs py-1 px-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                          title="AI Research"
                        >
                          🔍
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAIAction('outreach', dealership) }}
                          className="flex-1 text-xs py-1 px-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                          title="Generate Outreach"
                        >
                          ✉️ AI
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAIAction('suggest', dealership) }}
                          className="flex-1 text-xs py-1 px-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                          title="Suggest Action"
                        >
                          💡
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAIAction('score', dealership) }}
                          className="flex-1 text-xs py-1 px-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                          title="Score Lead"
                        >
                          📊
                        </button>
                      </div>

                      {/* Footer */}
                      <div className="flex justify-between items-center text-xs text-gray-400 border-t pt-2">
                        <span>{dealership._count?.activities || 0} activities</span>
                        {dealership.monthlyValue && (
                          <span className="font-semibold text-green-600">
                            {formatCurrency(dealership.monthlyValue)}/mo
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}

                {dealerships.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <p className="text-sm">No leads in this stage</p>
                    <p className="text-xs mt-1">Drag leads here or add new</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Closed Deals Section */}
      <div className="mt-10 pt-8 border-t border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Closed Deals</h2>
            <p className="text-gray-500">
              {closedDealsData?.summary.totalCount || 0} active customers
              {closedDealsData?.summary.totalMonthlyValue ? (
                <span className="ml-2">
                  • MRR: {formatCurrency(closedDealsData.summary.totalMonthlyValue)}
                </span>
              ) : null}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Filter by State:</label>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
            >
              <option value="ALL">All States</option>
              {closedDealsData?.states.map((state) => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Closed Deals Table */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-green-600">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                  Dealership
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                  Location
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                  Primary Contact
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                  Monthly Value
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                  Assigned To
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {closedDealsData?.dealerships.map((dealership) => {
                const primaryContact = dealership.contacts[0]
                return (
                  <tr key={dealership.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full animate-pulse mr-3"></div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{dealership.name}</div>
                          {dealership.brands && dealership.brands.length > 0 && (
                            <div className="text-xs text-gray-500">{dealership.brands.join(', ')}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {[dealership.city, dealership.state].filter(Boolean).join(', ') || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {primaryContact ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {primaryContact.firstName} {primaryContact.lastName}
                          </div>
                          {primaryContact.email && (
                            <div className="text-xs text-gray-500">{primaryContact.email}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {dealership.monthlyValue ? (
                        <span className="text-sm font-semibold text-green-600">
                          {formatCurrency(dealership.monthlyValue)}/mo
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {dealership.assignedUser?.name || dealership.assignedUser?.email || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => openEditModal(dealership)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                )
              })}
              {(!closedDealsData?.dealerships || closedDealsData.dealerships.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <p className="text-lg">No closed deals yet</p>
                    <p className="text-sm mt-1">Move dealerships to Active Customer status to see them here</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white z-10">
              <h3 className="text-xl font-semibold text-gray-900">
                {selectedDealership ? 'Edit Lead' : 'Add New Lead'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Dealership Info Section */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Dealership Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dealership Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
                      placeholder="ABC Motors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
                      placeholder="Dallas"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
                      placeholder="TX"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
                      placeholder="https://abcmotors.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Brands</label>
                    <input
                      type="text"
                      value={formData.brands}
                      onChange={(e) => setFormData({ ...formData, brands: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
                      placeholder="Toyota, Honda"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Est. Monthly Value ($)</label>
                    <input
                      type="number"
                      value={formData.monthlyValue}
                      onChange={(e) => setFormData({ ...formData, monthlyValue: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
                      placeholder="5000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    >
                      {Object.entries(stageConfig).map(([key, config]) => (
                        <option key={key} value={key}>{config.label}</option>
                      ))}
                      <option value="ACTIVE_CUSTOMER">Active Customer (Won)</option>
                      <option value="CHURNED">Churned</option>
                      <option value="DO_NOT_CONTACT">Do Not Contact</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Contact Info Section */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Primary Contact (Optional)</h4>
                <p className="text-xs text-gray-500 mb-3">For pipeline cards, only Owner/GM contacts are shown. Other roles can be added in full contact management.</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input
                      type="text"
                      value={formData.contactFirstName}
                      onChange={(e) => setFormData({ ...formData, contactFirstName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={formData.contactLastName}
                      onChange={(e) => setFormData({ ...formData, contactLastName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
                      placeholder="Smith"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select
                      value={formData.contactRole}
                      onChange={(e) => setFormData({ ...formData, contactRole: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    >
                      {Object.entries(roleLabels).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
                      placeholder="john@abcmotors.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={formData.contactPhone}
                      onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
                      placeholder="(555) 987-6543"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Custom Title (Optional)</label>
                    <input
                      type="text"
                      value={formData.contactPosition}
                      onChange={(e) => setFormData({ ...formData, contactPosition: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
                      placeholder="e.g. Senior F&I Manager"
                    />
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
                  placeholder="Additional notes about this lead..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm() }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {selectedDealership ? 'Update Lead' : 'Add Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Leads Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-900">Upload Lead List</h3>
                <button
                  onClick={() => { setShowUploadModal(false); setUploadFile(null); setUploadResult(null) }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  &times;
                </button>
              </div>
            </div>
            <div className="p-6">
              {uploadResult ? (
                <div className={`p-4 rounded-lg mb-4 ${uploadResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                  {uploadResult.message}
                </div>
              ) : null}

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-4">
                  Upload a CSV file with your lead list. Required column: <strong>Dealership Name</strong> (or Company/Name).
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Optional columns: First Name, Last Name, Email, Phone, City, State, Zip, Website, Brands, Notes
                </p>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="lead-file-upload"
                />
                <label htmlFor="lead-file-upload" className="cursor-pointer">
                  {uploadFile ? (
                    <div>
                      <p className="text-gray-900 font-medium">{uploadFile.name}</p>
                      <p className="text-sm text-gray-500">{(uploadFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-gray-500 mb-2">Click to select CSV file</p>
                      <p className="text-sm text-gray-400">or drag and drop</p>
                    </div>
                  )}
                </label>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => { setShowUploadModal(false); setUploadFile(null); setUploadResult(null) }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
                >
                  {uploadResult?.success ? 'Close' : 'Cancel'}
                </button>
                {!uploadResult?.success && (
                  <button
                    onClick={handleUpload}
                    disabled={!uploadFile || uploading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? 'Uploading...' : 'Upload Leads'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Result Modal */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white z-10 flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-900">
                {getAIActionTitle(aiAction)} - {aiDealership?.name}
              </h3>
              <button
                onClick={() => setShowAIModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                &times;
              </button>
            </div>
            <div className="p-6">
              {aiLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                  <p className="mt-4 text-gray-500">Sarah AI is analyzing...</p>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                    {aiResult}
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowAIModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-700"
              >
                Close
              </button>
              {!aiLoading && (
                <button
                  onClick={() => navigator.clipboard.writeText(aiResult)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Copy to Clipboard
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Action Modal */}
      {showQuickActionModal && quickActionDealership && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-900">
                {quickActionType === 'CALL' && '📞 Log Call'}
                {quickActionType === 'EMAIL' && '✉️ Log Email'}
                {quickActionType === 'NOTE' && '📝 Add Note'}
                {quickActionType === 'MEETING' && '📅 Log Meeting'}
              </h3>
              <button
                onClick={() => setShowQuickActionModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                &times;
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                <strong>{quickActionDealership.name}</strong>
                {quickActionDealership.contacts?.[0] && (
                  <span> - {quickActionDealership.contacts[0].firstName} {quickActionDealership.contacts[0].lastName}</span>
                )}
              </p>
              <textarea
                value={quickActionNote}
                onChange={(e) => setQuickActionNote(e.target.value)}
                rows={4}
                placeholder={
                  quickActionType === 'CALL' ? 'Call notes... (what was discussed?)' :
                  quickActionType === 'EMAIL' ? 'Email summary... (what was the email about?)' :
                  quickActionType === 'NOTE' ? 'Add your note...' :
                  'Meeting notes... (what was discussed?)'
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
              />
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowQuickActionModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={submitQuickAction}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Log Activity
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
