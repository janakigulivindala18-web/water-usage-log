# WaterWise — Water Usage Log

WaterWise is a beginner-friendly full-stack application that helps people record daily water use by activity, review their history, and share water-saving suggestions.

## 1. Problem and objectives

Water use is easy to forget or estimate poorly. WaterWise gives users a simple log to record activity, litres used, date, and optional notes. Users can review daily and weekly totals and look for patterns.

### Roles
- **User:** create an account, sign in, add and delete their own logs, filter history, and submit water-saving suggestions.
- **Admin:** use the same account system and view submitted suggestions. Admin access is assigned in the database by a project owner.

### Features included
- Sign-up and sign-in through Supabase Auth.
- Daily, last-7-day, and total-entry summaries.
- Water logs by category, amount, date, and notes.
- Search and category filtering in history.
- Delete confirmation.
- Static water-saving tips and suggestion submissions.
- Admin-only suggestions view.
- Input validation, API authorization, rate limiting, security headers, and PostgreSQL constraints.

## 2. Technology and architecture

- Frontend: HTML5, CSS3, Vanilla JavaScript
- Backend: Node.js and Express
- Database and identity: Supabase Auth + Supabase PostgreSQL
- Version control: Git and GitHub

The browser calls the Express REST API with `fetch()`. Supabase Auth verifies accounts and issues access tokens. Express verifies each token and checks the role in `profiles` before accessing data. The service-role key is server-only and is never sent to the browser.

## 3. Folder structure

```text
water-usage-log/
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── backend/
│   ├── routes/
│   │   ├── admin.js
│   │   ├── auth.js
│   │   ├── logs.js
│   │   └── suggestions.js
│   ├── middleware/
│   │   └── auth.js
│   ├── server.js
│   ├── supabase.js
│   ├── package.json
│   ├── .env
│   ├── .env.example
│   └── .gitignore
├── database/
│   └── schema.sql
├── .gitignore
└── README.md
```

## 4. Prerequisites

Install:
- [Node.js LTS](https://nodejs.org/) (npm is included)
- [Visual Studio Code](https://code.visualstudio.com/)
- [Git](https://git-scm.com/downloads)
- A free [Supabase](https://supabase.com/) account

Check installation in a new VS Code terminal:

```powershell
node --version
npm --version
git --version
```

Each command should print a version number.

## 5. Create the Supabase database

1. Sign in to Supabase and create a new project.
2. Set and securely store the database password. It is not used in this app's `.env`.
3. In the project, open **SQL Editor** and create a new query.
4. Open `database/schema.sql`, copy all its contents, paste into the SQL Editor, and click **Run**.
5. Open **Table Editor** and verify that `profiles`, `water_logs`, and `suggestions` exist.
6. In **Project Settings → API** (labels may vary), copy the Project URL, publishable/anon key, and service-role/secret key. Use the server-only service key for `SUPABASE_SERVICE_ROLE_KEY`; never put it in frontend code or GitHub.

The schema installs a trigger that creates a profile whenever a Supabase Auth user signs up.

## 6. Configure environment variables

From the project root, create `backend/.env` by copying `backend/.env.example`. Replace the example values:

```dotenv
PORT=3000
NODE_ENV=development
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=your_actual_publishable_or_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_actual_server_only_service_role_key
```

- `SUPABASE_URL`: URL shown in Supabase project API settings.
- `SUPABASE_ANON_KEY`: public/publishable key used for the sign-up/sign-in calls from the server.
- `SUPABASE_SERVICE_ROLE_KEY`: privileged key used only inside the backend after authorization checks.
- `PORT`: local web server port.
- `NODE_ENV`: environment name.

The `.env` file contains secrets and is ignored by Git. `.env.example` contains placeholders and should be committed. Never copy real secrets into README, browser code, screenshots, or public repositories.

## 7. Install and run

Open VS Code → **Terminal → New Terminal**. Make sure the terminal is at the root `water-usage-log` folder.

```powershell
cd backend
npm install
npm run check
npm start
```

Expected output resembles:

```text
WaterWise is running at http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000). To check the server, open [http://localhost:3000/api/health](http://localhost:3000/api/health); it should return JSON with `"status":"ok"`.

For development auto-restart, stop the server with `Ctrl+C`, then run `npm run dev`.

## 8. Sign-up and administrator setup

1. Open the application and choose **Create account**.
2. Register with an email address and password at least 8 characters long.
3. If Supabase email confirmation is enabled, open the confirmation email before signing in.
4. Sign in with that account.

To configure the administrator, first register the intended admin email through the app (or create the user in Supabase Auth), then run this in the Supabase SQL Editor:

```sql
update public.profiles
set role = 'admin'
where email = 'mrec@gmail.com';
```

Check the result:

```sql
select email, role from public.profiles where email = 'mrec@gmail.com';
```

It should show `admin`. Do not hard-code an administrator password in the source code or share it in GitHub. Set or reset the admin password through Supabase Auth's supported dashboard/reset flow and keep it private.

## 9. API reference

All responses are JSON. Protected routes require `Authorization: Bearer <access_token>`.

| Method | Path | Purpose | Access |
|---|---|---|---|
| GET | `/api/health` | Health check | Public |
| POST | `/api/auth/signup` | Register with `{ "email", "password" }` | Public, rate-limited |
| POST | `/api/auth/signin` | Sign in with `{ "email", "password" }` | Public, rate-limited |
| GET | `/api/auth/me` | Current user and role | Signed-in user |
| GET | `/api/logs` | List current user's logs | Signed-in user |
| POST | `/api/logs` | Create log with `{ "category", "litres", "log_date", "notes" }` | Signed-in user |
| DELETE | `/api/logs/:id` | Delete a log owned by current user | Signed-in user |
| POST | `/api/suggestions` | Submit `{ "content" }` | Signed-in user |
| GET | `/api/admin/suggestions` | List suggestions | Admin only |

Typical errors: `400` invalid input, `401` missing/invalid session, `403` insufficient permission or unconfigured profile, `404` missing record/route, and `500` server/database failure. Error messages intentionally avoid returning raw database errors.

## 10. Database design

- `profiles`: links a Supabase Auth user ID to their email and role.
- `water_logs`: each record belongs to one profile; amounts and categories are constrained.
- `suggestions`: each suggestion belongs to one profile.
- Foreign keys cascade when a user is removed. Indexes support user history and recent suggestions.
- Row Level Security (RLS) is enabled. This implementation deliberately does not create direct browser table policies: the browser calls Express, and the backend verifies the user and enforces ownership/role before using the server-only key. Do not add direct client database access without designing appropriate RLS policies.

## 11. Functional testing checklist

1. **Health:** `/api/health` returns `{"status":"ok","service":"WaterWise API"}`.
2. **Sign-up:** valid credentials create a Supabase Auth user and a profile. If email confirmation is enabled, confirm before sign-in.
3. **Sign-in:** valid credentials return an access token; invalid credentials show a friendly error.
4. **Create log:** add a category, amount, and date; the log appears in recent logs and history after saving.
5. **Validation:** amount below `0.1`, above `100000`, invalid category, missing date, or a future date should be rejected.
6. **History filters:** search notes and choose a category; only matching rows should remain.
7. **Delete:** click Delete and cancel to preserve a record; confirm to remove it.
8. **Ownership:** a user should only see and delete their own logs. Try a second account to verify this.
9. **Suggestions:** submit a suggestion of 5–500 characters; shorter/longer content should be rejected.
10. **Admin:** a regular user requesting `/api/admin/suggestions` should receive `403`; the configured admin should see suggestions.
11. **Responsive UI:** test the dashboard at desktop and mobile widths.
12. **No credentials in Git:** run `git status` and ensure `backend/.env` is not staged.

These instructions describe tests to perform locally; they do not claim a connection to your personal Supabase project has been tested.

## 12. Troubleshooting

- **Missing environment variables:** check that `backend/.env` exists and each value is copied exactly from your Supabase project.
- **Invalid API key / failed connection:** verify `SUPABASE_URL`, keys, and that there are no extra spaces.
- **Profile not configured:** rerun `database/schema.sql` if the trigger/table is missing. For an existing Auth user created before the trigger, add the profile in SQL using that user's exact Auth UUID and email.
- **Sign-up does not sign in immediately:** email confirmation may be enabled; confirm your email first.
- **Admin page hidden or `403`:** verify the signed-in email has `role = 'admin'` in `public.profiles`, then sign out and sign in again.
- **Port already in use:** set `PORT=3001` in `backend/.env` and restart, then open `http://localhost:3001`.
- **`npm` not recognized:** install Node.js LTS and reopen the terminal.
- **SQL table errors:** run the full schema in the correct Supabase project and check Table Editor for the three public tables.
- **Empty dashboard:** sign in and create a log; logs are not preloaded with fake data.

## 13. Git and GitHub

1. Create a new empty repository on GitHub and copy its HTTPS URL.
2. From the project root:

```powershell
git init
git status
git add .
git status
git commit -m "Build WaterWise water usage log"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

Replace `YOUR_GITHUB_REPOSITORY_URL` with the actual URL. If `origin` already exists, use `git remote set-url origin YOUR_GITHUB_REPOSITORY_URL`.

Before committing, verify that `.env` files with real credentials, `node_modules/`, private user data, and database exports are not staged. `.env.example` should be included. `.gitignore` does not remove secrets already committed. If a secret was exposed, rotate it immediately and remove it from repository history as appropriate.

## 14. Limitations and future improvements

- No charting library or external water-use APIs are required.
- Weekly totals are calculated from the most recent 500 logs returned by the API; users with very large histories may need a server-side aggregate endpoint.
- Suggestions are visible to administrators; moderation status and editing are not included.
- A production deployment should use HTTPS, configure allowed origins and email settings, review Supabase key formats, and add monitoring and automated integration tests.

## 15. Security notes

- Never commit `.env` or expose the service-role key.
- The server checks tokens and role-based permissions; the service key bypasses RLS and must remain on the server.
- Passwords are managed by Supabase Auth and are not stored in application tables.
- Use a unique password for every account and change compromised credentials promptly.
