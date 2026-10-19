# Production deployment

Only deploy through an HTTPS-capable hosting platform or load balancer. Use a recent Docker Compose plugin that supports the `!reset` merge tag; the production port isolation depends on it. Set a real public `WEB_ORIGIN`, strong unique `JWT_SECRET`, production PostgreSQL credentials, `RESEND_API_KEY`, and `EMAIL_FROM` in the deployment secret store. Never commit `.env`. AI explanations additionally require an OpenAI key and a strong, unique `AI_SERVICE_TOKEN` shared only between the API and AI service.

## Release procedure

1. Run the repository's CI checks, including the container and production-network smoke checks.
2. Create deployment secrets from `.env.example`; replace every placeholder and verify the Resend sending domain.
3. Inspect the merged configuration with the command below. It must show a published port only for Nginx. `--no-interpolate` prevents secret values from being printed.

```powershell
docker compose -f docker-compose.yml -f docker-compose.production.yml config --no-interpolate
```

4. Start PostgreSQL and Redis, then run migrations before exposing the application:

```powershell
docker compose -f docker-compose.yml -f docker-compose.production.yml up -d postgres redis
docker compose -f docker-compose.yml -f docker-compose.production.yml run --build --rm api node node_modules/typeorm/cli.js migration:run -d dist/database/data-source.js
docker compose -f docker-compose.yml -f docker-compose.production.yml up -d --build
```

5. Confirm `/api/v1/health`, `/health` (AI, internal only), and `/api/health` (web, internal only) report `ok`.
6. Configure backups for `postgres_data`, central log collection, and monitoring alerts before accepting users. Redact verification and password-reset URLs from ingress/load-balancer logs as well as application logs.

## Network boundary

The base development Compose file binds PostgreSQL, Redis, API, AI, and web host ports to loopback. The production overlay removes those host port mappings altogether; Nginx is the only exposed service. Configure TLS certificates at the ingress layer; HTTP alone is not a production-ready deployment. Verify trusted-proxy and client-IP handling for the actual ingress topology before enabling production rate limits.
