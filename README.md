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
- Personal API key for scripting: start/stop a timer or nudge your own tracked time up/down
  from curl, a shortcut, or a physical button — no browser needed

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

### Running on another machine (e.g. a Raspberry Pi on your LAN)

If you're accessing the app from other devices, `localhost` won't resolve to the host
machine. Set `FRONTEND_URL` and `GOOGLE_CALLBACK_URL` in `backend/.env` to the host's LAN
IP or hostname, add the matching redirect URI in Google Cloud Console, and pass the same
address as `VITE_API_URL` when building the frontend:

```bash
VITE_API_URL=http://<host-ip-or-hostname>:4000 docker compose up --build
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

## Testing

Both projects use [Vitest](https://vitest.dev).

```bash
# backend — integration tests hit a real Postgres, so the db container
# must be running first
docker compose up -d db
cd backend && npm test

# frontend — unit tests, no services needed
cd frontend && npm test
```

**In VS Code:** install the recommended **Vitest** extension (VS Code will prompt you, or
install `vitest.explorer` manually) and both suites show up in the Testing sidebar with
per-test run/debug buttons — no extra config needed once `npm install` has been run in
each folder.

Backend tests create their own throw-away users/projects (random emails, never real data)
and delete them afterward, so they're safe to run against your local dev database.
`tests/security.test.ts` specifically covers cross-user access control — one project
member can never read, adjust, or delete another member's time, with or without a valid
key for their own account.

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
| POST   | /api/auth/api-key             | Generate (or regenerate) your personal API key |
| DELETE | /api/auth/api-key             | Revoke your API key               |
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
| POST   | /api/time-entries/adjust     | Add/remove time without a timer (own entries only) |
| DELETE | /api/time-entries/:id        | Delete an entry                   |
| GET    | /api/leaderboard?projectId=&period= | Ranked totals for one project's members (`today`/`week`/`month`/`all`) |

## Calling the API without a browser

Every endpoint above accepts either the browser session cookie or a personal API key sent
as `Authorization: Bearer <key>`. Generate a key from the "API access" panel at the bottom
of the Dashboard (or `POST /api/auth/api-key` using your browser session once), then:

```bash
# Start a timer
curl -X POST http://localhost:4000/api/time-entries/start \
  -H "Authorization: Bearer <key>" -H "Content-Type: application/json" \
  -d '{"projectId":"<project-id>"}'

# Stop it
curl -X POST http://localhost:4000/api/time-entries/stop \
  -H "Authorization: Bearer <key>"

# Add or remove time without running a timer (e.g. -5 min)
curl -X POST http://localhost:4000/api/time-entries/adjust \
  -H "Authorization: Bearer <key>" -H "Content-Type: application/json" \
  -d '{"projectId":"<project-id>","deltaSeconds":-300}'
```

`adjust` (and every other write) always applies to the calling user's own time — there's
no way to pass a different user, so a key can never be used to edit someone else's hours.
