import React from 'react'

interface CardProps {
  className?: string
  children: React.ReactNode
}

export function Card({ className = '', children }: CardProps) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {children}
    </div>
  )
}

interface CardHeaderProps {
  className?: string
  children: React.ReactNode
}

export function CardHeader({ className = '', children }: CardHeaderProps) {
  return (
    <div className={`p-6 pb-2 ${className}`}>
      {children}
    </div>
  )
}

interface CardContentProps {
  className?: string
  children: React.ReactNode
}

export function CardContent({ className = '', children }: CardContentProps) {
  return (
    <div className={`p-6 pt-0 ${className}`}>
      {children}
    </div>
  )
}

interface CardTitleProps {
  className?: string
  children: React.ReactNode
}

export function CardTitle({ className = '', children }: CardTitleProps) {
  return (
    <h3 className={`text-lg font-semibold leading-none tracking-tight ${className}`}>
      {children}
    </h3>
  )
}

interface CardDescriptionProps {
  className?: string
  children: React.ReactNode
}

export function CardDescription({ className = '', children }: CardDescriptionProps) {
  return (
    <p className={`text-sm text-gray-600 ${className}`}>
      {children}
    </p>
  )
}