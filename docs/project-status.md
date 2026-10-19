# Project status and delivery plan

## Working MVP path

The current implementation supports an authenticated user creating an Only1Core, defining a draft strategy with structured confluence rules, configuring market monitors, submitting a manual market observation, and saving an explainable confluence analysis. Phase 1 foundations and the Phase 2 trader-workspace implementation are in place. Phase 2 hardening continues where review identifies defects; production email setup and full browser/end-to-end acceptance coverage remain launch gates.

Phase 3 milestone 1 adds user-requested Twelve Data candles, TradingView Lightweight Charts, and OpenAI explanations of preserved assessment rules. The AI service is authenticated privately, uses bounded structured output, and cannot change the deterministic score. Provider behavior is covered with mocked tests; live account validation still requires credentials.

## Project-manager review: 19 October 2026

**Current phase: Phase 3, milestone 1 (on-demand integrations), with a Phase 2 reliability/security hardening pass.** This is a functional development MVP, not a production-ready automatic scanner.

The review addresses duplicate one-time verification requests, rejected profile saves, strategy form/edit races and lost rule metadata, unsafe post-login return paths, password byte-limit handling, transactional account recovery/session issuance, ambiguous manual-rule matching, container assets/startup, and production network isolation. Existing user accounts, historical assessments, credentials, and PostgreSQL migrations are preserved. Older assessments using delimiter-bearing rule labels should be re-evaluated if their previous score is suspect; saved evidence is intentionally not rewritten.

New component regressions cover the repaired frontend behaviors, including Strict Mode effect replay. Container/proxy runtime checks are added to CI; a local Docker daemon is required to run them. Configuration validation alone does not prove that a container image or public deployment is healthy.

### Validation completed in this review

- API: 165 tests across 24 suites passed; lint and production build passed.
- Web: 13 component/helper regressions and 4 API-session regressions passed; lint, production compilation/type checking, generation of all 20 pages, and standalone packaging passed.
- AI: 35 tests passed using mocked providers, including the real SDK over a local mock transport; no paid requests were made.
- PostgreSQL/HTTP: 59 checks passed, including profile saves, 72-byte password handling, ownership checks, confluence separation, simultaneous refresh, and reset-versus-refresh behavior. Only uniquely named fixture accounts were created and removed; existing accounts were not targeted.
- Compose: merged production configuration exposes only Nginx; the development bindings are loopback-only. A working Docker daemon is still needed for the added image/proxy runtime checks.

This review did not change a live deployment, configure provider credentials, or establish live email/market-data/AI delivery. Browser end-to-end release acceptance remains outstanding; component tests are not presented as full browser coverage.

## Before public launch

| Area | Status | Required completion |
| --- | --- | --- |
| Web workspace | Functional Phase 2, hardening reviewed | Responsive navigation, profile, notification inbox, marketplace browsing, editable setup flows, and accessible loading/error states are implemented. Component/helper regressions do not replace full browser/end-to-end acceptance tests. |
| Authentication | Functional backend, transactional recovery | Non-enumerating registration/recovery, verification, JWT/session rotation, and Resend-backed delivery are implemented. Configure `RESEND_API_KEY`, `EMAIL_FROM`, and a verified sending domain; complete deployed verification/recovery acceptance tests. |
| AI layer | Phase 3 milestone 1 implemented | Configure OpenAI and the shared service token; validate live connectivity, human-review explanation quality, and add cost monitoring before launch. |
| Market scanning | On-demand candles implemented | Configure Twelve Data and confirm entitlements. Automatic rule evaluation, jobs/scheduling, distributed provider budgets, and alerts remain pending. |
| Mobile | Not started | Install Flutter and build the mobile client after web APIs are stable. |
| Operations | Prepared | Run migrations, deploy to HTTPS hosting, configure backups, monitoring, alerts, and secret management. |
| Community suggestions | Basic public suggestions | Custom suggestion text is published during registration. Add verified-publication and moderation/privacy controls before inviting the public. |

## Delivery order

1. **Finish the connected staging MVP.** Deploy the Vercel frontend from `apps/web`, host the API/PostgreSQL/private AI service, configure secrets and canonical URLs, and test registration, verification, profile/strategy saves, refresh, and recovery in a real browser. Resend can test its own account email before a sending domain is ready; public email delivery still requires a verified domain.
2. **Complete Phase 3 milestone 1 validation.** Validate Twelve Data access/display entitlements and OpenAI connectivity/quality with real credentials and explicit cost limits. A missing provider key is setup work, not evidence of a functioning live integration.
3. **Build Phase 3 milestone 2: automated evidence collection.** Define a bounded supported rule vocabulary and evaluate those rules against sourced candles, then add persistent job scheduling, shared provider budgets, deduplication, and scan history. Current manual matching compares category/condition text; stored rule `value` fields are not yet executable thresholds. SMC/ICT and other onboarding labels are preferences, not already implemented automatic strategy engines.
4. **Connect scanned evidence to explanations and alerts.** Preserve provenance and immutable assessment snapshots; add notification delivery with user controls, retries, and duplicate protection. Do not infer or fabricate signals from incomplete evidence.
5. **Pass release gates before public launch.** Complete end-to-end/security tests, suggestion moderation, backups/restore checks, monitoring, rate-limit/proxy verification, and deployment acceptance. The mobile client follows stable web APIs; it is not implemented yet.
