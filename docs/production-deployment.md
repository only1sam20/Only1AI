# Production deployment

Only deploy through an HTTPS-capable hosting platform or load balancer. Set a real public `WEB_ORIGIN`, strong unique `JWT_SECRET`, and production PostgreSQL credentials in the deployment secret store. Never commit `.env`.

## Release procedure

1. Run `npm ci --legacy-peer-deps`, `npm run build`, and `npm test -- --runInBand` in CI.
2. Create deployment secrets from `.env.example`; replace every placeholder.
3. Start the stack with `docker compose -f docker-compose.yml -f docker-compose.production.yml up -d --build`.
4. Run database migrations once per release:

```powershell
docker compose -f docker-compose.yml -f docker-compose.production.yml run --rm api node node_modules/typeorm/cli.js migration:run -d dist/database/data-source.js
```

5. Confirm `/api/v1/health`, `/health` (AI, internal only), and `/api/health` (web, internal only) report `ok`.
6. Configure backups for `postgres_data`, central log collection, and monitoring alerts before accepting users.

## Network boundary

The production Compose overlay removes public PostgreSQL, Redis, API, AI, and web ports. Nginx is the only exposed service. Configure TLS certificates at the ingress layer; HTTP alone is not a production-ready deployment.
