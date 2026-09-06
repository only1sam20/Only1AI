# Confluence Engine

The Confluence Engine deterministically compares supplied observations to the structured rules in a user-owned strategy. It stores an explainable score and matched rule IDs; `qualified` means the configured threshold was met, not that a trade should be placed.

`POST /api/v1/confluence-assessments`

```json
{"strategyId":"00000000-0000-0000-0000-000000000001","observations":[{"category":"session","condition":"is London open"}]}
```
