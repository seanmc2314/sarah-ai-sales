'use client'

import { useState, useEffect } from 'react'

interface Task {
  id: string
  title: string
  description: string | null
  dueDate: string | null
  dueTime: string | null
  priority: string
  status: string
  taskType: string | null
  completedAt: string | null
  createdAt: string
  dealership: { id: string; name: string } | null
  contact: { id: string; firstName: string; lastName: string } | null
  deal: { id: string; title: string } | null
  assignedTo: { id: string; name: string; email: string }
  createdBy: { id: string; name: string; email: string }
}

interface TaskSummary {
  dueToday: number
  overdue: number
  pending: number
}

interface Dealership {
  id: string
  name: string
}

const priorityColors: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-700',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700'
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-700'
}

export default function TasksPanel() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [summary, setSummary] = useState<TaskSummary>({ dueToday: 0, overdue: 0, pending: 0 })
  const [dealerships, setDealerships] = useState<Dealership[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [filter, setFilter] = useState<'all' | 'today' | 'overdue'>('all')

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    dueTime: '',
    priority: 'MEDIUM',
    taskType: '',
    dealershipId: ''
  })

  useEffect(() => {
    fetchTasks()
    fetchDealerships()
  }, [filter])

  const fetchTasks = async () => {
    try {
      let url = '/api/tasks?status=PENDING&status=IN_PROGRESS'
      if (filter === 'today') url = '/api/tasks?dueToday=true'
      if (filter === 'overdue') url = '/api/tasks?overdue=true'

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setTasks(data.tasks || [])
        setSummary(data.summary || { dueToday: 0, overdue: 0, pending: 0 })
      }
    } catch (error) {
      console.error('Error fetching tasks:', error)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = selectedTask ? `/api/tasks/${selectedTask.id}` : '/api/tasks'

      const response = await fetch(url, {
        method: selectedTask ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          dueDate: formData.dueDate || null,
          dealershipId: formData.dealershipId || null
        })
      })

      if (response.ok) {
        setShowModal(false)
        resetForm()
        fetchTasks()
      }
    } catch (error) {
      console.error('Error saving task:', error)
    }
  }

  const completeTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' })
      })

      if (response.ok) {
        fetchTasks()
      }
    } catch (error) {
      console.error('Error completing task:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      dueDate: '',
      dueTime: '',
      priority: 'MEDIUM',
      taskType: '',
      dealershipId: ''
    })
    setSelectedTask(null)
  }

  const openEditModal = (task: Task) => {
    setSelectedTask(task)
    setFormData({
      title: task.title,
      description: task.description || '',
      dueDate: task.dueDate?.split('T')[0] || '',
      dueTime: task.dueTime || '',
      priority: task.priority,
      taskType: task.taskType || '',
      dealershipId: task.dealership?.id || ''
    })
    setShowModal(true)
  }

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return new Date(dueDate) < today
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'No due date'
    const date = new Date(dateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) return 'Today'
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
    return date.toLocaleDateString()
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tasks</h2>
          <p className="text-gray-500">Manage your follow-ups and to-dos</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true) }}
          className="px-4 py-2 rounded-lg text-white font-medium shadow-md hover:shadow-lg transition-all"
          style={{ background: 'linear-gradient(135deg, #1e40af, #dc2626)' }}
        >
          + Add Task
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div
          className={`bg-white p-4 rounded-xl shadow-md cursor-pointer transition-all ${
            filter === 'today' ? 'ring-2 ring-blue-500' : ''
          }`}
          onClick={() => setFilter('today')}
        >
          <div className="text-sm text-gray-500">Due Today</div>
          <div className="text-2xl font-bold text-blue-600">{summary.dueToday}</div>
        </div>
        <div
          className={`bg-white p-4 rounded-xl shadow-md cursor-pointer transition-all ${
            filter === 'overdue' ? 'ring-2 ring-red-500' : ''
          }`}
          onClick={() => setFilter('overdue')}
        >
          <div className="text-sm text-gray-500">Overdue</div>
          <div className="text-2xl font-bold text-red-600">{summary.overdue}</div>
        </div>
        <div
          className={`bg-white p-4 rounded-xl shadow-md cursor-pointer transition-all ${
            filter === 'all' ? 'ring-2 ring-gray-500' : ''
          }`}
          onClick={() => setFilter('all')}
        >
          <div className="text-sm text-gray-500">Total Pending</div>
          <div className="text-2xl font-bold text-gray-900">{summary.pending}</div>
        </div>
      </div>

      {/* Tasks List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading tasks...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {filter === 'all' ? 'No pending tasks' : filter === 'today' ? 'No tasks due today' : 'No overdue tasks'}
          </h3>
          <p className="text-gray-500 mb-4">
            {filter === 'all' ? 'Create a task to stay organized' : 'Great job staying on top of things!'}
          </p>
          {filter === 'all' && (
            <button
              onClick={() => { resetForm(); setShowModal(true) }}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Task
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-all ${
                isOverdue(task.dueDate) ? 'border-l-4 border-red-500' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <button
                    onClick={() => completeTask(task.id)}
                    className="mt-1 w-5 h-5 rounded-full border-2 border-gray-300 hover:border-green-500 hover:bg-green-50 transition-all flex-shrink-0"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">{task.title}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[task.priority]}`}>
                        {task.priority}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-sm text-gray-500 mb-2">{task.description}</p>
                    )}
                    <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                      <span className={isOverdue(task.dueDate) ? 'text-red-600 font-medium' : ''}>
                        📅 {formatDate(task.dueDate)}
                        {task.dueTime && ` at ${task.dueTime}`}
                      </span>
                      {task.dealership && (
                        <span>🏢 {task.dealership.name}</span>
                      )}
                      {task.contact && (
                        <span>👤 {task.contact.firstName} {task.contact.lastName}</span>
                      )}
                      {task.deal && (
                        <span>💼 {task.deal.title}</span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => openEditModal(task)}
                  className="text-gray-400 hover:text-gray-600 p-2"
                >
                  ✏️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b">
              <h3 className="text-xl font-semibold">
                {selectedTask ? 'Edit Task' : 'Create New Task'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Follow up with dealership"
                />
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
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Time
                  </label>
                  <input
                    type="time"
                    value={formData.dueTime}
                    onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Task Type
                  </label>
                  <select
                    value={formData.taskType}
                    onChange={(e) => setFormData({ ...formData, taskType: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select type...</option>
                    <option value="follow_up">Follow Up</option>
                    <option value="call">Call</option>
                    <option value="email">Email</option>
                    <option value="meeting">Meeting</option>
                    <option value="proposal">Proposal</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Related Dealership
                </label>
                <select
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
                  {selectedTask ? 'Update Task' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
