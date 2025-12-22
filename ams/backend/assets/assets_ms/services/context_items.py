"""Compatibility wrapper for legacy context_items helpers.

Use `assets_ms.services.contexts` as the single consolidated Contexts
integration module. This file remains to preserve older imports while
forwarding to the new implementation.
"""
from __future__ import annotations

import warnings

from .contexts import (
    get_category_by_id,
    get_manufacturer_by_id,
    get_depreciation_by_id,
)

warnings.warn(
    "assets_ms.services.context_items is deprecated; use assets_ms.services.contexts instead",
    DeprecationWarning,
)

__all__ = [
    "get_category_by_id",
    "get_manufacturer_by_id",
    "get_depreciation_by_id",
]
