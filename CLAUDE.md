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
├── technici.html       # Public browse page — technician profiles with filters
├── klussen.html        # Public browse page — job listings with filters
├── 404.html            # Custom 404 page
├── supabase.js         # Supabase REST client (TechMaatDB) + auth functions
├── supabase-auth-setup.sql  # SQL to run in Supabase Dashboard (table + RPC + users)
├── verificatie-setup.sql   # SQL for documenten table + verificatie columns (run in Supabase)
├── koppelingen-setup.sql   # SQL for koppelingen table (run in Supabase)
├── facturen-setup.sql      # SQL for facturen table (run in Supabase)
├── cookies.js          # AVG cookie consent banner
├── sitemap.xml         # SEO sitemap
├── robots.txt          # Crawler rules (disallow dashboard + agents)
├── img/
│   └── hero.jpg        # Hero image (locally saved)
└── agents/
    ├── inbox.js        # Inbox Agent — classifies form submissions
    ├── matching.js     # Matching Agent — scores technicus-bedrijf fit (0-100)
    ├── factuur.js      # Factuur Agent — invoice generation with commission
    ├── verificatie.js  # Verificatie Agent — document review queue
    ├── analytics.js    # Analytics Agent — KPI dashboard, trends, distributions
    ├── crm.js          # CRM Agent — contact management, follow-ups, notities
    └── content.js      # Content Agent — social media content generation
```

## Database (Supabase)
Tables created with RLS policies:
- **technici** — naam, email, telefoon, woonplaats, specialismen[], certificeringen[], uurtarief, werkradius, beschikbaarheid, ploegendienst, kilometervergoeding, omschrijving, status, created_at
- **bedrijven** — bedrijfsnaam, contactpersoon, email, telefoon, locatie, branche, type_werk, omschrijving, status, created_at
- **klussen** — bedrijf_id (FK), titel, omschrijving, locatie, urgentie, duur, specialisme, status, created_at
- **documenten** — technicus_id (FK), type, bestandsnaam, storage_path, status (wacht/goedgekeurd/afgekeurd), notitie, vervaldatum, beoordeeld_door, beoordeeld_op, created_at

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

### Active (7/7)
1. **Inbox Agent** (`agents/inbox.js`) — Reads/classifies submissions from Supabase. Filter tabs (Alle/Technici/Bedrijven). Expandable cards.
2. **Matching Agent** (`agents/matching.js`) — Scores technicus-bedrijf fit (0-100). Koppel button with confirmation modal, Supabase save, email notification. Status tracking.
3. **Factuur Agent** (`agents/factuur.js`) — Invoice management with commission calc (10-15%). PDF generation (jsPDF). Create new invoices with live preview. Saves to Supabase.
4. **Verificatie Agent** (`agents/verificatie.js`) — Document review queue for uploaded certificates, insurance, KvK. Admin approve/reject with notes + expiry tracking.
5. **Analytics Agent** (`agents/analytics.js`) — KPI dashboard, weekly trend charts (registraties, klussen), specialisme/beschikbaarheid verdeling, koppeling/factuur status, top matches, omzet/commissie tracking.
6. **CRM Agent** (`agents/crm.js`) — Contact management, follow-up tracking (auto-detects contacts without koppelingen), contact detail modal with koppelingen history, notities per contact (localStorage). Filter tabs.
7. **Content Agent** (`agents/content.js`) — Social media / LinkedIn content generation. 5 templates (technicus spotlight, klus, bedrijf welkom, platform stats, werving). One-click generate from live data, copy to clipboard, post history (localStorage).

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

## Current Phase: Phase 2 (Platform MVP)

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

### ✅ Completed (Supabase setup — 8 april 2026)
- verificatie-setup.sql executed (documenten table + verificatie columns)
- Storage bucket `verificatie-docs` created (private, PDF/JPG/PNG, 10MB max)
- Storage policies added (INSERT + SELECT for anon on `verificatie-docs`)

### ✅ Completed (Phase 2 — 7 april 2026)
- Public technici browse page (technici.html) with filters (specialisme, beschikbaarheid, ploegendienst, zoeken)
- Public klussen browse page (klussen.html) with filters (specialisme, urgentie, duur, zoeken)
- Klussen management in dashboard (create, list, status tracking)
- Dashboard Technici/Bedrijven pages now load live data from Supabase (replaced demo data)
- Supabase CRUD methods for klussen, update methods for technici/bedrijven
- Navigation updated across all pages (Technici + Klussen links)
- Sitemap updated with new pages
- Cookie consent now properly blocks analytics
- **Verificatie & compliance flow:**
  - Document upload during technicus registration (VCA, NEN 3140, F-gassen, verzekering, KvK)
  - Conditional upload fields (only show when certificate checkbox is checked)
  - Compliance checkboxes for technici (training, ervaring, verzekering)
  - Compliance checkboxes for bedrijven (werkwijze, commissie, dataverwerking)
  - Refactored submit flow: JS-based with upload progress, Formspree email notification
  - Verificatie Agent (4th active agent): admin review queue, approve/reject, expiry tracking
  - Auto-update verificatie_status on technici when all docs are approved

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

### ✅ Completed (8 april 2026)
- **Koppel button activated** in Matching Agent — confirmation modal, save to Supabase `koppelingen` table, email notification via Formspree
- Koppeling status tracking (in_afwachting/geaccepteerd/afgewezen/voltooid)
- Success toast notification after koppeling
- Supabase `koppelingen` table with RLS policies
- **PDF invoice generation** — professional Dutch invoices via jsPDF with TechMaat branding, commission calc, BTW
- **Nieuwe factuur button** — create invoices from dashboard with technicus/bedrijf dropdowns, live preview, auto-PDF download
- PDF download button per factuur in the invoice table
- **All agents migrated to live Supabase data** (with demo fallback):
  - Inbox Agent: loads technici + bedrijven from Supabase as submissions
  - Factuur Agent: loads/saves from `facturen` table in Supabase
  - Matching Agent: already loaded from Supabase (phase 2)
  - Verificatie Agent: already loaded from Supabase (phase 2)

- **Analytics Agent** built (5th active agent) — KPI cards, trend charts, distributions, status overviews, top matches, revenue tracking
- **CRM Agent** built (6th) — contact management, follow-up detection, notities, contact detail modal
- **Content Agent** built (7th) — 5 content templates, one-click generate, copy to clipboard, post history
- **All 7/7 agents now active**

### 🟡 Next Steps (prioritized)
1. Own domain (techmaat.nl) + professional email — domain available 5 mei 2026
4. Analytics Agent
5. Build remaining agents (CRM, Content)
6. Stripe integration (Phase 4)
7. Supabase Auth upgrade — use built-in auth with email verification
8. Migrate from Tailwind CDN to local build

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
