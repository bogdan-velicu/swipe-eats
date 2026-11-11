# Group Dining Swipe App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A dark, polished, cross-platform group dinner-decider where any-size groups join a realtime session (code/QR/link) and swipe on food types and/or nearby places until the group's picks surface.

**Architecture:** Expo / React Native app (Expo Router) with a pure, framework-free domain core (matching, codes, distance/units, food-type catalog) that is unit-tested in isolation. Realtime session state lives in Firestore with anonymous auth; all Google Places access is proxied through a Firebase Cloud Function so the key never ships in the client. UI is built feature-by-feature on top of the tested core, with Reanimated/Gesture-Handler for the swipe deck.

**Tech Stack:** Expo SDK 54+, React Native, TypeScript, expo-router, react-native-reanimated, react-native-gesture-handler, react-native-maps, Firebase (Firestore + Anonymous Auth + Cloud Functions), Google Places API (New, v1), Jest + @testing-library/react-native, Firebase emulator for rules/service tests.

**Spec:** `docs/superpowers/specs/2026-11-11-group-dining-swipe-design.md`

## Global Constraints

- Original app, not a BiteSwipe reskin — no BiteSwipe name, branding, assets, copy, or backend.
- Platform: Expo managed workflow, TypeScript, one codebase for iOS + Android. No shipped web target in v1.
- No accounts: anonymous Firebase Auth only. No OS push notifications in v1 (in-app Firestore realtime only). No ads. No gamification (badges/achievements/mini-games). No in-app ordering/reservations/payments.
- Google Places key lives **only** in the Cloud Function proxy, never in the client build; additionally API-restricted.
- Google Places terms: do **not** persist Places photo/review content in Firestore. Sessions store place **IDs** + minimal display fields; clients fetch photos via fresh photo references at view time; show the (~5) reviews Google returns with required attribution.
- Units: metric **and** imperial everywhere, user-toggleable; default from device locale.
- Match default: live leaderboard of most-liked; a candidate liked by every *active* participant is a match.
- Membership: join mid-session inherits the in-progress deck; leaving drops you from the unanimity denominator; matching evaluated continuously over currently-active participants.
- Solo mode: personal shortlist (any like saves), no "match" concept, reuses deck UI.
- Place mode deck anchored on **host's** location; food-type mode is location-light.
- Requires internet. Visual direction: dark & premium.

## Review Focus

Inputs/failure modes the spec implies that no single task's happy-path tests exercise — each gets a test in the owning task:

- **Empty/short candidate deck:** Places returns 0–2 results (rural area, tight walking-time + open-now). Deck must show a clear empty/expand-radius state, not a blank screen or crash. → Task 12 (deck), Task 14 (filters) tests.
- **Participant leaves mid-swipe:** the active set shrinks; a candidate everyone *remaining* liked must become a match, and the denominator must update without a stale lock. → Task 6 (matching) tests.
- **Duplicate / re-swipe:** the same user swiping the same candidate twice (reconnect, double-tap) must be idempotent, not double-counted. → Task 6 + Task 9 tests.
- **Malformed / expired join code & cross-session link:** wrong code, code for a `finished`/`cancelled` session, or a link to a non-existent session must fail gracefully with a readable message. → Task 11 (join) tests.
- **Security-rule enforcement:** a client writing another user's swipes, reading a session it hasn't joined, or ending a session it doesn't host must be denied. → Task 8 (rules) tests.

---

## Phase A — Foundations (pure core + scaffold; boots a runnable slice)

### Task 1: Project scaffold + design tokens

**Files:**
- Create: `package.json`, `app.config.ts`, `tsconfig.json`, `babel.config.js`, `jest.config.js`
- Create: `src/theme/tokens.ts`, `src/theme/index.ts`
- Test: `src/theme/__tests__/tokens.test.ts`

**Interfaces:**
- Produces: `theme` object `{ color: { bg, surface, surfaceGlass, text, textDim, accent, like, pass }, radius, space, font }`; `ThemeProvider` React context + `useTheme()`.

- [ ] **Step 1: Write the failing test** — `tokens.test.ts`: asserts `theme.color.bg` is the dark base `'#0c0c10'`, `theme.color.accent` is the amber `'#ff9f43'`, and every token group (`color/radius/space/font`) is present and non-empty.
- [ ] **Step 2: Run test, verify it fails** — `npx jest src/theme` → FAIL (module not found).
- [ ] **Step 3: Scaffold the Expo+TS app** (`npx create-expo-app` managed, TS template), add deps from Tech Stack, then implement `tokens.ts` with the dark-premium palette from the spec and `index.ts` exporting `ThemeProvider`/`useTheme`.
- [ ] **Step 4: Run test, verify it passes.**
- [ ] **Step 5: Commit** — `feat: expo scaffold + dark-premium design tokens`.

### Task 2: Units & distance utilities

**Files:**
- Create: `src/core/units.ts`
- Test: `src/core/__tests__/units.test.ts`

**Interfaces:**
- Produces: `type UnitSystem = 'metric' | 'imperial'`; `haversineMeters(a: LatLng, b: LatLng): number`; `formatDistance(meters: number, u: UnitSystem): string`; `walkingMinutes(meters: number): number` (uses 5 km/h ≈ 83.3 m/min); `defaultUnitSystem(locale: string): UnitSystem`.

- [ ] **Step 1: Write the failing tests** — `haversineMeters` between two known coords ≈ expected (±1%); `formatDistance(1609, 'imperial')` → `'1.0 mi'`, `formatDistance(1500,'metric')` → `'1.5 km'`, sub-km/sub-mi render in m/ft; `walkingMinutes(833)` → `10`; `defaultUnitSystem('en-US')` → `'imperial'`, `'en-GB'`/`'ro-RO'` → `'metric'`.
- [ ] **Step 2: Run, verify fails.**
- [ ] **Step 3: Implement `src/core/units.ts`** — pure functions, no RN imports.
- [ ] **Step 4: Run, verify passes.**
- [ ] **Step 5: Commit** — `feat: units + distance/walking-time utilities`.

### Task 3: Session code generator

**Files:**
- Create: `src/core/sessionCode.ts`
- Test: `src/core/__tests__/sessionCode.test.ts`

**Interfaces:**
- Produces: `generateSessionCode(len?: number, rng?: () => number): string` — default length 6, charset `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no ambiguous I/O/0/1).

- [ ] **Step 1: Write the failing tests** — length defaults to 6; every char ∈ charset; never emits `I O 0 1`; with a seeded `rng` the output is deterministic (injectable RNG for testability; production passes a crypto-backed `rng`).
- [ ] **Step 2: Run, verify fails.**
- [ ] **Step 3: Implement** — map `rng()` across charset; document that production supplies `expo-crypto` randomness, not `Math.random`.
- [ ] **Step 4: Run, verify passes.**
- [ ] **Step 5: Commit** — `feat: session code generator`.

### Task 4: Food-type catalog

**Files:**
- Create: `src/core/foodTypes.ts`
- Test: `src/core/__tests__/foodTypes.test.ts`

**Interfaces:**
- Produces: `type FoodType = { value: string; label: string; placesType: string; emoji: string }`; `FOOD_TYPES: FoodType[]`; `priceLevelToSymbols(level: string, max?: number): string`; `symbolsToPriceLevel(s: string): string`.

- [ ] **Step 1: Write the failing tests** — `FOOD_TYPES` contains the curated set (pizza, burger, kebab, sushi, ramen, …) each with a non-empty `placesType`, `label`, `emoji`; `value`s are unique; `priceLevelToSymbols('PRICE_LEVEL_MODERATE')` → `'$$'` and round-trips via `symbolsToPriceLevel`.
- [ ] **Step 2: Run, verify fails.** → **Step 3: Implement.** → **Step 4: Run, verify passes.** → **Step 5: Commit** — `feat: food-type catalog + price mapping`.

### Task 5: Domain types

**Files:**
- Create: `src/core/types.ts`
- Test: (type-only; covered by consumers)

**Interfaces:**
- Produces: `LatLng`; `SwipeDir = 'LIKE' | 'PASS'`; `Participant = { id; name; emoji; color; joinedAt; active }`; `Candidate = { id; kind: 'foodType' | 'place'; placeId?; name; ... }`; `Session = { id; code; hostId; status: 'waiting'|'active'|'finished'|'cancelled'; mode: 'foodType'|'place'|'both'; filters: Filters; participants: Record<string,Participant>; candidates: Candidate[]; swipes: Record<string, Record<string, SwipeDir>> }`; `Filters = { unit: UnitSystem; maxWalkMin?: number; radiusMeters?: number; cuisines: string[]; maxPrice?: string; minRating?: number; openNow: boolean; anchor: LatLng }`.

- [ ] **Step 1: Define all shared types in `src/core/types.ts`.** No logic. (No test task of its own; later tasks import and exercise these.)
- [ ] **Step 2: Commit** — `feat: domain types`.

### Task 6: Matching engine

**Files:**
- Create: `src/core/matching.ts`
- Test: `src/core/__tests__/matching.test.ts`

**Interfaces:**
- Consumes: `Session`, `SwipeDir`, `Participant` (Task 5).
- Produces: `activeParticipantIds(s: Session): string[]`; `leaderboard(s: Session): { candidateId: string; likes: number }[]` (desc by likes); `matches(s: Session): string[]` (candidates liked by *every* active participant); `recordSwipe(s: Session, userId: string, candidateId: string, dir: SwipeDir): Session` (pure, idempotent — re-swipe overwrites, never double-counts).

- [ ] **Step 1: Write the failing tests** —
  - unanimous: 3 active, all LIKE candidate X → `matches` includes X; one PASS → excluded.
  - **leave mid-swipe (Review Focus):** participant who PASSed X goes `active:false` → X becomes a match; denominator shrinks.
  - **idempotent re-swipe (Review Focus):** same user LIKE X twice → `leaderboard` counts X once.
  - leaderboard ordering by like count desc.
  - empty session → `matches` `[]`, `leaderboard` `[]`.
- [ ] **Step 2: Run, verify fails.**
- [ ] **Step 3: Implement `src/core/matching.ts`** — pure; `matches` = candidates where every active id has `swipes[id][cand] === 'LIKE'`.
- [ ] **Step 4: Run, verify passes.**
- [ ] **Step 5: Commit** — `feat: matching engine (leaderboard + unanimous match)`.

### Task 7: Navigation skeleton + unit toggle (runnable slice)

**Files:**
- Create: `app/_layout.tsx`, `app/index.tsx`, `app/create.tsx`, `app/join.tsx`, `app/lobby.tsx`, `app/swipe.tsx`, `app/results.tsx`, `app/recap.tsx`
- Create: `src/state/settings.ts` (unit system persisted via `expo-secure-store`/AsyncStorage)
- Test: `src/state/__tests__/settings.test.ts`

**Interfaces:**
- Consumes: `theme` (Task 1), `defaultUnitSystem` (Task 2).
- Produces: `useSettings()` → `{ unit, setUnit }`; eight placeholder routes themed dark.

- [ ] **Step 1: Write the failing test** — `settings` store returns `defaultUnitSystem(locale)` initially and persists a `setUnit('imperial')` across reload (mock storage).
- [ ] **Step 2: Run, verify fails.** → **Step 3:** implement settings store + wrap routes in `ThemeProvider`; each screen a themed placeholder with its title. → **Step 4: Run, verify passes.** → **Step 5:** `npx expo start` boots to a dark home with working nav + unit toggle. → **Step 6: Commit** — `feat: navigation skeleton + unit toggle`.

---

## Phase B — Backend (Firestore + anonymous auth + Places proxy)

### Task 8: Firebase init + anonymous auth

**Files:**
- Create: `src/backend/firebase.ts`, `src/backend/auth.ts`
- Test: `src/backend/__tests__/auth.test.ts` (Firebase emulator)

**Interfaces:**
- Produces: `db` (Firestore), `ensureAnonymousAuth(): Promise<string>` (returns uid; idempotent — reuses current user).

- [ ] **Step 1: Write the failing test** — against the Auth emulator, `ensureAnonymousAuth()` returns a stable uid and a second call returns the same uid.
- [ ] **Step 2: Run, verify fails.** → **Step 3:** implement init from env config + anon sign-in wrapper. → **Step 4: Run, verify passes.** → **Step 5: Commit** — `feat: firebase init + anonymous auth`.

### Task 9: Session service + security rules

**Files:**
- Create: `src/backend/sessionService.ts`
- Create: `firestore.rules`, `firestore.indexes.json`
- Test: `src/backend/__tests__/sessionService.test.ts`, `src/backend/__tests__/rules.test.ts` (emulator)

**Interfaces:**
- Consumes: `db`, `ensureAnonymousAuth` (Task 8); `generateSessionCode` (Task 3); `recordSwipe` logic mirrored server-shaped (Task 6); `Session`/`Filters` (Task 5).
- Produces: `createSession(input): Promise<Session>`; `findSessionByCode(code): Promise<Session|null>`; `joinSession(id, participant): Promise<void>`; `observeSession(id, cb): Unsubscribe` (onSnapshot); `recordSwipe(id, candidateId, dir): Promise<void>` (writes only caller's swipe path); `leaveSession(id): Promise<void>` (sets `active:false`); `setCandidates(id, candidates)`; `startPlacesRound(id)`; `endSession(id)` (host only); `cancelSession(id)` (host only).

- [ ] **Step 1: Write the failing service tests** — create→findByCode round-trips; join adds participant; recordSwipe writes `swipes/{uid}/{cand}`; leave flips `active`; observe fires on change.
- [ ] **Step 2: Write the failing rules tests (Review Focus)** — non-participant can't read; participant A can't write B's swipes; non-host can't `end`/`cancel`; reads/writes denied when `status` is `finished`.
- [ ] **Step 3: Run, verify fails.**
- [ ] **Step 4: Implement `sessionService.ts` + `firestore.rules`** — rules: session readable only to listed participants; `swipes/{uid}` writable only by that uid; `status` transitions to `finished`/`cancelled` only by `hostId`.
- [ ] **Step 5: Run both suites, verify pass.**
- [ ] **Step 6: Commit** — `feat: firestore session service + security rules`.

### Task 10: Places Cloud Function proxy

**Files:**
- Create: `functions/src/places.ts`, `functions/src/index.ts`, `functions/package.json`
- Create: `src/backend/placesClient.ts` (client caller)
- Test: `functions/src/__tests__/places.test.ts`, `src/backend/__tests__/placesClient.test.ts`

**Interfaces:**
- Produces (callable function `searchPlaces`): input `{ anchor, radiusMeters, includedTypes, maxPrice?, minRating?, openNow?, pageToken? }` → `{ places: PlaceLite[], nextPageToken? }` where `PlaceLite = { id, name, location, rating, userRatingCount, priceLevel, primaryType, photoRefs: string[], address }`. Callable `placePhotos(placeId)` and `placeReviews(placeId)` return fresh photo URLs / up to 5 reviews with `attributions`.
- Produces (client): `searchPlaces(filters): Promise<PlaceLite[]>`, `placePhotoUrls(placeId): Promise<string[]>`, `placeReviews(placeId): Promise<Review[]>`.

- [ ] **Step 1: Write the failing function tests** — with the Places HTTP layer mocked, `searchPlaces` maps a Places `searchText`/`searchNearby` response into `PlaceLite[]`, forwards filters, and **never** returns the raw key; `minRating`/`maxPrice` filter correctly; **duplicate guard (Review Focus):** paging dedupes by `id`.
- [ ] **Step 2: Write the failing client test** — `placesClient.searchPlaces` calls the callable and surfaces `PlaceLite[]`; empty response → `[]` (no throw).
- [ ] **Step 3: Run, verify fails.**
- [ ] **Step 4: Implement** — Cloud Function reads key from runtime config (never the client); client calls via Firebase callable. Do not persist photo/review content.
- [ ] **Step 5: Run, verify passes.**
- [ ] **Step 6: Commit** — `feat: places cloud-function proxy + client`.

---

## Phase C — Experience (screens, deck, map, polish)

### Task 11: Create & Join flows (code/QR/link)

**Files:**
- Modify: `app/create.tsx`, `app/join.tsx`
- Create: `src/features/join/useDeepLink.ts`, `src/features/join/QrScanner.tsx`, `src/features/session/useSession.ts`
- Test: `src/features/join/__tests__/useDeepLink.test.ts`, `src/features/session/__tests__/useSession.test.ts`

**Interfaces:**
- Consumes: `sessionService` (Task 9), `ensureAnonymousAuth` (Task 8), `generateSessionCode` (Task 3).
- Produces: `useSession(id)` → `{ session, loading, error }` (wraps `observeSession`); `parseJoinLink(url): string | null` (extracts session id/code); deep-link + `biteswipe`-equivalent scheme config in `app.config.ts` (placeholder universal-link domain).

- [ ] **Step 1: Write failing tests** — `parseJoinLink` extracts code from `app-scheme://join?code=ABC123` and the placeholder `https://<domain>/join/<code>`, returns `null` on junk; **(Review Focus)** join with wrong/expired code surfaces a readable error, not a crash.
- [ ] **Step 2: Run, verify fails.** → **Step 3:** implement create form (name, emoji/color, mode, location via `expo-location` or address, filters) calling `createSession`; join via code, QR (`expo-camera`), or deep link. → **Step 4: Run, verify passes.** → **Step 5:** `expo-router` linking config + share sheet (code/QR/link). → **Step 6: Commit** — `feat: create + join flows (code/QR/deep link)`.

### Task 12: Swipe deck

**Files:**
- Create: `src/features/swipe/SwipeDeck.tsx`, `src/features/swipe/SwipeCard.tsx`, `src/features/swipe/useDeck.ts`
- Modify: `app/swipe.tsx`
- Test: `src/features/swipe/__tests__/useDeck.test.ts`

**Interfaces:**
- Consumes: `Candidate` (Task 5), `recordSwipe` service (Task 9), `useSession` (Task 11).
- Produces: `useDeck(session)` → `{ current, next, like(), pass(), remaining, empty }`; `SwipeDeck` (Reanimated gestures → `like`/`pass`, buttery spring).

- [ ] **Step 1: Write failing tests** — `useDeck` advances on like/pass, records the swipe, exposes `remaining`; **(Review Focus)** zero candidates → `empty:true` so the screen shows an empty/expand state.
- [ ] **Step 2: Run, verify fails.** → **Step 3:** implement `useDeck` (logic) then `SwipeDeck`/`SwipeCard` with `react-native-reanimated` + `react-native-gesture-handler` (drag, rotate, fling, like/pass overlays). → **Step 4: Run, verify passes.** → **Step 5: Commit** — `feat: animated swipe deck`.

### Task 13: Restaurant card content (photos gallery + reviews)

**Files:**
- Modify: `src/features/swipe/SwipeCard.tsx`
- Create: `src/features/place/PlacePhotos.tsx`, `src/features/place/PlaceReviews.tsx`, `src/features/place/use-place-detail.ts`
- Test: `src/features/place/__tests__/use-place-detail.test.ts`

**Interfaces:**
- Consumes: `placesClient` (Task 10), `units` (Task 2), `Filters.unit`.
- Produces: `usePlaceDetail(placeId)` → `{ photos, reviews, loading }`; card shows name, rating+count, price symbols, distance/walk-time in the chosen unit, primary type, a swipeable **photo gallery**, and review snippets **with attribution**.

- [ ] **Step 1: Write failing test** — `usePlaceDetail` fetches photos+reviews via the client, caps reviews at what Google returns, and carries attribution; distance renders in the active unit system.
- [ ] **Step 2: Run, verify fails.** → **Step 3:** implement gallery + reviews (fetch fresh refs at view time; no persistence). → **Step 4: Run, verify passes.** → **Step 5: Commit** — `feat: place photo gallery + reviews on card`.

### Task 14: Filters + Lobby + food-type→place flow

**Files:**
- Create: `src/features/filters/FilterSheet.tsx`, `src/features/filters/buildPlacesQuery.ts`
- Modify: `app/lobby.tsx`, `app/create.tsx`
- Test: `src/features/filters/__tests__/buildPlacesQuery.test.ts`

**Interfaces:**
- Consumes: `Filters` (Task 5), `walkingMinutes`/`haversineMeters` (Task 2), `FOOD_TYPES` (Task 4), `sessionService.setCandidates/startPlacesRound` (Task 9), `searchPlaces` (Task 10).
- Produces: `buildPlacesQuery(filters): SearchPlacesInput` — converts `maxWalkMin` → `radiusMeters` (walk speed), passes cuisine/price/rating/openNow; `FilterSheet` UI (units toggle, walking-time or radius, cuisine multi-select ≤ relevant, price, rating, open-now).

- [ ] **Step 1: Write failing tests** — `buildPlacesQuery` with `maxWalkMin:12` yields `radiusMeters ≈ 1000`; cuisine/price/rating forwarded; **(Review Focus)** tight filters that would return nothing still produce a valid query (empty handled downstream, deck shows expand state).
- [ ] **Step 2: Run, verify fails.** → **Step 3:** implement query builder + `FilterSheet`; lobby shows live participants (`observeSession`), host "find places" button → `startPlacesRound` after a food-type round. → **Step 4: Run, verify passes.** → **Step 5: Commit** — `feat: filters, lobby, food-type→place flow`.

### Task 15: Map view with reachable range

**Files:**
- Create: `src/features/map/RangeMap.tsx`
- Modify: `app/create.tsx` (or a map modal route)
- Test: `src/features/map/__tests__/rangeMeters.test.ts`

**Interfaces:**
- Consumes: `walkingMinutes`/`haversineMeters` (Task 2), `Filters.anchor`.
- Produces: `rangeMeters(filters): number` (radius or walk-time-derived); `RangeMap` renders `react-native-maps` with anchor marker + a `Circle` of `rangeMeters` and result pins.

- [ ] **Step 1: Write failing test** — `rangeMeters` returns the explicit radius when set, else the walk-time-derived radius; 0/undefined → a sane default.
- [ ] **Step 2: Run, verify fails.** → **Step 3:** implement `rangeMeters` + `RangeMap` overlay. → **Step 4: Run, verify passes.** → **Step 5: Commit** — `feat: map view with reachable range`.

### Task 16: Results, recap, Maps hand-off, solo mode

**Files:**
- Modify: `app/results.tsx`, `app/recap.tsx`, `app/swipe.tsx`
- Create: `src/features/results/useResults.ts`, `src/features/results/mapsLink.ts`
- Test: `src/features/results/__tests__/useResults.test.ts`, `src/features/results/__tests__/mapsLink.test.ts`

**Interfaces:**
- Consumes: `matches`/`leaderboard` (Task 6), `useSession` (Task 11), `usePlaceDetail` (Task 13).
- Produces: `useResults(session)` → `{ matches, leaderboard, soloPicks }`; `mapsDirectionsUrl(place): string`; results screen (live leaderboard + matches, detail, directions); recap (session summary, share); solo mode uses `soloPicks` (every like) with no match gating.

- [ ] **Step 1: Write failing tests** — `useResults` surfaces unanimous matches + ordered leaderboard; **solo session** (1 active) → every like appears in `soloPicks`, `matches` not required; `mapsDirectionsUrl` builds a valid Google Maps `daddr` link.
- [ ] **Step 2: Run, verify fails.** → **Step 3:** implement results/recap screens + solo path + Maps hand-off. → **Step 4: Run, verify passes.** → **Step 5: Commit** — `feat: results, recap, solo mode, maps hand-off`.

### Task 17: App-link verification + store fallback

**Files:**
- Modify: `app.config.ts` (associated domains / intent filters, placeholder domain)
- Create: `docs/deeplinks.md` (what to host at the real domain: AASA + assetlinks.json; store-fallback behavior)

**Interfaces:**
- Consumes: linking config (Task 11).

- [ ] **Step 1: Configure** universal/app links for the placeholder domain + `autoVerify` intent filter; document the AASA/assetlinks files and the "app not installed → store/landing" fallback.
- [ ] **Step 2: Commit** — `chore: app-link verification config + deep-link docs`.

---

## Self-review notes

- **Spec coverage:** group-size/solo (T6,T16), two modes + food→place (T4,T14,T16), join code/QR/link (T3,T11,T17), dark-premium (T1), smooth deck (T12), metric/imperial (T2,T7), walking-time (T2,T14), map range (T15), multi-photo+reviews (T13), realtime lobby (T9,T14), anonymous auth (T8), Places proxy + key safety (T10), ToS photo/review handling (T10,T13), security rules (T9) — all mapped.
- **Review Focus** items each pinned to a task's tests (T6, T9, T10, T11, T12, T14).
- Core decision-dense logic (matching, codes, units, proxy contract, rules) is pinned with exact signatures/assertions; routine screen layout is left to the engineer within the tokens/interfaces given.
