# TechMaat — Project Guide

## What is TechMaat
Dutch marketplace platform connecting ZZP (freelance) technicians with companies needing urgent technical support, maintenance, and repairs. Think "Temper/YoungOnes but for technical/industrial specialists."

## Repository
- **Repo:** jairmercelino/TechMaat (NEVER push to JM-Mechanica)
- **Live:** https://jairmercelino.github.io/TechMaat/
- **Domain:** techmaat.nl (in quarantine, not yet active)
- **Owner:** Jair Mercelino
- **Partner:** QK Techniek (info@qktechniek.nl)

## Tech Stack
- Frontend: Vanilla HTML/CSS/JS (no framework)
- Styling: Tailwind CDN (same config in every HTML file)
- Database: Supabase (URL: jvyexvymbmtdovuhanjt.supabase.co)
- Forms: Formspree (ID: xaqlakdb) + Supabase dual-write
- Auth: Supabase custom auth (SHA-256 hashed passwords + verify_login RPC)
- Hosting: GitHub Pages
- Future: Claude API (matching), Stripe (payments), SendGrid (email)

## Design System
- **Colors:** tm-blue #003082, tm-orange #ff6600, tm-orange-dark #cc5200, tm-navy #001a4d
- **Fonts:** Space Grotesk (headlines), Manrope (body) via Google Fonts
- **Language:** Dutch throughout all user-facing text
- **Mobile-first** always
- **Icons:** Material Symbols Outlined
- **Favicon:** SVG inline "TM" in tm-blue square

## File Structure
```
techmaat/
├── index.html          # Landing page (hero, how it works, benefits, waitlist form)
├── aanmelden.html      # Registration (dual-tab: Technicus / Bedrijf)
├── login.html          # Dashboard login (3 accounts, role-based)
├── dashboard.html      # Owner dashboard (sidebar nav, 8 sections, agent cards)
├── privacy.html        # AVG/GDPR privacy policy
├── voorwaarden.html    # Terms of service
├── verzekering.html    # Insurance info for ZZP technicians
├── 404.html            # Custom 404 page
├── supabase.js         # Supabase REST client (TechMaatDB) + auth functions
├── supabase-auth-setup.sql  # SQL to run in Supabase Dashboard (table + RPC + users)
├── cookies.js          # AVG cookie consent banner
├── sitemap.xml         # SEO sitemap
├── robots.txt          # Crawler rules (disallow dashboard + agents)
├── img/
│   └── hero.jpg        # Hero image (locally saved)
└── agents/
    ├── inbox.js        # Inbox Agent — classifies form submissions
    ├── matching.js     # Matching Agent — scores technicus-bedrijf fit (0-100)
    └── factuur.js      # Factuur Agent — invoice generation with commission
```

## Database (Supabase)
Tables created with RLS policies:
- **technici** — naam, email, telefoon, woonplaats, specialismen[], certificeringen[], uurtarief, werkradius, beschikbaarheid, ploegendienst, kilometervergoeding, omschrijving, status, created_at
- **bedrijven** — bedrijfsnaam, contactpersoon, email, telefoon, locatie, branche, type_werk, omschrijving, status, created_at
- **klussen** — bedrijf_id (FK), titel, omschrijving, locatie, urgentie, duur, specialisme, status, created_at

- **admin_users** — email, password_hash (SHA-256), naam, role, created_at
  - RLS enabled, no direct SELECT policy (anon cannot read this table)
  - Login via `verify_login(p_email, p_hash)` RPC function (SECURITY DEFINER)

RLS: anon can INSERT into technici/bedrijven (form submissions) and SELECT from all tables. admin_users is protected — accessible only via verify_login RPC.

## Login Accounts
| Email | Password | Role | Access |
|-------|----------|------|--------|
| admin@techmaat.nl | TechMaat2026! | admin | Full dashboard |
| info@jmmechanica.nl | TechMaat2026! | admin | Full dashboard |
| info@qktechniek.nl | TechMaat2026! | partner | No Facturen, no Instellingen |

Auth: Passwords are SHA-256 hashed (salt: techmaat_salt_2026) and verified via Supabase RPC (verify_login). No plaintext passwords in source code.

## AI Agents (7 total)

### Active (3/7)
1. **Inbox Agent** (`agents/inbox.js`) — Reads/classifies submissions. Filter tabs (Alle/Technici/Bedrijven). Expandable cards. Currently runs on demo data (Formspree API key = null).
2. **Matching Agent** (`agents/matching.js`) — Scores technicus-bedrijf fit (0-100). Criteria: specialisme (40pts), type werk (20pts), beschikbaarheid (20pts), certificeringen (20pts). Two-column UI with score bars.
3. **Factuur Agent** (`agents/factuur.js`) — Invoice overview with commission calc (10-15%). Status tracking (concept/verzonden/betaald/verlopen). Summary cards. Demo invoices.

### Inactive (4/7)
4. **Verificatie Agent** — Check VCA, NEN 3140, KvK documents. No code yet.
5. **Analytics Agent** — KPI analysis, trends. Placeholder page only.
6. **CRM Agent** — Relationship management, follow-ups. Card only.
7. **Content Agent** — Social media / LinkedIn content generation. Card only.

### Agent Architecture
- Each agent is a vanilla JS IIFE exposing `window.AgentName`
- Required methods: `init()`, `getStats()`, `render*(containerId)`
- Dashboard loads agents via `<script src="agents/name.js"></script>`
- `navigateTo()` in dashboard.html triggers rendering per section
- Agents can read from `TechMaatDB` (supabase.js) or fall back to demo data
- Demo data badge shown when `isDemo = true`

## Business Model
- Free for technicians (to attract supply)
- Companies pay 10-15% commission per job
- Specialisms: Hydrauliek, Elektrotechniek, Pneumatiek, Mechanica, PLC/Besturingen, Lassen, Koeltechniek, Instrumentatie
- Certifications: VCA Basis, VCA VOL, NEN 3140, F-gassen
- Shift types: Dagdienst, 2-ploegen, 3-ploegen, 5-ploegen (volcontinue), Flexibel

## Current Phase: Phase 1 (Waitlist & Validation)

### ✅ Completed
- Landing page with waitlist form
- Dual-tab registration (technicus/bedrijf)
- Formspree + Supabase form handling
- Login + role-based dashboard
- 3 active AI agents (Inbox, Matching, Factuur)
- Privacy policy, Terms, Insurance info pages
- Cookie consent banner
- SEO (sitemap, robots, OG tags, meta descriptions, favicon)
- 404 page
- Partner account (QK Techniek)

### 🔴 Action Required
1. **Run supabase-auth-setup.sql** in Supabase Dashboard SQL Editor — login won't work until this is done
2. Cookie consent doesn't actually block analytics — implement before adding Google Analytics
3. Add aanmelden.html to sitemap.xml

### ✅ Completed (sessions 6-7 april 2026)
- Landing page, registration form, all legal pages
- Supabase connected (technici, bedrijven, klussen, admin_users tables)
- Formspree + Supabase dual-write on registration
- Login migrated to Supabase Auth (SHA-256 + verify_login RPC)
- Role-based access (admin/partner)
- 3/7 AI agents active (Inbox, Matching, Factuur)
- Dashboard with working sidebar navigation (8 sections)
- Cookie banner, SEO, favicon, 404 page
- CLAUDE.md project guide

### 🟡 Next Steps (prioritized)
1. Own domain (techmaat.nl) + professional email
2. Activate "Koppel" button in Matching + email notifications
3. PDF invoice generation
4. Verificatie Agent (document upload + check)
5. Replace demo data with live Supabase data in all agents
6. Analytics Agent
7. Build remaining agents (CRM, Content)
8. Stripe integration (Phase 4)
9. Supabase Auth upgrade — use built-in auth with email verification
10. Migrate from Tailwind CDN to local build

## Workflow Rules
- Always push to `jairmercelino/TechMaat`, never JM-Mechanica
- Keep all user-facing text in Dutch
- Mobile-first design always
- GDPR/AVG compliant
- Match existing design system (tm-blue, tm-orange, white)
- Use vanilla JS — no frameworks
- Each agent follows the IIFE pattern with window.AgentName
- Test Supabase queries with curl before implementing
- Commit messages in English, descriptive
- Update this CLAUDE.md when completing major milestones

## GitHub Push (when no gh auth)
```bash
git remote set-url origin https://TOKEN@github.com/jairmercelino/TechMaat.git
git push
git remote set-url origin https://github.com/jairmercelino/TechMaat.git
```

## Supabase Management API
```bash
PROJECT_REF="jvyexvymbmtdovuhanjt"
TOKEN="sbp_620e01d421923267ee99912207d89cd21dd4a8e9"
curl -X POST "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"query": "YOUR SQL HERE"}'
```
