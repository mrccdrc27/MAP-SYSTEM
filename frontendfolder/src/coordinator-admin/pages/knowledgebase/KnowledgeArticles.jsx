import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaEdit, FaArchive, FaTimes } from 'react-icons/fa';

import userStyles from '../user-management/CoordinatorAdminUserAccess.module.css';
import knowledgeStyles from './knowledge.module.css';
import TablePagination from '../../../shared/table/TablePagination';
import Button from '../../../shared/components/Button';
import InputField from '../../../shared/components/InputField';
import SysAdminArticlesFilter from '../../components/filters/SysAdminArticlesFilter';
import DeleteConfirmationModal from '../../components/modals/SysAdminDeleteConfirmationModal';
import ArchiveConfirmationModal from '../../components/modals/SysAdminArchiveConfirmationModal';
import kbService from '../../../services/kbService';
import authService from '../../../utilities/service/authService';
import Skeleton from '../../../shared/components/Skeleton/Skeleton';

const KnowledgeArticles = () => {
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [serverSide, setServerSide] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({});
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, article: null, isDeleting: false });
  const [archiveModal, setArchiveModal] = useState({ isOpen: false, article: null, isArchiving: false });
  const [isAuthorized, setIsAuthorized] = useState(null);

  // Role-based access control - Only System Admin can access
  useEffect(() => {
    const userRole = authService.getUserRole();
    if (userRole !== 'System Admin') {
      setIsAuthorized(false);
      navigate('/admin/dashboard');
    } else {
      setIsAuthorized(true);
    }
  }, [navigate]);

  // appliedFilters is the source of truth for FilterPanel initial state

  // pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetch = async () => {
    setLoading(true);
    try {
      // Try server-aware fetch: request first page with serverSide flag so we can detect meta
      const cats = await kbService.listCategories();
      const firstPage = await kbService.listArticles({ page: 1, page_size: itemsPerPage, serverSide: true });
      setCategories(cats || []);

      // If backend returned wrapped response { results, meta }
      if (firstPage && firstPage.results && firstPage.meta) {
        const results = firstPage.results || [];
        const meta = firstPage.meta || {};
        const total = meta.count ?? meta.total ?? (meta.results_count ?? results.length);
        // Determine server page size (try meta.page_size/limit, fallback to provided itemsPerPage or results.length)
        const pageSize = meta.page_size || meta.page_size || meta.limit || itemsPerPage || results.length || 10;
        const totalPages = Math.max(1, Math.ceil((total || results.length) / pageSize));

        // If only one page, just use results. If multiple pages, fetch remaining pages then combine.
        if (totalPages <= 1) {
          const all = (results || []).filter(a => !a.archived);
          setServerSide(false);
          setArticles(all);
          setTotalCount(all.length || 0);
        } else {
          // Fetch remaining pages in sequence (small number of pages expected)
          const pages = [results];
          for (let p = 2; p <= totalPages; p++) {
            try {
              const pageResp = await kbService.listArticles({ page: p, page_size: pageSize, serverSide: true });
              const pageResults = (pageResp && pageResp.results) ? pageResp.results : [];
              pages.push(pageResults);
            } catch (e) {
              console.warn('Failed to fetch articles page', p, e);
            }
          }
          const combined = pages.flat().filter(a => !a.archived);
          setServerSide(false);
          setArticles(combined);
          setTotalCount(combined.length || 0);
        }
      } else {
        // Backend did not return meta; assume array result
        const list = Array.isArray(firstPage) ? firstPage : (firstPage && firstPage.results ? firstPage.results : []);
        const filteredAll = (list || []).filter(a => !a.archived);
        setServerSide(false);
        setArticles(filteredAll);
        setTotalCount(filteredAll.length || 0);
      }
    } catch (e) {
      // swallow for now
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
    const onCreated = () => fetch();
    window.addEventListener('kb:articleCreated', onCreated);
    window.addEventListener('kb:articleUpdated', onCreated);
    return () => {
      window.removeEventListener('kb:articleCreated', onCreated);
      window.removeEventListener('kb:articleUpdated', onCreated);
    };
  }, [currentPage, itemsPerPage]);

  const getCategoryName = (id) => {
    const c = categories.find(x => String(x.id) === String(id));
    return c ? c.name : 'Uncategorized';
  };

  const normalizeAuthorLabel = (author) => {
    if (!author) return '';
    const s = String(author).toLowerCase();
    if (s.includes('system admin') || s.includes('system administrator') || s.includes('administrator')) return 'System Admin';
    return author;
  };

  const truncate = (text, max = 29) => {
    if (!text) return '';
    const str = String(text);
    if (str.length <= max) return str;
    // show max chars = max (including dots). keep max-3 characters then '...'
    return str.slice(0, Math.max(0, max - 3)) + '...';
  };

  const formatArticleDate = (a) => {
    const dateStr = a.date_created || a.date_modified || '';
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch (e) {
      return dateStr;
    }
  };

  const handleArchive = async (article) => {
    openArchiveModal(article);
  };

  const openArchiveModal = (article) => {
    setArchiveModal({ isOpen: true, article, isArchiving: false });
  };

  const closeArchiveModal = () => {
    setArchiveModal({ isOpen: false, article: null, isArchiving: false });
  };

  const confirmArchive = async () => {
    const article = archiveModal.article;
    if (!article) return;

    setArchiveModal((prev) => ({ ...prev, isArchiving: true }));
    try {
      // Use dedicated archive API instead of PATCHing an unsupported field
      // The backend exposes POST /api/articles/:id/archive/ which the
      // kbService.archiveArticle helper calls.
      if (kbService.archiveArticle) {
        await kbService.archiveArticle(article.id);
      } else {
        await kbService.updateArticle(article.id, { is_archived: true });
      }
      window.dispatchEvent(new CustomEvent('kb:articleUpdated', { detail: { id: article.id } }));
      setArticles((prev) => prev.filter((a) => a.id !== article.id));
      closeArchiveModal();
    } catch (err) {
      console.error('Failed to archive article:', err);
      alert('Failed to archive article');
      setArchiveModal((prev) => ({ ...prev, isArchiving: false }));
    }
  };

  const openDeleteModal = (article) => {
    setDeleteModal({ isOpen: true, article, isDeleting: false });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, article: null, isDeleting: false });
  };

  const confirmDelete = async () => {
    const article = deleteModal.article;
    if (!article) return;

    setDeleteModal((prev) => ({ ...prev, isDeleting: true }));
    try {
      // Use the dedicated delete API (DELETE /api/articles/:id/)
      if (kbService.deleteArticle) {
        await kbService.deleteArticle(article.id);
      } else {
        // Fallback: try PATCHing the actual DB field if helper missing
        await kbService.updateArticle(article.id, { is_archived: false });
      }
      window.dispatchEvent(new CustomEvent('kb:articleUpdated', { detail: { id: article.id } }));
      setArticles((prev) => prev.filter((a) => a.id !== article.id));
      closeDeleteModal();
    } catch (err) {
      console.error('Failed to delete article:', err);
      alert('Failed to delete article');
      setDeleteModal((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  // filtered list according to category/visibility/search
  const filtered = useMemo(() => {
    const q = (query || '').trim().toLowerCase();
  const catLabel = appliedFilters?.category?.label || '';
  // FilterPanel produces `status` for the dropdown; here we use it as visibility
  const visLabel = appliedFilters?.status?.label || '';
    const start = appliedFilters?.startDate || '';
    const end = appliedFilters?.endDate || '';

    const startTs = start ? new Date(start).setHours(0,0,0,0) : null;
    const endTs = end ? new Date(end).setHours(23,59,59,999) : null;

    return articles.filter(a => {
      // category filter (compare by category name)
      if (catLabel) {
        const name = getCategoryName(a.category_id);
        if (name !== catLabel) return false;
      }

      // date range filter - use date_modified or date_created
      if (startTs || endTs) {
        const dateStr = a.date_modified || a.date_created || '';
        const artTs = dateStr ? new Date(dateStr).getTime() : null;
        if (startTs && artTs !== null && artTs < startTs) return false;
        if (endTs && artTs !== null && artTs > endTs) return false;
      }

      if (q) {
        const hay = ((a.title || '') + ' ' + (a.content || '')).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      // visibility filter (case-insensitive)
      if (visLabel) {
        if (((a.visibility || '').toLowerCase()) !== (visLabel || '').toLowerCase()) return false;
      }
      return true;
    });
  }, [articles, appliedFilters, query]);

  // pagination slice
  const paginated = useMemo(() => {
    if (serverSide) return articles; // already contains current page
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage, serverSide, articles]);

  // small components for counts (kept simple)
  const LikesCount = ({ articleId }) => {
    const [count, setCount] = useState(0);
    useEffect(() => {
      let mounted = true;
      kbService.listFeedback(articleId).then((f) => {
        if (!mounted) return;
        setCount((f || []).filter(x => x.helpful).length);
      }).catch(()=>{});
      return () => { mounted = false; };
    }, [articleId]);
    return <span>{count}</span>;
  };

  const DislikesCount = ({ articleId }) => {
    const [count, setCount] = useState(0);
    useEffect(() => {
      let mounted = true;
      kbService.listFeedback(articleId).then((f) => {
        if (!mounted) return;
        setCount((f || []).filter(x => !x.helpful).length);
      }).catch(()=>{});
      return () => { mounted = false; };
    }, [articleId]);
    return <span>{count}</span>;
  };

  // Prevent rendering if not authorized
  if (isAuthorized === false) {
    return null;
  }

  return (
    <div className={userStyles.pageContainer}>
      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        title="Article"
        message={`Are you sure you want to delete "${deleteModal.article?.title}"? This article will be permanently removed and cannot be recovered.`}
        onConfirm={confirmDelete}
        onCancel={closeDeleteModal}
        isDeleting={deleteModal.isDeleting}
      />

      {/* Archive Confirmation Modal */}
      <ArchiveConfirmationModal
        isOpen={archiveModal.isOpen}
        title="Article"
        message={`Are you sure you want to archive "${archiveModal.article?.title}"? It will be moved to the archived section.`}
        onConfirm={confirmArchive}
        onCancel={closeArchiveModal}
        isArchiving={archiveModal.isArchiving}
      />

      {/* Filter panel (outside the table) — use shared FilterPanel for consistent spacing */}
      <SysAdminArticlesFilter
        onApply={(filters) => { setAppliedFilters(filters); setCurrentPage(1); }}
        onReset={(filters) => { setAppliedFilters(filters); setCurrentPage(1); }}
        initialFilters={appliedFilters}
        categoryOptions={(categories || []).map(c => ({ label: c.name }))}
      />

      <div className={userStyles.tableSection}>
        <div className={userStyles.tableHeader}>
          <h2>Articles</h2>
            <div className={userStyles.tableActions}>
            <InputField
              type="search"
              placeholder="Search..."
              value={query}
              onChange={e => { setQuery(e.target.value); setCurrentPage(1); }}
              inputClassName={knowledgeStyles.searchInput}
            />
            {authService.getUserRole() !== 'Ticket Coordinator' && (
              <button
                className={userStyles.registerButton}
                onClick={() => navigate('/admin/knowledge/create')}
              >
                Create Article
              </button>
            )}
          </div>
        </div>

        {/* Filter is rendered above the table — duplicates removed */}

        <div className={userStyles.tableWrapper}>
          <table className={userStyles.table}>
            <thead>
              <tr>
                <th className={knowledgeStyles.colArticle}>Article</th>
                <th className={knowledgeStyles.colCategory}>Category</th>
                <th className={knowledgeStyles.colTags}>Tags</th>
                <th className={knowledgeStyles.colVisibility}>Visibility</th>
                <th className={knowledgeStyles.colCreated}>Created</th>
                <th className={knowledgeStyles.colLikes}>Total Likes</th>
                <th className={knowledgeStyles.colDislikes}>Total Dislikes</th>
                <th className={knowledgeStyles.colActions}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td><Skeleton width="100%" height="40px" /></td>
                    <td><Skeleton width="100%" height="40px" /></td>
                    <td><Skeleton width="100%" height="40px" /></td>
                    <td className={knowledgeStyles.textCenter}><Skeleton width="80px" height="40px" /></td>
                    <td className={knowledgeStyles.textCenter}><Skeleton width="100px" height="40px" /></td>
                    <td className={knowledgeStyles.textCenter}><Skeleton width="60px" height="40px" /></td>
                    <td className={knowledgeStyles.textCenter}><Skeleton width="80px" height="40px" /></td>
                    <td><Skeleton width="120px" height="40px" /></td>
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className={knowledgeStyles.emptyState}>
                    No articles found for this category or search.
                  </td>
                </tr>
              ) : (
                paginated.map((a, idx) => (
                  <tr key={a.id || idx}>
                    <td>
                      <div className={userStyles.subjectCell}>
                        <div className={knowledgeStyles.subjectTitle}>{a.title}</div>
                        <div className={knowledgeStyles.subjectMeta}>{a.author} • {formatArticleDate(a)}</div>
                      </div>
                    </td>
                      <td>{getCategoryName(a.category_id)}</td>
                      <td>{a.tags && a.tags.length ? a.tags.join(', ') : ''}</td>
                    <td className={knowledgeStyles.textCenter}>{a.visibility}</td>
              <td className={knowledgeStyles.textCenter}>{formatArticleDate(a)}</td>
                    <td className={knowledgeStyles.textCenter}><LikesCount articleId={a.id} /></td>
                    <td className={knowledgeStyles.textCenter}><DislikesCount articleId={a.id} /></td>
                    <td>
                      <div className={userStyles.actionButtonCont}>
                        <button title="View" className={userStyles.actionButton} onClick={() => navigate(`/admin/knowledge/view/${a.id}`)}>
                          <FaEye />
                        </button>
                        <button title="Edit" className={userStyles.actionButton} onClick={() => navigate(`/admin/knowledge/edit/${a.id}`)}>
                          <FaEdit />
                        </button>
                        <button title="Archive" className={userStyles.actionButton} onClick={() => handleArchive(a)}>
                          <FaArchive />
                        </button>
                        <button title="Delete" className={userStyles.actionButton} onClick={() => openDeleteModal(a)}>
                          <FaTimes />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className={userStyles.tablePagination}>
          <TablePagination
            currentPage={currentPage}
            totalItems={serverSide ? totalCount : filtered.length}
            initialItemsPerPage={itemsPerPage}
            onPageChange={(p) => setCurrentPage(p)}
            onItemsPerPageChange={(n) => { setItemsPerPage(n); setCurrentPage(1); }}
            alwaysShow={true}
          />
        </div>
      </div>
    </div>
  );
};

export default KnowledgeArticles;
