# Brendan Czekaj — Portfolio

Two pages, each with its own root layout so neither loads the other's styles:

- **`/` — the main page, for recruiters.** One readable column on a dark glass panel —
  name, role and links, then a summary, experience and projects — on a deep teal
  background. A menu
  pinned top-right jumps to each section and highlights the one you're reading (a Menu
  button on phones). Copy lives in [`src/content/site.ts`](src/content/site.ts).
- **`/gamedev` — the game development page.** A pixel-art sky that follows the visitor's
  local clock, one screen tall: title and links at the top, a pixel window of projects in
  the sky, and the ground (ridges, treeline, grass, a dirt path and a grazing cow) along
  the bottom. Copy lives in [`src/content/portfolio.json`](src/content/portfolio.json) and
  is edited in place with the block editor (below).

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

**The main page (`/`)** reads [`src/content/site.ts`](src/content/site.ts). Edit it by hand;
it's typed, so a typo fails `npm run typecheck`. Leave a link out rather than ship a
placeholder.

**The game development page (`/gamedev`)** reads
[`src/content/portfolio.json`](src/content/portfolio.json), and the easiest way to change it
is the block editor on that page. The file's shape is defined in
[`src/content/portfolio.ts`](src/content/portfolio.ts) and checked by
[`validate.ts`](src/content/validate.ts) whenever it loads, so a broken file fails
`npm run build` instead of shipping.

### The block editor

With `npm run dev` running, open `/gamedev` and click **✎ EDIT** in the top-left corner. A side panel opens and
everything on the page becomes editable. Every change autosaves to `portfolio.json` half a
second after you stop; the badge in the panel shows **SAVED / SAVING… / NOT SAVED** (hover it
for the reason if a save fails). Click **✓ Done** to preview the page as visitors see it, then
commit and deploy as usual — the diff is just what you changed.

Each tab is a column of **blocks**:

| Block       | Looks like                                              |
| ----------- | ------------------------------------------------------- |
| Heading     | Pixel-font section title                                |
| Subheading  | Bold line, e.g. a role or a project name                |
| Paragraph   | Body copy                                               |
| Meta line   | Small muted line under a subheading, e.g. dates         |
| Bullet list | One point per line                                      |
| Tags        | Row of pixel labels, e.g. a tech stack                  |
| Link        | Pixel call to action, e.g. `GitHub →`, opens in new tab |
| Contact row | Label plus link, e.g. `EMAIL  you@example.com`          |
| Divider     | Line between one project or job and the next            |

A "section" such as a project is just a run of blocks; put a divider between sections.

- **Add** a block by dragging it from the panel onto the page (a glowing line shows where it
  will land), or by clicking it in the panel to add it below the block you're in.
- **Move** a block by its `⋮⋮` handle, with the ↑ ↓ buttons in its toolbar, or with ⌥↑ / ⌥↓.
  List items and tags have their own handles. **Move to…** sends a block to another tab.
- **Change** a heading, subheading, paragraph or meta line into one another from the
  toolbar's type menu. **⧉** duplicates a block; **✕** deletes it.
- **Write** like a document: Enter starts a new block (or a new list item or tag), and
  Backspace in an empty one removes it.
- **Format** by selecting text: bold, italic, highlight, link (⌘B, ⌘I, ⌘⇧H, ⌘K).
- **Tabs** are managed in the panel: drag to reorder, rename (the URL hash follows, e.g.
  `#blog`), add, or delete.
- **Undo / redo** (⌘Z / ⇧⌘Z) covers everything, typing and structure alike.
- The title, tagline and footer are edited in place; the panel's **Page** section sets the
  search/browser title and description.

Empty blocks are left off the live site, so a half-finished draft never shows a gap.

The editor is development-only. Its save route is a `*.dev.ts` file that only `next dev`
loads, accepts requests only from the page's own `localhost` origin, and validates every
document before writing it; the production build contains neither the route nor any editor
code (TipTap and dnd-kit are dev dependencies). If you change `portfolio.json` by hand, or
revert it with git, while the editor is open, the editor picks up the file rather than
writing over it.

### Editing the JSON by hand

Every block, list item and tag has an `id`, which the editor uses for drag-and-drop; any
unique short string works for new ones. Formatted text (headings, paragraphs, list items) is
a small HTML subset — `<strong>`, `<em>`, `<mark>` and `<a href="…">` — with `&amp;`,
`&lt;` and `&gt;` for those characters. Anything else is shown as literal text, and links
are limited to http, https, mailto and tel.

Search the JSON for `TODO` to find placeholders that still need real values: the project
links and the contact details.

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
`[data-theme='…']` token block in `gamedev.css`.

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
[`src/app/(gamedev)/gamedev.css`](<src/app/(gamedev)/gamedev.css>): sky gradient stops, star colours, cloud
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
`--cow-px` custom property in `gamedev.css`.

---

## Accessibility

- **Contrast.** Every theme was measured rather than eyeballed. Panel text and accent text
  clear WCAG AA (4.5:1) against any part of the sky in all four themes, across a panel
  background alpha of 0.80–0.95; the window sits at 0.92. Worst case is 5.82:1.
- **Text is never faded.** Fading the element bleeds the sky through the glyphs (0.6
  opacity drops accent text to **2.69:1**), so only the panel's _background alpha_ is ever
  tuned. Text renders at full strength.
- **Tabs.** The window follows the WAI-ARIA tabs pattern: arrow keys, Home and End move
  between tabs, only the selected tab is in the tab order, and each panel is focusable so
  keyboard users can scroll it. Inactive panels are hidden with `visibility`, which takes
  them out of the accessibility tree while keeping all copy in the static HTML. Each tab
  is linkable: `/#projects` opens straight to Projects.
- **Reduced motion.** Under `prefers-reduced-motion: reduce` everything stops — twinkling,
  shooting stars, cloud drift, parallax and glow pulses — and theme changes become an
  instant swap.
- Decorative sky and ground elements are `aria-hidden`, there is a skip link, and landmarks
  are semantic (`header` / `main` / `section` / `footer`).

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
`src/content/portfolio.json` — change it there if the domain changes.

Because the output is plain static files, `out/` can also be dropped on GitHub Pages,
Netlify, Cloudflare Pages or any static host. For a host that serves the site from a
subpath you would additionally need `basePath` and `assetPrefix` in `next.config.ts`.

---

## Project layout

```
src/
  app/
    (main)/             The main page at /
      layout.tsx        Root layout: Inter, metadata
      page.tsx          Name, links, summary, experience, projects
      site.css          Its styles
    (gamedev)/          The pixel-art page
      layout.tsx        Root layout: pixel fonts, metadata, pre-paint theme script
      gamedev/page.tsx  Scene composition, at /gamedev
      gamedev.css       Theme tokens, scene, sprites, panels, editor, motion rules
    api/content/route.dev.ts  Dev-only route that saves edits to portfolio.json
  components/
    ThemeScript.tsx     Blocking pre-paint theme resolution
    ThemeProvider.tsx   Theme state, clock re-checks, visibility pausing
    ThemeToggle.tsx     Pixel sun/moon override control
    TabbedWindow.tsx    The one pixel window: ARIA tabs, hash deep links
    site/               The main page's pieces
      SiteNav.tsx       Top-right section menu with current-section highlight
    content/
      Blocks.tsx        Read-only block rendering, formatted text
      SiteContent.tsx   Title, tabbed window and footer
      PageContent.tsx   SiteContent, or the editor under `npm run dev`
    editor/             Dev-only block editor
      Editor.tsx        Root: EDIT toggle, drag and drop, editable page
      Panel.tsx         Side panel: block palette, tabs, page settings
      EditableBlocks.tsx  Block chrome and per-type editing
      RichField.tsx     One line of editable text (TipTap)
      FormatToolbar.tsx Bold, italic, highlight and link on selection
      store.tsx         Document, undo history, autosave, focus
      model.ts          Block factories, ids, helpers
    scene/
      PixelSprite.tsx   Renders a pixel map as one block per horizontal run
      StarField.tsx     Seeded sparkles and dots
      Clouds.tsx        Parallax bands with a seamless wrap
      CelestialBody.tsx Sun/moon, scroll parallax clamped at the horizon
      ShootingStars.tsx Randomly spawned meteors, per-theme rate
      Ground.tsx        Ridges, treeline, grass, dirt path
      Cow.tsx           Grazing cow: walk/graze state machine, click to moo
  content/
    site.ts             Copy for the main page
    portfolio.json      Copy for /gamedev, as tabs of blocks
    portfolio.ts        Its types
    validate.ts         Shape check + normalisation, on load and on save
  lib/
    theme.ts            Theme types + time schedule
    pixel.ts            Pixel maps (sun, moon, clouds, trees)
    cow.ts              Cow sprite frames (walk cycle, grazing, chew)
    moo.ts              Web Audio moo synthesis
    prng.ts             Seeded RNG for deterministic scene generation
    inline.ts           Formatted-text parser and link sanitiser
scripts/generate-og.mjs Open Graph image renderer
```

Fonts: **Press Start 2P** for headings, labels and tags only; **IBM Plex Sans** for all body
copy. Paragraphs are never set in the pixel font.
