# Project status and delivery plan

## Working MVP path

The current implementation supports an authenticated user creating an Only1Core, defining a draft strategy with structured confluence rules, adding paused market monitors, submitting a manual market observation, and saving an explainable confluence analysis. The web interface is connected to these APIs.

## Before public launch

| Area | Status | Required completion |
| --- | --- | --- |
| Web workspace | Functional Phase 2 | Responsive navigation, profile, notification inbox, marketplace browsing, editable setup flows, and accessible loading/error states are implemented. Add browser-level UI tests before public launch. |
| Authentication | Functional backend | Non-enumerating registration/recovery, verification, JWT/session rotation, and Resend-backed delivery are implemented. Configure `RESEND_API_KEY`, `EMAIL_FROM`, and a verified sending domain; web recovery screens still need end-to-end UI coverage. |
| AI layer | Scaffolded only | Select a model/provider, configure credentials, build prompt templates and provider adapter, then test explanations. |
| Market scanning | Configuration only | Select and license a market-data provider, add ingestion, scheduling, rate limits, and provenance. |
| Mobile | Not started | Install Flutter and build the mobile client after web APIs are stable. |
| Operations | Prepared | Run migrations, deploy to HTTPS hosting, configure backups, monitoring, alerts, and secret management. |

## Delivery order

1. Configure the verified Resend sending domain and production email credentials; complete browser-level verification and recovery tests.
2. Integrate a licensed market-data source; no scan runs without data provenance.
3. Integrate an AI provider behind the existing service boundary; add human-reviewed evaluation cases.
4. Complete end-to-end tests, mobile application, and production rollout.
