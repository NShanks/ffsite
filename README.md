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

Admin Workflow & Management Commands
This is the "engine" of the app. All custom logic is handled by management commands run from the backend folder.

1. sync_sleeper (Run Daily)
This is the main "engine." It syncs all data from the Sleeper API into our local database.

Bash

# Must be in the /backend folder with venv active
python manage.py sync_sleeper
What it does:

Fetches the current NFL week from the Sleeper API.

Syncs all Users and MemberProfiles.

Syncs all Teams, including their W-L-T record and points_for.

Syncs all WeeklyScores from Week 1 through the current week.

"Playoff Latch" Logic:

Before Week 15: It skips the playoff bracket sync.

During Week 15: It runs once to find the final playoff teams and checks the made_league_playoffs box.

After Week 15: It "latches" and stops syncing the bracket (to preserve our original playoff pool) as long as UltimatePlayoffEntry records exist.

2. post_weekly_winners (Run Weekly, after sync)
This command finds the high scorer for each league and posts a consolidated message to the admin Discord channel.

Bash

# Run this at the END of each regular season week
python manage.py post_weekly_winners --week=10
What it does:

Finds the highest WeeklyScore for each League for the given week.

Gathers the winner's name, team name, score, and Venmo info.

Posts one single, clean message to the Discord webhook defined in settings.py.

3. start_big_playoff (Run ONCE)
This is the "starting gun" for the BIG Playoff.

Bash

# Run this ONCE at the end of Week 14 / start of Week 15
python manage.py start_big_playoff
What it does:

Finds all teams where made_league_playoffs is True.

Creates their first UltimatePlayoffEntry record for Week 15.

This "flips the latch" and tells sync_sleeper to stop syncing the brackets.

4. run_playoff_elimination (Run Weekly - Playoffs)
This script runs your custom, points-based elimination logic.

Bash

# Run this at the END of each playoff week (e.g., Week 15, 16, 17)
python manage.py run_playoff_elimination --week=15
What it does:

Finds all active UltimatePlayoffEntry teams for that week.

Gets their scores from the WeeklyScore table.

Sorts them by score and marks the bottom half as is_eliminated = True.

Creates new, blank entries for the "winners" for the next week.