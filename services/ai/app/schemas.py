"""Bounded contracts shared by the internal API and the provider adapter."""

import math
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, JsonValue, model_validator

ShortText = Annotated[str, Field(min_length=1, max_length=80)]
Condition = Annotated[str, Field(min_length=1, max_length=1000)]
RuleId = Annotated[str, Field(min_length=1, max_length=64)]


class StrictModel(BaseModel):
    model_config = ConfigDict(
        extra="forbid", strict=True, str_strip_whitespace=True, revalidate_instances="always"
    )


class StrategyContext(StrictModel):
    name: Annotated[str, Field(min_length=1, max_length=160)]
    timeframe: Annotated[str, Field(min_length=1, max_length=32)] | None


class Assessment(StrictModel):
    score: Annotated[float, Field(ge=0, le=100, allow_inf_nan=False)]
    outcome: Literal["qualified", "insufficient"]


class Observation(StrictModel):
    category: ShortText
    condition: Condition


class Rule(Observation):
    id: RuleId


def validate_context(value: JsonValue, depth: int = 0) -> None:
    if depth > 6:
        raise ValueError("Market context nesting is too deep.")
    if isinstance(value, dict):
        if len(value) > 64 or any(not key.strip() or len(key) > 80 for key in value):
            raise ValueError("Market context contains too many or invalid fields.")
        for nested in value.values():
            validate_context(nested, depth + 1)
    elif isinstance(value, list):
        if len(value) > 64:
            raise ValueError("Market context contains too many items.")
        for nested in value:
            validate_context(nested, depth + 1)
    elif isinstance(value, str) and len(value) > 2000:
        raise ValueError("Market context text is too long.")
    elif isinstance(value, float) and not math.isfinite(value):
        raise ValueError("Market context numbers must be finite.")


class ExplainRequest(StrictModel):
    strategy: StrategyContext
    assessment: Assessment
    matchedRules: Annotated[list[Rule], Field(max_length=100)]
    unmatchedRules: Annotated[list[Rule], Field(max_length=100)]
    observations: Annotated[list[Observation], Field(max_length=100)]
    marketContext: dict[str, JsonValue] | None

    @model_validator(mode="after")
    def validate_evidence(self) -> "ExplainRequest":
        rules = self.matchedRules + self.unmatchedRules
        if len(rules) > 100:
            raise ValueError("At most 100 rules may be explained.")
        if len({rule.id for rule in rules}) != len(rules):
            raise ValueError("Supplied rule IDs must be unique.")
        if self.marketContext is not None:
            validate_context(self.marketContext)
        return self


class ExplanationPayload(StrictModel):
    summary: Annotated[str, Field(min_length=1, max_length=1800)]
    limitations: Annotated[
        list[Annotated[str, Field(min_length=1, max_length=400)]],
        Field(max_length=8),
    ]
    ruleReferences: Annotated[list[RuleId], Field(max_length=100)]


class ExplainResponse(ExplanationPayload):
    provider: Literal["openai"]
    model: Annotated[str, Field(min_length=1, max_length=100)]
    generatedAt: str
