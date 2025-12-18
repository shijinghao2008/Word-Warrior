# Word Warrior Backend

This folder hosts a lightweight Express backend that aligns with the Word Warrior PRD. It exposes PVE, PVP and admin endpoints, and wraps Gemini Flash for text grading tasks. The service can run without Supabase (in-memory profiles) or persist to Supabase when `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are provided.

## Running locally

```bash
npm install
npm run server:dev
```

Environment variables:

- `PORT` (optional): server port, defaults to `8788`.
- `GEMINI_API_KEY` (or `API_KEY`): Gemini HTTP key for grading and quiz generation.
- `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` (optional): enable persistence for user profiles.

## API surface

- `GET /api/health` — Health check.
- `GET /api/users/:id` — Fetch profile with computed Combat Power.
- `POST /api/pve/vocab` — Apply vocab mastery rewards (EXP + ATK).
- `POST /api/pve/writing` — Grade writing via Gemini and award HP/EXP.
- `POST /api/pve/reading` — Resolve reading/grammar answers and return explanations.
- `GET /api/pve/quiz/:category` — Generate practice questions with Gemini Flash.
- `POST /api/pvp/result` — Apply rank/EXP changes based on battle outcome, including upset logic and streak bonuses.
- `GET /api/admin/users` — List players (works with in-memory or Supabase).
- `POST /api/admin/users/:id/ban` — Toggle ban flag.
- `POST /api/admin/users/:id/god-mode` — Demo “God Mode” stat overrides.
- `POST /api/admin/seed` — Seed demo users for UI testing.
