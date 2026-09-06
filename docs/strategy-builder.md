# Strategy Builder

Strategies capture a trader’s methodology as named, versionable configurations attached to an Only1Core. Rules are normalized records so later confluence evaluation can reference them without parsing free-form prose.

## Endpoints

- `GET /api/v1/strategies`
- `GET /api/v1/strategies/:id`
- `POST /api/v1/strategies`
- `PATCH /api/v1/strategies/:id`

```json
{"only1CoreId":"00000000-0000-0000-0000-000000000001","name":"London breakout","timeframe":"15m","rules":[{"category":"session","condition":"is London open","priority":80},{"category":"structure","condition":"breaks prior range high","priority":90}]}
```

Creating or updating a strategy never creates a signal or trade instruction. A strategy is active only when the user explicitly sets its status to `active`.
