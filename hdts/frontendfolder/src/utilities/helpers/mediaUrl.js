import { API_CONFIG } from '../../config/environment';

export function resolveMediaUrl(imgCandidate) {
  if (!imgCandidate) return null;

  // If it's an object with url/path
  try {
    if (typeof imgCandidate === 'object' && imgCandidate !== null) {
      const urlVal = imgCandidate.url || imgCandidate.image || imgCandidate.path;
      if (urlVal && typeof urlVal === 'string') {
        if (urlVal.startsWith('data:') || urlVal.startsWith('http')) return urlVal;
        const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || `${API_CONFIG.BACKEND.BASE_URL.replace(/\/$/, '')}/media/`;
        const clean = urlVal.startsWith('/') ? urlVal.slice(1) : urlVal;
        return `${MEDIA_URL}${clean}`;
      }
    }

    // If it's a string
    if (typeof imgCandidate === 'string') {
      if (imgCandidate.startsWith('data:') || imgCandidate.startsWith('http')) return imgCandidate;
      const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || `${API_CONFIG.BACKEND.BASE_URL.replace(/\/$/, '')}/media/`;
      let candidate = imgCandidate.trim();
      candidate = candidate.replace(/^\/?media\//, '');
      const clean = candidate.startsWith('/') ? candidate.slice(1) : candidate;
      return `${MEDIA_URL}${clean}`;
    }
  } catch (e) {
    // ignore and fallthrough
  }

  return null;
}
