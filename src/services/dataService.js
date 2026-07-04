import { supabase, isSupabaseReady } from '../supabase/client'

const STORAGE_KEY = 'jeebi_data'

/**
 * Load all user data from Supabase and write to LocalStorage.
 */
export async function loadUserData(userId) {
  const [walletsResult, transactionsResult, profileResult] = await Promise.all([
    supabase.from('wallets').select('*').eq('user_id', userId),
    supabase.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false }),
    supabase.from('profiles').select('balance').eq('id', userId).single(),
  ])

  const data = {
    balance: profileResult.data?.balance ?? 0,
    categories: (walletsResult.data || []).map(w => ({
      id: w.id,
      name: w.name,
      color: w.color,
      budget: Number(w.budget),
    })),
    transactions: (transactionsResult.data || []).map(t => ({
      id: t.id,
      amount: Number(t.amount),
      categoryId: t.wallet_id,
      description: t.description || '',
      date: t.date,
    })),
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  return data
}

/**
 * Upsert all data from LocalStorage to Supabase for the given user.
 * Called after every local mutation so the cloud stays in sync.
 */
export async function syncToSupabase(userId) {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return
  const data = JSON.parse(raw)

  // Fetch existing IDs from Supabase to know what to delete vs. upsert
  const [existingWallets, existingTxn] = await Promise.all([
    supabase.from('wallets').select('id').eq('user_id', userId),
    supabase.from('transactions').select('id').eq('user_id', userId),
  ])

  const remoteWalletIds = new Set((existingWallets.data || []).map(w => w.id))
  const remoteTxnIds = new Set((existingTxn.data || []).map(t => t.id))
  const localWalletIds = new Set(data.categories.map(c => c.id))
  const localTxnIds = new Set(data.transactions.map(t => t.id))

  // ---- Wallets ----
  const walletsToDelete = [...remoteWalletIds].filter(id => !localWalletIds.has(id))
  const walletsToUpsert = data.categories.map(c => ({
    id: c.id,
    user_id: userId,
    name: c.name,
    color: c.color,
    budget: c.budget,
  }))

  if (walletsToDelete.length > 0) {
    await supabase.from('wallets').delete().in('id', walletsToDelete).eq('user_id', userId)
  }
  for (const wallet of walletsToUpsert) {
    await supabase.from('wallets').upsert(wallet, { onConflict: 'id' })
  }

  // ---- Transactions ----
  const txnToDelete = [...remoteTxnIds].filter(id => !localTxnIds.has(id))
  const txnToUpsert = data.transactions.map(t => ({
    id: t.id,
    user_id: userId,
    wallet_id: t.categoryId,
    amount: t.amount,
    description: t.description || '',
    date: t.date,
  }))

  if (txnToDelete.length > 0) {
    await supabase.from('transactions').delete().in('id', txnToDelete).eq('user_id', userId)
  }
  for (const txn of txnToUpsert) {
    await supabase.from('transactions').upsert(txn, { onConflict: 'id' })
  }

  // ---- Profile (balance) ----
  await supabase.from('profiles').upsert({
    id: userId,
    balance: data.balance,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' })
}

/**
 * Clear LocalStorage and remote data for a user.
 */
export async function clearUserData(userId) {
  localStorage.removeItem(STORAGE_KEY)

  await Promise.all([
    supabase.from('transactions').delete().eq('user_id', userId),
    supabase.from('wallets').delete().eq('user_id', userId),
    supabase.from('profiles').upsert({ id: userId, balance: 0, updated_at: new Date().toISOString() }),
  ])
}
