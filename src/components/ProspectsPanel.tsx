'use client'

import { useState, useEffect } from 'react'

interface Prospect {
  id: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  company?: string
  position?: string
  status: string
  source: string
  lastContactDate?: string
  nextFollowUp?: string
}

export default function ProspectsPanel() {
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [uploadStatus, setUploadStatus] = useState<string>('')
  const [proposalGenerating, setProposalGenerating] = useState<string | null>(null)

  useEffect(() => {
    fetchProspects()
  }, [])

  const handleGenerateProposal = async (prospectId: string) => {
    setProposalGenerating(prospectId)
    try {
      const response = await fetch('/api/proposals/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospectId,
          options: {
            includeROI: true,
            includePricing: true,
            tone: 'professional'
          }
        })
      })

      if (response.ok) {
        const result = await response.json()
        alert(`Proposal generated successfully! ID: ${result.proposal.id}`)
        fetchProspects() // Refresh to update status
      } else {
        const error = await response.json()
        alert(`Failed to generate proposal: ${error.error}`)
      }
    } catch (error) {
      console.error('Error generating proposal:', error)
      alert('Error generating proposal. Please try again.')
    } finally {
      setProposalGenerating(null)
    }
  }

  const fetchProspects = async () => {
    try {
      const response = await fetch('/api/prospects')
      if (response.ok) {
        const data = await response.json()
        setProspects(data.prospects || [])
      }
    } catch (error) {
      console.error('Error fetching prospects:', error)
      setProspects([])
    }
  }

  const handleAddProspect = async (prospectData: any) => {
    try {
      const response = await fetch('/api/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prospectData)
      })

      if (response.ok) {
        fetchProspects()
        setShowAddForm(false)
      }
    } catch (error) {
      console.error('Error adding prospect:', error)
    }
  }

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadStatus('Uploading...')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/prospects/import', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const result = await response.json()
        setUploadStatus(`Success! Imported ${result.results.imported} prospects, ${result.results.skipped} skipped, ${result.results.errors} errors.`)
        fetchProspects()
        setTimeout(() => {
          setShowUploadForm(false)
          setUploadStatus('')
        }, 3000)
      } else {
        const error = await response.json()
        setUploadStatus(`Error: ${error.error || 'Upload failed'}`)
      }
    } catch (error) {
      console.error('Error uploading CSV:', error)
      setUploadStatus('Error uploading file. Please try again.')
    }
  }

  const filteredProspects = prospects.filter(prospect => {
    const matchesStatus = selectedStatus === 'all' || prospect.status === selectedStatus
    const matchesSearch =
      prospect.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prospect.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prospect.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prospect.email?.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesStatus && matchesSearch
  })

  const statusColors = {
    'COLD': 'bg-gray-100 text-gray-800',
    'CONTACTED': 'bg-blue-100 text-blue-800',
    'INTERESTED': 'bg-yellow-100 text-yellow-800',
    'APPOINTMENT_SET': 'bg-green-100 text-green-800',
    'PROPOSAL_SENT': 'bg-purple-100 text-purple-800',
    'CLOSED_WON': 'bg-green-100 text-green-800',
    'CLOSED_LOST': 'bg-red-100 text-red-800'
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Prospects</h2>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowUploadForm(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Upload CSV
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Add Prospect
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search prospects..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <select
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="COLD">Cold</option>
              <option value="CONTACTED">Contacted</option>
              <option value="INTERESTED">Interested</option>
              <option value="APPOINTMENT_SET">Appointment Set</option>
              <option value="PROPOSAL_SENT">Proposal Sent</option>
              <option value="CLOSED_WON">Closed Won</option>
              <option value="CLOSED_LOST">Closed Lost</option>
            </select>
          </div>
        </div>
      </div>

      {/* Prospects Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredProspects.map((prospect) => (
            <li key={prospect.id}>
              <div className="px-4 py-4 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10">
                    <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">
                        {prospect.firstName[0]}{prospect.lastName[0]}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">
                      {prospect.firstName} {prospect.lastName}
                    </div>
                    <div className="text-sm text-gray-500">
                      {prospect.position} at {prospect.company}
                    </div>
                    <div className="text-sm text-gray-500">
                      {prospect.email} • {prospect.phone}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    statusColors[prospect.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
                  }`}>
                    {prospect.status.replace('_', ' ')}
                  </span>
                  <button
                    onClick={() => handleGenerateProposal(prospect.id)}
                    disabled={proposalGenerating === prospect.id}
                    className="text-purple-600 hover:text-purple-900 text-sm font-medium px-2 py-1 rounded hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {proposalGenerating === prospect.id ? 'Generating...' : 'Generate Proposal'}
                  </button>
                  <button className="text-blue-600 hover:text-blue-900 text-sm font-medium px-2 py-1 rounded hover:bg-blue-50">
                    View Details
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {filteredProspects.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No prospects found.</p>
        </div>
      )}

      {/* CSV Upload Modal */}
      {showUploadForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Prospects CSV</h3>
              <div className="space-y-4">
                <div className="text-sm text-gray-600 mb-4">
                  <p className="mb-2">Upload a CSV file with the following columns:</p>
                  <ul className="list-disc ml-5 space-y-1">
                    <li>firstName (required)</li>
                    <li>lastName (required)</li>
                    <li>email</li>
                    <li>phone</li>
                    <li>company</li>
                    <li>position</li>
                    <li>industry</li>
                    <li>dealership</li>
                    <li>source (default: &quot;csv_import&quot;)</li>
                  </ul>
                </div>

                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVUpload}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />

                {uploadStatus && (
                  <div className={`p-3 rounded-md text-sm ${
                    uploadStatus.startsWith('Success')
                      ? 'bg-green-100 text-green-800'
                      : uploadStatus.startsWith('Error')
                      ? 'bg-red-100 text-red-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {uploadStatus}
                  </div>
                )}

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadForm(false)
                      setUploadStatus('')
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Prospect Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Prospect</h3>
              <form onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                const prospectData = {
                  firstName: formData.get('firstName'),
                  lastName: formData.get('lastName'),
                  email: formData.get('email'),
                  phone: formData.get('phone'),
                  company: formData.get('company'),
                  position: formData.get('position'),
                  source: formData.get('source'),
                  status: 'COLD'
                }
                handleAddProspect(prospectData)
              }}>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      name="firstName"
                      placeholder="First Name"
                      required
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      name="lastName"
                      placeholder="Last Name"
                      required
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="tel"
                    name="phone"
                    placeholder="Phone"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    name="company"
                    placeholder="Company"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    name="position"
                    placeholder="Position"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    name="source"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Source</option>
                    <option value="cold_list">Cold List</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="referral">Referral</option>
                    <option value="website">Website</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add Prospect
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