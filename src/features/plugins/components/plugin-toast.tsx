import { useState } from 'react'
import { 
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast'
import { CheckCircle, XCircle } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info'

interface ToastMessage {
  id: string
  type: ToastType
  title: string
  description?: string
  duration?: number
}

interface PluginToastProps {
  toastMessages: ToastMessage[]
  removeToast: (id: string) => void
}

export function PluginToast({ toastMessages, removeToast }: PluginToastProps) {
  
  return (
    <ToastProvider>
      {toastMessages.map((toast) => (
        <Toast
          key={toast.id}
          variant={toast.type === 'error' ? 'destructive' : 'default'}
          onOpenChange={() => removeToast(toast.id)}
          duration={toast.duration || 3000}
        >
          <div className="flex items-start gap-2">
            {toast.type === 'success' && (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
            {toast.type === 'error' && (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            <div className="grid gap-1">
              <ToastTitle>{toast.title}</ToastTitle>
              {toast.description && (
                <ToastDescription>{toast.description}</ToastDescription>
              )}
            </div>
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport className="p-4" />
    </ToastProvider>
  )
}

// Toast 钩子函数
export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  
  const addToast = (
    type: ToastType,
    title: string,
    description?: string,
    duration?: number
  ) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, type, title, description, duration }])
    
    // 自动移除
    if (duration !== 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration || 3000)
    }
  }
  
  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }
  
  const showSuccess = (title: string, description?: string, duration?: number) => {
    addToast('success', title, description, duration)
  }
  
  const showError = (title: string, description?: string, duration?: number) => {
    addToast('error', title, description, duration)
  }
  
  const showInfo = (title: string, description?: string, duration?: number) => {
    addToast('info', title, description, duration)
  }
  
  return {
    toasts,
    showSuccess,
    showError,
    showInfo,
    removeToast,
  }
}
