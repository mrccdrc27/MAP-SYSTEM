// Backend article service for Knowledge Base
import { API_CONFIG } from '../../config/environment.js';

const BASE_URL = API_CONFIG.BACKEND.BASE_URL;

// Cache whether the backend supports the per-version endpoint to avoid
// repeated 404 requests during a session. undefined = unknown, true/false = cached result.
let _supportsVersionEndpoint;

// Helper function to get auth headers (no manual cookie reading needed with httpOnly cookies)
const getAuthHeaders = () => {
  return {
    'Content-Type': 'application/json',
  };
};

// Helper function to get fetch options with proper cookie-based authentication
const getFetchOptions = (method = 'GET', body = null) => {
  const options = {
    method,
    credentials: 'include', // Essential for httpOnly cookie-based auth
    headers: getAuthHeaders(),
  };
  
  if (body) {
    options.body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  
  return options;
};

// Helper to handle 401 errors by logging out immediately
const handleAuthError = (response) => {
  if (response.status === 401) {
    console.log('Session expired (articleService). Dispatching auth:expired event.');
    try {
      window.dispatchEvent(new CustomEvent('auth:expired'));
    } catch (e) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('loggedInUser');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    throw new Error('Session expired. Please log in again.');
  }
};

export const backendArticleService = {
  /**
   * Get all knowledge articles
   */
  // Accept an optional params object { page, page_size, ... } which will be encoded
  async getAllArticles(params = {}) {
    try {
      // Build query string from params
      const qs = Object.keys(params || {}).length
        ? `?${Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')}`
        : '';
      const response = await fetch(`${BASE_URL}/api/articles/${qs}`, getFetchOptions('GET'));

      handleAuthError(response);

      if (!response.ok) {
        throw new Error('Failed to fetch articles');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching articles:', error);
      return [];
    }
  },

  /**
   * Optional: fetch category choices from backend if the API exposes them.
   * Some backends expose an endpoint like /api/articles/choices/ that returns
   * available category choices. This helper will try that and return [] on failure.
   */
  async getCategoryChoices() {
    try {
      const response = await fetch(`${BASE_URL}/api/articles/choices/`, getFetchOptions('GET'));

      handleAuthError(response);

      if (!response.ok) return [];

      return await response.json();
    } catch (error) {
      // Not all backends expose this endpoint — that's fine, caller should fallback
      return [];
    }
  },

  /**
   * Get a single article by ID
   */
  async getArticleById(articleId) {
    try {
      const response = await fetch(`${BASE_URL}/api/articles/${articleId}/`, getFetchOptions('GET'));

      handleAuthError(response);

      if (!response.ok) {
        throw new Error('Failed to fetch article');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching article:', error);
      throw error;
    }
  },

  /**
   * Create a new knowledge article
   */
  async createArticle(articleData) {
    try {
      const response = await fetch(`${BASE_URL}/api/articles/`, getFetchOptions('POST', articleData));

      handleAuthError(response);

      if (!response.ok) {
        let errorData = null;
        try {
          errorData = await response.json();
        } catch (e) {
          console.error('Failed to parse error response from createArticle', e);
        }
        console.error('Article creation failed, response body:', errorData);
        // Prefer returning validation errors if present
        const msg = (errorData && (errorData.detail || JSON.stringify(errorData))) || 'Failed to create article';
        throw new Error(msg);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating article:', error);
      throw error;
    }
  },

  /**
   * Update an existing article (PATCH)
   */
  async updateArticle(articleId, articleData) {
    try {
      const response = await fetch(`${BASE_URL}/api/articles/${articleId}/`, getFetchOptions('PATCH', articleData));

      handleAuthError(response);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update article');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating article:', error);
      throw error;
    }
  },

  /**
   * Archive an article (custom endpoint)
   */
  async archiveArticle(articleId) {
    try {
      const response = await fetch(`${BASE_URL}/api/articles/${articleId}/archive/`, getFetchOptions('POST'));

      handleAuthError(response);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to archive article');
      }

      return await response.json();
    } catch (error) {
      console.error('Error archiving article:', error);
      throw error;
    }
  },

  /**
   * Restore an archived article (custom endpoint)
   */
  async restoreArticle(articleId) {
    try {
      const response = await fetch(`${BASE_URL}/api/articles/${articleId}/restore/`, getFetchOptions('POST'));

      handleAuthError(response);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to restore article');
      }

      return await response.json();
    } catch (error) {
      console.error('Error restoring article:', error);
      throw error;
    }
  },

  /**
   * Delete an article permanently
   */
  async deleteArticle(articleId) {
    try {
      const response = await fetch(`${BASE_URL}/api/articles/${articleId}/`, getFetchOptions('DELETE'));

      handleAuthError(response);

      if (!response.ok) {
        throw new Error('Failed to delete article');
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting article:', error);
      throw error;
    }
  },

  /**
   * Get a single version of an article (if backend exposes versions endpoint)
   * Falls back to throwing if endpoint not available; callers should handle by
   * fetching the parent article and finding the version locally.
   */
  async getArticleVersion(articleId, versionId) {
    try {
      // If we've previously determined the endpoint is not supported, skip calling it.
      if (_supportsVersionEndpoint === false) return null;
      const response = await fetch(`${BASE_URL}/api/articles/${articleId}/versions/${versionId}/`, getFetchOptions('GET'));

      handleAuthError(response);

      if (!response.ok) {
        // If the backend doesn't expose per-version endpoints, mark the flag
        // and return null so callers can fallback to article.versions.
        if (response.status === 404) {
          _supportsVersionEndpoint = false;
          return null;
        }

        let errorMsg = 'Failed to fetch article version';
        try {
          const errBody = await response.json();
          errorMsg = errBody && (errBody.detail || JSON.stringify(errBody)) || errorMsg;
        } catch (e) {
          // ignore parse errors
        }
        throw new Error(errorMsg);
      }

      // Successful response — mark support true and return parsed body
      _supportsVersionEndpoint = true;
      return await response.json();
    } catch (error) {
      // Log at debug level and return null so callers can fall back silently.
      console.warn('getArticleVersion failed:', error);
      return null;
    }
  },
};
