import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './AuthContext'
import { isSupabaseReady } from '../supabase/client'
import { loadUserData, syncToSupabase } from '../services/dataService'

const AppContext = createContext()
const STORAGE_KEY = 'jeebi_data'

function loadLocalData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { balance: 0, categories: [], transactions: [] }
}

const DEFAULT_CATEGORIES = [
  { id: 'cat_1', name: 'إيجار', color: '#ef4444', budget: 0 },
  { id: 'cat_2', name: 'إنترنت', color: '#3b82f6', budget: 0 },
  { id: 'cat_3', name: 'مطاعم', color: '#f59e0b', budget: 0 },
  { id: 'cat_4', name: 'مواصلات', color: '#10b981', budget: 0 },
  { id: 'cat_5', name: 'تسوق', color: '#ec4899', budget: 0 },
  { id: 'cat_6', name: 'أخرى', color: '#8b5cf6', budget: 0 },
]

export function AppProvider({ children }) {
  const { user } = useAuth()
  const [data, setData] = useState(() => loadLocalData)
  const [syncing, setSyncing] = useState(false)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)
  const syncTimer = useRef(null)
  const mounted = useRef(false)

  // On mount: load from Supabase if user is authenticated
  useEffect(() => {
    if (!user || !isSupabaseReady()) return

    loadUserData(user.id).then((remote) => {
      if (remote) setData(remote)
    }).catch((err) => {
      console.warn('Failed to load from Supabase, using local data:', err.message)
    })
  }, [user?.id])

  // Persist to LocalStorage on every data change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data])

  // Debounced sync: push data to Supabase 1.5s after last change
  useEffect(() => {
    if (!user || !isSupabaseReady()) return

    if (syncTimer.current) clearTimeout(syncTimer.current)
    syncTimer.current = setTimeout(async () => {
      setSyncing(true)
      try {
        await syncToSupabase(user.id)
      } catch (err) {
        console.warn('Supabase sync failed:', err.message)
      } finally {
        setSyncing(false)
      }
    }, 1500)

    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current)
    }
  }, [data, user?.id])

  const totalExpenses = data.transactions.reduce((s, t) => s + t.amount, 0)
  const remainingBalance = data.balance - totalExpenses

  const getCatStats = useCallback((catId) => {
    const cat = data.categories.find((c) => c.id === catId)
    const spent = data.transactions
      .filter((t) => t.categoryId === catId)
      .reduce((s, t) => s + t.amount, 0)
    return {
      budget: cat?.budget || 0,
      spent,
      remaining: (cat?.budget || 0) - spent,
      pct: cat?.budget > 0 ? (spent / cat.budget) * 100 : 0,
      cat,
    }
  }, [data.categories, data.transactions])

  const showToast = useCallback((message, type = 'warning') => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ message, type, id: Date.now() })
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }, [])

  const hideToast = useCallback(() => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(null)
  }, [])

  const setBalance = useCallback((amount) => {
    setData((prev) => ({ ...prev, balance: amount }))
  }, [])

  const addCategory = useCallback((name, color, budget) => {
    const id = 'cat_' + Date.now()
    setData((prev) => ({
      ...prev,
      categories: [...prev.categories, { id, name, color, budget: budget || 0 }],
    }))
    return id
  }, [])

  const updateCategoryBudget = useCallback((id, budget) => {
    setData((prev) => ({
      ...prev,
      categories: prev.categories.map((c) =>
        c.id === id ? { ...c, budget: budget || 0 } : c
      ),
    }))
  }, [])

  const removeCategory = useCallback((id) => {
    setData((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c.id !== id),
    }))
  }, [])

  const addTransaction = useCallback((amount, categoryId, description, date) => {
    const id = 'txn_' + Date.now()
    setData((prev) => ({
      ...prev,
      transactions: [
        { id, amount, categoryId, description, date: date || new Date().toISOString() },
        ...prev.transactions,
      ],
    }))
  }, [])

  const updateTransaction = useCallback((id, updates) => {
    setData((prev) => ({
      ...prev,
      transactions: prev.transactions.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    }))
  }, [])

  const removeTransaction = useCallback((id) => {
    setData((prev) => ({
      ...prev,
      transactions: prev.transactions.filter((t) => t.id !== id),
    }))
  }, [])

  const resetToDefaults = useCallback(() => {
    setData({ balance: 0, categories: [...DEFAULT_CATEGORIES], transactions: [] })
  }, [])

  return (
    <AppContext.Provider
      value={{
        ...data,
        totalExpenses,
        remainingBalance,
        syncing,
        toast,
        showToast,
        hideToast,
        getCatStats,
        setBalance,
        addCategory,
        updateCategoryBudget,
        removeCategory,
        addTransaction,
        updateTransaction,
        removeTransaction,
        resetToDefaults,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

export { DEFAULT_CATEGORIES }
