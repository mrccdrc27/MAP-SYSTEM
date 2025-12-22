import os
from urllib.parse import urljoin, urlparse
import logging
import time
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


ASSETS_API_URL = os.getenv("ASSETS_API_URL", "http://assets:8002/")


def _build_session():
    s = requests.Session()
    retries = Retry(
        total=3,
        backoff_factor=0.2,
        status_forcelist=(500, 502, 503, 504),
        allowed_methods=frozenset(["GET", "POST", "PUT", "PATCH", "DELETE"]),
    )
    adapter = HTTPAdapter(max_retries=retries)
    s.mount("http://", adapter)
    s.mount("https://", adapter)
    return s


_SESSION = _build_session()

# module logger
logger = logging.getLogger(__name__)


def _make_url(path: str) -> str:
    # If user passes a full URL, return as-is. Otherwise join with base assets URL.
    if not path:
        return ASSETS_API_URL
    if path.startswith("http://") or path.startswith("https://"):
        return path
    return urljoin(ASSETS_API_URL, path)


def _format_display_path(url: str, original_path: str) -> str:
    """Return a compact display path for logs.

    Prefer the relative path when the url is under the configured ASSETS_API_URL,
    otherwise return the URL path (including query) or the original path string.
    """
    try:
        parsed = urlparse(url)
    except Exception:
        # fallback to original path if parsing fails
        return original_path or url

    # If the URL starts with the configured base, show the relative part
    if ASSETS_API_URL and url.startswith(ASSETS_API_URL):
        rel = url[len(ASSETS_API_URL):]
        if not rel.startswith("/"):
            rel = f"/{rel}"
        # include query if present
        if parsed.query:
            rel = f"{rel}?{parsed.query}"
        return rel

    # Otherwise return path + optional query
    display = parsed.path or original_path or url
    if parsed.query:
        display = f"{display}?{parsed.query}"
    return display


def get(path: str, params=None, timeout: float = 5, **kwargs):
    url = _make_url(path)
    display = _format_display_path(url, path)
    start = time.monotonic()
    try:
        resp = _SESSION.get(url, params=params, timeout=timeout, **kwargs)
        elapsed_ms = (time.monotonic() - start) * 1000
        logger.info(f"[HTTP] GET {display} → {resp.status_code} ({elapsed_ms:.1f}ms)")
        return resp
    except requests.RequestException as exc:
        elapsed_ms = (time.monotonic() - start) * 1000
        logger.warning(f"[HTTP] GET {display} → ERROR ({elapsed_ms:.1f}ms) {exc}")
        raise


def post(path: str, json=None, data=None, timeout: float = 5, **kwargs):
    url = _make_url(path)
    display = _format_display_path(url, path)
    start = time.monotonic()
    try:
        resp = _SESSION.post(url, json=json, data=data, timeout=timeout, **kwargs)
        elapsed_ms = (time.monotonic() - start) * 1000
        logger.info(f"[HTTP] POST {display} → {resp.status_code} ({elapsed_ms:.1f}ms)")
        return resp
    except requests.RequestException as exc:
        elapsed_ms = (time.monotonic() - start) * 1000
        logger.warning(f"[HTTP] POST {display} → ERROR ({elapsed_ms:.1f}ms) {exc}")
        raise


def patch(path: str, json=None, data=None, timeout: float = 5, **kwargs):
    url = _make_url(path)
    display = _format_display_path(url, path)
    start = time.monotonic()
    try:
        resp = _SESSION.patch(url, json=json, data=data, timeout=timeout, **kwargs)
        elapsed_ms = (time.monotonic() - start) * 1000
        logger.info(f"[HTTP] PATCH {display} → {resp.status_code} ({elapsed_ms:.1f}ms)")
        return resp
    except requests.RequestException as exc:
        elapsed_ms = (time.monotonic() - start) * 1000
        logger.warning(f"[HTTP] PATCH {display} → ERROR ({elapsed_ms:.1f}ms) {exc}")
        raise


def delete(path: str, timeout: float = 5, **kwargs):
    url = _make_url(path)
    display = _format_display_path(url, path)
    start = time.monotonic()
    try:
        resp = _SESSION.delete(url, timeout=timeout, **kwargs)
        elapsed_ms = (time.monotonic() - start) * 1000
        logger.info(f"[HTTP] DELETE {display} → {resp.status_code} ({elapsed_ms:.1f}ms)")
        return resp
    except requests.RequestException as exc:
        elapsed_ms = (time.monotonic() - start) * 1000
        logger.warning(f"[HTTP] DELETE {display} → ERROR ({elapsed_ms:.1f}ms) {exc}")
        raise
