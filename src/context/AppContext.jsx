import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './AuthContext'
import { isSupabaseReady } from '../supabase/client'
import { loadUserData, syncToSupabase, initializeUserData } from '../services/dataService'
import { diagnoseAndFixGoalsSchema } from '../services/dataServiceDebug'

const AppContext = createContext(null)
const STORAGE_KEY = 'jeebi_data'

function loadLocalData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

const wrapWithLog = (fn, name) => {
  return (...args) => {
    if (typeof fn !== 'function') {
      const errorMsg = `Context function '${name}' is NOT a function! Type: ${typeof fn}, Value: ${JSON.stringify(fn)}, Is Array: ${Array.isArray(fn)}, Constructor: ${fn?.constructor?.name}`;
      console.error(errorMsg, fn);
      console.error('Stack trace:', new Error().stack);
      throw new Error(errorMsg);
    }
    return fn(...args);
  };
};

const DEFAULT_CATEGORIES = [
  { name: 'إيجار', color: '#ef4444', budget: 0 },
  { name: 'إنترنت', color: '#3b82f6', budget: 0 },
  { name: 'مطاعم', color: '#f59e0b', budget: 0 },
  { name: 'مواصلات', color: '#10b981', budget: 0 },
  { name: 'تسوق', color: '#ec4899', budget: 0 },
  { name: 'أخرى', color: '#8b5cf6', budget: 0 },
]

export function AppProvider({ children }) {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)
  const syncTimer = useRef(null)
  const scheduledProcessedRef = useRef(false)
  const dataRef = useRef(data)
  dataRef.current = data

  useEffect(() => {
    if (!user) {
      console.log('[AppContext] No user — showing auth pages')
      setData(null)
      setDataLoading(false)
      return
    }

    if (!isSupabaseReady()) {
      console.log('[AppContext] Supabase not configured — falling back to LocalStorage')
      const local = loadLocalData()
      setData(local || { balance: 0, savings: 0, categories: [], transactions: [], transfers: [], goals: [] })
      setDataLoading(false)
      return
    }

    console.log(`[AppContext] Loading data for user ${user.id}`)
    setDataLoading(true)

    loadUserData(user.id)
      .then((remote) => {
        if (remote === null) {
          console.log('[AppContext] First-time user — initializing defaults')
          return initializeUserData(user.id).then((defaults) => {
            setData(defaults)
            localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults))
          })
        }
        console.log(`[AppContext] Loaded remote data: ${remote.categories.length} categories, ${remote.transactions.length} transactions, ${remote.goals.length} goals, savings=${remote.savings}`)
        setData(remote)
      })
      .catch((err) => {
        console.error('[AppContext] Failed to load from Supabase:', err)
        const local = loadLocalData()
        if (local) {
          console.log('[AppContext] Falling back to LocalStorage cache')
          setData(local)
        } else {
          setData({ balance: 0, savings: 0, categories: [], transactions: [], transfers: [], goals: [] })
        }
      })
      .finally(() => {
        setDataLoading(false)
      })
  }, [user?.id])

  useEffect(() => {
    if (!data || !user || !isSupabaseReady()) return

    if (syncTimer.current) clearTimeout(syncTimer.current)
    syncTimer.current = setTimeout(async () => {
      setSyncing(true)
      try {
        await syncToSupabase(user.id, data)
      } catch (err) {
        console.error('[AppContext] Sync failed:', err)
      } finally {
        setSyncing(false)
      }
    }, 1500)

    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current)
    }
  }, [data, user?.id])

  useEffect(() => {
    if (data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    }
  }, [data])

  const totalExpenses = data ? (data.transactions ?? []).reduce((s, t) => s + (t.amount ?? 0), 0) : 0
  const savings = data?.savings ?? 0
  const remainingBalance = data ? (data.balance ?? 0) - totalExpenses - savings : 0
  const goals = data?.goals ?? []

  const getCatStats = useCallback((catId) => {
    if (!data) return { budget: 0, spent: 0, remaining: 0, pct: 0, cat: null }
    const cat = (data.categories ?? []).find((c) => c.id === catId)
    const spent = (data.transactions ?? [])
      .filter((t) => t.categoryId === catId)
      .reduce((s, t) => s + (t.amount ?? 0), 0)
    return {
      budget: cat?.budget || 0,
      spent,
      remaining: (cat?.budget || 0) - spent,
      pct: cat?.budget > 0 ? (spent / cat.budget) * 100 : 0,
      cat,
    }
  }, [data?.categories, data?.transactions])

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
    setData((prev) => prev ? { ...prev, balance: amount } : { balance: amount, savings: 0, categories: [], transactions: [], transfers: [], goals: [] })
  }, [])

  const addCategory = useCallback((name, color, budget) => {
    const id = 'cat_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
    setData((prev) => {
      const base = prev || { balance: 0, savings: 0, categories: [], transactions: [], transfers: [], goals: [] }
      return {
        ...base,
        categories: [...(base.categories ?? []), { id, name, color, budget: budget || 0 }],
      }
    })
    return id
  }, [])

  const updateCategoryBudget = useCallback((id, budget) => {
    setData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        categories: (prev.categories ?? []).map((c) =>
          c.id === id ? { ...c, budget: budget || 0 } : c
        ),
      }
    })
  }, [])

  const removeCategory = useCallback((id) => {
    setData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        categories: (prev.categories ?? []).filter((c) => c.id !== id),
      }
    })
  }, [])

  const addTransaction = useCallback((amount, categoryId, description, date) => {
    const id = 'txn_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
    setData((prev) => {
      const base = prev || { balance: 0, savings: 0, categories: [], transactions: [], transfers: [], goals: [] }
      return {
        ...base,
        transactions: [
          { id, amount, categoryId, description, date: date || new Date().toISOString() },
          ...(base.transactions ?? []),
        ],
      }
    })
  }, [])

  const updateTransaction = useCallback((id, updates) => {
    setData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        transactions: (prev.transactions ?? []).map((t) =>
          t.id === id ? { ...t, ...updates } : t
        ),
      }
    })
  }, [])

  const removeTransaction = useCallback((id) => {
    setData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        transactions: (prev.transactions ?? []).filter((t) => t.id !== id),
      }
    })
  }, [])

  const transferToSavings = useCallback((amount) => {
    const val = typeof amount === 'number' ? amount : parseFloat(amount)
    if (isNaN(val) || val <= 0) {
      showToast('يجب أن يكون المبلغ أكبر من صفر', 'warning')
      return
    }
    const currentData = dataRef.current
    const totalExp = (currentData?.transactions ?? []).reduce((s, t) => s + (t.amount ?? 0), 0)
    const remaining = (currentData?.balance ?? 0) - totalExp - (currentData?.savings ?? 0)
    if (val > remaining) {
      showToast('المبلغ يتجاوز الرصيد المتبقي', 'warning')
      return
    }

    setData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        savings: (prev.savings ?? 0) + val,
        transfers: [
          {
            id: 'transfer_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            type: 'deposit',
            amount: val,
            date: new Date().toISOString(),
          },
          ...(prev.transfers ?? []),
        ],
      }
    })
    showToast(`تم تحويل ${val.toLocaleString('en-US')} د.ع إلى المدخرات`, 'info')
  }, [showToast])

  const withdrawFromSavings = useCallback((amount) => {
    const val = typeof amount === 'number' ? amount : parseFloat(amount)
    if (isNaN(val) || val <= 0) {
      showToast('يجب أن يكون المبلغ أكبر من صفر', 'warning')
      return
    }
    if (val > dataRef.current?.savings) {
      showToast('المبلغ يتجاوز المدخرات الحالية', 'warning')
      return
    }

    setData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        savings: (prev.savings ?? 0) - val,
        transfers: [
          {
            id: 'transfer_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            type: 'withdraw',
            amount: val,
            date: new Date().toISOString(),
          },
          ...(prev.transfers ?? []),
        ],
      }
    })
    showToast(`تم سحب ${val.toLocaleString('en-US')} د.ع من المدخرات`, 'info')
  }, [showToast])

  const addGoal = useCallback((goal) => {
    const id = 'goal_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
    const now = new Date().toISOString()
    setData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        goals: [
          ...(prev.goals ?? []),
          {
            id,
            title: goal.title || '',
            emoji: goal.emoji || '',
            target_amount: Number(goal.target_amount) || 0,
            saved_amount: 0,
            frequency: goal.frequency || 'monthly',
            contribution_amount: Number(goal.contribution_amount) || 0,
            start_date: goal.start_date || '',
            target_date: goal.target_date || '',
            last_contribution_date: '',
            status: 'active',
            created_at: now,
            updated_at: now,
          },
        ],
      }
    })
  }, [])

  const updateGoal = useCallback((id, updates) => {
    setData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        goals: (prev.goals ?? []).map((g) =>
          g.id === id ? { ...g, ...updates, updated_at: new Date().toISOString() } : g
        ),
      }
    })
  }, [])

  const deleteGoal = useCallback((id) => {
    setData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        goals: (prev.goals ?? []).filter((g) => g.id !== id),
      }
    })
  }, [])

  const pauseGoal = useCallback((id) => {
    setData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        goals: (prev.goals ?? []).map((g) =>
          g.id === id ? { ...g, status: 'paused', updated_at: new Date().toISOString() } : g
        ),
      }
    })
  }, [])

  const resumeGoal = useCallback((id) => {
    setData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        goals: (prev.goals ?? []).map((g) =>
          g.id === id ? { ...g, status: 'active', updated_at: new Date().toISOString() } : g
        ),
      }
    })
  }, [])

  const completeGoal = useCallback((id) => {
    setData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        goals: (prev.goals ?? []).map((g) =>
          g.id === id
            ? { ...g, status: 'completed', target_amount: g.saved_amount, updated_at: new Date().toISOString() }
            : g
        ),
      }
    })
  }, [])

  const processScheduledGoals = useCallback(() => {
    const currentData = dataRef.current
    if (!currentData?.goals?.length) return

    const now = new Date()
    const today = now.toISOString().slice(0, 10)
    let movedAmount = 0
    const skippedGoals = []
    const processedGoals = []

    const updatedGoals = currentData.goals.map((goal) => {
      if (goal.status !== 'active') return goal
      if (!goal.contribution_amount || goal.saved_amount >= goal.target_amount) return goal

      const lastDate = goal.last_contribution_date || goal.start_date
      if (!lastDate) return goal

      let due = false
      if (!goal.last_contribution_date) {
        due = lastDate <= today
      } else {
        const next = new Date(lastDate)
        if (goal.frequency === 'daily') next.setDate(next.getDate() + 1)
        else if (goal.frequency === 'weekly') next.setDate(next.getDate() + 7)
        else if (goal.frequency === 'monthly') next.setMonth(next.getMonth() + 1)
        due = now >= next
      }
      if (!due) return goal

      const remainingNeeded = goal.target_amount - goal.saved_amount
      const contrib = Math.min(goal.contribution_amount, remainingNeeded)

      if ((currentData.savings ?? 0) - movedAmount < contrib) {
        skippedGoals.push(goal.title)
        return goal
      }

      movedAmount += contrib
      processedGoals.push(goal.title)

      const newSaved = goal.saved_amount + contrib
      return {
        ...goal,
        saved_amount: newSaved,
        last_contribution_date: today,
        status: newSaved >= goal.target_amount ? 'completed' : 'active',
      }
    })

    if (movedAmount > 0) {
      setData((prev) => ({
        ...prev,
        goals: updatedGoals,
        savings: (prev.savings ?? 0) - movedAmount,
        transfers: [
          ...(prev.transfers ?? []),
          {
            id: 'transfer_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            type: 'goal_contribution',
            amount: movedAmount,
            date: today,
          },
        ],
      }))
      console.log(`[AppContext] Auto-processed ${processedGoals.length} goals, moved ${movedAmount} from savings`)
    }

    if (skippedGoals.length > 0) {
      showToast(`⚠️ رصيد الادخار غير كافٍ لـ: ${skippedGoals.join('، ')}`, 'warning')
    }
  }, [showToast])

  useEffect(() => {
    if (data && user && isSupabaseReady() && !scheduledProcessedRef.current) {
      scheduledProcessedRef.current = true
      setTimeout(() => processScheduledGoals(), 500)
    }
  }, [data, user, processScheduledGoals])

  const runDiagnostics = useCallback(async () => {
    if (!user || !isSupabaseReady()) return
    await diagnoseAndFixGoalsSchema(user.id)
  }, [user?.id])

  const resetToDefaults = useCallback(async () => {
    if (!user || !isSupabaseReady()) return

    const timestamp = Date.now()
    const categories = DEFAULT_CATEGORIES.map((c, i) => ({
      id: `cat_${timestamp}_${i}`,
      name: c.name,
      color: c.color,
      budget: c.budget,
    }))

    const defaults = { balance: 0, savings: 0, categories, transactions: [], transfers: [], goals: [] }

    console.log('[AppContext] Resetting to defaults')
    setSyncing(true)
    try {
      await syncToSupabase(user.id, defaults)
      setData(defaults)
      console.log('[AppContext] Reset complete')
    } catch (err) {
      console.error('[AppContext] Reset failed:', err)
    } finally {
      setSyncing(false)
    }
  }, [user?.id])

  const safeValue = {
    balance: data?.balance ?? 0,
    savings: data?.savings ?? 0,
    categories: data?.categories ?? [],
    transactions: data?.transactions ?? [],
    transfers: data?.transfers ?? [],
    goals: data?.goals ?? [],
    totalExpenses: totalExpenses ?? 0,
    remainingBalance: remainingBalance ?? 0,
    dataLoading: dataLoading ?? true,
    syncing: syncing ?? false,
    toast: toast ?? null,
    showToast: wrapWithLog(showToast, 'showToast'),
    hideToast: wrapWithLog(hideToast, 'hideToast'),
    getCatStats: wrapWithLog(getCatStats, 'getCatStats'),
    setBalance: wrapWithLog(setBalance, 'setBalance'),
    addCategory: wrapWithLog(addCategory, 'addCategory'),
    updateCategoryBudget: wrapWithLog(updateCategoryBudget, 'updateCategoryBudget'),
    removeCategory: wrapWithLog(removeCategory, 'removeCategory'),
    addTransaction: wrapWithLog(addTransaction, 'addTransaction'),
    updateTransaction: wrapWithLog(updateTransaction, 'updateTransaction'),
    removeTransaction: wrapWithLog(removeTransaction, 'removeTransaction'),
    transferToSavings: wrapWithLog(transferToSavings, 'transferToSavings'),
    withdrawFromSavings: wrapWithLog(withdrawFromSavings, 'withdrawFromSavings'),
    addGoal: wrapWithLog(addGoal, 'addGoal'),
    updateGoal: wrapWithLog(updateGoal, 'updateGoal'),
    deleteGoal: wrapWithLog(deleteGoal, 'deleteGoal'),
    pauseGoal: wrapWithLog(pauseGoal, 'pauseGoal'),
    resumeGoal: wrapWithLog(resumeGoal, 'resumeGoal'),
    completeGoal: wrapWithLog(completeGoal, 'completeGoal'),
    runDiagnostics: wrapWithLog(runDiagnostics, 'runDiagnostics'),
    resetToDefaults: wrapWithLog(resetToDefaults, 'resetToDefaults'),
  }

  return (
    <AppContext.Provider value={safeValue}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return {
    balance: ctx.balance ?? 0,
    savings: ctx.savings ?? 0,
    categories: ctx.categories ?? [],
    transactions: ctx.transactions ?? [],
    transfers: ctx.transfers ?? [],
    goals: ctx.goals ?? [],
    totalExpenses: ctx.totalExpenses ?? 0,
    remainingBalance: ctx.remainingBalance ?? 0,
    dataLoading: ctx.dataLoading ?? true,
    syncing: ctx.syncing ?? false,
    toast: ctx.toast ?? null,
    showToast: wrapWithLog(ctx.showToast, 'showToast'),
    hideToast: wrapWithLog(ctx.hideToast, 'hideToast'),
    getCatStats: wrapWithLog(ctx.getCatStats, 'getCatStats'),
    setBalance: wrapWithLog(ctx.setBalance, 'setBalance'),
    addCategory: wrapWithLog(ctx.addCategory, 'addCategory'),
    updateCategoryBudget: wrapWithLog(ctx.updateCategoryBudget, 'updateCategoryBudget'),
    removeCategory: wrapWithLog(ctx.removeCategory, 'removeCategory'),
    addTransaction: wrapWithLog(ctx.addTransaction, 'addTransaction'),
    updateTransaction: wrapWithLog(ctx.updateTransaction, 'updateTransaction'),
    removeTransaction: wrapWithLog(ctx.removeTransaction, 'removeTransaction'),
    transferToSavings: wrapWithLog(ctx.transferToSavings, 'transferToSavings'),
    withdrawFromSavings: wrapWithLog(ctx.withdrawFromSavings, 'withdrawFromSavings'),
    addGoal: wrapWithLog(ctx.addGoal, 'addGoal'),
    updateGoal: wrapWithLog(ctx.updateGoal, 'updateGoal'),
    deleteGoal: wrapWithLog(ctx.deleteGoal, 'deleteGoal'),
    pauseGoal: wrapWithLog(ctx.pauseGoal, 'pauseGoal'),
    resumeGoal: wrapWithLog(ctx.resumeGoal, 'resumeGoal'),
    completeGoal: wrapWithLog(ctx.completeGoal, 'completeGoal'),
    runDiagnostics: wrapWithLog(ctx.runDiagnostics, 'runDiagnostics'),
    resetToDefaults: wrapWithLog(ctx.resetToDefaults, 'resetToDefaults'),
  }
}

export { DEFAULT_CATEGORIES }
