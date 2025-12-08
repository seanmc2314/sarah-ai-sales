import React, { useState } from 'react'

interface SelectProps {
  children: React.ReactNode
  value?: string
  onValueChange?: (value: string) => void
  defaultValue?: string
}

export function Select({ children, value, onValueChange, defaultValue }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedValue, setSelectedValue] = useState(value || defaultValue || '')

  const handleValueChange = (newValue: string) => {
    setSelectedValue(newValue)
    onValueChange?.(newValue)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as any, {
            isOpen,
            setIsOpen,
            selectedValue,
            onValueChange: handleValueChange
          })
        }
        return child
      })}
    </div>
  )
}

interface SelectTriggerProps {
  className?: string
  children: React.ReactNode
  isOpen?: boolean
  setIsOpen?: (open: boolean) => void
}

export function SelectTrigger({ className = '', children, isOpen, setIsOpen }: SelectTriggerProps) {
  return (
    <button
      type="button"
      className={`flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      onClick={() => setIsOpen?.(!isOpen)}
    >
      {children}
      <svg className="h-4 w-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  )
}

interface SelectValueProps {
  placeholder?: string
  selectedValue?: string
}

export function SelectValue({ placeholder = 'Select...', selectedValue }: SelectValueProps) {
  return <span>{selectedValue || placeholder}</span>
}

interface SelectContentProps {
  className?: string
  children: React.ReactNode
  isOpen?: boolean
  onValueChange?: (value: string) => void
}

export function SelectContent({ className = '', children, isOpen, onValueChange }: SelectContentProps) {
  if (!isOpen) return null

  return (
    <div className={`absolute top-full left-0 z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg ${className}`}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as any, { onValueChange })
        }
        return child
      })}
    </div>
  )
}

interface SelectItemProps {
  value: string
  children: React.ReactNode
  onValueChange?: (value: string) => void
}

export function SelectItem({ value, children, onValueChange }: SelectItemProps) {
  return (
    <button
      type="button"
      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
      onClick={() => onValueChange?.(value)}
    >
      {children}
    </button>
  )
}