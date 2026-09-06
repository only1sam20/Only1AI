# Architecture

The MVP is a modular monolith: the NestJS API owns product-domain modules and exposes versioned REST endpoints. The Next.js web app is its primary client. A separately deployable FastAPI service provides AI capabilities behind an explicit provider boundary. PostgreSQL is the system of record; Redis supports cache, rate limiting, sessions, and jobs.

All trade decisions remain with the user. Neither the API nor AI service may execute orders or present analyses as guaranteed outcomes.

## Initial boundaries

- `apps/api/src/modules` will contain independent domain modules.
- `services/ai/app/providers` contains model-provider adapters; business logic must not depend on a vendor SDK.
- Shared TypeScript contracts belong in `packages/shared` once authentication introduces the first cross-app DTOs.

## Chosen external integrations

- **Market data:** Twelve Data is the server-side source of truth for historical OHLC, current quotes, and scanner inputs. Its API covers the initial multi-asset scope through one adapter. API keys remain in the API/AI services and must never be sent to the browser.
- **Charting:** TradingView is the chart-rendering layer. Its Charting Library requires the product to supply data through a datafeed, so the TradingView adapter consumes normalized Only1AI/Twelve Data data rather than becoming a second source of truth.
- **AI:** OpenAI is the initial model provider, reached only by the FastAPI service through a provider interface. The product response must be educational analysis with explicit uncertainty, never trade execution or a guaranteed signal.
- **Email:** Resend is the transactional-email provider for verification, password recovery, and product notifications. A verified sending domain is required before production delivery.

Before public release, confirm each exchange's entitlement and redistribution terms. A development or personal market-data plan is not automatically permission to display or redistribute data to product users.

## Health endpoints

- Web: `/api/health`
- API: `/api/v1/health`
- AI: `/health`

## Performance conventions

User-scoped chronological feeds use `(user_id, created_at DESC)` database indexes and bounded pagination (`limit` up to 100, `offset` from 0). This prevents dashboard-sized history requests from becoming unbounded as a user’s analysis history grows.
