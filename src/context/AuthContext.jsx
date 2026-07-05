import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseReady } from '../supabase/client'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isSupabaseReady()) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then((result) => {
      const session = result?.data?.session ?? null
      setUser(session?.user ?? null)
      setLoading(false)
    }).catch((err) => {
      console.warn('Auth session fetch failed:', err?.message ?? err)
      setLoading(false)
    })

    const subscriptionResult = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    const subscription = subscriptionResult?.data?.subscription ?? null

    return () => subscription?.unsubscribe()
  }, [])

  const signUp = useCallback(async (email, password) => {
    setError(null)
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(getArabicError(error.message))
      return false
    }
    return true
  }, [])

  const signIn = useCallback(async (email, password) => {
    setError(null)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(getArabicError(error.message))
      return false
    }
    return true
  }, [])

  const signOut = useCallback(async () => {
    try {
      if (supabase && typeof supabase.auth?.signOut === 'function') {
        await supabase.auth.signOut()
      }
    } catch (err) {
      console.warn('Sign out error:', err?.message ?? err)
    }
    setUser(null)
  }, [])

  const clearError = useCallback(() => setError(null), [])

  const safeValue = {
    user: user ?? null,
    loading: loading ?? true,
    error: error ?? null,
    signUp: typeof signUp === 'function' ? signUp : async () => false,
    signIn: typeof signIn === 'function' ? signIn : async () => false,
    signOut: typeof signOut === 'function' ? signOut : async () => {},
    clearError: typeof clearError === 'function' ? clearError : () => {},
  }

  return (
    <AuthContext.Provider value={safeValue}>
      {children}
    </AuthContext.Provider>
  )
}

function getArabicError(msg) {
  const map = {
    'Invalid login credentials': 'بيانات الدخول غير صحيحة',
    'Email not confirmed': 'البريد الإلكتروني غير مؤكد',
    'User already registered': 'هذا المستخدم مسجل مسبقاً',
    'Password should be at least 6 characters': 'كلمة السر يجب أن تكون 6 أحرف على الأقل',
    'Unable to validate email or password': 'البريد الإلكتروني أو كلمة السر غير صالحة',
    'Invalid email': 'البريد الإلكتروني غير صالح',
  }
  for (const [en, ar] of Object.entries(map)) {
    if (msg.includes(en)) return ar
  }
  return msg
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return {
    user: ctx.user ?? null,
    loading: ctx.loading ?? true,
    error: ctx.error ?? null,
    signUp: typeof ctx.signUp === 'function' ? ctx.signUp : async () => false,
    signIn: typeof ctx.signIn === 'function' ? ctx.signIn : async () => false,
    signOut: typeof ctx.signOut === 'function' ? ctx.signOut : async () => {},
    clearError: typeof ctx.clearError === 'function' ? ctx.clearError : () => {},
  }
}
