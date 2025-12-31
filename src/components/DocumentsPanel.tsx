'use client'

import { useState, useEffect, useRef } from 'react'

interface Document {
  id: string
  name: string
  originalName: string
  description: string | null
  filePath: string
  fileSize: number
  mimeType: string
  fileExtension: string
  category: string
  tags: string[]
  validFrom: string | null
  validUntil: string | null
  signedAt: string | null
  signedBy: string | null
  createdAt: string
  dealership: { id: string; name: string }
  uploadedBy: { id: string; name: string; email: string }
}

interface Dealership {
  id: string
  name: string
}

const categoryLabels: Record<string, string> = {
  AGREEMENT: 'Agreement',
  CONTRACT: 'Contract',
  PROPOSAL: 'Proposal',
  INVOICE: 'Invoice',
  NDA: 'NDA',
  TRAINING_MATERIAL: 'Training Material',
  REPORT: 'Report',
  OTHER: 'Other'
}

const categoryColors: Record<string, string> = {
  AGREEMENT: 'bg-green-100 text-green-700',
  CONTRACT: 'bg-blue-100 text-blue-700',
  PROPOSAL: 'bg-purple-100 text-purple-700',
  INVOICE: 'bg-yellow-100 text-yellow-700',
  NDA: 'bg-red-100 text-red-700',
  TRAINING_MATERIAL: 'bg-indigo-100 text-indigo-700',
  REPORT: 'bg-gray-100 text-gray-700',
  OTHER: 'bg-gray-100 text-gray-700'
}

export default function DocumentsPanel() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [dealerships, setDealerships] = useState<Dealership[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [dealershipFilter, setDealershipFilter] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'OTHER',
    dealershipId: '',
    validFrom: '',
    validUntil: '',
    signedAt: '',
    signedBy: '',
    tags: ''
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  useEffect(() => {
    fetchDocuments()
    fetchDealerships()
  }, [categoryFilter, dealershipFilter])

  const fetchDocuments = async () => {
    try {
      let url = '/api/documents?'
      if (categoryFilter) url += `category=${categoryFilter}&`
      if (dealershipFilter) url += `dealershipId=${dealershipFilter}&`

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setDocuments(data.documents || [])
      }
    } catch (error) {
      console.error('Error fetching documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDealerships = async () => {
    try {
      const response = await fetch('/api/dealerships')
      if (response.ok) {
        const data = await response.json()
        setDealerships(data.dealerships || [])
      }
    } catch (error) {
      console.error('Error fetching dealerships:', error)
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile || !formData.dealershipId) return

    setUploading(true)
    try {
      const uploadData = new FormData()
      uploadData.append('file', selectedFile)
      uploadData.append('dealershipId', formData.dealershipId)
      uploadData.append('category', formData.category)
      uploadData.append('name', formData.name || selectedFile.name.replace(/\.[^/.]+$/, ''))
      uploadData.append('description', formData.description)
      uploadData.append('tags', formData.tags)
      if (formData.validFrom) uploadData.append('validFrom', formData.validFrom)
      if (formData.validUntil) uploadData.append('validUntil', formData.validUntil)
      if (formData.signedAt) uploadData.append('signedAt', formData.signedAt)
      if (formData.signedBy) uploadData.append('signedBy', formData.signedBy)

      const response = await fetch('/api/documents', {
        method: 'POST',
        body: uploadData
      })

      if (response.ok) {
        setShowModal(false)
        resetForm()
        fetchDocuments()
      }
    } catch (error) {
      console.error('Error uploading document:', error)
    } finally {
      setUploading(false)
    }
  }

  const deleteDocument = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return

    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchDocuments()
      }
    } catch (error) {
      console.error('Error deleting document:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'OTHER',
      dealershipId: '',
      validFrom: '',
      validUntil: '',
      signedAt: '',
      signedBy: '',
      tags: ''
    })
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return '📄'
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝'
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊'
    if (mimeType.includes('image')) return '🖼️'
    return '📁'
  }

  const filteredDocuments = documents.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.dealership.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Documents</h2>
          <p className="text-gray-500">Manage dealer agreements, contracts, and files</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true) }}
          className="px-4 py-2 rounded-lg text-white font-medium shadow-md hover:shadow-lg transition-all"
          style={{ background: 'linear-gradient(135deg, #1e40af, #dc2626)' }}
        >
          + Upload Document
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-md mb-6">
        <div className="flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {Object.entries(categoryLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select
            value={dealershipFilter}
            onChange={(e) => setDealershipFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Dealerships</option>
            {dealerships.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Documents Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading documents...</p>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <div className="text-6xl mb-4">📁</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No documents found</h3>
          <p className="text-gray-500 mb-4">Upload your first document to get started</p>
          <button
            onClick={() => { resetForm(); setShowModal(true) }}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Upload Document
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => (
            <div key={doc.id} className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all p-4">
              <div className="flex items-start gap-3">
                <div className="text-3xl">{getFileIcon(doc.mimeType)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900 truncate">{doc.name}</h3>
                      <p className="text-sm text-gray-500">{doc.dealership.name}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${categoryColors[doc.category]}`}>
                      {categoryLabels[doc.category]}
                    </span>
                  </div>
                  {doc.description && (
                    <p className="text-sm text-gray-500 mt-2 line-clamp-2">{doc.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                    <span>{formatFileSize(doc.fileSize)}</span>
                    <span>•</span>
                    <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                    {doc.signedAt && (
                      <>
                        <span>•</span>
                        <span className="text-green-600">✓ Signed</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <a
                      href={doc.filePath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Download
                    </a>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={() => deleteDocument(doc.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white z-10">
              <h3 className="text-xl font-semibold">Upload Document</h3>
            </div>
            <form onSubmit={handleUpload} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  File *
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  required
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                {selectedFile && (
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedFile.name} ({formatFileSize(selectedFile.size)})
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dealership *
                </label>
                <select
                  required
                  value={formData.dealershipId}
                  onChange={(e) => setFormData({ ...formData, dealershipId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select dealership...</option>
                  {dealerships.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Document Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Will use filename if empty"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valid From
                  </label>
                  <input
                    type="date"
                    value={formData.validFrom}
                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valid Until
                  </label>
                  <input
                    type="date"
                    value={formData.validUntil}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Signed Date
                  </label>
                  <input
                    type="date"
                    value={formData.signedAt}
                    onChange={(e) => setFormData({ ...formData, signedAt: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Signed By
                  </label>
                  <input
                    type="text"
                    value={formData.signedBy}
                    onChange={(e) => setFormData({ ...formData, signedBy: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Signer name"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm() }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !selectedFile || !formData.dealershipId}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Upload Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
