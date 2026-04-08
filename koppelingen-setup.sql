-- ============================================================
-- TechMaat: Koppelingen tabel
-- Slaat matching-koppelingen op tussen technici en bedrijven
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- Tabel aanmaken
CREATE TABLE IF NOT EXISTS koppelingen (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  technicus_id uuid REFERENCES technici(id),
  bedrijf_id uuid REFERENCES bedrijven(id),
  technicus_naam text NOT NULL,
  bedrijf_naam text NOT NULL,
  score integer DEFAULT 0,
  redenen text[],
  status text DEFAULT 'in_afwachting' CHECK (status IN ('in_afwachting', 'geaccepteerd', 'afgewezen', 'voltooid')),
  notitie text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS inschakelen
ALTER TABLE koppelingen ENABLE ROW LEVEL SECURITY;

-- Policies: anon kan lezen, schrijven en updaten
CREATE POLICY "anon_insert_koppelingen" ON koppelingen FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_select_koppelingen" ON koppelingen FOR SELECT TO anon USING (true);
CREATE POLICY "anon_update_koppelingen" ON koppelingen FOR UPDATE TO anon USING (true) WITH CHECK (true);
