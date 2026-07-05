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

function logSeparator() {
  console.error('='.repeat(72))
}

function logField(label, value) {
  console.error(`  ${label}: ${value === undefined ? 'undefined' : value === null ? 'null' : value}`)
}

function logObject(label, obj) {
  console.error(`  ${label}:`)
  const lines = JSON.stringify(obj, null, 2).split('\n')
  lines.forEach(line => console.error('    ' + line))
}

function logSupabaseOp(context, { request, response, error }) {
  logSeparator()
  console.error(`  SUPABASE OP: ${context}`)
  if (request) logObject('Request', request)
  if (response) {
    logSeparator()
    console.error('  RESPONSE:')
    if (response.data !== undefined) logObject('  data', response.data)
  }
  if (error) {
    logSeparator()
    console.error('  ERROR:')
    logField('code', error.code)
    logField('message', error.message)
    logField('details', error.details)
    logField('hint', error.hint)
    logField('status', error.status || error.statusCode || 'N/A')
    logField('statusText', error.statusText || 'N/A')
    logSeparator()
    logField('error.toString()', error.toString())
    logField('typeof error', typeof error)
    logField('error.constructor.name', error?.constructor?.name)
    logObject('Full error object', error)
    logSeparator()
  } else {
    console.error('  No error')
    logSeparator()
  }
}

const EXPECTED_GOALS_SCHEMA = {
  table: 'goals',
  columns: [
    { name: 'id', type: 'text', nullable: false, is_pk: true, default: null },
    { name: 'user_id', type: 'uuid', nullable: false, is_pk: false, default: null, references: { table: 'auth.users', column: 'id' } },
    { name: 'title', type: 'text', nullable: false, is_pk: false, default: null },
    { name: 'emoji', type: 'text', nullable: true, is_pk: false, default: "''::text" },
    { name: 'target_amount', type: 'numeric', nullable: false, is_pk: false, default: '0' },
    { name: 'saved_amount', type: 'numeric', nullable: false, is_pk: false, default: '0' },
    { name: 'frequency', type: 'text', nullable: false, is_pk: false, default: "'monthly'::text" },
    { name: 'contribution_amount', type: 'numeric', nullable: false, is_pk: false, default: '0' },
    { name: 'start_date', type: 'text', nullable: false, is_pk: false, default: "''::text" },
    { name: 'target_date', type: 'text', nullable: true, is_pk: false, default: null },
    { name: 'last_contribution_date', type: 'text', nullable: true, is_pk: false, default: null },
    { name: 'status', type: 'text', nullable: false, is_pk: false, default: "'active'::text" },
    { name: 'created_at', type: 'text', nullable: false, is_pk: false, default: null },
    { name: 'updated_at', type: 'text', nullable: false, is_pk: false, default: null },
  ],
  rls_enabled: true,
  rls_policies: ['select', 'insert', 'update', 'delete'],
  foreign_keys: [
    { column: 'user_id', references_table: 'auth.users', references_column: 'id', on_delete: 'CASCADE' },
  ],
}

function columnTypeMismatch(actual, expected) {
  const actualType = actual.data_type.toLowerCase()
  const expectedType = expected.type.toLowerCase()
  if (actualType === expectedType) return null
  if (actualType === 'real' && expectedType === 'numeric') return null
  if (actualType === 'double precision' && expectedType === 'numeric') return null
  if (actualType === 'integer' && expectedType === 'numeric') return null
  if (actualType === 'bigint' && expectedType === 'numeric') return null
  if (actualType === 'smallint' && expectedType === 'numeric') return null
  if (actualType === 'numeric' && ['real', 'double precision', 'integer', 'bigint', 'smallint'].includes(expectedType)) return null
  if (actualType === 'character varying' && expectedType === 'text') return null
  if (actualType === 'varchar' && expectedType === 'text') return null
  if (actualType === 'text' && ['character varying', 'varchar'].includes(expectedType)) return null
  if (actualType === 'timestamp with time zone' && expectedType === 'text') return `TIMESTAMPTZ vs TEXT - date must be stored as ISO string in code`
  if (actualType === 'timestamp without time zone' && expectedType === 'text') return `TIMESTAMP vs TEXT`
  if (actualType === 'date' && expectedType === 'text') return `DATE vs TEXT`
  return `Expected ${expectedType}, got ${actualType}`
}

export async function checkGoalsSchema() {
  logSeparator()
  console.error('  SCHEMA DIAGNOSIS FOR "goals" TABLE')
  logSeparator()
  console.error('  Expected columns:')
  EXPECTED_GOALS_SCHEMA.columns.forEach(c => {
    console.error(`    ${c.name} (${c.type})${c.is_pk ? ' PK' : ''}${c.references ? ' -> ' + c.references.table + '(' + c.references.column + ')' : ''}`)
  })
  logSeparator()

  let tableExists = false
  let actualColumns = []

  logSeparator()
  console.error('  Attempting to query information_schema...')
  logSeparator()
  console.error('  NOTE: Supabase anon key may not have access to information_schema.')
  console.error('  If this fails, we fall back to try-fetch which checks by error code.')
  logSeparator()

  try {
    const { data: tables, error: tablesErr } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'goals')

    logField('information_schema.tables result', tables ? JSON.stringify(tables) : 'null')
    logField('information_schema.tables error', tablesErr ? tablesErr.toString() : 'null')
    if (tablesErr) logObject('information_schema error details', tablesErr)

    if (tables && tables.length > 0) {
      tableExists = true
      console.error('  TABLE EXISTS (information_schema confirmed)')
    } else {
      console.error('  TABLE DOES NOT EXIST (information_schema reported)')
    }
  } catch (e) {
    logField('information_schema query exception', e.toString())
    console.error('  Cannot access information_schema with anon key.')
    console.error('  Falling back to pragmatic detection via SELECT query error code...')
  }

  if (tableExists) {
    try {
      const { data: cols, error: colsErr } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default, character_maximum_length')
        .eq('table_schema', 'public')
        .eq('table_name', 'goals')

      logField('information_schema.columns result', cols ? JSON.stringify(cols) : 'null')
      logField('information_schema.columns error', colsErr ? colsErr.toString() : 'null')
      if (colsErr) logObject('columns error details', colsErr)

      actualColumns = cols || []
    } catch (e) {
      console.error('  Error checking columns:', e.toString())
      logObject('Exception', e)
    }
    logSeparator()
  }

  if (!tableExists) {
    logSeparator()
    console.error('  PRAGMATIC DETECTION: attempting to SELECT 1 row from goals...')
    logSeparator()
    try {
      const { data: probe, error: probeErr } = await supabase.from('goals').select('id').limit(1)
      logField('Probe result data', probe ? JSON.stringify(probe) : 'null')
      logField('Probe result error', probeErr ? probeErr.toString() : 'null')
      if (probeErr) logObject('Probe error details', probeErr)
      if (probeErr && probeErr.code === '42P01') {
        tableExists = false
        console.error('  CONFIRMED: Table "goals" does not exist (error code 42P01)')
      } else if (probeErr) {
        console.error('  Table exists but query failed with different error')
        tableExists = true
      } else {
        tableExists = true
        console.error('  CONFIRMED: Table "goals" exists and is queryable')
      }
    } catch (e) {
      console.error('  Probe query failed:', e.toString())
      logObject('Exception', e)
    }
    logSeparator()
  }

  const actualMap = {}
  actualColumns.forEach(c => { actualMap[c.column_name] = c })

  const expectedMap = {}
  EXPECTED_GOALS_SCHEMA.columns.forEach(c => { expectedMap[c.name] = c })

  const allColNames = new Set([...Object.keys(actualMap), ...Object.keys(expectedMap)])

  console.error('  COLUMN COMPARISON:')
  logSeparator()

  let mismatches = []

  for (const colName of [...allColNames].sort()) {
    const actual = actualMap[colName]
    const expected = expectedMap[colName]

    if (actual && !expected) {
      mismatches.push({ type: 'extra_column', column: colName, actual })
      console.error(`  EXTRA COLUMN: ${colName} (${actual.data_type})`)
    } else if (!actual && expected) {
      mismatches.push({ type: 'missing_column', column: colName, expected })
      console.error(`  MISSING COLUMN: ${colName} (${expected.type})`)
    } else if (actual && expected) {
      const typeIssue = columnTypeMismatch(actual, expected)
      if (typeIssue) {
        mismatches.push({ type: 'type_mismatch', column: colName, actual: actual.data_type, expected: expected.type, detail: typeIssue })
        console.error(`  TYPE MISMATCH: ${colName} — ${typeIssue}`)
      }

      const actualNullable = actual.is_nullable === 'YES'
      const expectedNullable = !expected.nullable
      if (actualNullable !== expectedNullable) {
        mismatches.push({ type: 'nullable_mismatch', column: colName, actual_nullable: actualNullable, expected_nullable: expectedNullable })
        console.error(`  NULLABLE MISMATCH: ${colName} — actual nullable=${actualNullable}, expected nullable=${expectedNullable}`)
      }

      const hasActualDefault = actual.column_default !== null && actual.column_default !== undefined
      const hasExpectedDefault = expected.default !== null
      if (hasActualDefault !== hasExpectedDefault) {
        mismatches.push({ type: 'default_mismatch', column: colName, actual_default: actual.column_default, expected_default: expected.default })
        console.error(`  DEFAULT MISMATCH: ${colName} — actual default=${actual.column_default}, expected default=${expected.default}`)
      }

      console.error(`  OK: ${colName} (actual=${actual.data_type}, expected=${expected.type})`)
    }
  }

  logSeparator()

  console.error('  RLS AND FK CHECKS (not yet supported via information_schema RPC):')
  console.error('  NOTE: RLS policies and foreign keys cannot be queried via the Supabase')
  console.error('  client anon key. They must be verified manually in the SQL Editor.')
  console.error('  See src/supabase/schema.sql for the expected RLS and FK definitions.')
  logSeparator()

  return { tableExists, actualColumns, expectedColumns: EXPECTED_GOALS_SCHEMA.columns, mismatches }
}

function validateGoal(goal) {
  const missing = []
  if (!goal.id) missing.push('id')
  if (goal.title === undefined || goal.title === null) missing.push('title')
  if (goal.target_amount === undefined || goal.target_amount === null) missing.push('target_amount')
  if (goal.saved_amount === undefined || goal.saved_amount === null) missing.push('saved_amount')
  if (!goal.frequency) missing.push('frequency')
  if (goal.contribution_amount === undefined || goal.contribution_amount === null) missing.push('contribution_amount')
  if (goal.start_date === undefined || goal.start_date === null) missing.push('start_date')
  if (!goal.status) missing.push('status')
  if (missing.length > 0) {
    console.error(`[dataService] Goal validation failed — missing properties: ${missing.join(', ')}`)
    logObject('Invalid goal object', goal)
    return false
  }
  return true
}

export async function testGoalUpsert(userId) {
  logSeparator()
  console.error('  TEST GOAL UPSERT')
  logSeparator()
  console.error('  This will attempt to create a test goal and log every detail.')

  const testGoal = {
    id: 'test_goal_' + Date.now(),
    title: 'Test Goal',
    emoji: '🧪',
    target_amount: 1000,
    saved_amount: 0,
    frequency: 'monthly',
    contribution_amount: 100,
    start_date: new Date().toISOString().slice(0, 10),
    target_date: null,
    last_contribution_date: null,
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  logSeparator()
  console.error('  Test goal object:')
  logObject('Full JSON', testGoal)
  logSeparator()
  console.error('  Calling supabase.from("goals").insert(...)')
  logSeparator()

  const payload = {
    id: testGoal.id,
    user_id: userId,
    title: testGoal.title,
    emoji: testGoal.emoji || null,
    target_amount: testGoal.target_amount,
    saved_amount: testGoal.saved_amount,
    frequency: testGoal.frequency,
    contribution_amount: testGoal.contribution_amount,
    start_date: testGoal.start_date,
    target_date: testGoal.target_date || null,
    last_contribution_date: testGoal.last_contribution_date || null,
    status: testGoal.status,
    created_at: testGoal.created_at,
    updated_at: testGoal.updated_at,
  }

  logObject('Payload sent to Supabase', payload)
  logSeparator()

  const result = await supabase.from('goals').insert(payload)

  logSupabaseOp('TEST GOAL INSERT', {
    request: { body: payload, method: 'POST', endpoint: '/rest/v1/goals' },
    response: { data: result.data, status: result.status, statusText: result.statusText },
    error: result.error,
  })

  if (result.error) {
    console.error('  TEST FAILED — could not create test goal')
    logSeparator()
    console.error('  ROOT CAUSE ANALYSIS:')
    console.error('  -------------------')
    if (result.error.code === '42P01') {
      console.error('  The "goals" table does not exist in the Supabase database.')
      console.error('  Run the SQL in src/supabase/migration_goals.sql in the Supabase SQL Editor.')
    } else if (result.error.code === '23505') {
      console.error('  Duplicate key violation. This may be a conflict detection issue.')
    } else if (result.error.code === '23503') {
      console.error('  Foreign key violation. The user_id may not exist in auth.users.')
    } else if (result.error.code === '42501') {
      console.error('  RLS policy violation. The user may not have permission to insert.')
    } else if (result.error.code === '23502') {
      console.error('  Not null violation. A required column is missing from the payload.')
    } else if (result.error.message && result.error.message.includes('column')) {
      console.error('  Column mismatch. The payload contains a column that does not exist in the table.')
    } else {
      console.error('  Unknown error. See full error details above.')
    }
    logSeparator()
  } else {
    console.error('  TEST PASSED — test goal created successfully')
    logSeparator()
    console.error('  Cleaning up test goal...')
    const del = await supabase.from('goals').delete().eq('id', testGoal.id)
    logField('Cleanup result', del.error ? 'Error: ' + del.error.toString() : 'Success')
    logSeparator()
  }

  return { success: !result.error, error: result.error }
}

export async function diagnoseAndFixGoalsSchema(userId) {
  logSeparator()
  console.error('  GOALS SCHEMA DIAGNOSTIC & AUTO-FIX')
  logSeparator()

  const schemaInfo = await checkGoalsSchema()

  if (schemaInfo.tableExists && schemaInfo.mismatches.length === 0) {
    console.error('  Schema is correct. Testing upsert...')
    const test = await testGoalUpsert(userId)
    if (test.success) {
      console.error('  All clear — goals feature should work correctly.')
    } else {
      console.error('  Schema looks correct but upsert still fails — see above for details.')
    }
    return
  }

  if (!schemaInfo.tableExists) {
    console.error('  TABLE MISSING — generating CREATE TABLE migration...')
    logSeparator()
    console.error('  Run this SQL in the Supabase SQL Editor:')
    logSeparator()
    const migration = [
      '  -- Create goals table for Jeebi',
      '  CREATE TABLE IF NOT EXISTS goals (',
      '    id TEXT PRIMARY KEY,',
      '    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,',
      '    title TEXT NOT NULL,',
      '    emoji TEXT DEFAULT \'\',',
      '    target_amount NUMERIC NOT NULL DEFAULT 0,',
      '    saved_amount NUMERIC NOT NULL DEFAULT 0,',
      '    frequency TEXT NOT NULL DEFAULT \'monthly\',',
      '    contribution_amount NUMERIC NOT NULL DEFAULT 0,',
      '    start_date TEXT NOT NULL DEFAULT \'\',',
      '    target_date TEXT DEFAULT NULL,',
      '    last_contribution_date TEXT DEFAULT NULL,',
      '    status TEXT NOT NULL DEFAULT \'active\',',
      '    created_at TEXT NOT NULL,',
      '    updated_at TEXT NOT NULL',
      '  );',
      '',
      '  ALTER TABLE goals ENABLE ROW LEVEL SECURITY;',
      '',
      '  CREATE POLICY "Users can view their own goals"',
      '    ON goals FOR SELECT USING (auth.uid() = user_id);',
      '  CREATE POLICY "Users can create their own goals"',
      '    ON goals FOR INSERT WITH CHECK (auth.uid() = user_id);',
      '  CREATE POLICY "Users can update their own goals"',
      '    ON goals FOR UPDATE USING (auth.uid() = user_id);',
      '  CREATE POLICY "Users can delete their own goals"',
      '    ON goals FOR DELETE USING (auth.uid() = user_id);',
      '',
    ]
    migration.forEach(line => console.error(line))
    logSeparator()
  }

  if (schemaInfo.mismatches.length > 0) {
    console.error(`  Found ${schemaInfo.mismatches.length} schema mismatches.`)
    console.error('  Generating ALTER TABLE migration...')
    logSeparator()

    for (const mismatch of schemaInfo.mismatches) {
      if (mismatch.type === 'missing_column') {
        console.error(`  ALTER TABLE goals ADD COLUMN ${mismatch.column} ${mismatch.expected.type}${mismatch.expected.nullable ? '' : ' NOT NULL'}${mismatch.expected.default ? ' DEFAULT ' + mismatch.expected.default : ''};`)
      } else if (mismatch.type === 'type_mismatch') {
        console.error(`  ALTER TABLE goals ALTER COLUMN ${mismatch.column} TYPE ${mismatch.expected};`)
      } else if (mismatch.type === 'extra_column') {
        console.error(`  -- Extra column ${mismatch.column} (${mismatch.actual.data_type}) — may need ALTER TABLE goals DROP COLUMN ${mismatch.column};`)
      }
    }
    logSeparator()
  }
}

export async function loadUserData(userId) {
  console.log(`[dataService] Loading data for user ${userId}`)

  const [walletsResult, transactionsResult, profileResult, goalsResult] = await Promise.all([
    supabase.from('wallets').select('*').eq('user_id', userId),
    supabase.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false }),
    supabase.from('profiles').select('balance, savings').eq('id', userId).single(),
    supabase.from('goals').select('*').eq('user_id', userId),
  ])

  logSupabaseOp('load goals', {
    request: { query: 'select * from goals where user_id = ' + userId },
    response: goalsResult,
    error: goalsResult.error,
  })

  logSupabaseOp('load wallets', {
    request: { query: 'select * from wallets where user_id = ' + userId },
    response: walletsResult,
    error: walletsResult.error,
  })

  logSupabaseOp('load transactions', {
    request: { query: 'select * from transactions where user_id = ' + userId },
    response: transactionsResult,
    error: transactionsResult.error,
  })

  if (profileResult.error && profileResult.error.code !== 'PGRST116') {
    if (walletsResult.data?.length || transactionsResult.data?.length) {
      logSupabaseOp('load profile', {
        request: { query: "select balance, savings from profiles where id = '" + userId + "'" },
        response: profileResult,
        error: profileResult.error,
      })
    }
  }

  const wallets = walletsResult.data || []
  const transactions = transactionsResult.data || []
  const balance = profileResult.data?.balance ?? 0
  const savings = profileResult.data?.savings ?? 0
  const goals = goalsResult.data || []

  if (goalsResult.error) {
    console.error('[dataService] Goals fetch failed — goals feature will be degraded')
    if (goalsResult.error.code === '42P01') {
      logSeparator()
      console.error('  DETECTED: "goals" table does not exist in Supabase!')
      console.error('  Run the SQL in src/supabase/migration_goals.sql in the Supabase SQL Editor.')
      console.error('  Or use the "تشخيص المشكلة" button in the Goals section to generate the SQL.')
      logSeparator()
    }
  }

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

  logSupabaseOp('fetch existing goals for sync', {
    request: { query: 'select id from goals where user_id = ' + userId },
    response: existingGoals,
    error: existingGoals.error,
  })

  const remoteWalletIds = new Set((existingWallets.data || []).map(w => w.id))
  const remoteTxnIds = new Set((existingTxn.data || []).map(t => t.id))
  const remoteGoalIds = new Set((existingGoals.data || []).map(g => g.id))
  const localWalletIds = new Set(categories.map(c => c.id))
  const localTxnIds = new Set(transactions.map(t => t.id))
  const localGoalIds = new Set(goals.map(g => g.id))

  const walletsToDelete = [...remoteWalletIds].filter(id => !localWalletIds.has(id))
  if (walletsToDelete.length > 0) {
    const result = await supabase.from('wallets').delete().in('id', walletsToDelete).eq('user_id', userId)
    logSupabaseOp('delete wallets', {
      request: { ids: walletsToDelete },
      response: result,
      error: result.error,
    })
    if (!result.error) console.log(`[dataService] Deleted ${walletsToDelete.length} wallets`)
  }

  for (const wallet of categories) {
    const payload = {
      id: wallet.id,
      user_id: userId,
      name: wallet.name,
      color: wallet.color,
      budget: Number(wallet.budget) || 0,
    }
    logSupabaseOp('upsert wallet ' + wallet.id, {
      request: { body: payload, method: 'POST', endpoint: '/rest/v1/wallets?on_conflict=id' },
      error: null,
    })
    const result = await supabase.from('wallets').upsert(payload, { onConflict: 'id' })
    logSupabaseOp('upsert wallet result ' + wallet.id, {
      request: { body: payload },
      response: result,
      error: result.error,
    })
  }

  const txnToDelete = [...remoteTxnIds].filter(id => !localTxnIds.has(id))
  if (txnToDelete.length > 0) {
    const result = await supabase.from('transactions').delete().in('id', txnToDelete).eq('user_id', userId)
    logSupabaseOp('delete transactions', {
      request: { ids: txnToDelete },
      response: result,
      error: result.error,
    })
    if (!result.error) console.log(`[dataService] Deleted ${txnToDelete.length} transactions`)
  }

  for (const txn of transactions) {
    const payload = {
      id: txn.id,
      user_id: userId,
      wallet_id: txn.categoryId,
      amount: Number(txn.amount) || 0,
      description: txn.description || '',
      date: txn.date,
    }
    const result = await supabase.from('transactions').upsert(payload, { onConflict: 'id' })
    logSupabaseOp('upsert transaction ' + txn.id, {
      request: { body: payload },
      response: result,
      error: result.error,
    })
  }

  const goalsToDelete = [...remoteGoalIds].filter(id => !localGoalIds.has(id))
  if (goalsToDelete.length > 0) {
    const result = await supabase.from('goals').delete().in('id', goalsToDelete).eq('user_id', userId)
    logSupabaseOp('delete goals', {
      request: { ids: goalsToDelete },
      response: result,
      error: result.error,
    })
    if (!result.error) console.log(`[dataService] Deleted ${goalsToDelete.length} goals`)
  }

  for (const goal of goals) {
    if (!validateGoal(goal)) continue

    const payload = {
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
    }

    console.log("GOAL OBJECT", JSON.stringify(goal, null, 2))
    console.log("PAYLOAD TO SUPABASE", JSON.stringify(payload, null, 2))

    const result = await supabase.from('goals').upsert(payload, { onConflict: 'id' })

    console.log("UPSERT RESULT", JSON.stringify(result, null, 2))

    if (result.error) {
      console.error("GOAL UPSERT ERROR", JSON.stringify(result.error, null, 2))
    } else {
      console.log(`[dataService] Upserted goal ${goal.id}: "${goal.title}"`)
    }
  }

  const profilePayload = {
    id: userId,
    balance: balance,
    savings: savings,
    updated_at: new Date().toISOString(),
  }
  const result = await supabase.from('profiles').upsert(profilePayload, { onConflict: 'id' })
  logSupabaseOp('upsert profile', {
    request: { body: profilePayload },
    response: result,
    error: result.error,
  })
  if (!result.error) console.log(`[dataService] Sync complete — balance=${balance}, savings=${savings}`)

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
    const payload = {
      id: cat.id,
      user_id: userId,
      name: cat.name,
      color: cat.color,
      budget: cat.budget,
    }
    const result = await supabase.from('wallets').upsert(payload, { onConflict: 'id' })
    logSupabaseOp('create default wallet ' + cat.name, {
      request: { body: payload },
      response: result,
      error: result.error,
    })
  }

  const profilePayload = { id: userId, balance: 0, savings: 0, updated_at: new Date().toISOString() }
  const result = await supabase.from('profiles').upsert(profilePayload, { onConflict: 'id' })
  logSupabaseOp('create profile', {
    request: { body: profilePayload },
    response: result,
    error: result.error,
  })

  console.log(`[dataService] Initialized ${categories.length} default categories for user ${userId}`)

  return { balance: 0, savings: 0, categories, transactions: [], transfers: [], goals: [] }
}

export async function clearUserData(userId) {
  console.log(`[dataService] Clearing all data for user ${userId}`)
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(getTransfersKey(userId))

  const txnResult = await supabase.from('transactions').delete().eq('user_id', userId)
  logSupabaseOp('clear transactions', {
    request: { query: 'delete from transactions where user_id = ' + userId },
    response: txnResult,
    error: txnResult.error,
  })

  const walletResult = await supabase.from('wallets').delete().eq('user_id', userId)
  logSupabaseOp('clear wallets', {
    request: { query: 'delete from wallets where user_id = ' + userId },
    response: walletResult,
    error: walletResult.error,
  })

  const goalsResult = await supabase.from('goals').delete().eq('user_id', userId)
  logSupabaseOp('clear goals', {
    request: { query: 'delete from goals where user_id = ' + userId },
    response: goalsResult,
    error: goalsResult.error,
  })

  const profilePayload = { id: userId, balance: 0, savings: 0, updated_at: new Date().toISOString() }
  const profileResult = await supabase.from('profiles').upsert(profilePayload)
  logSupabaseOp('reset profile', {
    request: { body: profilePayload },
    response: profileResult,
    error: profileResult.error,
  })

  console.log('[dataService] Clear complete')
}
