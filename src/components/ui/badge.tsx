import React from 'react'

interface BadgeProps {
  className?: string
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'destructive'
  children: React.ReactNode
}

export function Badge({ className = '', variant = 'default', children }: BadgeProps) {
  const baseClasses = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium'

  const variantClasses = {
    default: 'bg-blue-100 text-blue-800',
    secondary: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    destructive: 'bg-red-100 text-red-800'
  }

  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  )
}