Markdown

# IYKYK Charity Fantasy Football League

A full-stack application (Django + React) built to manage the IYKYK multi-league fantasy football association. Its primary goal is to showcase teams and leagues, provide a clear overview of the custom "BIG Playoff," and automate admin tasks like payout notifications.

---

## Tech Stack

* **Frontend:** React (with `create-react-app`, `axios`, and `react-router-dom`)
* **Backend:** Python, Django, Django Rest Framework
* **Database:** SQLite3 (for development)

---

## Getting Started & Installation

How to get a new copy of this project running from scratch.

### 1. Backend Setup

1.  Navigate into the backend folder: `cd backend`
2.  Create a Python virtual environment: `python -m venv venv`
3.  Activate the environment (Windows): `venv\Scripts\activate`
4.  Install all required packages: `pip install -r requirements.txt`
5.  Create the database: `python manage.py migrate`
6.  Create your admin account: `python manage.py createsuperuser`

**Note:** If you add new Python packages (like `requests`), remember to update your requirements file:
`pip freeze > requirements.txt`

### 2. Frontend Setup

1.  Navigate into the frontend folder: `cd frontend`
2.  Install all required packages: `npm install`

---

## How to Run the Application

You must have **two** separate terminals running.

### Terminal 1: Backend (Django)

```bash
# Navigate to the backend folder
cd backend

# Activate your environment
venv\Scripts\activate

# Start the Django server
python manage.py runserver
Your backend will be running at http://localhost:8000.

Terminal 2: Frontend (React)
Bash

# Navigate to the frontend folder
cd frontend

# Start the React server
npm start
Your frontend will be running at http://localhost:3000.

## Offline Frontend (No Backend)

To run the frontend without Django, using only local JSON data:

1. **Create the snapshot** (while online, once per season):
   ```bash
   cd backend
   python download_sleeper.py
   ```

2. **Make the snapshot available to the frontend**:
   ```bash
   # Symlink (recommended; no copy)
   ln -sf ../../backend/sleeper_snapshot_2025.json frontend/public/sleeper_snapshot_2025.json
   # Or copy:
   cp backend/sleeper_snapshot_2025.json frontend/public/
   ```

3. **Start the frontend only**:
   ```bash
   cd frontend
   npm start
   ```

The frontend uses `localApi.js`, which reads `sleeper_snapshot_2025.json` and returns the same shapes as the Django API. Admin commands (sync, post winners, etc.) will fail in offline mode; they require the backend.

---

## Offline / Local Data Workflow (Backend)

To work with a full season of data without hitting the live Sleeper API:

**Step 1:** Run the download script while online (once per season or when you need fresh data):

```bash
cd backend
python download_sleeper.py
# Uses league_ids.json for league IDs. Pass --league-ids ID1,ID2 to override.
# Saves to sleeper_snapshot_2025.json (use --output to change).
# Use --skip-stats to skip per-player stats (faster, fewer API calls).
```

**Step 2:** Run sync from the local snapshot (no network needed):

```bash
python manage.py sync_sleeper --from-local
# Reads from sleeper_snapshot_2025.json (use --snapshot path to override).
```

The frontend talks to the Django API. Run both backend and frontend as usual.

---

## Admin Workflow & Management Commands

This is the "engine" of the app. All custom logic is handled by management commands run from the backend folder.

### 1. sync_sleeper (Run Daily, or --from-local for offline)

This is the main "engine." It syncs data from the Sleeper API (or from a local JSON snapshot) into the database.

```bash
# Live API (requires network)
python manage.py sync_sleeper

# Offline mode (reads from sleeper_snapshot_2025.json)
python manage.py sync_sleeper --from-local
What it does:

Fetches the current NFL week from Sleeper (or from snapshot when using --from-local).

Syncs all Users and MemberProfiles.

Syncs all Teams, including their W-L-T record and points_for.

Syncs all WeeklyScores from Week 1 through the current week.

"Playoff Latch" Logic:

Before Week 15: It skips the playoff bracket sync.

During Week 15: It runs once to find the final playoff teams and checks the made_league_playoffs box.

After Week 15: It "latches" and stops syncing the bracket (to preserve our original playoff pool) as long as UltimatePlayoffEntry records exist.

### 2. post_weekly_winners (Run Weekly, after sync)
This command finds the high scorer for each league and posts a consolidated message to the admin Discord channel.

Bash

# Run this at the END of each regular season week
python manage.py post_weekly_winners --week=10
What it does:

Finds the highest WeeklyScore for each League for the given week.

Gathers the winner's name, team name, score, and Venmo info.

Posts one single, clean message to the Discord webhook defined in settings.py.

### 3. start_big_playoff (Run ONCE)
This is the "starting gun" for the BIG Playoff.

Bash

# Run this ONCE at the end of Week 14 / start of Week 15
python manage.py start_big_playoff
What it does:

Finds all teams where made_league_playoffs is True.

Creates their first UltimatePlayoffEntry record for Week 15.

This "flips the latch" and tells sync_sleeper to stop syncing the brackets.

### 4. run_playoff_elimination (Run Weekly - Playoffs)
This script runs your custom, points-based elimination logic.

Bash

# Run this at the END of each playoff week (e.g., Week 15, 16, 17)
python manage.py run_playoff_elimination --week=15
What it does:

Finds all active UltimatePlayoffEntry teams for that week.

Gets their scores from the WeeklyScore table.

Sorts them by score and marks the bottom half as is_eliminated = True.

Creates new, blank entries for the "winners" for the next week.