import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import userStyles from '../user-management/CoordinatorAdminUserAccess.module.css';
import SysAdminArticlesFilter from '../../components/filters/SysAdminArticlesFilter';
import TablePagination from '../../../shared/table/TablePagination';
import kbService from '../../../services/kbService';
import authService from '../../../utilities/service/authService';
import Skeleton from '../../../shared/components/Skeleton/Skeleton';

const KnowledgeViewArticles = () => {
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState({});
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

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const cats = await Promise.resolve(kbService.listCategories());
        const arts = await Promise.resolve(kbService.listArticles({}));
        // If backend/categories endpoint didn't return useful choices, derive categories from articles
        let finalCategories = [];
        if (Array.isArray(cats) && cats.length) {
          finalCategories = cats;
        } else if (Array.isArray(arts) && arts.length) {
          const uniq = Array.from(new Set(arts.map(a => a.category_id || a.category || 'Uncategorized')));
          finalCategories = uniq.map((v) => ({ id: v, name: String(v) }));
        }
        setCategories(finalCategories || []);
        // Filter for non-archived articles only
        const nonArchived = (arts || []).filter(a => !a.archived);
        setArticles(nonArchived);
      } catch (e) {
        console.error('Error loading articles:', e);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const getCategoryName = (id) => {
    const c = categories.find(x => String(x.id) === String(id));
    return c ? c.name : 'Uncategorized';
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

  const filtered = useMemo(() => {
    const start = appliedFilters?.startDate || '';
    const end = appliedFilters?.endDate || '';
    const catLabel = appliedFilters?.category?.label || '';
    const visLabel = appliedFilters?.visibility?.label || '';
    const startTs = start ? new Date(start).setHours(0,0,0,0) : null;
    const endTs = end ? new Date(end).setHours(23,59,59,999) : null;

    return (articles || []).filter(a => {
      // Category filter
      if (catLabel) {
        const name = getCategoryName(a.category_id);
        if (name !== catLabel) return false;
      }

      // Date range filter
      if (startTs || endTs) {
        const dateStr = a.date_modified || a.date_created || '';
        const artTs = dateStr ? new Date(dateStr).getTime() : null;
        if (startTs && artTs !== null && artTs < startTs) return false;
        if (endTs && artTs !== null && artTs > endTs) return false;
      }

      // Visibility filter
      if (visLabel) {
        if (((a.visibility || '').toLowerCase()) !== (visLabel || '').toLowerCase()) return false;
      }

      return true;
    });
  }, [articles, appliedFilters, categories]);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const handleArchive = async (article) => {
    if (!window.confirm(`Archive "${article.title}"?`)) return;
    try {
      await kbService.updateArticle(article.id, { archived: true });
      window.dispatchEvent(new CustomEvent('kb:articleUpdated', { detail: { id: article.id } }));
      setArticles(prev => prev.filter(p => p.id !== article.id));
    } catch (e) {
      console.error('Error archiving article:', e);
    }
  };

  const handleDelete = async (article) => {
    if (!window.confirm(`Delete "${article.title}" permanently? This cannot be undone.`)) return;
    try {
      await kbService.updateArticle(article.id, { deleted: true });
      window.dispatchEvent(new CustomEvent('kb:articleUpdated', { detail: { id: article.id } }));
      setArticles(prev => prev.filter(p => p.id !== article.id));
    } catch (e) {
      console.error('Error deleting article:', e);
    }
  };

  // Prevent rendering if not authorized
  if (isAuthorized === false) {
    return null;
  }

  return (
    <div className={userStyles.pageContainer}>
      {/* Shared Filter Panel */}
      <SysAdminArticlesFilter
        onApply={(filters) => { setAppliedFilters(filters); setCurrentPage(1); }}
        onReset={(filters) => { setAppliedFilters(filters); setCurrentPage(1); }}
        initialFilters={appliedFilters}
        categoryOptions={(categories || []).map(c => ({ label: c.name }))}
      />

      <div className={userStyles.tableSection}>
        <div className={userStyles.tableHeader}>
          <h2>Knowledge Base Articles</h2>
        </div>

        <div className={userStyles.tableWrapper}>
          <table className={userStyles.table}>
            <thead>
              <tr>
                <th style={{ width: 260 }}>Article</th>
                <th>Category</th>
                 <th>Tags</th>
                <th style={{ width: 120, textAlign: 'center' }}>Visibility</th>
                <th style={{ width: 140, textAlign: 'center' }}>Created</th>
                <th style={{ width: 180, textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td><Skeleton width="100%" height="40px" /></td>
                    <td><Skeleton width="100%" height="40px" /></td>
                     <td><Skeleton width="100%" height="40px" /></td>
                    <td style={{ textAlign: 'center' }}><Skeleton width="80px" height="40px" /></td>
                    <td style={{ textAlign: 'center' }}><Skeleton width="100px" height="40px" /></td>
                    <td><Skeleton width="120px" height="40px" /></td>
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: '#6b7280', fontStyle: 'italic' }}>
                    No articles found.
                  </td>
                </tr>
              ) : (
                paginated.map((a, idx) => (
                  <tr key={a.id || idx}>
                    <td>
                      <div className={userStyles.subjectCell}>
                        <div style={{ fontWeight: 600 }}>{a.title}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{a.author} • {formatArticleDate(a)}</div>
                      </div>
                    </td>
                    <td>{getCategoryName(a.category_id)}</td>
                     <td>{a.tags && a.tags.length ? a.tags.join(', ') : ''}</td>
                    <td style={{ textAlign: 'center' }}>{a.visibility}</td>
                    <td style={{ textAlign: 'center' }}>{formatArticleDate(a)}</td>
                    <td>
                      <div className={userStyles.actionButtonCont}>
                        <button title="Archive" className={userStyles.actionButton} onClick={() => handleArchive(a)}>Archive</button>
                        <button title="Delete" className={userStyles.actionButton} onClick={() => handleDelete(a)}>Delete</button>
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
            totalItems={filtered.length}
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

export default KnowledgeViewArticles;
