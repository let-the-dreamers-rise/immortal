# Immortality — Dao Longevity · PRD

## Problem Statement
A mobile app for people who want to live longer to explore ancient longevity practices
(Chinese Dao + Ayurveda), follow a structured guided path, log their journey like a journal,
and build a real-world community — framed strictly as historical exploration, not medical advice.

## Architecture
- Frontend: React Native (Expo Router, TS). Fonts: Cormorant Garamond (display) + DM Sans (body).
  Icons: phosphor-react-native. Keyboard: react-native-keyboard-controller. Storage: @/src/utils/storage.
- Backend: FastAPI + MongoDB (motor). Session-token auth in `user_sessions`.
- Integrations: Emergent Google OAuth (unified with email auth), Gemini Nano Banana
  (ink-wash illustrations), Emergent Object Storage (illustration images).

## User Personas
- The everyday seeker: curious about longevity, not a scholar; wants clear "what to do today".
- The consistent practitioner: shows up daily, earns Elder status over time.

## Core Requirements (static)
- Guided Dao Path with honest, non-gamified progression.
- Journaling where "nothing happened" is first-class.
- Contextual one-line safety notes, one-time signup disclaimer, never popup walls.
- Community that feels intimate, not social-media noise.

## Implemented (2026-06)
- Auth: email/password register+login (session token), Emergent Google login, /me, logout, profile edit.
- Onboarding: intention prompt + path choice (Dao/Ayurveda/Both); one-time disclaimer on auth screen.
- Dao Path Year 1: 4 stages as a staggered journey map; start + self-assessment unlock (min check-ins).
- Practice Library: 20 curated practices (12 Dao, 8 Ayurveda); filters by tradition & difficulty;
  historical-context vs modern-understanding labels; contextual safety notes; AI ink-wash illustrations
  (8 generated, rest use gradient placeholders — LLM key budget cap hit; auto-resumes on top-up/restart).
- Journal: free-form reflection + mood + practice/stage link + public/private; "Nothing happened today"
  quick action; timeline with soft-delete; stage check-in increments.
- Stats: current/longest streak, days practiced, milestones (7/30/90/365), Elder badge, stages completed.
- Community: practitioners list, follow/unfollow, public feed, other-user profiles, personal profile banner.
- Testing: 28/28 backend pytest pass; frontend e2e verified.

## Implemented (2026-06, iteration 2)
- Local Meetups: host/join real-world practice circles; opt-in device location for "nearby" distance sorting;
  liability waiver embedded in RSVP flow; host auto-RSVP; host can cancel a circle. (Community → Meetups tab,
  /meetup/new, /meetup/[id]). Backend: /api/meetups CRUD + rsvp.
- Path Comments: replies on shared (public) reflections; log detail screen (/log/[id]) with comment thread;
  comment_count on feed + journal entries; open from community feed and public journal entries.
- Daily Reminders: settings toggle + time presets; local daily notification tuned to the user's path
  (expo-notifications); permission handling with Open-Settings fallback; persisted via /api/profile/reminder.
  (Device-only — no-op on web/Expo Go Android; fires on a real/dev build.)
- Year 2 Path (Nei Gong): 3 new stages (Meridian Activation, Dantian & Microcosmic Orbit, Refined Meditation
  & Integration) + 6 new Year-2 practices; journey map shows a Year 2 separator; stages lock until Year 1 done.
- Testing: 41/41 backend pytest pass (28 regression + 13 new); all new frontend flows verified.

## Backlog / Remaining
- P1: Meetups & discovery (location opt-in, RSVP, liability waiver, Google Maps).
- P1: Push notifications (daily reminders, replies) — requires deployed build + Firebase google-services.json.
- P1: Community feed comments/reactions; moderation queue for user-submitted practices.
- P2: Dao Path Year 2 (Months 13-24); expanded Ayurveda guided path.
- P2: Aggregated practice insights; Chinese-language support.
- Tech: add `authReady` flag to defer gated-screen fetches until session restore (avoids 401 flash on hard reload).

## Notes
- No payments in v1. Human-curated content (no AI recommendations) to maintain trust.
- LLM illustration budget on the shared universal key is capped; top up to generate remaining images.

## Implemented (2026-09, iteration 3 — Dao enrichment from clinical dossier)
- Ba Duan Jin now lists all 8 named brocades; Wu Qin Xi lists the 5 animals with Five-Element/organ pairing.
- Added `evidence_note` (honest, dossier-grounded) to Ba Duan Jin, Wu Qin Xi, Zhan Zhuang, Jinggong; shown as
  a "What the evidence says" section on the practice screen.
- Added a gentle PAR-Q-style "Before you begin" readiness note on Breathwork/Pranayama/Internal practices.
- New Teachings section in Library (Practices | Teachings segment): 8 Daoist concepts (Yangsheng, Three
  Treasures, Neidan, Wu Wei, Dao & De, Xian, Microcosmic Orbit, Zuowang) with detail screens + calligraphy art.
  Backend: GET /api/teachings, /api/teachings/{id}. Content framed as historical exploration, not medical advice.
- Verified: teachings + enriched practice content via curl; Teachings screen + Ba Duan Jin detail via screenshots;
  core flows (auth, path, library) regression-checked; lint clean.

## Still open
- Roll named sub-forms / evidence tiers / safety notes across ALL remaining practices (Yijinjing, Liuzijue six
  sounds, Taixi caution, etc. from dossier §3–5) — partially done.
- Generate remaining ink-wash illustrations — blocked on Universal Key budget cap (user must top up).
