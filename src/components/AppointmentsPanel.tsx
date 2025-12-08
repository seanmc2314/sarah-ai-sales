'use client'

import { useState, useEffect } from 'react'

interface Appointment {
  id: string
  title: string
  description?: string
  startTime: string
  endTime: string
  status: string
  prospect: {
    firstName: string
    lastName: string
    company?: string
  }
  meetingLink?: string
  location?: string
}

export default function AppointmentsPanel() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day')

  useEffect(() => {
    fetchAppointments()
  }, [selectedDate])

  const fetchAppointments = async () => {
    try {
      const response = await fetch(`/api/appointments?date=${selectedDate}`)
      if (response.ok) {
        const data = await response.json()
        setAppointments(data)
      }
    } catch (error) {
      console.error('Error fetching appointments:', error)
    }
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-blue-100 text-blue-800'
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800'
      case 'COMPLETED':
        return 'bg-gray-100 text-gray-800'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800'
      case 'NO_SHOW':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const updateAppointmentStatus = async (appointmentId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        fetchAppointments()
      }
    } catch (error) {
      console.error('Error updating appointment status:', error)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Appointments</h2>
        <div className="flex items-center space-x-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex rounded-md shadow-sm">
            <button
              onClick={() => setViewMode('day')}
              className={`px-4 py-2 text-sm font-medium ${
                viewMode === 'day'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              } border border-gray-300 rounded-l-md`}
            >
              Day
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 text-sm font-medium ${
                viewMode === 'week'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              } border-t border-b border-gray-300`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-4 py-2 text-sm font-medium ${
                viewMode === 'month'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              } border border-gray-300 rounded-r-md`}
            >
              Month
            </button>
          </div>
        </div>
      </div>

      {/* Appointments List */}
      <div className="space-y-4">
        {appointments.length > 0 ? (
          appointments.map((appointment) => (
            <div key={appointment.id} className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <h3 className="text-lg font-medium text-gray-900 mr-3">
                      {appointment.title}
                    </h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                      {appointment.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="flex items-center text-sm text-gray-500 mb-2">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formatDate(appointment.startTime)} • {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
                  </div>

                  <div className="flex items-center text-sm text-gray-500 mb-2">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {appointment.prospect.firstName} {appointment.prospect.lastName}
                    {appointment.prospect.company && ` • ${appointment.prospect.company}`}
                  </div>

                  {appointment.location && (
                    <div className="flex items-center text-sm text-gray-500 mb-2">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {appointment.location}
                    </div>
                  )}

                  {appointment.meetingLink && (
                    <div className="flex items-center text-sm text-blue-600 mb-2">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      <a href={appointment.meetingLink} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        Join Meeting
                      </a>
                    </div>
                  )}

                  {appointment.description && (
                    <p className="text-sm text-gray-600 mt-3">{appointment.description}</p>
                  )}
                </div>

                <div className="flex flex-col space-y-2 ml-4">
                  {appointment.status === 'SCHEDULED' && (
                    <>
                      <button
                        onClick={() => updateAppointmentStatus(appointment.id, 'CONFIRMED')}
                        className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => updateAppointmentStatus(appointment.id, 'CANCELLED')}
                        className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                      >
                        Cancel
                      </button>
                    </>
                  )}

                  {appointment.status === 'CONFIRMED' && (
                    <>
                      <button
                        onClick={() => updateAppointmentStatus(appointment.id, 'COMPLETED')}
                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                      >
                        Complete
                      </button>
                      <button
                        onClick={() => updateAppointmentStatus(appointment.id, 'NO_SHOW')}
                        className="px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
                      >
                        No Show
                      </button>
                    </>
                  )}

                  <button className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700">
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No appointments</h3>
            <p className="mt-1 text-sm text-gray-500">No appointments scheduled for this date.</p>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-blue-600">
            {appointments.filter(apt => apt.status === 'SCHEDULED').length}
          </div>
          <div className="text-sm text-gray-600">Scheduled</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-green-600">
            {appointments.filter(apt => apt.status === 'CONFIRMED').length}
          </div>
          <div className="text-sm text-gray-600">Confirmed</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-gray-600">
            {appointments.filter(apt => apt.status === 'COMPLETED').length}
          </div>
          <div className="text-sm text-gray-600">Completed</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-red-600">
            {appointments.filter(apt => apt.status === 'CANCELLED' || apt.status === 'NO_SHOW').length}
          </div>
          <div className="text-sm text-gray-600">Missed</div>
        </div>
      </div>
    </div>
  )
}