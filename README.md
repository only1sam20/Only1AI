# Only1AI

Only1AI is a trader decision-support workspace. It helps users organise a personal methodology, review confluence, and understand saved evidence. It does not execute trades, guarantee outcomes, or replace a trader's judgement.

## What works in this milestone

- Trader-tailored registration (market and methodology preferences), strong-password guidance, email verification, login, rotating sessions, and recovery flows
- Personal profiles, Only1Cores, strategies with editable confluence rules, and market-monitor configuration
- Manual confluence reviews and saved evidence-backed analyses
- Mission Control onboarding, notifications inbox, marketplace browsing, accessible responsive navigation, and reduced-motion support
- PostgreSQL migrations, API health checks, Docker/Nginx configuration, and GitHub Actions validation

Live market ingestion, scheduled scans, TradingView datafeeds, OpenAI analysis workflows, and automated delivery notifications are intentionally Phase 3 work.

## Local development

Requirements: Node.js 22+, npm 11+, PostgreSQL 17+, and Python 3.12+ for the AI service. Docker Desktop is optional but is the quickest way to start PostgreSQL and Redis when hardware virtualisation is available.

```powershell
Copy-Item .env.example .env
npm install
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

For local email verification without Resend, the API logs a verification URL when `NODE_ENV` is not `production`. For production, configure `RESEND_API_KEY`, `EMAIL_FROM`, and a verified sending domain.

## Quality checks

```powershell
npm run lint --workspace=@only1ai/api
npm run lint --workspace=@only1ai/web
npm test --workspace=@only1ai/api -- --runInBand --forceExit
npm run build --workspace=@only1ai/api
npm run build --workspace=@only1ai/web
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
