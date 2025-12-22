"""Compatibility wrapper for the legacy supplier helper.

This module existed previously as a standalone implementation. The codebase
now uses `assets_ms.services.contexts` as the single source of truth for
Context service integration. To preserve backwards compatibility, this file
re-exports the public helpers from `services.contexts` and emits a
DeprecationWarning when imported.
"""
from __future__ import annotations

import warnings

from .contexts import (
    fetch_suppliers_from_remote,
    get_suppliers,
    get_supplier_by_id,
)

# Deprecation notice for developers
warnings.warn(
    "assets_ms.services.supplier is deprecated; use assets_ms.services.contexts instead",
    DeprecationWarning,
)

__all__ = [
    "fetch_suppliers_from_remote",
    "get_suppliers",
    "get_supplier_by_id",
]
