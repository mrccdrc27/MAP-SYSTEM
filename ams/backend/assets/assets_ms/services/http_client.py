import os
import requests
from urllib.parse import urljoin
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from django.conf import settings


# Allow overriding via Django settings or env var
BASE_URL = getattr(settings, "CONTEXTS_API_URL", os.getenv("CONTEXTS_API_URL", "http://contexts-service:8003/"))


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


def _make_url(path: str) -> str:
    if not path:
        return BASE_URL
    if path.startswith("http://") or path.startswith("https://"):
        return path
    return urljoin(BASE_URL, path)

def get(path: str, params=None, timeout: float = 5, **kwargs):
    url = _make_url(path)
    return _SESSION.get(url, params=params, timeout=timeout, **kwargs)

def post(path: str, data=None, json=None, timeout: float = 5, **kwargs):
    url = _make_url(path)
    return _SESSION.post(url, data=data, json=json, timeout=timeout, **kwargs)

def patch(path: str, data=None, json=None, timeout: float = 5, **kwargs):
    url = _make_url(path)
    return _SESSION.patch(url, data=data, json=json, timeout=timeout, **kwargs)

def put(path: str, data=None, json=None, timeout: float = 5, **kwargs):
    url = _make_url(path)
    return _SESSION.put(url, data=data, json=json, timeout=timeout, **kwargs)

def delete(path: str, timeout: float = 5, **kwargs):
    url = _make_url(path)
    return _SESSION.delete(url, timeout=timeout, **kwargs)