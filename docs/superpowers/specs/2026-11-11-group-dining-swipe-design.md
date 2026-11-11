# Group Dining Swipe App — Design

**Status:** Approved 2026-11-11 (defaults in §7 accepted)
**Date:** 2026-11-11
**Working name:** swipe-eats (placeholder — rename before launch)

> A group "where should we eat?" decider. One person starts a session,
> others join by code / QR / shareable link, everyone swipes, and the app
> surfaces what the group agreed on. Inspired by the mechanics of BiteSwipe
> (which we reverse-engineered), rebuilt to feel smoother, look better, and
> decide smarter. This is an original app, not a reskin of BiteSwipe — no
> BiteSwipe branding, assets, copy, or backend.

---

## 1. Intent & why

Deciding where a group eats is a recurring, low-stakes, high-friction
problem. Existing apps (BiteSwipe and similar) get the core swipe loop
roughly right but feel unpolished: janky animations, US-only units, crude
distance filters, one photo per place, and feature bloat (badges,
mini-games, ads) layered over a loop that itself isn't tight.

The goal is a **fast, beautiful, frictionless** version that nails the core
loop and adds the discovery features that actually change the decision:
decide by **food type or specific place**, filter by **real walking time**,
and **see enough** (multiple photos, reviews) to judge a spot before
swiping.

**Success looks like:** a group of any size can go from "let's use the app"
to a decision in a minute or two, it feels delightful to use, and nobody
has to fight the filters or squint at a single thumbnail.

## 2. Goals

- **Tight core loop:** create/join session → swipe → see the agreed result.
- **Two decision modes** in one session flow:
  - **Food type** — swipe on cuisines/dishes (pizza, burger, kebab, sushi…)
    to settle "what are we feeling?"
  - **Place** — swipe on specific nearby restaurants.
  - A session can use either, or food-type first → then places of the
    winning type(s).
- **Any group size** (2 to large groups), plus a solo mode.
- **Seamless join:** code, QR, **and** a shareable deep link that opens the
  app straight into the session (the link is the headline new ability).
- **Smooth & animated:** physical, 60fps swipe deck; polished transitions
  and micro-interactions throughout. Performance is a feature.
- **Better discovery/filtering:**
  - **Metric and imperial** units, user-toggleable.
  - **Max walking time** from current location (e.g. "≤ 12 min walk"),
    alongside a plain distance radius.
  - **Map view** showing the user's location and reachable range drawn
    visibly (radius and/or walking-time area).
  - **Multiple photos per place** (gallery), and **reviews** shown on the
    card / detail.
  - Cuisine, price (metric-aware), minimum rating, open-now.
- **Dark & premium look** (direction "A" from brainstorming): near-black
  surfaces, glassy pills, warm amber accent, photography that glows.
- **Realtime group state:** live lobby, live progress, live match reveal.
- **Works together or apart:** same behavior whether co-located or remote
  (requires internet; see constraints). In **Place** mode the restaurant
  deck is anchored on the **host's** location — distance and walking time
  are shown relative to the host — so a remote member swipes the same
  spots. **Food-type** mode is location-light and fully remote-friendly.
  *(My call, from "mostly together, accommodate all cases".)*

## 3. Non-goals (v1)

- **No accounts / social graph.** Anonymous identity only; no login,
  profiles, friends lists, or history sync across devices.
- **No gamification bloat:** no achievements, badges, streaks, or
  mini-games (the original's "Bite Breaks"/achievements). May revisit later.
- **No ads** in v1.
- **No OS push notifications** in v1 — session updates are in-app realtime
  (Firestore listeners) while the app is open. Push (join/match alerts when
  backgrounded) is a later add. *(My call.)*
- **No true offline / no-internet mode** (no Bluetooth/local-network P2P).
  See §5.
- **No ordering, reservations, or payments.** We hand off to the place's
  Maps listing / website.
- **No web build** as a shipped target in v1 (mobile-first; a web version
  is a possible later add).

## 4. Anti-goals (what makes this a failure even if it "works")

- Feels sluggish, janky, or laggy during swiping. Smoothness is the point;
  a technically-correct but stuttery deck is a failure.
- Filters that are confusing or US-centric (imperial-only, radius-only).
- Cards too sparse to decide from (one photo, no review signal).
- Join flow with friction (manual code entry when a tap-to-join link
  existed; a link that opens a website instead of the app).
- Feature creep that dilutes the core loop.

## 5. Constraints & key technical decisions

**Decided (builder should follow unless a blocker appears):**

- **Platform:** Expo / React Native (managed workflow), one codebase for
  iOS + Android. Chosen for animation quality, cross-platform reach, and
  mature deep-link/QR tooling. *(My call.)*
- **Animation:** react-native-reanimated + react-native-gesture-handler for
  the swipe deck and transitions; target 60fps on mid-range devices. *(My
  call.)*
- **Backend:** Firebase — **Firestore** (realtime session state) +
  **Anonymous Auth** (identity without accounts). A managed backend means
  nothing to run or maintain and a free tier that covers this scale. Proven
  for exactly this use case. *(My call; Supabase is an equally valid
  alternative if preferred.)*
- **"Serverless" reality:** realtime multi-device sessions require a shared
  backend both phones can reach. Firebase *is* that, with no server we
  operate. True no-cloud P2P (same-room Bluetooth/WiFi) is explicitly out
  of scope for v1 — it's finicky on phones and not needed given sessions
  must also work when members are apart. The managed backend covers the
  "mostly together, but accommodate all cases" requirement; the only cost
  is that it needs internet even in-room.
- **Place data:** Google Places API (v1) — search by location + type,
  returning name, location, rating, review count, price level, **photos
  (multiple)**, **reviews**, hours, address, website. Food-type list is a
  curated built-in catalog mapped to Places `includedTypes`.
- **Places access goes through a Firebase Cloud Function proxy.** Cloud
  Functions are serverless (nothing to run or patch — still "no server"),
  so this doesn't reintroduce ops. The proxy means the Places key **never
  ships in the app** (closing the extractable-key flaw we found in the
  original), and it's the one place for caching, rate-limiting, Google's
  required attribution, and billing control. *(My call — resolves the
  reviewer's "no server vs. not abusable" contradiction.)*
- **Walking time:** computed from distance using a walking-speed
  approximation for v1 (fast, free, no extra API), presented as "~N min
  walk". *Optional upgrade* to true routed walking time via Google Routes
  API is left to the builder to add behind the same UI if accuracy
  demands it (has per-call cost). *(Approximation is the v1 default — my
  call.)*
- **Map:** a map view with the user's location and reachable range drawn as
  an overlay. Map SDK choice (e.g. react-native-maps with the platform
  provider) left to the builder.
- **Deep links:** app must register a URL scheme **and** a verified
  universal/app link so a shared link opens the app directly into the
  session, with graceful fallback (store/landing) when the app isn't
  installed. **Dependency:** this needs a small web domain to host the
  Apple App Site Association / Android assetlinks files. Acquiring/choosing
  the domain is an open item (§7).
- **Units:** metric and imperial throughout (distance, walking time
  presentation), user-toggleable; sensible default from device locale.
- **Visual direction:** dark & premium ("A").

**Hard constraints:**

- Requires internet connectivity for sessions.
- The Google Places key lives only in the Cloud Function proxy (§5), never
  in the client build, and is additionally API-restricted — so it can't be
  lifted and abused, the flaw we noted in the original.
- **Google Places terms:** Places content isn't persisted in our backend.
  Sessions store place **IDs** plus minimal display fields; clients fetch
  photos via fresh photo references at view time and show the (~5) reviews
  Google returns, with required attribution. The shared deck is a shared
  list of place IDs, not a stored copy of Google's content. This bounds the
  gallery/reviews to what Google permits — enough to "see enough to decide".
- Firestore **security rules** must enforce session integrity
  (participants can only write their own swipes; only the host can
  end/cancel; session readable only to participants). Unlike the original,
  this is treated as a first-class requirement, not an afterthought.

## 6. Shape of the app (for planning, not final UX)

**Screens (indicative):**

- **Home / landing** — start a session or join; recent session; unit
  toggle in settings.
- **Create session** — your name + identity color/emoji; choose decision
  mode (food type / places / both); location (GPS or address); filters
  (walking-time or radius, cuisine, price, rating, open-now, units).
- **Join** — code, QR scan, or arrive via link; name + identity.
- **Lobby** — live participant list, ready state, host controls, share
  (code/QR/link); in-app alert opt-in (OS push deferred past v1).
- **Swipe deck** — the hero screen; animated cards with photo gallery,
  name, rating, review snippet, distance/walk time, price; like/pass;
  live group progress.
- **Map view** — toggle from swipe/filters; location + reachable range.
- **Results** — the agreed picks; place detail with full photos/reviews;
  directions hand-off to Maps.
- **Session end / recap** — summary of the decision.

**Core data model (indicative):** `sessions/{id}` with host, status
(`waiting`→`active`→`finished`/`cancelled`), decision mode, filters,
participants, candidate list (food types and/or places), and per-user
swipes; match = a candidate every active participant liked (unanimous by
default — threshold behavior is an open item, §7).

**Membership over time:** people may join after swiping starts and inherit
the in-progress deck; a member who leaves is dropped from the unanimity
denominator; matching is evaluated continuously over currently-active
participants. *(My call.)* **Solo mode** is a personal browse/shortlist —
any like saves to your picks, there's no "match" concept, and it reuses the
deck UI. *(My call.)*

## 7. Resolved decisions (accepted 2026-11-11)

All four were accepted with the defaults below.

1. **Match rule for larger groups.** A live **leaderboard of most-liked**
   candidates is always shown; a candidate liked by every active
   participant is called a **match**, so there's always a result even when
   nothing is unanimous.
2. **Food-type → place flow.** Food-type round first; the **host taps
   "find places"** to start the restaurant round for the winning type(s)
   (no auto-jump).
3. **Deep-link domain.** Build against a **placeholder domain**; wire the
   real app-link domain in later. (App-link verification files can't be
   finalized until the real domain exists — tracked as a late step.)
4. **Places cost / scale.** **Personal / small-group scale** — low volume,
   a modest monthly budget cap, conservative caching.

## 8. Left to the builder

- Exact screen layouts, component breakdown, and navigation (Expo Router).
- Map SDK selection and range-overlay rendering.
- Whether to add routed walking-time (Routes API) or keep the
  approximation.
- State management, data-fetch/caching strategy, Places result paging.
- Firestore schema details and security-rule implementation.
- Testing approach and CI.
- Asset/design-system specifics within the dark & premium direction.
