# Brendan — Portfolio

A single-page portfolio with a pixel-art sky that follows the visitor's local clock.
The sky fills roughly the top 85% of the page; content panels float in it, alternating
left and right, and the ground — ridges, treeline, grass and a dirt path — is a horizon
you scroll down to reach.

Next.js (App Router) · TypeScript · Tailwind CSS · static export.

---

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

| Script                 | What it does                             |
| ---------------------- | ---------------------------------------- |
| `npm run dev`          | Dev server with Fast Refresh             |
| `npm run build`        | Static export to `out/`                  |
| `npm run start`        | Serve the built `out/` directory locally |
| `npm run typecheck`    | `tsc --noEmit`                           |
| `npm run lint`         | ESLint                                   |
| `npm run format`       | Prettier, writing in place               |
| `npm run format:check` | Prettier, check only (use in CI)         |
| `npm run og`           | Regenerate `public/og.png`               |

---

## Editing content

**All copy lives in [`src/content/portfolio.ts`](src/content/portfolio.ts).** Nothing in
that file controls layout, so you can edit it freely without touching a component. It is
fully typed — a typo or a missing field fails `npm run typecheck` instead of shipping.

Search the file for `TODO` to find the placeholders that still need real values:

- the employment start date (`experience.entries[].period`)
- both project links (`projects.entries[].link.href`)
- email, GitHub and LinkedIn (`contact.links`)

### Adding a project

Append an entry to `projects.entries`:

```ts
{
  name: 'Project name',
  blurb: 'One or two sentences. Rendered as body copy.',
  stack: ['NEXT.JS', 'TYPESCRIPT'],
  link: { label: 'GitHub', href: 'https://github.com/…' },
}
```

Stack tags render in the pixel font, so keep them short and uppercase. The panel grows to
fit; no layout changes are needed.

---

## Tuning the theme time ranges

Themes are chosen from the visitor's local wall-clock hour. The schedule lives in
[`src/lib/theme.ts`](src/lib/theme.ts) and is the single source of truth — it is shared by
the React runtime _and_ serialised into the pre-paint script, so the two cannot drift:

```ts
export const THEME_SCHEDULE = [
  { from: 5, theme: 'morning' }, //  5:00 – 8:59
  { from: 9, theme: 'day' }, //  9:00 – 16:59
  { from: 17, theme: 'evening' }, // 17:00 – 20:59
  { from: 21, theme: 'night' }, // 21:00 – 4:59 (wraps past midnight)
];
```

Each entry runs from its `from` hour until the next entry's. The last entry wraps around
midnight. Edit the hours, or add/remove a theme — but if you add one, give it a matching
`[data-theme='…']` token block in `globals.css`.

The visitor's timezone comes from `Intl.DateTimeFormat().resolvedOptions().timeZone`, which
needs no permission prompt. **The Geolocation API is never used.**

### Manual override

The toggle in the top-right cycles morning → day → evening → night and stores the choice in
`localStorage` under `portfolio-theme`. While an override is set the toggle reads `MANUAL`
and a **USE MY CLOCK** button appears to clear it and go back to following real time.

To reset from the console:

```js
localStorage.removeItem('portfolio-theme');
location.reload();
```

---

## How the theming works

Everything visual is a CSS custom property on `[data-theme]` in
[`src/app/globals.css`](src/app/globals.css): sky gradient stops, star colours, cloud
tints, ground colours, panel background/border/text, and glow colours. There is **one set
of components and four token sets** — no component branches on the theme.

Three details are worth knowing before you change any of it:

**1. Tokens are registered with `@property`.** Plain custom properties flip instantly and
cannot be transitioned. Registering them with a type makes them interpolable, which is what
lets the entire scene cross-fade over ~2s in a single `transition` declaration rather than
needing stacked layers and JS orchestration.

**2. The four sky gradients share one 9-stop layout.** The original art used different stop
positions per theme, which cannot interpolate pairwise. Each gradient was resampled onto a
common layout (0%, 12.5% … 100%); maximum colour error versus the original is 5.6/255,
invisible on a gradient this smooth.

**3. No flash of the wrong theme.** The site is statically exported, so the server has no
idea what time it is where the visitor is; the HTML ships as `night`. A small blocking
script in `<head>` ([`ThemeScript.tsx`](src/components/ThemeScript.tsx)) reads
`localStorage` and the clock and rewrites `data-theme` **before the first paint**.
Cross-fade transitions are only switched on one frame _after_ hydration — enabling them
earlier would turn the corrective swap into the very flash we are avoiding.

An open tab re-checks the clock every two minutes, and again whenever it regains
visibility, so it moves into evening on its own.

---

## The cow

A cow grazes in the field at the bottom. She wanders left and right, stops to
crop the grass for a while, then moves on — and if you click or tap her, she
moos.

- **Sprites** ([`src/lib/cow.ts`](src/lib/cow.ts)) are generated at module load
  from a declared silhouette; the dark outline is derived from it, so it can
  never end up with a gap. She is deliberately chunky — an oversized head, horn
  nubs, a big pink snout and short stubby legs — and is authored facing left,
  then mirrored with `scaleX` to walk the other way. The legs are part of the
  silhouette, which is what gives them the same pale hide and dark edge as the
  rest of her. The walk lifts diagonal pairs with no horizontal swing: at three
  pixels wide, a leg that slides sideways reads as a broken leg, not a stride.
- **The moo** ([`src/lib/moo.ts`](src/lib/moo.ts)) is synthesised with the Web
  Audio API rather than shipped as an audio file — no bytes, no licence, works
  offline. It is a sawtooth with a rising-then-falling pitch envelope through
  two bandpass "formant" filters. Browsers block audio until the user
  interacts, so the `AudioContext` is created on the first click, not at import.
- Clicking also pops a **"Moooo" speech bubble**, so the feedback still lands
  with the sound off or muted. It is an `aria-live` region, and the cow is a
  real `<button>` with a label — she lives outside the `aria-hidden` scenery so
  that focusing her is valid.
- Under `prefers-reduced-motion` she stands still and does not wander, but
  remains clickable.

To change how far she roams or how long she grazes, see the constants at the
top of [`src/components/scene/Cow.tsx`](src/components/scene/Cow.tsx)
(`WALK_MS`, `GRAZE_MS`, `WALK_SPEED`, `EDGE_MARGIN`). Her size is the
`--cow-px` custom property in `globals.css`.

---

## Accessibility

- **Contrast.** Every theme was measured rather than eyeballed. Panel text and accent text
  clear WCAG AA (4.5:1) at every panel position in all four themes; worst case is 5.82:1.
- **The hover dim never touches text.** The brief's original design dimmed unfocused panels
  to 0.6 opacity, which drops accent text to **2.69:1** — a clear AA failure, because fading
  the element bleeds the sky through the glyphs. Instead only the panel's _background alpha_
  and glow move (0.95 focused → 0.88 resting → 0.80 dimmed), a band verified AA throughout.
  Text renders at full strength in every state.
- **Touch.** Under `@media (hover: none)` the dim is disabled entirely and an
  `IntersectionObserver` gives the focus treatment to whichever panel is centred in the
  viewport.
- **Reduced motion.** Under `prefers-reduced-motion: reduce` everything stops — twinkling,
  shooting stars, cloud drift, parallax, glow pulses and the hover lift — and theme changes
  become an instant swap.
- Decorative sky and ground elements are `aria-hidden`, there is a skip link, landmarks are
  semantic (`header` / `main` / `section` / `footer`), and keyboard focus mirrors the hover
  treatment.

## Performance

- Animation only ever touches `transform` and `opacity`.
- Twinkling sparkles are capped at 40.
- Cloud bands translate a double-width track by exactly `-50%`, so the loop is seamless.
- All CSS animation pauses on `visibilitychange`, and the parallax `requestAnimationFrame`
  loop stops with it.
- The star field is generated from a fixed seed at module load, so server and client render
  identical markup and there is no hydration mismatch.

---

## The Open Graph image

`public/og.png` is the night scene, and it is committed to the repo. It is generated by
[`scripts/generate-og.mjs`](scripts/generate-og.mjs), which draws into a raw pixel buffer
and writes the PNG by hand — no canvas dependency, no native build step. It reads the moon
sprite straight out of `src/lib/pixel.ts` so the card cannot drift from the site.

```bash
npm run og
```

Static export cannot use a runtime `ImageResponse` route, which is why the file is
pre-rendered and committed.

---

## Deploying to Vercel

The project is a pure static export (`output: 'export'`), so it deploys with no
configuration:

1. Push the repo to GitHub.
2. In Vercel, **Add New → Project**, and import it.
3. Vercel detects Next.js and needs no build-setting changes — `npm run build` emits `out/`,
   and Vercel serves it.
4. Under **Settings → Domains**, add `brendanczekaj.com` and point your registrar at
   Vercel's nameservers (or add the `A` / `CNAME` records Vercel shows you).

The canonical URL and Open Graph tags come from `portfolio.meta.url` in
`src/content/portfolio.ts` — change it there if the domain changes.

Because the output is plain static files, `out/` can also be dropped on GitHub Pages,
Netlify, Cloudflare Pages or any static host. For a host that serves the site from a
subpath you would additionally need `basePath` and `assetPrefix` in `next.config.ts`.

---

## Project layout

```
src/
  app/
    layout.tsx          Fonts, SEO + Open Graph metadata, pre-paint theme script
    page.tsx            Page composition
    globals.css         Theme tokens, scene, sprites, panels, motion rules
  components/
    ThemeScript.tsx     Blocking pre-paint theme resolution
    ThemeProvider.tsx   Theme state, clock re-checks, visibility pausing
    ThemeToggle.tsx     Pixel sun/moon override control
    Panel.tsx           Floating dialog box + touch focus fallback
    scene/
      PixelSprite.tsx   Renders a pixel map as one block per horizontal run
      StarField.tsx     Seeded sparkles and dots
      Clouds.tsx        Parallax bands with a seamless wrap
      CelestialBody.tsx Sun/moon, scroll parallax clamped at the horizon
      ShootingStars.tsx Randomly spawned meteors, per-theme rate
      Ground.tsx        Ridges, treeline, grass, dirt path
      Cow.tsx           Grazing cow: walk/graze state machine, click to moo
  content/portfolio.ts  All copy
  lib/
    theme.ts            Theme types + time schedule
    pixel.ts            Pixel maps (sun, moon, clouds, trees)
    cow.ts              Cow sprite frames (walk cycle, grazing, chew)
    moo.ts              Web Audio moo synthesis
    prng.ts             Seeded RNG for deterministic scene generation
scripts/generate-og.mjs Open Graph image renderer
```

Fonts: **Press Start 2P** for headings, labels and tags only; **IBM Plex Sans** for all body
copy. Paragraphs are never set in the pixel font.
