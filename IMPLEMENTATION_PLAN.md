# School Open Day Radar

## MVP Implementation Plan

## Tech Stack (Current Decision)

* Frontend: Next.js hosted on Vercel
* Backend: Convex (database, auth, functions, scheduler)
* Cronjobs: Convex scheduler
* API routes: only for external callbacks Convex cannot handle (e.g., Stripe webhooks)
* Analytics: PostHog (product analytics) + Vercel Web Analytics (lightweight web stats)

## Task Workflow

See `docs/TASK_WORKFLOW.md` for the “start next task” process and the brief template at `docs/tasks/TEMPLATE.md`.

---

## Phase 0 — Foundations (Must Be Done First)

### 0.1 Infrastructure & Environment Setup (Backend)

**Target Outcome**

* Production-ready backend environment with auth, DB, and background jobs capability.

**Tasks**

* Provision backend with Convex (database + auth + functions)
* Configure Convex environments (dev / prod) and secrets
* Set up Vercel project + env vars for Next.js + Convex URLs
* Set up Convex scheduler for scheduled jobs (cron)
* Reserve Next.js API routes only for external callbacks Convex cannot handle (e.g., Stripe webhooks)
* Set up staging + production separation (Vercel + Convex)

**Verification**

* Can deploy backend without errors
* Secrets loaded correctly
* Health check endpoint responds
* Note: Convex + Vercel wiring completes in Phase 0.2 once the Next.js app exists

**Design Notes**

See `docs/tasks/phase-0-1-infrastructure-environment-setup.md`.

---

### 0.2 Frontend App Shell Setup (Frontend)

**Target Outcome**

* Responsive web app shell with routing, plus initial Convex + Vercel wiring.

**Tasks**

* Initialize Next.js app (hosted on Vercel)
* Configure routing
* Global layout + loading states
* Initialize Convex project and link dev deployment
* Add Convex client setup and env vars
* Set up Vercel project and configure preview + production env vars
* Validate Convex scheduler with a no-op job in dev

**Verification**

* `/start`, `/schools`, `/dashboard` routes load
* Mobile + desktop render correctly
* Convex dev deployment reachable from local app
* Vercel preview and production use correct Convex URLs
* Scheduler job runs in dev logs

**Design Notes**

See `docs/tasks/phase-0-2-frontend-app-shell-setup.md`.

⏩ *Parallel with 0.1*

---

## Phase 1 — Registration & WhatsApp Verification

### 1.1 WhatsApp Verification Token System (Backend)

**Target Outcome**

* Secure, single-use, time-limited verification links.

**Tasks**

* Create `verification_tokens` table
* Generate token (10-minute expiry, single use)
* Store phone number + token mapping

**Verification**

* Token expires after 10 minutes
* Token cannot be reused
* Invalid token rejected

---

### 1.2 WhatsApp Message Dispatch (Backend)

**Target Outcome**

* Users receive verification link via WhatsApp.

**Tasks**

* Integrate WhatsApp sending provider
* Template verification message
* Log send status

**Verification**

* WhatsApp message received with valid link
* Failed sends are logged

Uses: WhatsApp

---

### 1.3 Registration UI (/start) (Frontend)

**Target Outcome**

* User can submit WhatsApp number and request verification.

**Tasks**

* Country code selector (+852 default)
* Phone input validation
* Terms checkbox
* CTA triggers backend request

**Verification**

* Invalid numbers rejected
* CTA disabled until terms checked
* Success state shown after submit

⏩ *Parallel with 1.1 / 1.2*

---

### 1.4 Verification Link Handling (/v/:token) (Backend)

**Target Outcome**

* Verified session created correctly.

**Tasks**

* Validate token
* Mark phone as verified
* Create authenticated session
* Detect new vs existing user

**Verification**

* New user → redirected to `/schools`
* Existing user → redirected to `/dashboard`
* Token invalid after use

---

### 1.5 Verification Redirect Handling (Frontend)

**Target Outcome**

* Smooth transition from WhatsApp to app.

**Tasks**

* Loading state on verification
* Error UI for expired token
* Redirect logic

**Verification**

* Correct routing for all cases
* No blank screens

---

## Phase 2 — School Data & Monitoring Engine

### 2.1 School Master Data Model (Backend)

**Target Outcome**

* Canonical school dataset ready for filtering.

**Tasks**

* Create `schools` table:

  * name (zh/en)
  * level
  * type
  * district
  * website URL

**Verification**

* Can query by level/type/district
* Data seeded successfully

---

### 2.2 Announcement Scraping / Monitoring Job (Backend)

**Target Outcome**

* Detect new or updated announcements.

**Tasks**

* Scheduled job to fetch school pages
* Diff detection logic
* Save announcements + change type

**Verification**

* New announcement flagged as 🟢
* Updated announcement flagged as 🟡
* No-change logged as 🔘

⏩ *Parallel with Phase 3 frontend work*

---

## Phase 3 — School Selection (Onboarding Core)

### 3.1 School Search API (Backend)

**Target Outcome**

* Fast, filterable school search.

**Tasks**

* Search by Chinese / English name
* Filter by level/type/district

**Verification**

* Search results accurate
* Filters combinable

---

### 3.2 School Selection Rules Engine (Backend)

**Target Outcome**

* Enforce Free vs Premium constraints.

**Tasks**

* Max 5 schools for Free
* Lock editing for Free after save
* Editable list for Premium

**Verification**

* Free user blocked after save
* Premium user can modify anytime

---

### 3.3 School Search & Selection UI (/schools) (Frontend)

**Target Outcome**

* User selects schools and starts monitoring.

**Tasks**

* Search bar
* Filters
* Checkbox list
* Selection counter
* CTA: “開始監察”

**Verification**

* Cannot exceed 5 selections (Free)
* Counter updates correctly
* Save triggers backend

---

## Phase 4 — Dashboard Experience

### 4.1 Dashboard Data Aggregation API (Backend)

**Target Outcome**

* Unified dashboard payload.

**Tasks**

* Monitoring status
* Latest updates feed
* “Since you last checked” counts

**Verification**

* Correct counts
* Correct timestamps
* Free & Premium same feed

---

### 4.2 Dashboard UI (/dashboard) (Frontend)

**Target Outcome**

* Clear monitoring and update visibility.

**Tasks**

* Section A: Monitoring status
* Section B: Updates feed
* Section C: “Since you last checked”

**Verification**

* Updates sorted chronologically
* Section C numbers correct

---

### 4.3 Edit School CTA Gating (Frontend + Backend)

**Target Outcome**

* Premium upsell moment enforced.

**Tasks**

* Free user → modal with upgrade CTA
* Premium user → editable UI

**Verification**

* Free user cannot bypass lock
* Upgrade CTA visible

---

## Phase 5 — WhatsApp Summary Engine

### 5.1 Summary Generation Logic (Backend)

**Target Outcome**

* Correct message content per user tier.

**Tasks**

* Weekly summary (Free)
* Daily summary (Premium)
* “Missed schools” count logic

**Verification**

* Free: weekly only
* Premium: daily only
* Missed schools unnamed

---

### 5.2 WhatsApp Delivery Scheduler (Backend)

**Target Outcome**

* Messages sent at correct cadence.

**Tasks**

* Convex scheduler for daily + weekly jobs
* Skip inactive users
* Log delivery

**Verification**

* Messages sent on schedule
* No duplicates

---

## Phase 6 — Premium Subscription & Billing

### 6.1 Stripe Checkout Integration (Backend)

**Target Outcome**

* Subscription created via hosted checkout.

**Tasks**

* Create Stripe Checkout session
* Attach user metadata
* Handle success/cancel redirects

Uses: Stripe

**Verification**

* Successful checkout creates subscription
* Cancel returns safely

---

### 6.2 Stripe Upgrade UI (/upgrade) (Frontend)

**Target Outcome**

* Clear value proposition and trust.

**Tasks**

* Pricing display
* Benefits list
* CTA to Stripe Checkout

**Verification**

* CTA opens Stripe Checkout
* Mobile-friendly

---

### 6.3 Stripe Webhook Handling (Backend)

**Target Outcome**

* Accurate account state transitions.

**Tasks**

* Handle:

  * checkout.session.completed
  * invoice.payment_succeeded
  * invoice.payment_failed
  * customer.subscription.deleted

**Verification**

* User state updates correctly
* Downgrade on cancellation

---

### 6.4 Billing Success Page (/billing/success) (Frontend)

**Target Outcome**

* Confirmation + expectation setting.

**Verification**

* Displays success message
* Dashboard access works
* Daily summary starts next day

---

## Phase 7 — Metrics & Analytics

### 7.1 Event Tracking (Backend + Frontend)

**Target Outcome**

* All success metrics measurable.

**Tracked Events**

* signup_completed
* wa_verified
* school_selection_saved
* dashboard_first_view
* upgrade_cta_clicked
* checkout_started
* checkout_completed

**Tasks**

* Set up PostHog project and Vercel Web Analytics
* Instrument tracked events in frontend + backend

**Verification**

* Events visible in PostHog
* Web traffic visible in Vercel Web Analytics
* Funnels computable

---

## Phase 8 — Final QA & Launch Readiness

### 8.1 Account State QA

**Target Outcome**

* No leakage between Free / Premium.

**Verification**

* Manual test all account states
* Downgrade path works

---

### 8.2 End-to-End Smoke Test

**Target Outcome**

* Parent can complete full journey in <5 minutes.

**Verification**

* New signup → dashboard → summary received
* Upgrade → daily summary next day

---

## Parallelization Summary

**Can Run in Parallel**

* Phase 1 Frontend ↔ Backend
* Phase 2 monitoring ↔ Phase 3 UI
* Phase 4 dashboard ↔ Phase 5 summaries
* Phase 6 Stripe ↔ Phase 7 analytics

**Strictly Sequential**

* Verification before school selection
* School selection before dashboard
* Stripe webhook before Premium unlock
