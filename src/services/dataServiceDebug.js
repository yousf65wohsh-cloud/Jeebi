import { supabase } from '../supabase/client'

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
  if (actualType === 'timestamp with time zone' && expectedType === 'text') return 'TIMESTAMPTZ vs TEXT'
  if (actualType === 'timestamp without time zone' && expectedType === 'text') return 'TIMESTAMP vs TEXT'
  if (actualType === 'date' && expectedType === 'text') return 'DATE vs TEXT'
  return `Expected ${expectedType}, got ${actualType}`
}

export async function checkGoalsSchema() {
  console.log('=== SCHEMA DIAGNOSIS FOR "goals" TABLE ===')
  console.log('Expected columns:')
  EXPECTED_GOALS_SCHEMA.columns.forEach(c => {
    console.log(`  ${c.name} (${c.type})${c.is_pk ? ' PK' : ''}${c.references ? ' -> ' + c.references.table + '(' + c.references.column + ')' : ''}`)
  })

  let tableExists = false
  let actualColumns = []
  let mismatches = []

  try {
    const { data: tables, error: tablesErr } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'goals')

    console.log('information_schema.tables result:', JSON.stringify(tables))
    console.log('information_schema.tables error:', JSON.stringify(tablesErr))

    if (tables && tables.length > 0) {
      tableExists = true
      console.log('TABLE EXISTS')
    } else {
      console.log('TABLE DOES NOT EXIST')
    }
  } catch (e) {
    console.log('Cannot access information_schema with anon key.')
  }

  if (tableExists) {
    try {
      const { data: cols, error: colsErr } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_schema', 'public')
        .eq('table_name', 'goals')

      console.log('information_schema.columns result:', JSON.stringify(cols))
      console.log('information_schema.columns error:', JSON.stringify(colsErr))

      actualColumns = cols || []
    } catch (e) {
      console.log('Error checking columns:', e.toString())
    }
  }

  if (!tableExists) {
    try {
      const { data: probe, error: probeErr } = await supabase.from('goals').select('id').limit(1)
      console.log('Probe result:', JSON.stringify(probe))
      console.log('Probe error:', JSON.stringify(probeErr))
      if (probeErr && probeErr.code === '42P01') {
        tableExists = false
        console.log('CONFIRMED: Table "goals" does not exist (error code 42P01)')
      } else if (probeErr) {
        tableExists = true
        console.log('Table exists but query failed:', probeErr.code)
      } else {
        tableExists = true
        console.log('CONFIRMED: Table "goals" exists')
      }
    } catch (e) {
      console.log('Probe query failed:', e.toString())
    }
  }

  const actualMap = {}
  actualColumns.forEach(c => { actualMap[c.column_name] = c })

  const expectedMap = {}
  EXPECTED_GOALS_SCHEMA.columns.forEach(c => { expectedMap[c.name] = c })

  const allColNames = new Set([...Object.keys(actualMap), ...Object.keys(expectedMap)])

  console.log('COLUMN COMPARISON:')
  for (const colName of [...allColNames].sort()) {
    const actual = actualMap[colName]
    const expected = expectedMap[colName]

    if (actual && !expected) {
      mismatches.push({ type: 'extra_column', column: colName, actual })
      console.log(`EXTRA COLUMN: ${colName} (${actual.data_type})`)
    } else if (!actual && expected) {
      mismatches.push({ type: 'missing_column', column: colName, expected })
      console.log(`MISSING COLUMN: ${colName} (${expected.type})`)
    } else if (actual && expected) {
      const typeIssue = columnTypeMismatch(actual, expected)
      if (typeIssue) {
        mismatches.push({ type: 'type_mismatch', column: colName, actual: actual.data_type, expected: expected.type, detail: typeIssue })
        console.log(`TYPE MISMATCH: ${colName} — ${typeIssue}`)
      } else {
        console.log(`OK: ${colName} (${actual.data_type})`)
      }
    }
  }

  return { tableExists, actualColumns, expectedColumns: EXPECTED_GOALS_SCHEMA.columns, mismatches }
}

export async function testGoalUpsert(userId) {
  console.log('=== TEST GOAL UPSERT ===')

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

  console.log('GOAL OBJECT', JSON.stringify(testGoal, null, 2))
  console.log('PAYLOAD TO SUPABASE', JSON.stringify(payload, null, 2))

  const result = await supabase.from('goals').insert(payload)

  console.log('UPSERT RESULT', JSON.stringify(result, null, 2))

  if (result.error) {
    console.error('GOAL UPSERT ERROR', JSON.stringify(result.error, null, 2))
    if (result.error.code === '42P01') {
      console.log('ROOT CAUSE: "goals" table does not exist. Run src/supabase/migration_goals.sql in the SQL Editor.')
    } else if (result.error.code === '23505') {
      console.log('Duplicate key violation.')
    } else if (result.error.code === '23503') {
      console.log('Foreign key violation — user_id may not exist.')
    } else if (result.error.code === '42501') {
      console.log('RLS policy violation.')
    } else if (result.error.code === '23502') {
      console.log('Not null violation — missing required column.')
    }
  } else {
    console.log('TEST PASSED')
    await supabase.from('goals').delete().eq('id', testGoal.id)
    console.log('Test goal cleaned up')
  }

  return { success: !result.error, error: result.error }
}

export async function diagnoseAndFixGoalsSchema(userId) {
  console.log('=== GOALS SCHEMA DIAGNOSTIC ===')

  const schemaInfo = await checkGoalsSchema()

  if (schemaInfo.tableExists && schemaInfo.mismatches.length === 0) {
    console.log('Schema is correct. Testing upsert...')
    const test = await testGoalUpsert(userId)
    if (test.success) {
      console.log('All clear — goals feature should work correctly.')
    } else {
      console.log('Schema looks correct but upsert still fails.')
    }
    return
  }

  if (!schemaInfo.tableExists) {
    console.log('TABLE MISSING — Run this SQL in the Supabase SQL Editor:')
    const migration = [
      '-- Create goals table for Jeebi',
      'CREATE TABLE IF NOT EXISTS goals (',
      '  id TEXT PRIMARY KEY,',
      '  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,',
      '  title TEXT NOT NULL,',
      '  emoji TEXT DEFAULT \'\',',
      '  target_amount NUMERIC NOT NULL DEFAULT 0,',
      '  saved_amount NUMERIC NOT NULL DEFAULT 0,',
      '  frequency TEXT NOT NULL DEFAULT \'monthly\',',
      '  contribution_amount NUMERIC NOT NULL DEFAULT 0,',
      '  start_date TEXT NOT NULL DEFAULT \'\',',
      '  target_date TEXT DEFAULT NULL,',
      '  last_contribution_date TEXT DEFAULT NULL,',
      '  status TEXT NOT NULL DEFAULT \'active\',',
      '  created_at TEXT NOT NULL,',
      '  updated_at TEXT NOT NULL',
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
    ]
    migration.forEach(line => console.log(line))
  }

  if (schemaInfo.mismatches.length > 0) {
    console.log(`Found ${schemaInfo.mismatches.length} schema mismatches.`)
    for (const mismatch of schemaInfo.mismatches) {
      if (mismatch.type === 'missing_column') {
        console.log(`ALTER TABLE goals ADD COLUMN ${mismatch.column} ${mismatch.expected.type}${mismatch.expected.nullable ? '' : ' NOT NULL'}${mismatch.expected.default ? ' DEFAULT ' + mismatch.expected.default : ''};`)
      } else if (mismatch.type === 'type_mismatch') {
        console.log(`ALTER TABLE goals ALTER COLUMN ${mismatch.column} TYPE ${mismatch.expected};`)
      } else if (mismatch.type === 'extra_column') {
        console.log(`-- Extra column ${mismatch.column} (${mismatch.actual.data_type})`)
      }
    }
  }
}
