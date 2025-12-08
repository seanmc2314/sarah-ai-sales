import React, { useState, createContext, useContext } from 'react'

interface DialogContextType {
  open: boolean
  setOpen: (open: boolean) => void
}

const DialogContext = createContext<DialogContextType | undefined>(undefined)

interface DialogProps {
  children: React.ReactNode
}

export function Dialog({ children }: DialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <DialogContext.Provider value={{ open, setOpen }}>
      {children}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setOpen(false)} />
          <div className="relative z-50 w-full max-w-lg mx-4">
            {React.Children.map(children, child => {
              if (React.isValidElement(child) && child.type === DialogContent) {
                return child
              }
              return null
            })}
          </div>
        </div>
      )}
    </DialogContext.Provider>
  )
}

interface DialogTriggerProps {
  children: React.ReactNode
  asChild?: boolean
}

export function DialogTrigger({ children, asChild }: DialogTriggerProps) {
  const context = useContext(DialogContext)
  if (!context) throw new Error('DialogTrigger must be used within Dialog')

  const { setOpen } = context

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ onClick?: () => void }>, {
      onClick: () => setOpen(true)
    })
  }

  return (
    <button onClick={() => setOpen(true)}>
      {children}
    </button>
  )
}

interface DialogContentProps {
  className?: string
  children: React.ReactNode
}

export function DialogContent({ className = '', children }: DialogContentProps) {
  const context = useContext(DialogContext)
  if (!context) throw new Error('DialogContent must be used within Dialog')

  const { open } = context

  if (!open) return null

  return (
    <div className={`bg-white rounded-lg shadow-xl p-6 ${className}`}>
      {children}
    </div>
  )
}

interface DialogHeaderProps {
  className?: string
  children: React.ReactNode
}

export function DialogHeader({ className = '', children }: DialogHeaderProps) {
  return (
    <div className={`flex flex-col space-y-2 text-center sm:text-left ${className}`}>
      {children}
    </div>
  )
}

interface DialogTitleProps {
  className?: string
  children: React.ReactNode
}

export function DialogTitle({ className = '', children }: DialogTitleProps) {
  return (
    <h2 className={`text-lg font-semibold leading-none tracking-tight ${className}`}>
      {children}
    </h2>
  )
}

interface DialogDescriptionProps {
  className?: string
  children: React.ReactNode
}

export function DialogDescription({ className = '', children }: DialogDescriptionProps) {
  return (
    <p className={`text-sm text-gray-600 ${className}`}>
      {children}
    </p>
  )
}