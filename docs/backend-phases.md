# Backend Build Plan

FastAPI + Supabase backend. Intentionally thin — simulation, chaos, and all real-time
computation stay in the frontend Web Worker. The backend does three things: verify identity,
persist diagrams, and serve presets.

Reference: `backend/SimuFlow_Backend.pdf` for full design doc (DB schema, Pydantic models, RLS policies, API routes).

---

## What the backend builds (feature view)

| Feature | Description |
|---|---|
| **Identity** | Supabase handles sign in / sign up / OAuth. Backend verifies the JWT on every request — nothing more. |
| **Save / Load** | Diagrams persist to Postgres as `TopologySchema` JSON. Users can save, rename, and load from any device. |
| **Share links** | Any diagram can generate a public read-only URL (no auth to view). Share token stored on the diagram row. |
| **Fork** | Authenticated user copies a public shared diagram into their own account. Requires being signed in. |
| **Presets** | 7 curated architecture blueprints served from DB. Cached in memory at startup — no DB hit per request. |

**What the backend does NOT do:**
- Run simulations
- Store metric history or simulation frames (ephemeral browser state only)
- WebSocket / real-time connections
- Chaos logic

---

## Phase 1 — Foundation
*Milestones: M1 scaffold + M2 auth + M3 migrations (~5 days)*

### M1 — Scaffold
- FastAPI app instance with CORS, lifespan hooks
- `/health` endpoint returning `{ status: ok, version }`
- `app/core/config.py` loading env vars via pydantic-settings
- `.env.example` with all required variables
- `uvicorn` entry point

### M2 — Auth
- Supabase client factory (`app/db/`)
- `get_current_user` FastAPI dependency — calls `supabase.auth.get_user(token)`, returns `AuthUser`
- `AuthUser` model with `user_id`
- Invalid/expired token → 401
- Auth tests

### M3 — Migrations
Run via Supabase CLI (`supabase db push`).

| Migration | Contents |
|---|---|
| `001_create_diagrams.sql` | `diagrams` table + RLS policies + `updated_at` trigger |
| `002_create_presets.sql` | `presets` table + seed data for all 7 blueprint presets |
| `003_add_share_fields.sql` | `is_public`, `share_token`, `fork_count` columns on `diagrams` |

RLS policies (enforced at Postgres layer, not in app code):
- `diagrams SELECT`: `user_id = auth.uid() OR is_public = true`
- `diagrams INSERT/UPDATE/DELETE`: `user_id = auth.uid()`
- `presets SELECT`: authenticated users only, read-only
- `presets INSERT/UPDATE/DELETE`: service role only

**Deliverable:** Running FastAPI server, auth working, DB schema live.

---

## Phase 2 — Diagrams API
*Milestone: M4 (~3 days)*

Full CRUD for user diagrams. The `topology` column stores `TopologySchema` JSON — validated
by Pydantic on every write before touching the DB.

### Routes
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/diagrams` | List user's diagrams — paginated, ordered by `updated_at` desc |
| `POST` | `/api/v1/diagrams` | Create new diagram |
| `GET` | `/api/v1/diagrams/{id}` | Get diagram by ID |
| `PUT` | `/api/v1/diagrams/{id}` | Partial update — name and/or topology |
| `DELETE` | `/api/v1/diagrams/{id}` | Delete diagram |

### Pydantic models
All models inherit `SimuFlowBase` with `alias_generator=to_camel` so API outputs camelCase
matching `topology.ts` exactly. Key models:
- `TopologySchema` — mirrors `TopologySchema` in `topology.ts`
- `NodeDef` — discriminated union on `nodeType` field
- `DiagramResponse` — what the API returns
- `DiagramListResponse` — paginated summary list
- `CreateDiagramRequest` / `UpdateDiagramRequest`

### DiagramService methods
`create`, `get`, `list`, `update`, `delete` — RLS enforces ownership, service layer never
filters by `user_id` manually.

### Tests
- CRUD routes, pagination, 404 behaviour, ownership (can't access other user's private diagram)

**Deliverable:** Full save/load API. Frontend can persist and retrieve diagrams.

---

## Phase 3 — Share & Fork
*Milestone: M5 (~2 days)*

### Share
- `POST /api/v1/diagrams/{id}/share` — generates `secrets.token_urlsafe(16)` token, sets `is_public=true`
- `DELETE /api/v1/diagrams/{id}/share` — clears token, sets `is_public=false`
- `GET /api/v1/shared/{token}` — public endpoint, no auth required, returns read-only diagram

### Fork
- `POST /api/v1/shared/{token}/fork` — requires auth
- Reads the public diagram by token, creates a copy in the authenticated user's account
- Returns `{ diagram_id, name }` so the frontend can redirect to the new diagram

**Auth + fork relationship:** Viewing a share link requires no auth. Forking prompts sign-in if not authenticated — once signed in, fork completes and the copy appears in the user's diagram list.

### Tests
- Share generation, revocation, public access without auth
- Fork: topology copy correctness, fork_count increment, unauthenticated fork → 401

**Deliverable:** Anyone can open a share link. Logged-in users can fork public diagrams.

---

## Phase 4 — Presets API
*Milestone: M6 (~1 day)*

Serves the curated architecture blueprints stored in the `presets` table.

### Why a DB, not local JSON?
- Presets can be toggled active/inactive without a redeploy
- `sort_order` controls display order without touching code
- Seed data lives in migration `002_create_presets.sql` — version controlled

### Routes
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/presets` | All active presets ordered by `sort_order` |
| `GET` | `/api/v1/presets/{slug}` | Single preset — 404 if not found or inactive |

### PresetService
- Results loaded into memory at app startup (lifespan event) — zero DB calls per request
- `list_presets()` returns cached list
- `get_by_slug(slug)` looks up from cache — raises 404 if missing

### Preset slugs (seed data)
| Slug | Name |
|---|---|
| `web_app` | Simple Web App |
| `cached_web_app` | Cached Web App |
| `url_shortener` | URL Shortener at Scale |
| `social_feed` | Social Media Feed |
| `video_streaming` | Video Streaming Platform |
| `ride_sharing` | Real-Time Ride Sharing |
| `ai_agent` | AI Agent Orchestration |

(`microservices` and `queue_system` ship as frontend-bundled templates and are not DB-seeded.)

### PresetBlueprint model
```
slug, name, description, category, topology: TopologySchema, sort_order
```

**Deliverable:** Frontend preset picker hits the API instead of bundled static JSON.

---

## Phase 5 — Deploy
*Milestone: M7 (~1 day)*

- `Dockerfile` — `python:3.12-slim` base, production container
- Railway or Render setup (both support Docker deploy from repo)
- All env vars configured in hosting dashboard
- Supabase migrations applied to production DB via `supabase db push`
- Health check wired to hosting platform's uptime monitor
- Staging smoke test: hit `/health`, auth a request, save + retrieve a diagram

**Deliverable:** Backend live at a public URL. Frontend can point to it.

---

## Phase 6 — Frontend wiring
*Not in the backend PDF — bridges the API to the existing React app*

- **Auth UI** — sign in / sign up / sign out flow wired to Supabase Auth
- **Save/Load** — toolbar Save button calls `POST /diagrams`, Load opens diagram list modal
- **Auto-save** — optional: debounced `PUT /diagrams/{id}` on topology change
- **Share** — generate link button in toolbar, copies URL to clipboard
- **Fork** — "Fork this diagram" button on shared diagram view
- **Preset picker** — hits `GET /api/v1/presets` instead of bundled JSON

---

## Build order

```
Phase 1 (Foundation) → Phase 2 (Diagrams) → Phase 3 (Share/Fork) → Phase 4 (Presets)
                                                     ↓
                                              Phase 5 (Deploy)
                                                     ↓
                                              Phase 6 (Frontend wiring)
```

Phases 3 and 4 can run in parallel once Phase 2 is done.
Phase 6 can start partially during Phase 5 (auth UI doesn't need the deployed API).
