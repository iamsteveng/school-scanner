# Task Brief: Phase 0.2 Frontend App Shell Setup (Frontend)

## Status
- In Progress

## Progress
- Next.js app scaffolded (App Router + Tailwind).
- `/start`, `/schools`, `/dashboard` placeholder routes created.
- Home page updated with route links.
- Convex init completed by user; `.env.local` created.
- Convex health query + cron stub added (requires `npx convex dev` to deploy).
- Pending: set Vercel preview + production env vars.
- Convex dev logs confirmed for cron.
- App routes verified locally.

## Remaining
- Configure Vercel Preview + Production env vars (`NEXT_PUBLIC_CONVEX_URL`).

## Goal
- Scaffold the Next.js app and wire Convex dev/prod deployments with Vercel preview/production envs.

## Success Criteria
- Next.js app runs locally with `/start`, `/schools`, `/dashboard` routes.
- Convex dev deployment initialized and reachable from local app (requires interactive `npx convex dev --once --configure=new`).
- Vercel preview + production env vars set with correct Convex URLs.
- Convex scheduler validated with a no-op job in dev logs.

## User Flow / UX Notes
- N/A (app shell)

## Data + Auth Assumptions
- Convex will be used for auth and data access; wiring starts here.

## Backend (Convex) Functions
- Add a no-op scheduled function for scheduler validation (after Convex init).
- Optional: health-check query/mutation (after Convex init).

## Frontend Components / Pages
- `/start`
- `/schools`
- `/dashboard`

## Edge Cases + Error Handling
- Missing `NEXT_PUBLIC_CONVEX_URL` prevents app boot; show a clear dev error.
- Mismatched env vars between preview/prod.

## Analytics Events
- N/A (app shell)

## Testing / Verification
- `npm run dev` loads all three routes. (verified)
- Convex dev logs show scheduler job execution (post-init). (verified)
- Vercel preview build uses preview env vars; production uses production env vars.

## Open Questions
- App Router confirmed.
- Tailwind confirmed.
