'use client'

import { useState, useEffect } from 'react'

interface User {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
}

export default function SettingsPanel() {
  const [users, setUsers] = useState<User[]>([])
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: ''
  })
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const url = editingUserId ? `/api/admin/users/${editingUserId}` : '/api/admin/users'
      const method = editingUserId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({
          type: 'success',
          text: editingUserId ? 'User updated successfully!' : 'User created successfully!'
        })
        setFormData({ name: '', email: '', password: '', role: '' })
        setEditingUserId(null)
        loadUsers()
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save user' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Something went wrong. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (user: User) => {
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role
    })
    setEditingUserId(user.id)
    setMessage(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'User deleted successfully!' })
        loadUsers()
      } else {
        const data = await response.json()
        setMessage({ type: 'error', text: data.error || 'Failed to delete user' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Something went wrong. Please try again.' })
    }
  }

  const clearForm = () => {
    setFormData({ name: '', email: '', password: '', role: '' })
    setEditingUserId(null)
    setMessage(null)
  }

  return (
    <div>
      <h2 style={{
        fontSize: '1.5rem',
        fontWeight: 700,
        color: '#111827',
        marginBottom: '1.5rem'
      }}>
        System Settings
      </h2>
      <p style={{
        fontSize: '0.875rem',
        color: '#6b7280',
        marginBottom: '2rem'
      }}>
        Manage users and system configuration
      </p>

      <div style={{
        background: 'white',
        padding: '2rem',
        borderRadius: '1rem',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{
          fontSize: '1.125rem',
          fontWeight: 600,
          color: '#111827',
          marginBottom: '1.5rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          User Management
        </h3>

        {message && (
          <div style={{
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            marginBottom: '1.5rem',
            background: message.type === 'success' ? '#ecfdf5' : '#fee',
            color: message.type === 'success' ? '#10b981' : '#dc2626',
            border: `1px solid ${message.type === 'success' ? '#10b981' : '#dc2626'}`
          }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Full Name <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  outline: 'none',
                  color: '#111827',
                  background: 'white'
                }}
                onFocus={(e) => e.target.style.borderColor = '#1e40af'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Email Address <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  outline: 'none',
                  color: '#111827',
                  background: 'white'
                }}
                onFocus={(e) => e.target.style.borderColor = '#1e40af'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Password <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  outline: 'none',
                  color: '#111827',
                  background: 'white'
                }}
                onFocus={(e) => e.target.style.borderColor = '#1e40af'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Role <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select
                required
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  outline: 'none',
                  background: 'white',
                  color: '#111827'
                }}
                onFocus={(e) => e.target.style.borderColor = '#1e40af'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              >
                <option value="">Select Role</option>
                <option value="USER">User</option>
                <option value="ADMIN">Supreme One Admin</option>
                <option value="MANAGEMENT">Supreme One Management</option>
                <option value="SALES">Supreme One Sales</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.75rem 1.5rem',
                background: loading ? '#9ca3af' : 'linear-gradient(135deg, #1e40af, #dc2626)',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s'
              }}
            >
              {loading ? 'Saving...' : (editingUserId ? 'Update User' : 'Save User')}
            </button>
            <button
              type="button"
              onClick={clearForm}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#f3f4f6',
                color: '#374151',
                border: '2px solid #e5e7eb',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#e5e7eb'}
              onMouseOut={(e) => e.currentTarget.style.background = '#f3f4f6'}
            >
              Clear
            </button>
          </div>
        </form>

        <h3 style={{
          fontSize: '1rem',
          fontWeight: 600,
          color: '#111827',
          marginTop: '2rem',
          marginBottom: '1rem'
        }}>
          Existing Users
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{
                  padding: '0.75rem',
                  textAlign: 'left',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>Name</th>
                <th style={{
                  padding: '0.75rem',
                  textAlign: 'left',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>Email</th>
                <th style={{
                  padding: '0.75rem',
                  textAlign: 'left',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>Role</th>
                <th style={{
                  padding: '0.75rem',
                  textAlign: 'left',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>Created</th>
                <th style={{
                  padding: '0.75rem',
                  textAlign: 'left',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: '#6b7280'
                  }}>
                    Loading users...
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} style={{
                    borderBottom: '1px solid #f3f4f6',
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#f9fafb'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '0.75rem', color: '#111827' }}>{user.name}</td>
                    <td style={{ padding: '0.75rem', color: '#6b7280' }}>{user.email}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: user.role === 'ADMIN' ? '#fef3c7' : '#e0e7ff',
                        color: user.role === 'ADMIN' ? '#92400e' : '#3730a3'
                      }}>
                        {user.role}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', color: '#6b7280', fontSize: '0.875rem' }}>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleEdit(user)}
                          style={{
                            padding: '0.375rem 0.75rem',
                            background: '#1e40af',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.375rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.background = '#1e3a8a'}
                          onMouseOut={(e) => e.currentTarget.style.background = '#1e40af'}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          style={{
                            padding: '0.375rem 0.75rem',
                            background: '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.375rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.background = '#b91c1c'}
                          onMouseOut={(e) => e.currentTarget.style.background = '#dc2626'}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
