"""Application configuration utilities."""

from __future__ import annotations

import json
from functools import lru_cache
from typing import List, Sequence

from pydantic import Field, HttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central application settings loaded from environment variables."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    api_prefix: str = Field(default="/api")
    allow_origins: List[str] = Field(default_factory=lambda: ["*"])
    log_level: str = Field(default="INFO")

    # Daily / RTC configuration
    daily_api_key: str | None = Field(default=None)
    daily_api_url: str = Field(default="https://api.daily.co/v1")
    daily_sample_room_url: str | None = Field(default=None)
    daily_room_exp_minutes: int = Field(default=2, ge=1)
    daily_token_exp_minutes: int = Field(default=2, ge=1)
    mock_daily: bool = Field(default=False)

    # Google Gemini Live configuration
    google_api_key: str | None = Field(default=None)
    google_model: str = Field(default="models/gemini-2.0-flash-live-001")
    google_voice_id: str = Field(default="Puck")
    google_language: str = Field(default="en-US")
    google_region: str | None = Field(default=None)
    system_instruction: str = Field(
        default=(
            "You are a helpful voice concierge for Pipecat demos."
            " Keep responses short, upbeat, and free of emojis."
        )
    )

    # Bot + session lifecycle
    bot_name: str = Field(default="Pipecat Gemini Live")
    session_ttl_seconds: int = Field(default=900, ge=60)
    cleanup_interval_seconds: int = Field(default=60, ge=10)
    bot_runner_enabled: bool = Field(default=True)
    enable_video_pipeline: bool = Field(
        default=False,
        description="Feature flag for staging Gemini Live video-specific pipeline logic.",
    )

    # Feature flags
    dummy_tokens_enabled: bool = Field(
        default=True,
        description="Allow generating synthetic room/token credentials when Daily API key is absent.",
    )

    @field_validator("allow_origins", mode="before")
    @classmethod
    def _parse_allow_origins(cls, value):
        if value is None:
            return value
        if isinstance(value, list):
            return value
        if isinstance(value, str):
            text = value.strip()
            if not text:
                return []
            if text.startswith("["):
                try:
                    parsed = json.loads(text)
                    if isinstance(parsed, list):
                        return parsed
                except json.JSONDecodeError:
                    pass
            return [item.strip() for item in text.split(",") if item.strip()]
        return value

    @property
    def cors_origins(self) -> Sequence[str | HttpUrl]:
        """Expose allowed origins in FastAPI-friendly format."""

        return self.allow_origins or ["*"]

    @property
    def use_mock_daily(self) -> bool:
        """Determine whether to short-circuit Daily REST calls."""

        return self.mock_daily or not bool(self.daily_api_key)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached settings instance."""

    return Settings()
