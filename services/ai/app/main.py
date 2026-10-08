"""Internal AI service: explain deterministic assessments using supplied evidence."""

import asyncio
import hashlib
import hmac
import math
import os
from datetime import datetime, timezone
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from openai import APIError, APITimeoutError, AsyncOpenAI
from pydantic import ValidationError

from app.schemas import ExplainRequest, ExplainResponse
from app.explanation import ExplanationOutputError, explain_assessment
from app.middleware import BoundedBodyMiddleware

app = FastAPI(title="Only1AI AI Service", version="0.2.0")
app.add_middleware(BoundedBodyMiddleware, max_bytes=65_536)
bearer = HTTPBearer(auto_error=False)


def require_service_auth(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> None:
    expected = os.getenv("AI_SERVICE_TOKEN", "").strip()
    if not expected:
        raise HTTPException(status_code=503, detail="AI service is not configured.")
    supplied = credentials.credentials if credentials else ""
    # Fixed-size digests keep the comparison independent of secret/header length.
    valid = hmac.compare_digest(
        hashlib.sha256(supplied.encode("utf-8")).digest(),
        hashlib.sha256(expected.encode("utf-8")).digest(),
    )
    if credentials is None or credentials.scheme.lower() != "bearer" or not valid:
        raise HTTPException(
            status_code=401,
            detail="Service authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )


def provider_timeout_seconds() -> float:
    try:
        configured = float(os.getenv("OPENAI_TIMEOUT_SECONDS", "20"))
    except ValueError:
        configured = 20
    if not math.isfinite(configured):
        configured = 20
    return min(max(configured, 1), 45)


@app.get("/health", tags=["health"])
async def health() -> dict[str, str | bool]:
    return {
        "status": "ok",
        "service": "ai",
        "providerConfigured": bool(
            os.getenv("OPENAI_API_KEY", "").strip()
            and os.getenv("AI_SERVICE_TOKEN", "").strip()
        ),
    }


@app.post(
    "/v1/explain",
    tags=["explanations"],
    response_model=ExplainResponse,
    dependencies=[Depends(require_service_auth)],
)
async def explain(payload: ExplainRequest) -> ExplainResponse:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(status_code=503, detail="AI explanation provider is not configured.")
    model = os.getenv("OPENAI_MODEL", "gpt-5-mini").strip() or "gpt-5-mini"
    if len(model) > 100:
        raise HTTPException(status_code=503, detail="AI explanation provider is not configured.")
    timeout = provider_timeout_seconds()
    try:
        # No retries: one user action must not silently initiate multiple paid requests.
        async with AsyncOpenAI(api_key=api_key, timeout=timeout, max_retries=0) as client:
            async with asyncio.timeout(timeout):
                output = await explain_assessment(client, payload, model)
    except (APITimeoutError, TimeoutError):
        raise HTTPException(status_code=504, detail="AI explanation timed out. Try again.") from None
    except (APIError, ExplanationOutputError, ValidationError):
        # Never expose provider messages, credentials, prompts, or user evidence.
        raise HTTPException(status_code=502, detail="AI explanation could not be generated.") from None
    return ExplainResponse(
        provider="openai",
        model=model,
        summary=output.summary,
        limitations=output.limitations,
        ruleReferences=output.ruleReferences,
        generatedAt=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    )
