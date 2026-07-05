import { supabase } from '../supabase/client'

const STORAGE_KEY = 'jeebi_data'

export async function loadUserData(userId) {
  console.log(`[dataService] Loading data for user ${userId}`)

  const [walletsResult, transactionsResult, profileResult] = await Promise.all([
    supabase.from('wallets').select('*').eq('user_id', userId),
    supabase.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false }),
    supabase.from('profiles').select('balance').eq('id', userId).single(),
  ])

  if (walletsResult.error) console.error('[dataService] Error loading wallets:', walletsResult.error)
  if (transactionsResult.error) console.error('[dataService] Error loading transactions:', transactionsResult.error)
  if (profileResult.error && profileResult.error.code !== 'PGRST116') {
    if (walletsResult.data?.length || transactionsResult.data?.length) {
      console.error('[dataService] Error loading profile:', profileResult.error)
    }
  }

  const wallets = walletsResult.data || []
  const transactions = transactionsResult.data || []
  const balance = profileResult.data?.balance ?? 0

  console.log(`[dataService] Loaded ${wallets.length} wallets, ${transactions.length} transactions, balance=${balance}`)

  if (wallets.length === 0 && transactions.length === 0 && !profileResult.data) {
    console.log('[dataService] First-time user detected — no remote data')
    return null
  }

  const data = {
    balance: Number(balance) || 0,
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
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  return data
}

export async function syncToSupabase(userId, data) {
  if (!data) {
    console.warn('[dataService] syncToSupabase called with no data')
    return
  }

  console.log(`[dataService] Syncing data for user ${userId}: ${data.categories?.length ?? 0} wallets, ${data.transactions?.length ?? 0} transactions, balance=${data.balance}`)

  const balance = Number(data.balance) || 0
  const categories = Array.isArray(data.categories) ? data.categories : []
  const transactions = Array.isArray(data.transactions) ? data.transactions : []

  const [existingWallets, existingTxn] = await Promise.all([
    supabase.from('wallets').select('id').eq('user_id', userId),
    supabase.from('transactions').select('id').eq('user_id', userId),
  ])

  if (existingWallets.error) console.error('[dataService] Error fetching existing wallets:', existingWallets.error)
  if (existingTxn.error) console.error('[dataService] Error fetching existing transactions:', existingTxn.error)

  const remoteWalletIds = new Set((existingWallets.data || []).map(w => w.id))
  const remoteTxnIds = new Set((existingTxn.data || []).map(t => t.id))
  const localWalletIds = new Set(categories.map(c => c.id))
  const localTxnIds = new Set(transactions.map(t => t.id))

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

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    balance: balance,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' })
  if (profileError) console.error('[dataService] Error upserting profile:', profileError)
  else console.log('[dataService] Sync complete — balance=${balance}')
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
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' })
  if (profileError) console.error('[dataService] Error upserting profile:', profileError)

  console.log(`[dataService] Initialized ${categories.length} default categories for user ${userId}`)

  return { balance: 0, categories, transactions: [] }
}

export async function clearUserData(userId) {
  console.log(`[dataService] Clearing all data for user ${userId}`)
  localStorage.removeItem(STORAGE_KEY)

  const { error: txnError } = await supabase.from('transactions').delete().eq('user_id', userId)
  if (txnError) console.error('[dataService] Error clearing transactions:', txnError)

  const { error: walletError } = await supabase.from('wallets').delete().eq('user_id', userId)
  if (walletError) console.error('[dataService] Error clearing wallets:', walletError)

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId, balance: 0, updated_at: new Date().toISOString(),
  })
  if (profileError) console.error('[dataService] Error resetting profile:', profileError)

  console.log('[dataService] Clear complete')
}
