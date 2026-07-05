import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AppProvider, useApp } from './context/AppContext'
import { isSupabaseReady } from './supabase/client'
import Dashboard from './components/Dashboard'
import CategoryManager from './components/CategoryManager'
import TransactionForm from './components/TransactionForm'
import TransactionList from './components/TransactionList'
import Reports from './components/Reports'
import Toast from './components/Toast'
import LoginPage from './components/LoginPage'
import SignupPage from './components/SignupPage'
import { LogOut, Cloud, CloudOff, Loader2 } from 'lucide-react'

function AuthGate({ children }) {
  const { user, loading } = useAuth()
  const [page, setPage] = useState('login')

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    )
  }

  if (!isSupabaseReady()) {
    return children
  }

  if (!user) {
    if (page === 'signup') {
      return <SignupPage onSwitchToLogin={() => setPage('login')} />
    }
    return <LoginPage onSwitchToSignup={() => setPage('signup')} />
  }

  return children
}

function SyncIndicator() {
  const { syncing } = useApp()
  const { user, signOut } = useAuth()

  if (!user) return null

  return (
    <div className="flex items-center gap-3">
      {syncing ? (
        <span className="flex items-center gap-1 text-xs text-amber-600">
          <Loader2 size={14} className="animate-spin" />
          جاري الحفظ
        </span>
      ) : isSupabaseReady() ? (
        <span className="flex items-center gap-1 text-xs text-green-600">
          <Cloud size={14} />
          متصل
        </span>
      ) : (
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <CloudOff size={14} />
          غير متصل
        </span>
      )}
      <button
        onClick={() => { if (typeof signOut === 'function') signOut() }}
        className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
        title="تسجيل الخروج"
      >
        <LogOut size={14} />
        خروج
      </button>
    </div>
  )
}

function AppContent() {
  return (
    <AppProvider>
      <Toast />
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-800">جيبي</h1>
            <SyncIndicator />
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          <Dashboard />
          <CategoryManager />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TransactionForm />
            <Reports />
          </div>
          <TransactionList />
        </main>

        <footer className="text-center py-6 text-xs text-gray-400">
          جيبي &copy; {new Date().getFullYear()} — تطبيق مفتوح المصدر
        </footer>
      </div>
    </AppProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <AppContent />
      </AuthGate>
    </AuthProvider>
  )
}
