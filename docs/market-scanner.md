# Market Scanner

Market Scanner persists the instruments a user explicitly wants Only1AI to monitor. Monitors are paused by default and validate ownership of their linked Only1Core and strategy. No market-data provider or trade signal is introduced by this module.

`POST /api/v1/market-monitors` accepts `only1CoreId`, optional `strategyId`, `symbol`, `marketType`, `timeframe`, and optional `status`.

```json
{"only1CoreId":"00000000-0000-0000-0000-000000000001","symbol":"EURUSD","marketType":"forex","timeframe":"15m"}
```
