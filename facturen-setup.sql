-- ============================================================
-- TechMaat: Facturen tabel
-- Slaat alle facturen op met commissie en BTW berekening
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS facturen (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  factuur_nummer text NOT NULL UNIQUE,
  bedrijf_naam text NOT NULL,
  bedrijf_email text,
  bedrijf_locatie text,
  technicus_naam text NOT NULL,
  technicus_specialisme text,
  klus_omschrijving text,
  uren numeric DEFAULT 0,
  uurtarief numeric DEFAULT 0,
  subtotaal numeric DEFAULT 0,
  commissie_percentage numeric DEFAULT 12,
  commissie_bedrag numeric DEFAULT 0,
  totaal numeric DEFAULT 0,
  btw numeric DEFAULT 0,
  totaal_incl_btw numeric DEFAULT 0,
  status text DEFAULT 'concept' CHECK (status IN ('concept', 'verzonden', 'betaald', 'verlopen')),
  datum date DEFAULT CURRENT_DATE,
  vervaldatum date,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE facturen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_insert_facturen" ON facturen FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_select_facturen" ON facturen FOR SELECT TO anon USING (true);
CREATE POLICY "anon_update_facturen" ON facturen FOR UPDATE TO anon USING (true) WITH CHECK (true);
