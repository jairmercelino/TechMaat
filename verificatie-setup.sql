-- ============================================================
-- TechMaat Verificatie Setup
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Create documenten table
CREATE TABLE IF NOT EXISTS documenten (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  technicus_id uuid NOT NULL,
  type text NOT NULL,
  bestandsnaam text NOT NULL,
  storage_path text NOT NULL,
  status text DEFAULT 'wacht',
  notitie text,
  vervaldatum date,
  beoordeeld_door text,
  beoordeeld_op timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 2. Enable RLS on documenten
ALTER TABLE documenten ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies for documenten (anon can insert, select, update)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_insert_documenten') THEN
    CREATE POLICY anon_insert_documenten ON documenten FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_select_documenten') THEN
    CREATE POLICY anon_select_documenten ON documenten FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_update_documenten') THEN
    CREATE POLICY anon_update_documenten ON documenten FOR UPDATE TO anon USING (true);
  END IF;
END $$;

-- 4. Add verification columns to technici
ALTER TABLE technici
  ADD COLUMN IF NOT EXISTS verificatie_status text DEFAULT 'niet_geverifieerd',
  ADD COLUMN IF NOT EXISTS kvk_nummer text,
  ADD COLUMN IF NOT EXISTS heeft_verzekering boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS akkoord_training boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS akkoord_ervaring boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS akkoord_verzekering boolean DEFAULT false;

-- 5. Add compliance columns to bedrijven
ALTER TABLE bedrijven
  ADD COLUMN IF NOT EXISTS akkoord_werkwijze boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS akkoord_commissie boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS akkoord_dataverwerking boolean DEFAULT false;

-- ============================================================
-- MANUAL STEP: Create Storage Bucket
-- Go to Supabase Dashboard → Storage → New Bucket
-- Name: verificatie-docs
-- Public: OFF
-- Allowed MIME types: application/pdf, image/jpeg, image/png
-- Max file size: 10MB
--
-- Then add this storage policy (in Storage → Policies):
-- Allow anon uploads:
--   INSERT policy for anon: bucket_id = 'verificatie-docs'
-- Allow anon reads (for signed URLs):
--   SELECT policy for anon: bucket_id = 'verificatie-docs'
-- ============================================================
