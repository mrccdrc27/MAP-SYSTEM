// Knowledge Base Service - Backend Adapter
// This adapts the backend article API to match the expected kbService interface
import { backendArticleService } from './backend/articleService';
import { TICKET_CATEGORIES } from '../shared/constants/ticketCategories';

// Helper to capitalize visibility string
const capitalizeVisibility = (visibility) => {
  const map = {
    'employee': 'Employee',
    'ticket coordinator': 'Ticket Coordinator',
    'system admin': 'System Admin'
  };
  return map[visibility.toLowerCase()] || 'Employee';
};

// Helper to normalize visibility from backend
const normalizeVisibility = (v) => {
  if (!v) return v;
  const s = String(v).trim().toLowerCase();
  if (s === 'system admin' || s === 'system_admin' || s === 'admin') return 'System Admin';
  if (s === 'ticket coordinator' || s === 'coordinator' || s === 'ticket_coordinator') return 'Ticket Coordinator';
  if (s === 'employee' || s === 'staff' || s === 'everyone') return 'Employee';
  return v.replace(/\b\w/g, c => c.toUpperCase());
};

// --- In-memory seeds & mocks (used by the mock kb service) ---
// These provide a minimal dataset so the service functions can operate
// without an external dependency during development.
const categoriesSeed = [
  { id: 1, name: 'IT Support' },
  { id: 2, name: 'Asset Check In' },
  { id: 3, name: 'Asset Check Out' },
];

const articlesSeed = [
  {
    id: 1001,
    title: 'How to reset your password',
    content: 'Step-by-step instructions to reset your password.',
    category_id: 1,
    visibility: 'Employee',
    date_created: new Date().toISOString(),
    date_modified: new Date().toISOString(),
    archived: false,
  },
  {
    id: 1002,
    title: 'Asset checkout procedure',
    content: 'How to properly check out company assets.',
    category_id: 3,
    visibility: 'Ticket Coordinator',
    date_created: new Date().toISOString(),
    date_modified: new Date().toISOString(),
    archived: false,
  }
];

const feedbackSeed = [
  { id: 1, articleId: 1001, helpful: true, comment: 'Very useful', date: new Date().toISOString() }
];

// Live in-memory collections
let mockCategories = JSON.parse(JSON.stringify(categoriesSeed));
let mockArticles = JSON.parse(JSON.stringify(articlesSeed)).map(a => ({ ...a, visibility: normalizeVisibility(a.visibility) }));
let mockFeedback = JSON.parse(JSON.stringify(feedbackSeed));

// Simple history store keyed by article id
const mockHistory = {}; // { [articleId]: [ { action, timestamp, by, changes } ] }

const pushHistory = (articleId, action, changes = {}, by = 'system') => {
  const entry = { action, timestamp: new Date().toISOString(), by, changes };
  mockHistory[articleId] = mockHistory[articleId] || [];
  mockHistory[articleId].push(entry);
};

export const listCategories = () => {
  // Try backend first, fallback to in-memory mockCategories
  return backendArticleService.getCategoryChoices()
    .then((choices) => {
      // Some backends return an object { categories: [...] }
      if (choices && typeof choices === 'object' && !Array.isArray(choices) && Array.isArray(choices.categories)) {
        choices = choices.categories;
      }
      // If backend returns an array of choices, normalize to {id, name}
      // NOTE: some backends expose categories as strings (e.g. 'IT Support').
      // Use the category value itself as `id` so it matches article.category strings.
      if (Array.isArray(choices)) {
        if (choices.length) {
          return choices.map((c, idx) => {
            // Handle common shapes: string, { value, label }, { id, name }, or other objects
            if (typeof c === 'string') return { id: c, name: c };
            if (c && (c.value || c.id || c.name)) {
              const id = c.value ?? c.id ?? c.name ?? String(idx + 1);
              const name = c.label ?? c.name ?? c.value ?? c.id ?? String(c);
              return { id, name };
            }
            return { id: String(idx + 1), name: String(c) };
          });
        }
        // Empty array from backend: return it so callers can derive categories from articles
        return [];
      }
      // Not an array: fall back to mock categories
      return Promise.resolve([...mockCategories]);
    })
    .catch(() => Promise.resolve([...mockCategories]));
};

export const listArticles = (filters = {}) => {
  // Try to fetch from backend and apply filters client-side as needed.
  // If caller passed pagination params (page, page_size), forward them so server-side pagination works.
  const params = {};
  if (filters.page) params.page = filters.page;
  if (filters.page_size) params.page_size = filters.page_size;
  const isServerRequest = Boolean(filters.page || filters.page_size || filters.serverSide);

  return backendArticleService.getAllArticles(params)
    .then((articles) => {
      // Support multiple backend shapes: array OR paginated object { results: [...] } OR { data: [...] }
      let rawList = [];
      let meta = null;
      if (Array.isArray(articles)) rawList = articles;
      else if (articles && Array.isArray(articles.results)) { rawList = articles.results; meta = articles; }
      else if (articles && Array.isArray(articles.data)) { rawList = articles.data; meta = articles; }
      else rawList = [];

      let results = rawList.length ? rawList.map(a => ({
        id: a.id,
        title: a.title || a.name || a.subject,
        content: a.content || a.body || a.description || '',
        category_id: a.category_id || (a.category && a.category.id) || a.category || null,
        visibility: normalizeVisibility(a.visibility || a.access || a.role || 'Employee'),
        date_created: a.date_created || a.created_at || a.created || new Date().toISOString(),
        date_modified: a.date_modified || a.updated_at || a.updated || new Date().toISOString(),
        archived: !!a.archived || !!a.is_archived || false,
      })) : [...mockArticles];

      // If backend returned meta (count/next/previous) and caller explicitly
      // requested server-side pagination (passed page/page_size or serverSide flag),
      // return the wrapped shape so callers can use meta.count for total items.
      if (meta && isServerRequest) {
        return { results, meta };
      }
      return results;

      if (filters.category_id) results = results.filter(a => a.category_id === filters.category_id || a.categoryId === filters.category_id);
      if (filters.visibility) results = results.filter(a => a.visibility === filters.visibility);
      if (filters.query) {
        const q = filters.query.toLowerCase();
        results = results.filter(a => (a.title || '').toLowerCase().includes(q) || (a.content || '').toLowerCase().includes(q));
      }
      return results;
    })
    .catch(() => {
      // Fallback to mock data on error
      let results = [...mockArticles];
      if (filters.category_id) results = results.filter(a => a.category_id === filters.category_id || a.categoryId === filters.category_id);
      if (filters.visibility) results = results.filter(a => a.visibility === filters.visibility);
      if (filters.query) {
        const q = filters.query.toLowerCase();
        results = results.filter(a => a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q));
      }
      return results;
    });
};

export const getArticle = (id) => {
  return backendArticleService.getArticleById(id)
    .then((a) => {
      if (!a) return null;
      return {
          id: a.id,
          // prefer common fields, fallback to subject for some backends
          title: a.title || a.name || a.subject,
          content: a.content || a.body || a.description,
          category_id: a.category_id || (a.category && a.category.id) || a.category,
          visibility: normalizeVisibility(a.visibility || a.access || 'Employee'),
          date_created: a.date_created || a.created_at,
          date_modified: a.date_modified || a.updated_at,
          archived: !!a.archived || !!a.is_archived,
          versions: Array.isArray(a.versions) ? a.versions : (a.versions || []),
        };
    })
    .catch(() => Promise.resolve(mockArticles.find(a => a.id === Number(id)) || null));
};

/**
 * Fetch a specific version for an article. Tries backend endpoint first,
 * falls back to retrieving the article and locating the version in the
 * article. `versionIdentifier` may be a numeric id, version number string,
 * or the index.
 */
export const getArticleVersion = async (articleId, versionIdentifier) => {
  // Try backend dedicated endpoint if available
  try {
    if (typeof backendArticleService.getArticleVersion === 'function') {
      const v = await backendArticleService.getArticleVersion(articleId, versionIdentifier);
      if (v) {
        return {
          id: v.id ?? null,
          number: v.number ?? v.version ?? v.id ?? null,
          date: v.date || v.updated_at || v.dateModified || v.modified || null,
          author: v.author || v.editor || v.updatedBy || null,
          changes: v.changes || v.summary || v.description || v.notes || '',
          visibility: normalizeVisibility(v.visibility || v.access || 'Employee'),
          content: v.content || v.body || v.text || v.html || v.raw || '',
        };
      }
    }
  } catch (err) {
    // backend may not implement versions endpoint; fall through
    console.warn('backend getArticleVersion failed:', err);
  }

  // Fallback: fetch full article and locate version by number/id/index
  try {
    const a = await getArticle(articleId);
    if (!a) return null;
    const versions = Array.isArray(a.versions) ? a.versions : [];
    if (!versions.length) return null;

    // If versionIdentifier is numeric index or id, try to find by id
    let found = null;
    if (versionIdentifier === undefined || versionIdentifier === null) {
      found = versions[0];
    } else {
      // try match by number or id or numeric index
      found = versions.find(v => String(v.number) === String(versionIdentifier) || String(v.id) === String(versionIdentifier));
      if (!found) {
        const idx = Number(versionIdentifier);
        if (!Number.isNaN(idx) && idx >= 0 && idx < versions.length) found = versions[idx];
      }
    }

    if (!found) return null;
    return {
      id: found.id ?? null,
      number: found.number ?? found.version ?? null,
      date: found.date || found.updated_at || found.dateModified || found.modified || null,
      author: found.author || found.editor || null,
      changes: found.changes || found.summary || found.description || found.notes || '',
      visibility: normalizeVisibility(found.visibility || 'Employee'),
      content: found.content || found.body || found.text || found.html || found.raw || '',
    };
  } catch (err) {
    console.warn('kbService.getArticleVersion fallback failed:', err);
    return null;
  }
};

export const submitArticle = (article) => {
  // Map frontend article shape -> backend serializer expected fields
  const payload = {
    subject: article.title || article.subject,
    description: article.content || article.description,
    // backend expects category to match ARTICLE_CATEGORY_CHOICES values
    category: article.category_id ?? article.category ?? null,
    visibility: normalizeVisibility(article.visibility || article.access || 'Employee'),
    is_archived: !!article.archived,
  };

  // include tags or author in metadata if provided
  if (article.tags) payload.tags = article.tags;
  if (article.author) payload.author = article.author;

  // Prefer backend create, fallback to mock
  return backendArticleService.createArticle(payload)
    .then(a => ({
      id: a.id,
      title: a.subject || a.title || a.name,
      content: a.description || a.content || a.body,
      category_id: a.category || a.category_id || null,
      visibility: normalizeVisibility(a.visibility || a.access || 'Employee'),
      date_created: a.created_at || a.date_created || new Date().toISOString(),
      date_modified: a.updated_at || a.date_modified || new Date().toISOString(),
      archived: !!a.is_archived || !!a.archived,
    }))
    .catch(() => {
      // fallback to in-memory behavior
      const id = mockArticles.length ? Math.max(...mockArticles.map(a => a.id)) + 1 : 1001;
      const now = new Date().toISOString().slice(0,10);
      const newArticle = { 
        id, 
        title: article.title,
        content: article.content,
        category_id: article.category_id,
        visibility: normalizeVisibility(article.visibility || 'Employee'),
        date_created: now,
        dateCreated: now,
        date_modified: now,
        dateModified: now,
        archived: !!article.archived
      };
      mockArticles.push(newArticle);
      return Promise.resolve(newArticle);
    });
};

export const updateArticle = (id, patch = {}) => {
  // Translate frontend patch keys to backend serializer expected keys
  const backendPatch = {};
  if ('title' in patch) backendPatch.subject = patch.title;
  if ('content' in patch) backendPatch.description = patch.content;
  if ('category_id' in patch) backendPatch.category = patch.category_id;
  if ('category' in patch) backendPatch.category = patch.category;
  if ('archived' in patch) backendPatch.is_archived = !!patch.archived;
  if ('is_archived' in patch) backendPatch.is_archived = !!patch.is_archived;
  if ('visibility' in patch) backendPatch.visibility = normalizeVisibility(patch.visibility);
  // pass-through other fields (tags, author) if present
  if ('tags' in patch) backendPatch.tags = patch.tags;

  // Prefer backend update, fallback to mock
  return backendArticleService.updateArticle(id, backendPatch)
    .then(a => ({
      id: a.id,
      title: a.subject || a.title || a.name,
      content: a.description || a.content || a.body,
      category_id: a.category || a.category_id || null,
      visibility: normalizeVisibility(a.visibility || a.access || 'Employee'),
      date_created: a.created_at || a.date_created || new Date().toISOString(),
      date_modified: a.updated_at || a.date_modified || new Date().toISOString(),
      archived: !!a.is_archived || !!a.archived,
    }))
    .catch(() => {
      const idx = mockArticles.findIndex(a => a.id === Number(id));
      if (idx === -1) return Promise.resolve(null);
      const now = new Date().toISOString().slice(0,10);
      mockArticles[idx] = { 
        ...mockArticles[idx], 
        ...patch, 
        date_modified: now,
        dateModified: now
      };
      return Promise.resolve(mockArticles[idx]);
    });
};

export const archiveArticle = (articleId) => {
  // Prefer backend custom archive endpoint, fallback to updateArticle
  return backendArticleService.archiveArticle(articleId)
    .then(a => ({
      id: a.id,
      title: a.title || a.name,
      content: a.content || a.body || a.description,
      category_id: a.category_id || (a.category && a.category.id) || a.category,
      visibility: normalizeVisibility(a.visibility || a.access || 'Employee'),
      date_created: a.date_created || a.created_at || new Date().toISOString(),
      date_modified: a.date_modified || a.updated_at || new Date().toISOString(),
      archived: !!a.archived || !!a.is_archived || false,
    }))
    .catch(() => {
      // fallback to mock behavior
      const idx = mockArticles.findIndex(a => a.id === Number(articleId));
      if (idx === -1) return Promise.resolve(null);
      mockArticles[idx].archived = true;
      return Promise.resolve(mockArticles[idx]);
    });
};

export const restoreArticle = (articleId) => {
  // Prefer backend custom restore endpoint, fallback to updateArticle
  return backendArticleService.restoreArticle(articleId)
    .then(a => ({
      id: a.id,
      title: a.title || a.name,
      content: a.content || a.body || a.description,
      category_id: a.category_id || (a.category && a.category.id) || a.category,
      visibility: normalizeVisibility(a.visibility || a.access || 'Employee'),
      date_created: a.date_created || a.created_at || new Date().toISOString(),
      date_modified: a.date_modified || a.updated_at || new Date().toISOString(),
      archived: !!a.archived || !!a.is_archived || false,
    }))
    .catch(() => {
      // fallback to mock behavior
      const idx = mockArticles.findIndex(a => a.id === Number(articleId));
      if (idx === -1) return Promise.resolve(null);
      mockArticles[idx].archived = false;
      return Promise.resolve(mockArticles[idx]);
    });
};

export const listPublishedArticles = (filters = {}) => {
  // Use backend when available, fallback to mock. Published = not archived.
  return backendArticleService.getAllArticles()
    .then((articles) => {
      // Support paginated or wrapped responses as in listArticles
      let rawList = [];
      let meta = null;
      if (Array.isArray(articles)) rawList = articles;
      else if (articles && Array.isArray(articles.results)) { rawList = articles.results; meta = articles; }
      else if (articles && Array.isArray(articles.data)) { rawList = articles.data; meta = articles; }
      else rawList = [];

      let results = rawList.length ? rawList.map(a => ({
        id: a.id,
        // include subject fallback because some backends use `subject` instead of `title`
        title: a.title || a.name || a.subject,
        content: a.content || a.body || a.description,
        category_id: a.category_id || (a.category && a.category.id) || a.category || null,
        visibility: normalizeVisibility(a.visibility || a.access || 'Employee'),
        date_created: a.date_created || a.created_at || new Date().toISOString(),
        date_modified: a.date_modified || a.updated_at || new Date().toISOString(),
        archived: !!a.archived || !!a.is_archived || false,
      })) : [...mockArticles];

      if (meta && isServerRequest) return { results, meta };
      return results;

      results = results.filter(a => !a.archived);
      if (filters.category_id) results = results.filter(a => a.category_id === filters.category_id || a.categoryId === filters.category_id);
      if (filters.visibility) results = results.filter(a => a.visibility === filters.visibility);
      if (filters.query) {
        const q = filters.query.toLowerCase();
        results = results.filter(a => (a.title || '').toLowerCase().includes(q) || (a.content || '').toLowerCase().includes(q));
      }
      return results;
    })
    .catch(() => {
      let results = [...mockArticles].filter(a => !a.archived);
      if (filters.category_id) results = results.filter(a => a.category_id === filters.category_id || a.categoryId === filters.category_id);
      if (filters.visibility) results = results.filter(a => a.visibility === filters.visibility);
      if (filters.query) {
        const q = filters.query.toLowerCase();
        results = results.filter(a => a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q));
      }
      return results;
    });
};

export const resetSeeds = () => {
  mockCategories = JSON.parse(JSON.stringify(categoriesSeed));
  mockArticles = JSON.parse(JSON.stringify(articlesSeed)).map(a => ({ ...a, visibility: normalizeVisibility(a.visibility) }));
  mockFeedback = JSON.parse(JSON.stringify(feedbackSeed));
};

export const listFeedback = (articleId) => {
  // Return a Promise to match async usage in UI (e.g. .then)
  return Promise.resolve(mockFeedback.filter(f => f.articleId === Number(articleId)));
};

export const submitFeedback = ({ articleId, helpful, comment }) => {
  const id = mockFeedback.length ? Math.max(...mockFeedback.map(f => f.id)) + 1 : 1;
  const entry = { id, articleId: Number(articleId), helpful: !!helpful, comment: comment || '', date: new Date().toISOString() };
  mockFeedback.push(entry);
  return Promise.resolve(entry);
};

export const getHistory = (articleId) => {
  return Promise.resolve(mockHistory[Number(articleId)] || []);
};

export const deleteArticle = (id) => {
  return backendArticleService.deleteArticle(id)
    .then(() => Promise.resolve(true))
    .catch(() => {
      const idx = mockArticles.findIndex(a => a.id === Number(id));
      if (idx === -1) return Promise.resolve(false);
      const removed = mockArticles.splice(idx, 1)[0];
      pushHistory(Number(id), 'deleted', { removed }, 'system');
      return Promise.resolve(true);
    });
};

// default export includes main conveniences for imports that use default
export default {
  listCategories,
  listArticles,
  listPublishedArticles,
  getArticle,
  getArticleVersion,
  submitArticle,
  updateArticle,
  archiveArticle,
  restoreArticle,
  getHistory,
  listFeedback,
  submitFeedback,
  deleteArticle,
  resetSeeds,
};
