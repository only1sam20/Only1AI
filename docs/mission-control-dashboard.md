# Mission Control Dashboard

Mission Control is the authenticated home for each trader. It reports setup progress and, as modules are enabled, will surface the user's Only1Cores, strategies, monitored markets, and opportunity zones.

## Current endpoint

`GET /api/v1/dashboard/mission-control` requires an access token and returns only truthful onboarding and zero states until downstream modules hold real data.

```json
{"greetingName":"Ada","metrics":{"activeCores":0,"activeStrategies":0,"monitoredMarkets":0,"opportunityZones":0},"opportunities":[]}
```
