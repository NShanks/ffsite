"# IYKYK Site" 
# ffsite
I need a better way for users to visualize what's going on in the IYKYK charity football league. I want to create an application that can showcase teams and leagues while giving a better overview of the entire operation for the players. Especially during the playoffs.


# FFL Site (Fantasy Football League-of-Leagues)

> A full-stack application (Django + React) to manage a multi-league fantasy football association, track custom playoffs, and handle payouts.

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
3.  Activate the environment: `venv\Scripts\activate`
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





Admin Workflow & Project Notes
This is the "engine" of the app. All custom logic is handled by management commands.

1. sync_sleeper (Run Daily)
This is the main "engine." It syncs all data from the Sleeper API into our local database.

Bash

# Must be in the /backend folder with venv active
python manage.py sync_sleeper
What it does:

Fetches the current NFL week.

Syncs all Users and MemberProfiles.

Syncs all Teams, including their W-L-T record and points_for.

Syncs all WeeklyScores from Week 1 through the current week.

"Playoff Latch":

Before Week 15: It skips the playoff sync.

During Week 15: It runs once to find the final playoff teams and checks the made_league_playoffs box.

After Week 15: It "latches" and stops syncing the bracket to preserve our original playoff pool.

2. start_big_playoff (Run ONCE)
This is the "starting gun" for the BIG Playoff.

Bash

# Run this ONCE at the end of Week 14 / start of Week 15
python manage.py start_big_playoff
What it does:

Finds all teams where made_league_playoffs is True.

Creates their first UltimatePlayoffEntry record for Week 15.

This "flips the latch" and tells sync_sleeper to stop syncing the brackets.

3. run_playoff_elimination (Run Weekly)
This is the script that runs your custom playoff logic.

Bash

# Run this at the END of each playoff week (e.g., Week 15, 16, 17)
python manage.py run_playoff_elimination --week=15
What it does:

Finds all active playoff teams for that week.

Gets their scores from the WeeklyScore table.

Sorts them by score and marks the bottom half as is_eliminated = True.

Creates new, blank entries for the "winners" for the next week.