import { supabase } from '../supabase/client'

const STORAGE_KEY = 'jeebi_data'

function getTransfersKey(userId) {
  return 'jeebi_transfers_' + userId
}

function loadTransfers(userId) {
  try {
    const raw = localStorage.getItem(getTransfersKey(userId))
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

function saveTransfers(userId, transfers) {
  try {
    localStorage.setItem(getTransfersKey(userId), JSON.stringify(transfers))
  } catch {}
}

function validateGoal(goal) {
  const missing = []
  if (!goal.id) missing.push('id')
  if (goal.title === undefined || goal.title === null) missing.push('title')
  if (goal.target_amount === undefined || goal.target_amount === null) missing.push('target_amount')
  if (goal.saved_amount === undefined || goal.saved_amount === null) missing.push('saved_amount')
  if (!goal.frequency) missing.push('frequency')
  if (goal.transfer_amount === undefined || goal.transfer_amount === null) missing.push('transfer_amount')
  if (missing.length > 0) {
    console.error('[dataService] Goal validation failed — missing properties: ' + missing.join(', '), JSON.stringify(goal))
    return false
  }
  return true
}

export async function loadUserData(userId) {
  console.log('[dataService] Loading data for user ' + userId)

  const [walletsResult, transactionsResult, profileResult, goalsResult] = await Promise.all([
    supabase.from('wallets').select('*').eq('user_id', userId),
    supabase.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false }),
    supabase.from('profiles').select('balance, savings').eq('id', userId).single(),
    supabase.from('goals').select('*').eq('user_id', userId),
  ])

  if (goalsResult.error) {
    console.error('[dataService] Goals fetch failed', JSON.stringify(goalsResult.error, null, 2))
    if (goalsResult.error.code === '42P01') {
      console.error('[dataService] The "goals" table does not exist in Supabase. Run src/supabase/migration_goals.sql in the SQL Editor.')
    }
  }

  const wallets = walletsResult.data || []
  const transactions = transactionsResult.data || []
  const balance = profileResult.data?.balance ?? 0
  const savings = profileResult.data?.savings ?? 0
  const goals = goalsResult.data || []

  console.log('[dataService] Loaded ' + wallets.length + ' wallets, ' + transactions.length + ' transactions, ' + goals.length + ' goals, balance=' + balance + ', savings=' + savings)

  if (wallets.length === 0 && transactions.length === 0 && !profileResult.data) {
    console.log('[dataService] First-time user detected — no remote data')
    return null
  }

  const transfers = loadTransfers(userId)

  const data = {
    balance: Number(balance) || 0,
    savings: Number(savings) || 0,
    categories: wallets.map(w => ({
      id: w.id,
      name: w.name,
      color: w.color,
      budget: Number(w.budget) || 0,
    })),
    transactions: transactions.map(t => ({
      id: t.id,
      amount: Number(t.amount) || 0,
      categoryId: t.wallet_id,
      description: t.description || '',
      date: t.date,
    })),
    transfers,
    goals: goals.map(g => ({
      id: g.id,
      title: g.title,
      target_amount: Number(g.target_amount) || 0,
      saved_amount: Number(g.saved_amount) || 0,
      frequency: g.frequency || 'monthly',
      transfer_amount: Number(g.transfer_amount) || 0,
      completed: g.completed || false,
      status: g.completed ? 'completed' : 'active',
      created_at: g.created_at || '',
      updated_at: g.updated_at || '',
    })),
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  return data
}

export async function syncToSupabase(userId, data) {
  if (!data) {
    console.warn('[dataService] syncToSupabase called with no data')
    return
  }

  const balance = Number(data.balance) || 0
  const savings = Number(data.savings) || 0
  const categories = Array.isArray(data.categories) ? data.categories : []
  const transactions = Array.isArray(data.transactions) ? data.transactions : []
  const goals = Array.isArray(data.goals) ? data.goals : []

  console.log('[dataService] Syncing for user ' + userId + ': ' + categories.length + ' wallets, ' + transactions.length + ' transactions, ' + goals.length + ' goals, balance=' + balance + ', savings=' + savings)

  const [existingWallets, existingTxn, existingGoals] = await Promise.all([
    supabase.from('wallets').select('id').eq('user_id', userId),
    supabase.from('transactions').select('id').eq('user_id', userId),
    supabase.from('goals').select('id').eq('user_id', userId),
  ])

  if (existingGoals.error) {
    console.error('[dataService] Failed to fetch existing goals for sync', JSON.stringify(existingGoals.error, null, 2))
  }

  const remoteWalletIds = new Set((existingWallets.data || []).map(w => w.id))
  const remoteTxnIds = new Set((existingTxn.data || []).map(t => t.id))
  const remoteGoalIds = new Set((existingGoals.data || []).map(g => g.id))
  const localWalletIds = new Set(categories.map(c => c.id))
  const localTxnIds = new Set(transactions.map(t => t.id))
  const localGoalIds = new Set(goals.map(g => g.id))

  const walletsToDelete = [...remoteWalletIds].filter(id => !localWalletIds.has(id))
  if (walletsToDelete.length > 0) {
    const result = await supabase.from('wallets').delete().in('id', walletsToDelete).eq('user_id', userId)
    if (result.error) console.error('[dataService] Error deleting wallets', JSON.stringify(result.error, null, 2))
    else console.log('[dataService] Deleted ' + walletsToDelete.length + ' wallets')
  }

  for (const wallet of categories) {
    const payload = { id: wallet.id, user_id: userId, name: wallet.name, color: wallet.color, budget: Number(wallet.budget) || 0 }
    const result = await supabase.from('wallets').upsert(payload, { onConflict: 'id' })
    if (result.error) console.error('[dataService] Error upserting wallet', JSON.stringify(result.error, null, 2))
  }

  const txnToDelete = [...remoteTxnIds].filter(id => !localTxnIds.has(id))
  if (txnToDelete.length > 0) {
    const result = await supabase.from('transactions').delete().in('id', txnToDelete).eq('user_id', userId)
    if (result.error) console.error('[dataService] Error deleting transactions', JSON.stringify(result.error, null, 2))
    else console.log('[dataService] Deleted ' + txnToDelete.length + ' transactions')
  }

  for (const txn of transactions) {
    const payload = { id: txn.id, user_id: userId, wallet_id: txn.categoryId, amount: Number(txn.amount) || 0, description: txn.description || '', date: txn.date }
    const result = await supabase.from('transactions').upsert(payload, { onConflict: 'id' })
    if (result.error) console.error('[dataService] Error upserting transaction', JSON.stringify(result.error, null, 2))
  }

  const goalsToDelete = [...remoteGoalIds].filter(id => !localGoalIds.has(id))
  if (goalsToDelete.length > 0) {
    const result = await supabase.from('goals').delete().in('id', goalsToDelete).eq('user_id', userId)
    if (result.error) console.error('[dataService] Error deleting goals', JSON.stringify(result.error, null, 2))
    else console.log('[dataService] Deleted ' + goalsToDelete.length + ' goals')
  }

  for (const goal of goals) {
    if (!validateGoal(goal)) continue

    const payload = {
      id: goal.id,
      user_id: userId,
      title: goal.title,
      target_amount: Number(goal.target_amount) || 0,
      saved_amount: Number(goal.saved_amount) || 0,
      frequency: goal.frequency || 'monthly',
      transfer_amount: Number(goal.transfer_amount) || 0,
      completed: goal.status === 'completed' || goal.completed || false,
      created_at: goal.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    console.log('GOAL OBJECT', JSON.stringify(goal, null, 2))
    console.log('PAYLOAD TO SUPABASE', JSON.stringify(payload, null, 2))

    const result = await supabase.from('goals').upsert(payload, { onConflict: 'id' })

    console.log('UPSERT RESULT', JSON.stringify(result, null, 2))

    if (result.error) {
      console.error('GOAL UPSERT ERROR', JSON.stringify(result.error, null, 2))
    } else {
      console.log('[dataService] Upserted goal ' + goal.id + ': "' + goal.title + '"')
    }
  }

  const profilePayload = { id: userId, balance: balance, savings: savings, updated_at: new Date().toISOString() }
  const profileResult = await supabase.from('profiles').upsert(profilePayload, { onConflict: 'id' })
  if (profileResult.error) console.error('[dataService] Error upserting profile', JSON.stringify(profileResult.error, null, 2))
  else console.log('[dataService] Sync complete — balance=' + balance + ', savings=' + savings)

  saveTransfers(userId, data.transfers || [])
}

export async function initializeUserData(userId) {
  console.log('[dataService] Initializing default data for user ' + userId)

  const timestamp = Date.now()
  const DEFAULT_CATEGORIES = [
    { name: 'إيجار', color: '#ef4444', budget: 0 },
    { name: 'إنترنت', color: '#3b82f6', budget: 0 },
    { name: 'مطاعم', color: '#f59e0b', budget: 0 },
    { name: 'مواصلات', color: '#10b981', budget: 0 },
    { name: 'تسوق', color: '#ec4899', budget: 0 },
    { name: 'أخرى', color: '#8b5cf6', budget: 0 },
  ]

  const categories = DEFAULT_CATEGORIES.map((c, i) => ({
    id: 'cat_' + timestamp + '_' + i,
    name: c.name,
    color: c.color,
    budget: c.budget,
  }))

  for (const cat of categories) {
    const payload = { id: cat.id, user_id: userId, name: cat.name, color: cat.color, budget: cat.budget }
    const result = await supabase.from('wallets').upsert(payload, { onConflict: 'id' })
    if (result.error) console.error('[dataService] Error creating default wallet', JSON.stringify(result.error, null, 2))
  }

  const profilePayload = { id: userId, balance: 0, savings: 0, updated_at: new Date().toISOString() }
  const result = await supabase.from('profiles').upsert(profilePayload, { onConflict: 'id' })
  if (result.error) console.error('[dataService] Error creating profile', JSON.stringify(result.error, null, 2))

  console.log('[dataService] Initialized ' + categories.length + ' default categories')

  return { balance: 0, savings: 0, categories, transactions: [], transfers: [], goals: [] }
}

export async function clearUserData(userId) {
  console.log('[dataService] Clearing all data for user ' + userId)
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(getTransfersKey(userId))

  const txnResult = await supabase.from('transactions').delete().eq('user_id', userId)
  if (txnResult.error) console.error('[dataService] Error clearing transactions', JSON.stringify(txnResult.error, null, 2))

  const walletResult = await supabase.from('wallets').delete().eq('user_id', userId)
  if (walletResult.error) console.error('[dataService] Error clearing wallets', JSON.stringify(walletResult.error, null, 2))

  const goalsResult = await supabase.from('goals').delete().eq('user_id', userId)
  if (goalsResult.error) console.error('[dataService] Error clearing goals', JSON.stringify(goalsResult.error, null, 2))

  const profilePayload = { id: userId, balance: 0, savings: 0, updated_at: new Date().toISOString() }
  const profileResult = await supabase.from('profiles').upsert(profilePayload)
  if (profileResult.error) console.error('[dataService] Error resetting profile', JSON.stringify(profileResult.error, null, 2))

  console.log('[dataService] Clear complete')
}
