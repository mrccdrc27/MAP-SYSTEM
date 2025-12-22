import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import userStyles from '../user-management/CoordinatorAdminUserAccess.module.css';
import knowledgeStyles from './knowledge.module.css';
import SysAdminArticlesFilter from '../../components/filters/SysAdminArticlesFilter';
import TablePagination from '../../../shared/table/TablePagination';
import kbService from '../../../services/kbService';
import authService from '../../../utilities/service/authService';
import Skeleton from '../../../shared/components/Skeleton/Skeleton';

const KnowledgeArchived = () => {
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
        const [cats, arts] = await Promise.all([kbService.listCategories(), kbService.listArticles({})]);
        setCategories(cats || []);
        setArticles((arts || []).filter(a => a.archived));
      } catch (e) {}
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
    // FilterPanel exposes the visibility dropdown as `status`.
    const visLabel = appliedFilters?.status?.label || '';
    const startTs = start ? new Date(start).setHours(0,0,0,0) : null;
    const endTs = end ? new Date(end).setHours(23,59,59,999) : null;

    return (articles || []).filter(a => {
      if (catLabel) {
        const name = getCategoryName(a.category_id);
        if (name !== catLabel) return false;
      }
      if (startTs || endTs) {
        const dateStr = a.date_modified || a.date_created || '';
        const artTs = dateStr ? new Date(dateStr).getTime() : null;
        if (startTs && artTs !== null && artTs < startTs) return false;
        if (endTs && artTs !== null && artTs > endTs) return false;
      }
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

  const handleRestore = async (article) => {
    if (!window.confirm(`Restore "${article.title}"?`)) return;
    try {
      if (kbService.restoreArticle) {
        await kbService.restoreArticle(article.id);
      } else {
        await kbService.updateArticle(article.id, { is_archived: false });
      }
      window.dispatchEvent(new CustomEvent('kb:articleUpdated', { detail: { id: article.id } }));
      setArticles(prev => prev.filter(p => p.id !== article.id));
    } catch (err) {
      console.error('Failed to restore article:', err);
      alert('Failed to restore article. Please try again.');
    }
  };

  const handleDelete = async (article) => {
    if (!window.confirm(`Delete "${article.title}" permanently? This cannot be undone.`)) return;
    try {
      await kbService.deleteArticle(article.id);
      window.dispatchEvent(new CustomEvent('kb:articleDeleted', { detail: { id: article.id } }));
      setArticles(prev => prev.filter(p => p.id !== article.id));
    } catch (error) {
      alert('Failed to delete article. Please try again.');
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
          <h2>Archived Articles</h2>
        </div>

        <div className={userStyles.tableWrapper}>
          <table className={userStyles.table}>
            <thead>
              <tr>
                <th style={{ width: 260 }}>Article</th>
                <th>Category</th>
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
                    <td style={{ textAlign: 'center' }}><Skeleton width="80px" height="40px" /></td>
                    <td style={{ textAlign: 'center' }}><Skeleton width="100px" height="40px" /></td>
                    <td><Skeleton width="120px" height="40px" /></td>
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                    <tr>
                        <td colSpan={7} className={knowledgeStyles.emptyState}>
                        No archived articles found.
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
                        <td className={knowledgeStyles.textCenter}>{a.visibility}</td>
                        <td className={knowledgeStyles.textCenter}>{formatArticleDate(a)}</td>
                    <td>
                      <div className={userStyles.actionButtonCont}>
                        <button title="Restore" className={userStyles.actionButton} onClick={() => handleRestore(a)}>Restore</button>
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

export default KnowledgeArchived;
