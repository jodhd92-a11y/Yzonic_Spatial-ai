# Marketing app — Astro port fixes

This is `apps/marketing` from your `apps1.zip` (Astro port), with the missing
landing-page sections ported over from `apps.zip` (the old Next.js version),
plus a few bugs fixed along the way. Drop this folder in over your existing
`apps/marketing`.

## What was missing (now added)

Your port had only gotten as far as `NavWithLoader` and `Sidebar` — genuinely
well done, with good calls (merging Nav+LoadingScreen into one island,
nanostores to coordinate state across island boundaries). But `index.astro`
below the nav was just an empty `150vh` spacer. Ported over and wired in:

- `Hero.tsx` + `Hero.module.css`
- `Features.tsx` + `Features.module.css`
- `Showcase.tsx` + `Showcase.module.css`
- `Gallery.tsx` + `Gallery.module.css`
- `Vision.tsx` + `Vision.module.css`
- `StarField.tsx` (hero canvas particle field)
- `Typewriter.tsx` + `Typewriter.module.css`
- `CustomCursor.tsx` + `CustomCursor.module.css`
- `SmoothScroll.tsx` — Lenis smooth-scroll (see note below)
- `Section.module.css` (shared eyebrow/h2/body styles)
- `hooks/useReveal.ts`

## Bugs found in the existing Astro files

1. **`global.css` was missing the color-theme system** (`--primary-deep`,
   `html[data-theme="pink/yellow/golden/green/violet/coral"]`), the noise
   texture overlay, the batched-transition rule, and the `content-visibility`
   perf hints on Features/Showcase/Gallery. All restored.

2. **Dead fonts re-added.** `package.json` and `global.css` had
   `@fontsource/dm-sans` and `@fontsource/instrument-serif` — but your own
   `apps.zip` layout.tsx has a comment explaining these were _removed_ because
   no `font-family` anywhere ever resolves to them. Re-adding them reintroduces
   two unnecessary font downloads. Removed again.

3. **`scroll-behavior: smooth` conflicts with Lenis.** `global.css` had added
   this, but Lenis was already sitting unused in `package.json`. Running both
   means two systems fight over scroll position on every wheel tick — the old
   codebase has a comment explaining exactly this. Removed; `SmoothScroll.tsx`
   (Lenis) is now the single source of truth for scroll animation, mounted
   once in `Layout.astro`.

4. **Hero's primary CTA was hardcoded** to `/auth?mode=signup` instead of
   using `appLinks.signup` like the Nav/Sidebar CTAs do. Fixed to use
   `appLinks`, so the explorer-app URL stays centralized.

## Architecture notes (things that changed on purpose)

- **`SmoothScrollProvider` → `SmoothScroll`.** The Next.js version wrapped
  `children` in a provider. Astro islands are independent React roots, so
  there's no single tree to wrap. It's now a render-nothing island mounted
  once in `Layout.astro` (`client:idle`), which drives the whole document.

- **Hydration strategy is more granular than the original.** The Next.js page
  was one big `'use client'` component — everything hydrated together, and
  `content-visibility: auto` was used purely to cut _paint_ cost for
  offscreen sections. Astro's island model lets each section defer
  _hydration_ itself:
  - `NavWithLoader` — `client:load` (is the loading screen)
  - `Sidebar`, `CustomCursor`, `SmoothScroll` — `client:idle`
  - `Hero` — `client:load` (above the fold, immediately interactive)
  - `Features`, `Showcase`, `Gallery`, `Vision` — `client:visible`
    (this is the direct Astro-native equivalent of the original's
    `next/dynamic` code-splitting for Gallery/Vision — same intent,
    extended to Features/Showcase too since they're also below the fold)

## Not touched / worth knowing about

- `.theme-dot` / `.fab` CSS classes exist in `global.css` but aren't wired to
  any actual theme-switcher UI in either version — looks like leftover/future
  scaffolding from the original codebase, not something this port broke.
- I couldn't run `npm install` / `astro build` in this environment (no
  network access), so this hasn't been build-verified — I did check all
  imports resolve, all `.module.css` files exist, and JSX braces/parens
  balance in every file. Worth a `pnpm install && pnpm build` on your end
  before shipping.

---

## Session 2 — remaining sections + global chrome

Compared the port against the finished `index.html` prototype and filled in
everything still missing. Same constraint as before: no network access, so
this is careful-by-hand rather than build-verified — run `npm install && npm
run build` before shipping.

### New sections (dropped into `index.astro` between existing ones)

- `Marquee.tsx` — infinite capability strip, after Hero
- `VideoSection.tsx` — video placeholder grid (swap `.placeholder` divs for
  real `<video>` tags once footage exists), after Gallery
- `ZoomSection.tsx` — the 5 "layer" cards with the CSS fire-hover effect.
  Desktop uses `:hover`; touch devices get the same look driven by an
  `IntersectionObserver` picking whichever card is nearest viewport-centre
  (mirrors the original's touch-activation script)
- `StatsSection.tsx` — 4 stat counters, each with its own IntersectionObserver
  - eased count-up (matches the original's per-element approach rather than
    one shared observer)
- `CtaSection.tsx` — final CTA, reuses the same `MagneticLink` + `.btnPrimary`
  as Hero (see below)
- `AboutSection.tsx` — founder/vision copy + full site footer, last section

### New global chrome (mounted once in `Layout.astro`, all `client:idle`)

- `ProgressBar.tsx` — top-of-page scroll progress, `scaleX` transform (not
  `width`) to stay compositor-only
- `SectionDots.tsx` — left-side section nav, hidden under 768px per the
  original's mobile CSS; caches section offsets on resize/load, not per
  scroll tick
- `ThemeSwitcher.tsx` — the color-theme picker for the `--primary`/`--accent`
  CSS vars that were already in `global.css` but had no UI. Includes the
  full-screen "ripple" recolour flourish (halo + wave + sparks, imperative
  DOM nodes created/removed per tap, same as the original) and the
  bottom-center "bloom dial" layout on mobile. Persists choice to
  `localStorage['sai_theme']`
- `FabStack.tsx` — autoscroll toggle + back-to-top. Drives the shared Lenis
  instance via `lenis.scrollTo(..., {immediate:true})` when present (see
  below) rather than fighting it with raw `window.scrollTo`

### Other changes

- **`SmoothScroll.tsx` now exposes `window.__lenis`.** FabStack and
  SectionDots both need to trigger scroll — since each Astro island is an
  independent React tree, there's no prop-drilling path to the Lenis
  instance SmoothScroll owns, so it's attached to `window` (cleaned up on
  unmount) as the least-bad option given the island boundary. If a shared
  scroll-controller store is added later, prefer that over `window`.
- **Extracted `MagneticLink` out of `Hero.tsx`** into its own file
  (`MagneticLink.tsx`) so `CtaSection` could reuse it instead of duplicating
  the pointer-follow logic. Hero's import updated accordingly.
- **`Sidebar.tsx`** — added the "Videos" nav link (pointed at nothing before
  since `VideoSection` didn't exist yet).
- **`global.css`** — extended the `content-visibility: auto` list to cover
  all the new sections, matching the existing Features/Showcase/Gallery
  pattern.

### Not done (flagging, not blocking)

- Nav active-link highlighting (bolding the current section in the navbar)
  wasn't ported — the original wired this into the same scroll handler as
  progress-bar/section-dots. `SectionDots` and `NavWithLoader` are separate
  islands with no shared state for this yet; low-value enough to skip for
  now, but nanostores would be the way to wire it if wanted.
- Video cards are still placeholders (by design — no source footage was
  provided). Swap the `.placeholder` div for a real `<video>` tag when
  footage is ready; the surrounding card markup doesn't need to change.
