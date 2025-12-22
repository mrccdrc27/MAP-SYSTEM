"""Compatibility wrapper for legacy API module `api.supplier`.

This module previously contained proxy views for the Contexts service. The
project now consolidates all Contexts-related proxy views in
`assets_ms.api.contexts`. To remain backward compatible for imports, this
file re-exports the classes and emits a DeprecationWarning when imported.
"""
from __future__ import annotations

import warnings

from .contexts import SupplierListProxy, SupplierDetailProxy

warnings.warn(
    "assets_ms.api.supplier is deprecated; import from assets_ms.api.contexts instead",
    DeprecationWarning,
)

__all__ = ["SupplierListProxy", "SupplierDetailProxy"]
