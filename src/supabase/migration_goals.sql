-- ============================================
-- Migration: Add goals table and profiles.savings
-- Run this in the Supabase SQL Editor
-- ============================================

-- 1. Add savings column to profiles (if not already present)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS savings NUMERIC NOT NULL DEFAULT 0;

-- 2. Create goals table
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_amount NUMERIC NOT NULL DEFAULT 0,
  saved_amount NUMERIC NOT NULL DEFAULT 0,
  transfer_amount NUMERIC NOT NULL DEFAULT 0,
  frequency TEXT NOT NULL DEFAULT 'monthly',
  next_transfer TEXT DEFAULT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 3. Enable Row Level Security
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- 4. Goals policies
CREATE POLICY "Users can view their own goals"
  ON goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own goals"
  ON goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
  ON goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals"
  ON goals FOR DELETE
  USING (auth.uid() = user_id);
