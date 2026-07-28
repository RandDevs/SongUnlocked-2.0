# SongUnlocked

An offline songbook for tracking the songs you can **actually play**, not the ones
you keep meaning to learn. Add a song, keep its chord sheet, mark it Mastered,
and watch the count per instrument go up.

Built with TypeScript, Vite, Vitest, and Playwright. Zero runtime dependencies.

---

## Run it

```bash
npm install        # install build & test dependencies
npm run dev        # http://localhost:5173 (Vite dev server)
```

**`npm install` is required.** The project uses Vite, TypeScript, Vitest, and Playwright for development, type-checking, and build automation. All dependencies sit strictly in `devDependencies`; **zero runtime dependencies** ship to the user.

```bash
npm run build      # production build (dist/) with Workbox PWA service worker
npm run preview    # preview production build locally (http://localhost:4173)
npm test           # unit tests (Vitest, 15 tests)
npm run test:e2e   # end-to-end interaction tests (Playwright, 46 tests)
npm run check      # strict TypeScript type check (tsc --noEmit)
npm run format     # format code (Prettier)
```

---

## Why it is built this way

**Zero runtime dependencies.** Every line that ships to users is in this repository. Nothing to audit, nothing to break on third-party CDNs. Build tools, type checkers, and test runners sit strictly in `devDependencies`.

**TypeScript in strict mode.** Source code in `src/`, unit tests in `tests/`, E2E tests in `e2e/`, and configuration files are fully typed with zero `any` types and zero `@ts-ignore` directives. Type checks are enforced with `tsc --noEmit`.

**Workbox PWA service worker.** Replaced hand-written service worker caching with `vite-plugin-pwa` (Workbox). Per-file content hashing automatically invalidates stale assets on updates, eliminating the footgun of manual `CACHE_VERSION` bumps serving outdated CSS or JS after a deployment.

**IndexedDB, not localStorage.** Chord sheets are long text. localStorage is synchronous, string-only, and capped at around 5 MB; IndexedDB has neither limitation. `src/db.ts` is a small hand-written promise wrapper around it.

**Local-first, no account.** Nothing leaves the device. That makes export the only real safety net, so it is a first-class feature rather than a hidden setting.

---

## The one real design trade-off

A chord must sit directly above the syllable it is played on. That requires a
monospaced font **and** lines that never wrap — the moment a line wraps, every
chord after the break points at the wrong word.

So the chord sheet does not wrap. It scrolls horizontally, and the reader controls
the type size with `A−` / `A+` in the transport bar. Wrapping and alignment cannot
both be true; alignment is the one that matters when you are playing.

---

## Design

Dark, editorial, one accent colour.

| Decision   | Value                                      | Reason                                                                                                                                                                            |
| ---------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Background | `#08090A`                                  | Near-black, not pure black; keeps borders visible                                                                                                                                 |
| Accent     | `#74D8B4`                                  | Cool mint, mid-chroma on purpose: readable for long sessions instead of shouting. Used **only** for mastered state, one filled action per screen, the active tab, and focus rings |
| Corners    | `6px`                                      | Present but not a motif                                                                                                                                                           |
| Type       | System UI stack; chord sheets in monospace | No webfont means no flash and no download                                                                                                                                         |
| Motion     | `120ms`, one easing curve                  | Fast enough to feel like a native app                                                                                                                                             |
| Icons      | Hand-drawn SVG strokes (`src/icons.ts`)    | No icon-font dependency, no emoji                                                                                                                                                 |

Deliberately avoided: gradients, glassmorphism, blur, emoji as iconography, and
cramped small text.

**Texture, not wallpaper.** A flat near-black fills like an unpainted wall on an
OLED phone, so the background carries two layers you should never consciously
notice: film grain at 2.6% opacity generated by an inline SVG turbulence filter,
and a vignette that lifts the top-centre of the screen by under 3%. Both are
inline data URIs — nothing to download, nothing to go missing offline. They live
on `html::before` / `html::after` rather than on `body`, because a negative
`z-index` paints behind its own parent's background; the base colour has to sit
one level up the tree or the texture would be buried under it.

**Moods are the one sanctioned exception to the single accent.** Seven fully
saturated pills would be exactly the generic look this app is trying to avoid, so
each mood gets a muted hue used as *text and icon colour over a 12% wash* —
never a solid fill. Sad is a cool blue, Love a dusty rose, Happy a warm gold,
Nostalgic a faded sepia, Chill a soft lavender (deliberately not teal, which
would collide with the mint accent), Upbeat a warm orange, Campfire an ember red.
A tag you invent yourself has no hue and renders in plain secondary text, which
keeps the presets legible as a set.

The accent is spent sparingly on purpose. Exactly **one** solid accent element per
screen carries the primary action (Home → quick add, Library → New song, Song →
play, Instruments → Add, Settings → Export). Everything else that is "on" — an
active filter chip, a Mastered badge — gets a tinted background and accent text,
never a solid fill. A default state is never accented, because nothing is
happening yet.

A red action never looks like an ordinary button. Delete controls sit neutral at
rest and turn `#FF6F5E` with a faint red wash on hover and on keyboard focus, and
every one of them opens a confirmation dialog whose button says what will die
("Delete song", "Delete instrument", "Delete everything") rather than a bare
"Confirm".

---

## Screens

- **Home** — quick-add (defaults to Mastered, because you usually log a song the
  moment you realise you can play it), mastery stats per instrument, recent activity.
- **Library** — search, then a row of three dropdowns (Instrument, Status, Capo)
  and a row of mood pills. The single-choice filters are dropdowns because chips
  grow with your library: twelve instruments would have pushed a chip row off the
  side of the screen, while a dropdown stays the same size no matter how much you
  own. Their resting values read "All instruments" / "Any status" / "Any capo", so
  the default state is stated rather than blank. The cost of a dropdown is that it
  hides its own state, so an applied filter turns its trigger accent-coloured —
  you can see the library is filtered without opening anything. Moods stay as
  pills because they are multi-select and choosing two must **widen** the result
  (Sad _or_ Love), which a dropdown cannot express at a glance. Choices are saved,
  so the filter you played with last night is still set tonight, and `Clear`
  appears only when something is actually filtered. The search field is
  created once and never re-rendered, so the caret and focus survive every
  keystroke; only the results list is rewritten.
- **Capo and tags** — every song stores a capo position (0–7) and up to five mood
  tags. Presets are Sad, Love, Happy, Nostalgic, Chill, Upbeat and Campfire, each
  with its own drawn icon and hue (`src/moods.ts`), and you can type your own. Capo is written out only in the song header ("No capo" /
  "Capo 2"); in the library a row shows a small `Capo 2` marker and stays silent
  when there is nothing to clamp.
- **Song** — the header reads top-down: back link, then the title with Edit and
  Delete tucked into the top-right corner, then a row of facts (status,
  instrument, capo, moods), then the chords used on their own labelled line so a
  long progression never crowds the badges. `Mark as Mastered` appears only while
  a song is still To Learn: promotion is the one-tap case worth a button, and
  demoting is rare enough that it belongs behind Edit, where it cannot be hit by
  accident. Below that sits the chord sheet, with autoscroll (play/pause plus an
  8–120 px/s speed slider) and type-size controls. Chord lines are tinted, section headers are set
  in small caps.
- **Instruments** — add, rename, archive, delete. Archiving is the primary action;
  deleting is only offered once an instrument holds no songs, which makes orphaned
  records impossible.
- **Settings** — export, import (Merge or Replace), reset.

---

## Structure

```
index.html            app shell
vite.config.ts        Vite build configuration + vite-plugin-pwa (Workbox)
vitest.config.ts      Vitest unit test configuration
playwright.config.ts  Playwright E2E test configuration
tsconfig.json         TypeScript strict mode compiler configuration
src/
  main.ts             boot + hash router
  store.ts            in-memory state, pub/sub, all mutations
  db.ts               IndexedDB wrapper
  seed.ts             first-run sample library
  chordsheet.ts       chord/lyric/section line parser
  autoscroll.ts       frame-rate-independent scroll engine
  backup.ts           export + all-or-nothing import validation
  dom.ts              ~40-line element helper
  icons.ts            SVG icon set
  moods.ts            mood presets: hue, wash and icon per tag
  ui/                 shell, dialog, custom select, tag input, shared song form
  views/              one file per screen
  styles/             design tokens + components
tests/                Vitest unit tests (.test.ts)
e2e/                  Playwright E2E tests (.spec.ts)

```

### How state flows

Every mutation writes to IndexedDB **first**, then updates memory, then notifies
subscribers. If the write fails, memory is untouched — the UI can never display a
song that was not actually saved. Reads are synchronous because the whole library
lives in memory after boot.

Each view returns a `cleanup()` function, and the router always runs it before
mounting the next screen. That is what stops the autoscroll loop and store
subscriptions from leaking when you navigate away mid-song.

---

## Offline

`vite-plugin-pwa` generates a Workbox service worker on build (`dist/sw.js`). It precaches the entire app shell and uses a cache-first strategy so the app loads with no network connection. Per-file content hashing automatically manages asset revisions upon new builds.

Previewing the production build with `npm run preview` serves the app locally over HTTP with full service worker support.

---

## About the sample content

The library ships with six songs so the app is not empty on first run. Titles and
artists are real; **the sheet text is written for this demo and is not the actual
lyrics of any song.** Real lyrics are copyrighted, and this repository is meant to
be publishable. The chord progressions are included because they are what the
alignment feature exists to display.

Settings → Reset restores this sample library.

---

## Verified before shipping

Every claim below was run on this code, not assumed:

- `npm run check` (`tsc --noEmit`) — **0 errors, strict mode on** across all source files, test suites, and configurations.
- `npm test` — **15 of 15 unit tests pass** (chord-sheet parser, backup validation, reading a version 1 backup into the version 2 schema, capo/tag cleaning) via Vitest.
- `npm run test:e2e` — **46 of 46 Playwright E2E checks pass in real Chromium**, 0 console or network errors. They cover the full 35 interaction sequence (seed data loading, search filtering without focus loss, status/capo filters, quick add, persistence across reload, dialog validation, autoscroll start/stop, chord tinting & exact character alignment, mastery toggling, back link sizing, custom dropdown keyboard controls, dialog footer pinning, backup export/import, SW active & shell caching, unknown route recovery), 10 route render checks across mobile/desktop viewports, and 1 offline PWA reload verification.
- `npm run build` — **Production build succeeds**, generating `dist/` bundle and Workbox service worker.
- All five screens rendered and verified at 390×844 and 1280×800.

### No native dropdowns

A native `<select>` renders its popup list in operating-system chrome that CSS
cannot touch, so on a dark app it flashes a white list. `src/ui/select.ts` is a
hand-written combobox/listbox that replaces all five of them, with the full
keyboard contract: Enter/Space/arrows to open, arrows and Home/End to move,
type-ahead, Enter to choose, Escape to dismiss, focus always returned to the
trigger, and `aria-expanded` / `aria-activedescendant` kept honest.

### Swipe between tabs

On a touch screen, swiping left or right moves between Home, Library, Instruments
and Settings. It is deliberately disabled on a song page, where a horizontal drag
belongs to the chord sheet, and it ignores gestures that start inside any
horizontally scrolling element or within 24 px of a screen edge.

### Upgrading from version 1

The IndexedDB schema is version 2. Existing songs are backfilled with
`capo: 0` and `tags: []` during the upgrade, nothing is lost, and a version 1
export file still imports cleanly.

---

## Browser support

Any current browser with ES modules, IndexedDB, `<dialog>`, and CSS custom
properties: Chrome/Edge 92+, Firefox 98+, Safari 15.4+.
