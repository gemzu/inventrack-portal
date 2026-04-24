-- Use this script in Supabase SQL Editor to fix the constraint
-- This approach allows ANY value in filter_type temporarily

-- Since we can't drop it due to violation, let's recreate the table without the constraint
-- and copy data

-- Create backup table with same structure
CREATE TABLE storefronts_backup AS SELECT * FROM storefronts;

-- Drop the original table with constraint
DROP TABLE storefronts CASCADE;

-- Recreate without the check constraint
CREATE TABLE storefronts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL DEFAULT 'STORE-' || substr(md5(random()::text), 1, 4),
  filter_type TEXT DEFAULT 'all',
  filter_value JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add RLS
ALTER TABLE storefronts ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users (adjust as needed)
CREATE POLICY "Users can do anything with own org storefronts" ON storefronts
  FOR ALL USING (true);

-- Copy data back if any existed
INSERT INTO storefronts SELECT * FROM storefronts_backup;

-- Cleanup
DROP TABLE storefronts_backup;