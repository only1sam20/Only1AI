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
Copy-Item .env.example .env
npm install --legacy-peer-deps
```

Start PostgreSQL and Redis with Docker when available:

```powershell
docker compose up -d postgres redis
```

Or run PostgreSQL locally and set the `DATABASE_*` values in `.env`.

Run database migrations, the API, and the web app in separate terminals:

```powershell
npm run migration:run --workspace=@only1ai/api
npm run dev:api
npm run dev:web
```

Open `http://localhost:3000`.

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
npm run build --workspace=@only1ai/api
npm run build --workspace=@only1ai/web
.\services\ai\.venv\Scripts\python.exe -m pytest services/ai/tests -q
```

## Repository layout

- `apps/web` - Next.js web application
- `apps/api` - NestJS API and database migrations
- `services/ai` - FastAPI AI-service boundary
- `apps/mobile` - future Flutter client
- `packages` - shared packages
- `infrastructure` - Docker and Nginx configuration
- `docs` - product and engineering documentation

See [project status](docs/project-status.md) and [architecture](docs/architecture.md) for the delivery plan and integration boundaries.
