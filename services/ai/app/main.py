"""Only1AI AI service entry point. Product AI workflows are added in the Only1Core module."""

from fastapi import FastAPI

app = FastAPI(title="Only1AI AI Service", version="0.1.0")


@app.get("/health", tags=["health"])
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "ai"}
