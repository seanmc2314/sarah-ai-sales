'use client'

import { useState, useEffect } from 'react'

interface Dealership {
  id: string
  name: string
  legalName: string | null
  status: string
  website: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  zipCode: string | null
  brands: string[]
  employeeCount: number | null
  fiManagerCount: number | null
  monthlyValue: number | null
  contractType: string | null
  isLive: boolean
  notes: string | null
  createdAt: string
  contacts: Array<{
    id: string
    firstName: string
    lastName: string
    isPrimary: boolean
  }>
  _count: {
    contacts: number
    deals: number
    documents: number
    activities: number
  }
}

const statusColors: Record<string, string> = {
  PROSPECT: 'bg-gray-100 text-gray-700',
  QUALIFIED: 'bg-blue-100 text-blue-700',
  NEGOTIATION: 'bg-yellow-100 text-yellow-700',
  ACTIVE_CUSTOMER: 'bg-green-100 text-green-700',
  CHURNED: 'bg-red-100 text-red-700',
  DO_NOT_CONTACT: 'bg-gray-400 text-white'
}

const statusLabels: Record<string, string> = {
  PROSPECT: 'Prospect',
  QUALIFIED: 'Qualified',
  NEGOTIATION: 'Negotiation',
  ACTIVE_CUSTOMER: 'Active Customer',
  CHURNED: 'Churned',
  DO_NOT_CONTACT: 'Do Not Contact'
}

export default function DealershipsPanel() {
  const [dealerships, setDealerships] = useState<Dealership[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedDealership, setSelectedDealership] = useState<Dealership | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [liveFilter, setLiveFilter] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    legalName: '',
    status: 'PROSPECT',
    website: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    brands: '',
    employeeCount: '',
    fiManagerCount: '',
    monthlyValue: '',
    contractType: '',
    notes: ''
  })

  useEffect(() => {
    fetchDealerships()
  }, [statusFilter, liveFilter])

  const fetchDealerships = async () => {
    try {
      let url = '/api/dealerships?'
      if (statusFilter) url += `status=${statusFilter}&`
      if (liveFilter) url += `isLive=${liveFilter}&`

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setDealerships(data.dealerships || [])
      }
    } catch (error) {
      console.error('Error fetching dealerships:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = selectedDealership
        ? `/api/dealerships/${selectedDealership.id}`
        : '/api/dealerships'

      const response = await fetch(url, {
        method: selectedDealership ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          brands: formData.brands ? formData.brands.split(',').map(b => b.trim()) : [],
          employeeCount: formData.employeeCount ? parseInt(formData.employeeCount) : null,
          fiManagerCount: formData.fiManagerCount ? parseInt(formData.fiManagerCount) : null,
          monthlyValue: formData.monthlyValue ? parseFloat(formData.monthlyValue) : null
        })
      })

      if (response.ok) {
        setShowModal(false)
        resetForm()
        fetchDealerships()
      }
    } catch (error) {
      console.error('Error saving dealership:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      legalName: '',
      status: 'PROSPECT',
      website: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      brands: '',
      employeeCount: '',
      fiManagerCount: '',
      monthlyValue: '',
      contractType: '',
      notes: ''
    })
    setSelectedDealership(null)
  }

  const openEditModal = (dealership: Dealership) => {
    setSelectedDealership(dealership)
    setFormData({
      name: dealership.name,
      legalName: dealership.legalName || '',
      status: dealership.status,
      website: dealership.website || '',
      phone: dealership.phone || '',
      email: dealership.email || '',
      address: dealership.address || '',
      city: dealership.city || '',
      state: dealership.state || '',
      zipCode: dealership.zipCode || '',
      brands: dealership.brands.join(', '),
      employeeCount: dealership.employeeCount?.toString() || '',
      fiManagerCount: dealership.fiManagerCount?.toString() || '',
      monthlyValue: dealership.monthlyValue?.toString() || '',
      contractType: dealership.contractType || '',
      notes: dealership.notes || ''
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

  const filteredDealerships = dealerships.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.state?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dealerships</h2>
          <p className="text-gray-500">Manage your dealership customers and prospects</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-md mb-6">
        <div className="flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="Search dealerships..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            {Object.entries(statusLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select
            value={liveFilter}
            onChange={(e) => setLiveFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Customers</option>
            <option value="true">Live Only</option>
            <option value="false">Not Live</option>
          </select>
        </div>
      </div>

      {/* Dealerships Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading dealerships...</p>
        </div>
      ) : filteredDealerships.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <div className="text-6xl mb-4">🏢</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No dealerships found</h3>
          <p className="text-gray-500">Add new leads through the Pipeline tab to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDealerships.map((dealership) => (
            <div
              key={dealership.id}
              className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all cursor-pointer"
              onClick={() => openEditModal(dealership)}
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                      style={{ background: 'linear-gradient(135deg, #1e40af, #dc2626)' }}>
                      {dealership.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        {dealership.name}
                        {dealership.isLive && (
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Live Customer"></span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {dealership.city && dealership.state ? `${dealership.city}, ${dealership.state}` : 'Location not set'}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[dealership.status]}`}>
                    {statusLabels[dealership.status]}
                  </span>
                </div>

                {dealership.brands.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {dealership.brands.slice(0, 3).map((brand, i) => (
                      <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                        {brand}
                      </span>
                    ))}
                    {dealership.brands.length > 3 && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                        +{dealership.brands.length - 3}
                      </span>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Contacts</span>
                    <p className="font-medium">{dealership._count.contacts}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Deals</span>
                    <p className="font-medium">{dealership._count.deals}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Documents</span>
                    <p className="font-medium">{dealership._count.documents}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Monthly Value</span>
                    <p className="font-medium text-green-600">
                      {dealership.monthlyValue ? formatCurrency(dealership.monthlyValue) : '-'}
                    </p>
                  </div>
                </div>

                {dealership.contacts.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs text-gray-500 mb-2">Primary Contact</p>
                    <p className="text-sm font-medium">
                      {dealership.contacts.find(c => c.isPrimary)?.firstName || dealership.contacts[0].firstName}{' '}
                      {dealership.contacts.find(c => c.isPrimary)?.lastName || dealership.contacts[0].lastName}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white z-10">
              <h3 className="text-xl font-semibold">
                {selectedDealership ? 'Edit Dealership' : 'Add New Dealership'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dealership Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="ABC Motors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Legal Name
                  </label>
                  <input
                    type="text"
                    value={formData.legalName}
                    onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="ABC Motors LLC"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(statusLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Brands (comma separated)
                  </label>
                  <input
                    type="text"
                    value={formData.brands}
                    onChange={(e) => setFormData({ ...formData, brands: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Toyota, Honda, Ford"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="contact@dealership.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="123 Main Street"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee Count
                  </label>
                  <input
                    type="number"
                    value={formData.employeeCount}
                    onChange={(e) => setFormData({ ...formData, employeeCount: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    F&I Managers
                  </label>
                  <input
                    type="number"
                    value={formData.fiManagerCount}
                    onChange={(e) => setFormData({ ...formData, fiManagerCount: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monthly Value ($)
                  </label>
                  <input
                    type="number"
                    value={formData.monthlyValue}
                    onChange={(e) => setFormData({ ...formData, monthlyValue: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contract Type
                </label>
                <select
                  value={formData.contractType}
                  onChange={(e) => setFormData({ ...formData, contractType: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select type...</option>
                  <option value="training_only">Training Only</option>
                  <option value="full_service">Full Service</option>
                  <option value="consulting">Consulting</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Additional notes about this dealership..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm() }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {selectedDealership ? 'Update Dealership' : 'Create Dealership'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
