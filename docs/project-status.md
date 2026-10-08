# Project status and delivery plan

## Working MVP path

The current implementation supports an authenticated user creating an Only1Core, defining a draft strategy with structured confluence rules, configuring market monitors, submitting a manual market observation, and saving an explainable confluence analysis. Phase 2 implementation is complete; production email setup and browser-level acceptance coverage are still launch gates.

Phase 3 milestone 1 adds user-requested Twelve Data candles, TradingView Lightweight Charts, and OpenAI explanations of preserved assessment rules. The AI service is authenticated privately, uses bounded structured output, and cannot change the deterministic score. Provider behavior is covered with mocked tests; live account validation still requires credentials.

## Before public launch

| Area | Status | Required completion |
| --- | --- | --- |
| Web workspace | Functional Phase 2 | Responsive navigation, profile, notification inbox, marketplace browsing, editable setup flows, and accessible loading/error states are implemented. Add browser-level UI tests before public launch. |
| Authentication | Functional backend | Non-enumerating registration/recovery, verification, JWT/session rotation, and Resend-backed delivery are implemented. Configure `RESEND_API_KEY`, `EMAIL_FROM`, and a verified sending domain; web recovery screens still need end-to-end UI coverage. |
| AI layer | Phase 3 milestone 1 implemented | Configure OpenAI and the shared service token; validate live connectivity, human-review explanation quality, and add cost monitoring before launch. |
| Market scanning | On-demand candles implemented | Configure Twelve Data and confirm entitlements. Automatic rule evaluation, jobs/scheduling, distributed provider budgets, and alerts remain pending. |
| Mobile | Not started | Install Flutter and build the mobile client after web APIs are stable. |
| Operations | Prepared | Run migrations, deploy to HTTPS hosting, configure backups, monitoring, alerts, and secret management. |

## Delivery order

1. Configure the verified Resend sending domain and production email credentials; complete browser-level verification and recovery tests.
2. Validate Twelve Data access and display rights; implement scheduled, provenance-backed rule evaluation with a shared provider budget.
3. Validate OpenAI explanations against human-reviewed evaluation cases; wire real scanned evidence into AI and notifications without inventing signals.
4. Complete end-to-end tests, mobile application, and production rollout.
