# Only1Core module

Each account can own multiple Only1Cores. A core is a personal, user-owned analysis configuration; it does not place orders, promise results, or replace trader judgement.

## Endpoints

- `GET /api/v1/only1-cores`
- `GET /api/v1/only1-cores/:id`
- `POST /api/v1/only1-cores`
- `PATCH /api/v1/only1-cores/:id`

All endpoints require an access token and enforce ownership. Cores begin paused, so monitoring is only enabled through an explicit user update.

```json
{"name":"London Open","description":"My intraday confluence workspace"}
```
