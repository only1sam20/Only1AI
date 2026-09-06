# Only1AI

Only1AI helps traders find and understand high-confluence opportunity zones. It does not execute trades, promise profits, or replace the user's judgement.

## Project setup

Requirements: Node.js 22+, npm 11+, Docker Desktop (for PostgreSQL and Redis), and Python 3.12+ for the AI service.

```powershell
Copy-Item .env.example .env
npm install
npm run dev:web
npm run dev:api
```

For the AI service, create a virtual environment in `services/ai`, install `requirements.txt`, then run `uvicorn app.main:app --reload --port 8000`.

`docker compose up --build` starts the complete local stack when Docker is installed.

## Repository layout

- `apps/web` — Next.js web app
- `apps/api` — NestJS REST API
- `apps/mobile` — Flutter client placeholder
- `services/ai` — FastAPI AI service
- `packages/*` — shared UI, types, and configuration
- `infrastructure` — container configuration
- `docs` — architecture and API documentation

## Current status

See [docs/project-status.md](docs/project-status.md) for the current MVP scope, launch blockers, and delivery plan.
