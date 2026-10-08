# Architecture

The MVP is a modular monolith: the NestJS API owns product-domain modules and exposes versioned REST endpoints. The Next.js web app is its primary client. A separately deployable FastAPI service provides AI explanations behind an authenticated provider boundary. PostgreSQL is the system of record. Redis is provisioned for future shared cache and jobs; the current market cache/budget is process-local, and automatic jobs are not implemented.

All trade decisions remain with the user. Neither the API nor AI service may execute orders or present analyses as guaranteed outcomes.

## Initial boundaries

- `apps/api/src/modules` will contain independent domain modules.
- `services/ai/app/explanation.py` isolates the OpenAI Responses adapter from the API/product domain; the private request/response boundary is defined by bounded schemas.
- Shared TypeScript contracts belong in `packages/shared` once authentication introduces the first cross-app DTOs.

## Chosen external integrations

- **Market data:** Twelve Data supplies on-demand historical OHLC through the NestJS adapter. Its key stays in the API and is never sent to the browser. Current quotes/real-time scanner inputs are planned; the compatibility snapshot uses the last available one-minute candle close, not a guaranteed live tick.
- **Charting:** TradingView Lightweight Charts currently renders normalized Only1AI/Twelve Data candles with attribution. A future proprietary Advanced Charting Library integration requires the appropriate license and datafeed; it is not shipped in this milestone.
- **AI:** OpenAI is the initial model provider, reached only by the FastAPI service through a provider interface. The product response must be educational analysis with explicit uncertainty, never trade execution or a guaranteed signal.
- **Email:** Resend is the transactional-email provider for verification, password recovery, and product notifications. A verified sending domain is required before production delivery.

Before public release, confirm each exchange's entitlement and redistribution terms. A development or personal market-data plan is not automatically permission to display or redistribute data to product users.

## Health endpoints

- Web: `/api/health`
- API: `/api/v1/health`
- AI: `/health`

`AI_SERVICE_URL` and `AI_SERVICE_TOKEN` connect NestJS to FastAPI. FastAPI denies explanation requests without a configured shared token and keeps the OpenAI key private. Its public health endpoint reports configuration readiness, not provider network health. Production networking should keep FastAPI private; Nginx does not publish its explanation route.

## Performance conventions

User-scoped chronological feeds use `(user_id, created_at DESC)` database indexes and bounded pagination (`limit` up to 100, `offset` from 0). This prevents dashboard-sized history requests from becoming unbounded as a user’s analysis history grows.
