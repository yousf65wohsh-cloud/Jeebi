import { useState, Component } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AppProvider, useApp } from './context/AppContext'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }
  static getDerivedStateFromError(error) { return { hasError: true, error } }
  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
    this.setState({ errorInfo })
  }
  render() {
    if (this.state.hasError) {
      return (
        <div dir="rtl" className="min-h-screen bg-red-50 flex items-center justify-center p-8">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-8 border border-red-200">
            <h2 className="text-2xl font-bold text-red-600 mb-4">⚠️ حدث خطأ</h2>
            <p className="text-gray-600 mb-4 font-arabic">تم اكتشاف خطأ في التطبيق:</p>
            <pre className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-700 overflow-auto max-h-60 whitespace-pre-wrap">
              {this.state.error?.toString()}
            </pre>
            {this.state.error?.stack && (
              <pre className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs text-gray-600 overflow-auto max-h-96 mt-3 whitespace-pre-wrap font-mono">
                {this.state.error.stack}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              className="mt-6 bg-red-500 text-white px-6 py-2.5 rounded-lg hover:bg-red-600 cursor-pointer"
            >
              إعادة تحميل الصفحة
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
import { isSupabaseReady } from './supabase/client'
import Dashboard from './components/Dashboard'
import CategoryManager from './components/CategoryManager'
import TransactionForm from './components/TransactionForm'
import TransactionList from './components/TransactionList'
import Reports from './components/Reports'
import Savings from './components/Savings'
import Goals from './components/Goals'
import Toast from './components/Toast'
import LoginPage from './components/LoginPage'
import SignupPage from './components/SignupPage'
import { LogOut, Cloud, CloudOff, Loader2, Plus, BarChart3, Home, TrendingUp } from 'lucide-react'
import FinancialInsights from './components/FinancialInsights'
import FinancialFuture from './components/FinancialFuture'

function AuthGate({ children }) {
  const { user = null, loading = true } = useAuth()
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
  let syncing = false
  try {
    syncing = useApp()?.syncing ?? false
  } catch { /* AppProvider not ready yet */ }

  const { user = null, signOut = async () => {} } = useAuth()

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
  const scrollToGoals = () => {
    document.getElementById('goals')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const [activeTab, setActiveTab] = useState('home')

  return (
    <AppProvider>
      <Toast />
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-3 py-2 md:px-4 md:py-4 flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-800">جيبي</h1>
            <SyncIndicator />
          </div>
        </header>

        <div className="sticky top-[49px] md:top-[73px] z-10 bg-white/90 backdrop-blur-sm border-b border-gray-100">
          <div className="max-w-4xl mx-auto flex">
            <button onClick={() => setActiveTab('home')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors cursor-pointer ${activeTab === 'home' ? 'text-emerald-600 border-b-2 border-emerald-500' : 'text-gray-400 hover:text-gray-600 border-b-2 border-transparent'}`}>
              <Home size={16} />
              الرئيسية
            </button>
            <button onClick={() => setActiveTab('insights')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors cursor-pointer ${activeTab === 'insights' ? 'text-indigo-600 border-b-2 border-indigo-500' : 'text-gray-400 hover:text-gray-600 border-b-2 border-transparent'}`}>
              <BarChart3 size={16} />
              التحليل المالي
            </button>
            <button onClick={() => setActiveTab('future')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors cursor-pointer ${activeTab === 'future' ? 'text-purple-600 border-b-2 border-purple-500' : 'text-gray-400 hover:text-gray-600 border-b-2 border-transparent'}`}>
              <TrendingUp size={16} />
              المستقبل المالي
            </button>
          </div>
        </div>

        {activeTab === 'home' ? (
          <main className="max-w-4xl mx-auto px-3 py-3 md:px-4 md:py-6 pb-16 md:pb-0">
            <div className="flex flex-col gap-3 md:gap-6">
              <div className="order-1 md:order-5" id="add-expense">
                <div className="md:grid md:grid-cols-2 md:gap-6">
                  <TransactionForm />
                  <div>
                    <Reports />
                  </div>
                </div>
              </div>

              <div className="order-2 md:order-1">
                <Dashboard onGoalsClick={scrollToGoals} />
              </div>

              <div className="order-3 md:order-2">
                <CategoryManager />
              </div>

              <div className="order-4 md:order-3" id="savings">
                <Savings />
              </div>

              <div className="order-5 md:order-4" id="goals">
                <Goals />
              </div>

              <div className="order-6">
                <TransactionList />
              </div>
            </div>
          </main>
        ) : activeTab === 'insights' ? (
          <main className="max-w-4xl mx-auto px-3 py-3 md:px-4 md:py-6 pb-16 md:pb-0">
            <FinancialInsights />
          </main>
        ) : (
          <main className="max-w-4xl mx-auto px-3 py-3 md:px-4 md:py-6 pb-16 md:pb-0">
            <FinancialFuture />
          </main>
        )}

        <footer className="hidden md:block text-center py-6 text-xs text-gray-400">
          جيبي &copy; {new Date().getFullYear()} — تطبيق مفتوح المصدر
        </footer>

        <button
          onClick={() => document.getElementById('add-expense')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          className="fixed bottom-6 right-6 w-14 h-14 bg-emerald-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-emerald-600 transition-colors z-50 md:hidden cursor-pointer"
          aria-label="إضافة مصروف"
        >
          <Plus size={28} />
        </button>
      </div>
    </AppProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </AuthGate>
    </AuthProvider>
  )
}
