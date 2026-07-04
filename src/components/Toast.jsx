import { AlertTriangle, X } from 'lucide-react'
import { useApp } from '../context/AppContext'

const COLORS = {
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  danger: 'bg-red-50 border-red-200 text-red-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
}

const ICON_COLORS = {
  warning: 'text-amber-500',
  danger: 'text-red-500',
  info: 'text-blue-500',
}

export default function Toast() {
  const { toast, hideToast } = useApp()

  if (!toast) return null

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-slide-down">
      <div
        className={`flex items-center gap-3 px-5 py-3 rounded-xl border shadow-lg ${COLORS[toast.type] || COLORS.warning}`}
      >
        <AlertTriangle className={`w-5 h-5 shrink-0 ${ICON_COLORS[toast.type] || ICON_COLORS.warning}`} />
        <p className="text-sm font-medium">{toast.message}</p>
        <button onClick={hideToast} className="opacity-60 hover:opacity-100 cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
