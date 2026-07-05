import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { UserPlus, Eye, EyeOff } from 'lucide-react'

export default function SignupPage({ onSwitchToLogin }) {
  const { signUp = async () => false, error = null, clearError = () => {} } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [localError, setLocalError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (typeof clearError === 'function') clearError()
    setLocalError(null)

    if (password !== confirmPw) {
      setLocalError('كلمة السر غير متطابقة')
      return
    }

    setSubmitting(true)
    const ok = typeof signUp === 'function' ? await signUp(email, password) : false
    setSubmitting(false)

    if (ok) {
      setDone(true)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4" dir="rtl">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-sm w-full text-center space-y-3">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <UserPlus size={24} className="text-green-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-800">تم إنشاء الحساب</h2>
          <p className="text-sm text-gray-500">يمكنك الآن تسجيل الدخول باستخدام بريدك الإلكتروني وكلمة السر.</p>
          <button
            onClick={onSwitchToLogin}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl px-6 py-2.5 text-sm transition-colors"
          >
            تسجيل الدخول
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4" dir="rtl">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">جيبي</h1>
          <p className="text-sm text-gray-500 mt-1">إنشاء حساب جديد</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          {(error || localError) && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {localError || error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="username@jeebi.app"
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
                placeholder="6 أحرف على الأقل"
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">تأكيد كلمة السر</label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)}
              placeholder="أعد إدخال كلمة السر"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl px-4 py-2.5 text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <UserPlus size={18} />
            {submitting ? 'جاري إنشاء الحساب...' : 'إنشاء حساب'}
          </button>

          <p className="text-center text-sm text-gray-500">
            لديك حساب بالفعل؟{' '}
            <button type="button" onClick={onSwitchToLogin} className="text-blue-600 hover:underline font-medium">
              تسجيل الدخول
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}
