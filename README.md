# TimeTracker

A small team time-tracking app: sign in with Google, track time you spend on
projects, and see a leaderboard of who has logged the most time.

- **Backend**: Node.js, Express, TypeScript, Prisma, PostgreSQL, Passport.js (Google OAuth 2.0)
- **Frontend**: React, Vite, TypeScript, Tailwind CSS
- **Everything runs in Docker** via `docker-compose`

## Features

- Sign in with your Google account (no passwords to manage)
- Create projects, start/stop a timer, or log time manually
- Invite teammates to a project by their Gmail address — if they haven't signed in yet, the
  invite is held and applied automatically the first time they log in with that email
- Leaderboard scoped to one project at a time, ranked by total tracked time — today, this
  week, this month, or all time — showing only that project's members

## 1. Create Google OAuth credentials

1. Go to the [Google Cloud Console credentials page](https://console.cloud.google.com/apis/credentials).
2. Create a project (or pick an existing one).
3. Click **Create credentials → OAuth client ID**, choose **Web application**.
4. Under **Authorized redirect URIs**, add:
   ```
   http://localhost:4000/api/auth/google/callback
   ```
5. Copy the generated **Client ID** and **Client secret**.

## 2. Configure environment variables

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and fill in:

- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — from step 1
- `JWT_SECRET` — any long random string, e.g. generate one with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```

The other defaults work out of the box for local Docker use.

## 3. Run with Docker

```bash
docker compose up --build
```

This starts three containers:

| Service  | URL                      |
|----------|--------------------------|
| frontend | http://localhost:3000    |
| backend  | http://localhost:4000    |
| db       | localhost:5432 (Postgres)|

The backend automatically applies Prisma migrations on startup.

Open **http://localhost:3000** and sign in with Google.

## Running without Docker (local dev)

```bash
# backend
cd backend
npm install
cp .env.example .env   # fill in the values as above, but DATABASE_URL should
                        # point at a Postgres instance reachable from your host,
                        # e.g. postgresql://timetracker:timetracker@localhost:5432/timetracker
npx prisma migrate dev
npm run dev

# frontend (in a second terminal)
cd frontend
npm install
npm run dev
```

## Project structure

```
backend/   Express API + Prisma schema (users, projects, time entries)
frontend/  React app (login, dashboard/timer, leaderboard)
docker-compose.yml   Runs db + backend + frontend together
```

## API overview

| Method | Path                        | Description                      |
|--------|------------------------------|-----------------------------------|
| GET    | /api/auth/google             | Start Google OAuth login          |
| GET    | /api/auth/me                 | Current user                      |
| POST   | /api/auth/logout             | Clear session                     |
| GET    | /api/projects                | Projects you're a member of       |
| POST   | /api/projects                | Create a project (you become owner)|
| DELETE | /api/projects/:id            | Delete a project (owner only)     |
| GET    | /api/projects/:id/members    | List members + pending invites    |
| POST   | /api/projects/:id/invite     | Invite a teammate by Gmail/email  |
| DELETE | /api/projects/:id/members/:userId | Remove a member, or leave    |
| GET    | /api/time-entries            | Recent time entries                |
| GET    | /api/time-entries/active     | Currently running timer, if any   |
| POST   | /api/time-entries/start      | Start a timer                     |
| POST   | /api/time-entries/stop       | Stop the running timer            |
| POST   | /api/time-entries            | Log a manual entry                |
| DELETE | /api/time-entries/:id        | Delete an entry                   |
| GET    | /api/leaderboard?projectId=&period= | Ranked totals for one project's members (`today`/`week`/`month`/`all`) |
