# Phase 0.1 Setup Checklist

## Convex
- Create new Convex project (dev + prod deployments)
- Run `npx convex dev --once --configure=new` in the repo (interactive login required)
- Record `NEXT_PUBLIC_CONVEX_URL` for dev and prod
- Configure Convex auth provider(s) when needed
- Enable scheduler (no code yet)

## Vercel
- Create a single Vercel project for this repo
- Set env vars for Preview and Production
- Confirm preview builds are separated from production

## Validation
- Confirm dev Convex URL works from local env
- Confirm prod Convex URL works from Vercel production env
- Confirm scheduler can run a no-op job (when Convex code exists)
