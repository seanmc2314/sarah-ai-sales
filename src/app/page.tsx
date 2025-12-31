'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return // Still loading
    if (session) {
      router.push('/dashboard')
    } else {
      router.push('/auth/signin')
    }
  }, [session, status, router])

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-red-50">
      <div className="text-center">
        <div className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-red-600 bg-clip-text text-transparent mb-4">
          Supreme One CRM
        </div>
        <div className="text-gray-600">Loading...</div>
      </div>
    </div>
  )
}