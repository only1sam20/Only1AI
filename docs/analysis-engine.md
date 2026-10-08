# Analysis Engine

Analysis records turn a confluence assessment into a saved, evidence-backed explanation. They enumerate matched and unmatched configured rules and always state that the output is not trading advice.

`POST /api/v1/analyses/from-assessment/:assessmentId` creates an analysis for an assessment owned by the current user.

## Phase 3: optional AI explanation

`POST /api/v1/analyses/from-assessment/:assessmentId/ai` verifies ownership, then calls the private FastAPI `POST /v1/explain` endpoint with a shared service token. The user initiates this action explicitly; it is rate limited and does not run automatically. `OPENAI_API_KEY` stays in the AI service, and no provider request is made when service credentials are missing.

New confluence assessments preserve an immutable snapshot of the strategy name/timeframe and each rule's ID, category, condition, priority, and matched status. Both standard and AI explanations use this historical snapshot instead of reading subsequently edited strategy details. Legacy assessments without snapshots must be evaluated again. Apply migration `1760000000014-preserve-assessed-rules.ts` before using this feature. The AI payload includes rule matches, not individual weights, so it explains matches and uncertainty rather than recalculating weighted contributions.

The OpenAI Responses adapter validates a structured summary, limitations, and rule references. Unknown or duplicate rule references, refusals, incomplete responses, and provider errors are rejected. Responses are bounded and credentials/provider details are never copied into errors. The saved record includes model, provider, generation time, references, limitations, and `contextSource: manual`.

Current observations are entered manually: AI receives no independently verified live context, makes no new market-data call, and does not recompute the score or issue trades. The interface exposes this limitation alongside the explanation. Automated scanned evidence is a later Phase 3 milestone.
