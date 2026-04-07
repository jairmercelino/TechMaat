-- TechMaat Auth Setup
-- Run this in the Supabase Dashboard SQL Editor (https://supabase.com/dashboard/project/jvyexvymbmtdovuhanjt/sql)
-- This creates the admin_users table, RLS policies, login RPC function, and inserts the 3 users.

-- 1. Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  naam text,
  role text DEFAULT 'partner',
  created_at timestamptz DEFAULT now()
);

-- 2. Enable RLS (blocks direct table access from anon)
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- 3. No SELECT policy — anon cannot read admin_users directly.
--    Login goes through the verify_login RPC function (SECURITY DEFINER).

-- 4. Create verify_login RPC function
--    SECURITY DEFINER runs as the function owner (postgres), bypassing RLS.
--    This ensures password_hash is NEVER exposed to the client.
CREATE OR REPLACE FUNCTION verify_login(p_email text, p_hash text)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'id', id,
    'email', email,
    'naam', naam,
    'role', role
  )
  FROM admin_users
  WHERE email = p_email AND password_hash = p_hash
  LIMIT 1;
$$;

-- 5. Insert the 3 admin users
-- Password: TechMaat2026! hashed with SHA-256 + salt 'techmaat_salt_2026'
INSERT INTO admin_users (email, password_hash, naam, role) VALUES
  ('admin@techmaat.nl', 'b64f929273618590be18aee87511ef3979153ac49d3b5cff67d46744e818da2d', 'Jair', 'admin'),
  ('info@jmmechanica.nl', 'b64f929273618590be18aee87511ef3979153ac49d3b5cff67d46744e818da2d', 'Jair', 'admin'),
  ('info@qktechniek.nl', 'b64f929273618590be18aee87511ef3979153ac49d3b5cff67d46744e818da2d', 'Partner QK Techniek', 'partner')
ON CONFLICT (email) DO NOTHING;
