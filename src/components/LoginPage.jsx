import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { LogIn, Eye, EyeOff } from 'lucide-react'

export default function LoginPage({ onSwitchToSignup }) {
  const { signIn, error, clearError, loading: authLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (typeof clearError === 'function') clearError()
    setSubmitting(true)
    try {
      if (typeof signIn !== 'function') {
        console.warn('signIn is not available')
        setSubmitting(false)
        return
      }
      await signIn(email, password)
    } catch (err) {
      console.warn('Login error:', err?.message ?? err)
    }
    setSubmitting(false)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <p className="text-gray-400">جاري التحميل...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4" dir="rtl">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">جيبي</h1>
          <p className="text-sm text-gray-500 mt-1">تسجيل الدخول لمتابعة مصاريفك</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="example@email.com"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">كلمة السر</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="أدخل كلمة السر"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl px-4 py-2.5 text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <LogIn size={18} />
            {submitting ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
          </button>

          <p className="text-center text-sm text-gray-500">
            ليس لديك حساب؟{' '}
            <button type="button" onClick={onSwitchToSignup} className="text-blue-600 hover:underline font-medium">
              إنشاء حساب جديد
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}
