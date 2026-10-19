# Only1AI

Only1AI is a trader decision-support workspace. It helps users organise a personal methodology, review confluence, and understand saved evidence. It does not execute trades, guarantee outcomes, or replace a trader's judgement.

## What works in this milestone

- Trader-tailored registration (market and methodology preferences), strong-password guidance, email verification, login, rotating sessions, and recovery flows
- Personal profiles, Only1Cores, strategies with editable confluence rules, and market-monitor configuration
- Manual confluence reviews and saved evidence-backed analyses
- On-demand Twelve Data candles displayed with TradingView Lightweight Charts
- Explicit OpenAI explanations of saved, immutable assessment evidence through the private AI service
- Mission Control onboarding, notifications inbox, marketplace browsing, accessible responsive navigation, and reduced-motion support
- PostgreSQL migrations, API health checks, Docker/Nginx configuration, and GitHub Actions validation

Phase 3 has started. This milestone adds on-demand historical candles and AI explanations, not automatic strategy scanning. Scheduled scans, real-time streaming, indicator/rule evaluation against candles, advanced charting, and automated delivery notifications remain pending.

## Local development

Requirements: Node.js 22+, npm 11+, PostgreSQL 17+, and Python 3.12+ for the AI service. Docker Desktop is optional but is the quickest way to start PostgreSQL and Redis when hardware virtualisation is available.

```powershell
if (-not (Test-Path -LiteralPath .env)) { Copy-Item .env.example .env }
npm install --legacy-peer-deps
```

Run these commands from the repository root. The copy creates `.env` only when it does not already exist; never overwrite configured credentials. The API and migration CLI automatically load this root `.env`, even though npm runs the API from `apps/api`. Existing terminal/Docker environment variables take precedence over `.env` values.

Start PostgreSQL and Redis with Docker when available:

```powershell
docker compose up -d postgres redis
```

Or run PostgreSQL locally, create a database named `only1ai` if it does not already exist, and set the `DATABASE_*` values in the root `.env`. For a local installation using the `postgres` login, update the existing lines:

```dotenv
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=only1ai
DATABASE_USER=postgres
DATABASE_PASSWORD='YOUR_ACTUAL_POSTGRESQL_PASSWORD'
NODE_ENV=development
```

`DATABASE_NAME` is the database, while `DATABASE_USER` is the PostgreSQL login. The `POSTGRES_*` example values configure Docker's database container, not the API connection. Keep credentials private and do not paste `.env` contents into screenshots. Configure a random `JWT_SECRET`; the API refuses to start without one. On Windows, generate it directly into the clipboard, then paste after the existing `JWT_SECRET=` line and save:

```powershell
node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))" | Set-Clipboard
```

Run database migrations, the API, and the web app in separate terminals:

```powershell
npm run migration:run --workspace=@only1ai/api
npm run dev:api
npm run dev:web
```

Open `http://localhost:3000`.

The API health endpoint is `http://localhost:3001/api/v1/health`. Wait for migrations to complete before starting the API. If authentication fails, recheck the saved `DATABASE_USER` and password; do not recreate or delete the database. Restart the API after changing `.env`.

### Enable Phase 3 integrations (without Docker)

Add `TWELVE_DATA_API_KEY`, `OPENAI_API_KEY`, and a long random `AI_SERVICE_TOKEN` to your existing `.env`. Never overwrite a configured `.env` with the example file. The API and AI service must use the same shared token; it is not a user's access token. Keep `AI_SERVICE_URL=http://localhost:8000` for local development.

Create and run the AI service from the repository root in another terminal:

```powershell
python -m venv services/ai/.venv
.\services\ai\.venv\Scripts\python.exe -m pip install -r services/ai/requirements.txt
.\services\ai\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir services/ai --env-file .env --host 127.0.0.1 --port 8000
```

Restart the API after changing `.env`, and run migrations before testing. In Market Scanner, create a monitor with a provider-style symbol such as `EUR/USD`, choose its interval, and click **Load candles**. Data loads only on request; no paid polling runs in the background. In Analysis, evaluate a manual context and click **Explain with AI**. Older assessments without preserved rules must be evaluated again before requesting AI. Standard explanations remain available without an OpenAI key.

Missing credentials produce setup/error states, not simulated data. The development checks use mocked providers; validate real credentials and market-data display entitlements before launch.

For local email verification without Resend, the API logs a verification URL when `NODE_ENV` is not `production`. For production, configure `RESEND_API_KEY`, `EMAIL_FROM`, and a verified sending domain.

## Quality checks

```powershell
npm run lint --workspace=@only1ai/api
npm run lint --workspace=@only1ai/web
npm test --workspace=@only1ai/api -- --runInBand --forceExit --testTimeout=15000
npm run test:session --workspace=@only1ai/web
npm run test:ui --workspace=@only1ai/web
npm run build --workspace=@only1ai/api
npm run build --workspace=@only1ai/web
.\services\ai\.venv\Scripts\python.exe -m pytest services/ai/tests -q
```

After migrations, a separate real PostgreSQL/HTTP smoke test can verify startup, registration, login, ownership, strategy edits, saved confluence, and session rotation against your configured local database:

```powershell
npm run test:database --workspace=@only1ai/api
```

This check creates uniquely named temporary fixture accounts and removes only those accounts and their cascaded records afterward. Email delivery is mocked, and it makes no paid provider calls. Existing user accounts and records are not targeted. It requires the same `DATABASE_*` settings and `JWT_SECRET` as normal API startup.

The UI regression suite exercises component behavior and Strict Mode effect replay with mocked dependencies. It is not a substitute for full browser/end-to-end acceptance tests or live provider validation. New and reset passwords are limited to 72 UTF-8 bytes to avoid bcrypt truncation; existing longer-password users should reset their password. See [authentication](docs/authentication.md).

## Vercel interface preview

This is an npm-workspace monorepo. Import the GitHub repository with **Root Directory `apps/web`**, **Next.js** as the framework, `npm ci --legacy-peer-deps` as the install command, and `npm run build` as the build command. Keep the default Next.js output directory. The repository root package does not declare Next.js and must not be selected as the frontend project root.

A Vercel frontend deployment alone does not deploy NestJS, PostgreSQL, or FastAPI. Without a hosted backend it is an interface preview, not a working account/analysis deployment. To connect it, set the frontend's server-side `API_URL` to the backend's HTTPS origin (no trailing slash or `/api/v1` suffix) and redeploy. Leave `NEXT_PUBLIC_API_URL` unset so browser requests use the same-origin `/api/v1` rewrite and the existing refresh-cookie policy.

On the backend, set `WEB_ORIGIN` to the canonical deployed frontend origin, configure database/JWT/email secrets, and run migrations before accepting traffic. Configure the private AI service separately. Do not put database passwords, Resend/OpenAI keys, or `AI_SERVICE_TOKEN` in browser-facing `NEXT_PUBLIC_*` variables. A `.vercel.app` address is enough for a website preview, but not a domain you control for public transactional-email sending.

## Repository layout

- `apps/web` - Next.js web application
- `apps/api` - NestJS API and database migrations
- `services/ai` - FastAPI AI-service boundary
- `apps/mobile` - future Flutter client
- `packages` - shared packages
- `infrastructure` - Docker and Nginx configuration
- `docs` - product and engineering documentation

See [project status](docs/project-status.md) and [architecture](docs/architecture.md) for the delivery plan and integration boundaries.
