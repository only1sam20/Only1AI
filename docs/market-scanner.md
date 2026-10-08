# Market Scanner

Market Scanner persists instruments a user explicitly wants Only1AI to review. Monitors are paused by default and validate ownership of their linked Only1Core and strategy. Phase 3 milestone 1 adds on-demand historical candles, not scheduled scans or trade signals. Active/paused status is saved configuration only until the scheduling milestone is delivered.

`POST /api/v1/market-monitors` accepts `only1CoreId`, optional `strategyId`, `symbol`, `marketType`, `timeframe`, and optional `status`.

```json
{"only1CoreId":"00000000-0000-0000-0000-000000000001","symbol":"EUR/USD","marketType":"forex","timeframe":"15min"}
```

`GET /api/v1/market-monitors/capabilities` reports server-side provider configuration and supported intervals without exposing a key. `GET /api/v1/market-monitors/:id/candles` checks monitor ownership and returns normalized bars plus provider, symbol, interval, exchange/currency/timezone metadata, fetch time, last-bar time, and cache provenance. Supported intervals are `1min`, `5min`, `15min`, `30min`, `45min`, `1h`, `2h`, `4h`, `8h`, `1day`, `1week`, and `1month`. Legacy aliases such as `15m` are normalized.

The server requests up to 300 bars from Twelve Data. It rejects invalid prices, inconsistent OHLC envelopes, malformed metadata/timestamps, empty data, and upstream errors. Bars are deduplicated and sorted. Intraday timestamps use UTC; daily/weekly/monthly timestamps represent the exchange-local trading date at UTC midnight, not the precise session instant.

Provider requests have a timeout, a bounded TTL cache, concurrent-request deduplication, and a per-process minute budget (`MARKET_DATA_*` settings in `.env.example`). These controls are not distributed: coordinate a shared budget before deploying multiple API replicas. Missing keys, unavailable symbols, quota exhaustion, or bad data produce safe errors with no synthetic fallback.

The web uses open-source TradingView Lightweight Charts, with attribution, to render these candles. This is not TradingView's proprietary Advanced Charting Library or a licensed real-time feed. Users load or refresh candles explicitly; the chart does not poll automatically. Real-time ingestion, rule evaluation, scheduling, and advanced datafeeds remain pending.
