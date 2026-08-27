// Central place for building links out of marketing into apps/explorer.
//
// explorer's own middleware (src/middleware.ts) decides what actually
// happens on landing:
//  - no session cookie  -> stays on /signup or /login
//  - valid session cookie -> bounced straight to explorer's "/" (the app)
//
// So every CTA here just points at /signup or /login — the "already
// signed in? skip straight to the app" behavior is handled on the
// explorer side, not here.
//
// Astro (Vite-based) exposes env vars via import.meta.env, and only
// variables prefixed PUBLIC_ are safe to read client-side — this is
// the direct equivalent of Next's NEXT_PUBLIC_ convention.
const EXPLORER_URL = (import.meta.env.PUBLIC_EXPLORER_URL ?? 'http://localhost:3000').replace(/\/$/, '')

export const appLinks = {
  signup: `${EXPLORER_URL}/signup`,
  login: `${EXPLORER_URL}/login`,
}
