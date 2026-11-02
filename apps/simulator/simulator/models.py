"""Espelho em Pydantic do TelemetryReadingSchema de packages/contracts."""

from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, field_serializer

Sensor = Literal["temperature", "vibration", "rpm"]
Status = Literal["running", "idle", "fault"]


class Metrics(BaseModel):
    temperature: float | None = None
    vibration: float | None = None
    rpm: float | None = None


class TelemetryReading(BaseModel):
    readingId: str
    assetId: str
    ts: datetime
    metrics: Metrics
    status: Status

    @field_serializer("ts")
    def _ts_as_utc_z(self, value: datetime) -> str:
        # O contrato (z.iso.datetime) exige sufixo Z; isoformat() daria +00:00.
        return value.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.") + f"{value.microsecond // 1000:03d}Z"

    def to_json(self) -> str:
        return self.model_dump_json(exclude_none=True)


class Machine(BaseModel):
    id: str
    name: str
    sector: str
    sensors: list[Sensor]
    profile: Literal["heating", "shaky", "steady", "intermittent", "faulty"]