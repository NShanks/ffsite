# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IYKYK Fantasy Football Site — a full-stack Django + React app that syncs data from the [Sleeper API](https://docs.sleeper.com/) to display league standings, weekly scores, and a custom points-based playoff bracket ("BIG Playoff"). Supports both live API mode and fully offline mode using a local JSON snapshot.

## Commands

### Backend
```bash
cd backend
source venv/bin/activate
python manage.py runserver          # http://localhost:8000
python manage.py migrate
python manage.py sync_sleeper       # Sync from live Sleeper API
python manage.py sync_sleeper --from-local  # Sync from local snapshot
python manage.py post_weekly_winners --week=X
python manage.py start_big_playoff
python manage.py run_playoff_elimination --week=X
```

### Frontend
```bash
cd frontend
npm start    # http://localhost:3000
npm run build
npm test
```

### Offline / Snapshot Workflow
```bash
# Capture live data once (requires network)
cd backend && python download_sleeper.py
# Creates backend/sleeper_snapshot_2025.json

# Link snapshot so frontend can serve it statically
ln -sf ../../backend/sleeper_snapshot_2025.json frontend/public/sleeper_snapshot_2025.json

# Then sync the DB from the snapshot
python manage.py sync_sleeper --from-local
```

## Architecture

### Data Flow
```
Sleeper API ──► download_sleeper.py ──► sleeper_snapshot_2025.json
                                               │
                        ┌──────────────────────┤
                        ▼                      ▼
              sync_sleeper (live)     sync_sleeper --from-local
                        └──────────────────────┤
                                               ▼
                                      Django SQLite DB
                                               │
                                               ▼
                               Django REST API (localhost:8000)
                                               │
                                    ┌──────────┴──────────┐
                                    ▼                     ▼
                             React Frontend         localApi.js
                          (axiosApi.js)          (reads snapshot
                                                  directly, no DB)
```

The frontend dynamically chooses between `axiosApi.js` (Django backend) and `localApi.js` (reads the static snapshot JSON) depending on which mode is active. Both modules expose the same function signatures.

### Backend Key Files
- `api/models.py` — `MemberProfile`, `League`, `Team`, `WeeklyScore`, `UltimatePlayoffEntry`, `Payout`, `CommonPlayer`
- `api/views.py` — Public endpoints + `IsAdminUser`-protected command endpoints that shell out to management commands via `call_command()`
- `api/management/commands/sync_sleeper.py` — Core sync engine; handles NFL state detection, upserts all teams/scores, and implements the **playoff latch** (at Week 15, `start_big_playoff` is called automatically and bracket sync is frozen)
- `backend/league_ids.json` — List of Sleeper league IDs to sync; `league_ids.example.json` is the template

### Frontend Key Files
- `src/App.js` — React Router setup; theme state persisted to `localStorage`
- `src/api/axiosApi.js` — All calls point to `http://localhost:8000/api`
- `src/api/localApi.js` — Offline implementation; returns the same shapes as the Django API but reads from the static snapshot; rejects admin calls
- `src/pages/AdminDashboard.js` — Admin command center (run sync, toggle dues/playoff flags, trigger Discord posts); currently **unprotected** (no auth guard on the route)

### BIG Playoff Logic
`UltimatePlayoffEntry` tracks each participant's weekly score. `run_playoff_elimination` eliminates the bottom half of remaining entries each week and creates new entries for the next week. The bracket is "latched" after Week 15 — `sync_sleeper` won't overwrite it once `start_big_playoff` has run.

### Auth
JWT via `rest_framework_simplejwt`. `LoginPage.js` and `ProtectedRoute.js` exist but the login route is commented out in `App.js`. Admin endpoints check `IsAdminUser` on the backend; the frontend admin dashboard has no route guard.

### Settings Notes
- `backend/ffsite/settings.py` contains the Discord webhook URL and `SECRET_KEY` in plaintext — this is intentional for a private/local deployment but worth noting when touching settings
- CORS is open to `http://localhost:3000` only
