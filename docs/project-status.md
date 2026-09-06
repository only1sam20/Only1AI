# Project status and delivery plan

## Working MVP path

The current implementation supports an authenticated user creating an Only1Core, defining a draft strategy with structured confluence rules, adding paused market monitors, submitting a manual market observation, and saving an explainable confluence analysis. The web interface is connected to these APIs.

## Before public launch

| Area | Status | Required completion |
| --- | --- | --- |
| Web workspace | In progress | Connect profile, notifications, marketplace creator/admin controls, and UI tests. |
| Authentication | Partial | Configure transactional email so email verification reaches users; add password reset and account recovery. |
| AI layer | Scaffolded only | Select a model/provider, configure credentials, build prompt templates and provider adapter, then test explanations. |
| Market scanning | Configuration only | Select and license a market-data provider, add ingestion, scheduling, rate limits, and provenance. |
| Mobile | Not started | Install Flutter and build the mobile client after web APIs are stable. |
| Operations | Prepared | Run migrations, deploy to HTTPS hosting, configure backups, monitoring, alerts, and secret management. |

## Delivery order

1. Finish web account and feedback loops.
2. Integrate a licensed market-data source; no scan runs without data provenance.
3. Integrate an AI provider behind the existing service boundary; add human-reviewed evaluation cases.
4. Configure email delivery and recovery flows.
5. Complete end-to-end tests, mobile application, and production rollout.
