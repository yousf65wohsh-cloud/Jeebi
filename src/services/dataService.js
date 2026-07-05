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

export async function loadUserData(userId) {
  console.log(`[dataService] Loading data for user ${userId}`)

  const [walletsResult, transactionsResult, profileResult, goalsResult] = await Promise.all([
    supabase.from('wallets').select('*').eq('user_id', userId),
    supabase.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false }),
    supabase.from('profiles').select('balance, savings').eq('id', userId).single(),
    supabase.from('goals').select('*').eq('user_id', userId),
  ])

  if (walletsResult.error) console.error('[dataService] Error loading wallets:', walletsResult.error)
  if (transactionsResult.error) console.error('[dataService] Error loading transactions:', transactionsResult.error)
  if (profileResult.error && profileResult.error.code !== 'PGRST116') {
    if (walletsResult.data?.length || transactionsResult.data?.length) {
      console.error('[dataService] Error loading profile:', profileResult.error)
    }
  }
  if (goalsResult.error) console.error('[dataService] Error loading goals:', goalsResult.error)

  const wallets = walletsResult.data || []
  const transactions = transactionsResult.data || []
  const balance = profileResult.data?.balance ?? 0
  const savings = profileResult.data?.savings ?? 0
  const goals = goalsResult.data || []

  console.log(`[dataService] Loaded ${wallets.length} wallets, ${transactions.length} transactions, ${goals.length} goals, balance=${balance}, savings=${savings}`)

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
      emoji: g.emoji || '',
      target_amount: Number(g.target_amount) || 0,
      saved_amount: Number(g.saved_amount) || 0,
      frequency: g.frequency || 'monthly',
      contribution_amount: Number(g.contribution_amount) || 0,
      start_date: g.start_date || '',
      target_date: g.target_date || '',
      last_contribution_date: g.last_contribution_date || '',
      status: g.status || 'active',
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

  console.log(`[dataService] Syncing data for user ${userId}: ${data.categories?.length ?? 0} wallets, ${data.transactions?.length ?? 0} transactions, ${data.goals?.length ?? 0} goals, balance=${data.balance}, savings=${data.savings}`)

  const balance = Number(data.balance) || 0
  const savings = Number(data.savings) || 0
  const categories = Array.isArray(data.categories) ? data.categories : []
  const transactions = Array.isArray(data.transactions) ? data.transactions : []
  const goals = Array.isArray(data.goals) ? data.goals : []

  const [existingWallets, existingTxn, existingGoals] = await Promise.all([
    supabase.from('wallets').select('id').eq('user_id', userId),
    supabase.from('transactions').select('id').eq('user_id', userId),
    supabase.from('goals').select('id').eq('user_id', userId),
  ])

  if (existingWallets.error) console.error('[dataService] Error fetching existing wallets:', existingWallets.error)
  if (existingTxn.error) console.error('[dataService] Error fetching existing transactions:', existingTxn.error)
  if (existingGoals.error) console.error('[dataService] Error fetching existing goals:', existingGoals.error)

  const remoteWalletIds = new Set((existingWallets.data || []).map(w => w.id))
  const remoteTxnIds = new Set((existingTxn.data || []).map(t => t.id))
  const remoteGoalIds = new Set((existingGoals.data || []).map(g => g.id))
  const localWalletIds = new Set(categories.map(c => c.id))
  const localTxnIds = new Set(transactions.map(t => t.id))
  const localGoalIds = new Set(goals.map(g => g.id))

  const walletsToDelete = [...remoteWalletIds].filter(id => !localWalletIds.has(id))
  if (walletsToDelete.length > 0) {
    const { error } = await supabase.from('wallets').delete().in('id', walletsToDelete).eq('user_id', userId)
    if (error) console.error('[dataService] Error deleting wallets:', error)
    else console.log(`[dataService] Deleted ${walletsToDelete.length} wallets`)
  }

  for (const wallet of categories) {
    const { error } = await supabase.from('wallets').upsert({
      id: wallet.id,
      user_id: userId,
      name: wallet.name,
      color: wallet.color,
      budget: Number(wallet.budget) || 0,
    }, { onConflict: 'id' })
    if (error) console.error('[dataService] Error upserting wallet', wallet.id, ':', error)
  }

  const txnToDelete = [...remoteTxnIds].filter(id => !localTxnIds.has(id))
  if (txnToDelete.length > 0) {
    const { error } = await supabase.from('transactions').delete().in('id', txnToDelete).eq('user_id', userId)
    if (error) console.error('[dataService] Error deleting transactions:', error)
    else console.log(`[dataService] Deleted ${txnToDelete.length} transactions`)
  }

  for (const txn of transactions) {
    const { error } = await supabase.from('transactions').upsert({
      id: txn.id,
      user_id: userId,
      wallet_id: txn.categoryId,
      amount: Number(txn.amount) || 0,
      description: txn.description || '',
      date: txn.date,
    }, { onConflict: 'id' })
    if (error) console.error('[dataService] Error upserting transaction', txn.id, ':', error)
  }

  const goalsToDelete = [...remoteGoalIds].filter(id => !localGoalIds.has(id))
  if (goalsToDelete.length > 0) {
    const { error } = await supabase.from('goals').delete().in('id', goalsToDelete).eq('user_id', userId)
    if (error) console.error('[dataService] Error deleting goals:', error)
    else console.log(`[dataService] Deleted ${goalsToDelete.length} goals`)
  }

  for (const goal of goals) {
    const { error } = await supabase.from('goals').upsert({
      id: goal.id,
      user_id: userId,
      title: goal.title,
      emoji: goal.emoji || null,
      target_amount: Number(goal.target_amount) || 0,
      saved_amount: Number(goal.saved_amount) || 0,
      frequency: goal.frequency || 'monthly',
      contribution_amount: Number(goal.contribution_amount) || 0,
      start_date: goal.start_date || '',
      target_date: goal.target_date || null,
      last_contribution_date: goal.last_contribution_date || null,
      status: goal.status || 'active',
      created_at: goal.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    if (error) console.error('[dataService] Error upserting goal', goal.id, ':', error)
  }

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    balance: balance,
    savings: savings,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' })
  if (profileError) console.error('[dataService] Error upserting profile:', profileError)
  else console.log(`[dataService] Sync complete — balance=${balance}, savings=${savings}`)

  saveTransfers(userId, data.transfers || [])
}

export async function initializeUserData(userId) {
  console.log(`[dataService] Initializing default data for user ${userId}`)

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
    id: `cat_${timestamp}_${i}`,
    name: c.name,
    color: c.color,
    budget: c.budget,
  }))

  for (const cat of categories) {
    const { error } = await supabase.from('wallets').upsert({
      id: cat.id,
      user_id: userId,
      name: cat.name,
      color: cat.color,
      budget: cat.budget,
    }, { onConflict: 'id' })
    if (error) console.error('[dataService] Error creating default wallet', cat.name, ':', error)
  }

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    balance: 0,
    savings: 0,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' })
  if (profileError) console.error('[dataService] Error upserting profile:', profileError)

  console.log(`[dataService] Initialized ${categories.length} default categories for user ${userId}`)

  return { balance: 0, savings: 0, categories, transactions: [], transfers: [], goals: [] }
}

export async function clearUserData(userId) {
  console.log(`[dataService] Clearing all data for user ${userId}`)
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(getTransfersKey(userId))

  const { error: txnError } = await supabase.from('transactions').delete().eq('user_id', userId)
  if (txnError) console.error('[dataService] Error clearing transactions:', txnError)

  const { error: walletError } = await supabase.from('wallets').delete().eq('user_id', userId)
  if (walletError) console.error('[dataService] Error clearing wallets:', walletError)

  const { error: goalsError } = await supabase.from('goals').delete().eq('user_id', userId)
  if (goalsError) console.error('[dataService] Error clearing goals:', goalsError)

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId, balance: 0, savings: 0, updated_at: new Date().toISOString(),
  })
  if (profileError) console.error('[dataService] Error resetting profile:', profileError)

  console.log('[dataService] Clear complete')
}
