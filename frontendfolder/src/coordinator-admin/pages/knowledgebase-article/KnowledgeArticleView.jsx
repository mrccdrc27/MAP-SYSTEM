import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaEdit, FaTrash, FaArchive } from 'react-icons/fa';
import styles from '../../../employee/pages/ticket-tracker/EmployeeTicketTracker.module.css';
import detailStyles from '../ticket-tracker/CoordinatorAdminTicketDetails.module.css';
import localStyles from './KnowledgeArticleView.module.css';
import ViewCard from '../../../shared/components/ViewCard';
import Loading from '../../../shared/components/Loading/Loading';
import Button from '../../../shared/components/Button';
import Breadcrumb from '../../../shared/components/Breadcrumb';
import Tabs from '../../../shared/components/Tabs';
import DeleteConfirmationModal from '../../components/modals/SysAdminDeleteConfirmationModal';
import ArchiveConfirmationModal from '../../components/modals/SysAdminArchiveConfirmationModal';
import kbService from '../../../services/kbService';
import authService from '../../../utilities/service/authService';
import KnowledgeArticleVersionHistory from './KnowledgeArticleVersionHistory';

const KnowledgeArticleView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [category, setCategory] = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [activeTab, setActiveTab] = useState('info');
  const leftColRef = useRef(null);
  const rightColRef = useRef(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, isDeleting: false });
  const [archiveModal, setArchiveModal] = useState({ isOpen: false, isArchiving: false });
  const [runtimeError, setRuntimeError] = useState(null);
  const [unauthorized, setUnauthorized] = useState(false);

  // Sync column heights - matching ticket tracker pattern exactly
  useEffect(() => {
    console.debug('[KB] KnowledgeArticleView mounted for id', id);
    const onErrorEvent = (event) => {
      try {
        const e = event?.error || event?.message || String(event);
        console.error('[KB] Unhandled error event in KnowledgeArticleView', e);
        setRuntimeError(e?.stack || e?.toString?.() || String(e));
      } catch (err) {
        console.error(err);
      }
    };
    const onWindowError = (msg, url, line, col, err) => {
      console.error('[KB] window.onerror caught in KnowledgeArticleView', err || msg);
      setRuntimeError(err?.stack || String(msg));
      return false;
    };
    window.addEventListener('error', onErrorEvent);
    window.onerror = onWindowError;
    let rAF = null;
    let resizeTimer = null;
    let imgs = [];
    let imgLoadHandlers = [];
    let observer = null;

    const sync = () => {
      if (rAF) cancelAnimationFrame(rAF);
      rAF = requestAnimationFrame(() => {
        const left = leftColRef.current;
        const right = rightColRef.current;
        if (!left || !right) return;
        left.style.minHeight = '';
        right.style.minHeight = '';
        const leftH = left.getBoundingClientRect().height;
        const rightH = right.getBoundingClientRect().height;
        const maxH = Math.max(leftH, rightH);
        left.style.minHeight = `${maxH}px`;
        right.style.minHeight = `${maxH}px`;
      });
    };

    sync();
    const lateTimer = setTimeout(sync, 220);

    // watch images inside columns so when they load we re-sync
    const watchImages = () => {
      imgs = [];
      imgLoadHandlers = [];
      const left = leftColRef.current;
      const right = rightColRef.current;
      if (!left || !right) return;
      const nodeImgs = [...left.querySelectorAll('img'), ...right.querySelectorAll('img')];
      nodeImgs.forEach((img) => {
        if (img.complete) return;
        const h = () => sync();
        img.addEventListener('load', h);
        img.addEventListener('error', h);
        imgs.push(img);
        imgLoadHandlers.push({ img, h });
      });
    };

    watchImages();

    // MutationObserver to detect dynamic content changes
    try {
      observer = new MutationObserver(() => {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(sync, 120);
      });
      if (leftColRef.current) observer.observe(leftColRef.current, { childList: true, subtree: true });
      if (rightColRef.current) observer.observe(rightColRef.current, { childList: true, subtree: true });
    } catch (err) {
      // ignore if MutationObserver not available
    }

    const onResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(sync, 120);
    };

    window.addEventListener('resize', onResize);

    return () => {
      if (rAF) cancelAnimationFrame(rAF);
      if (resizeTimer) clearTimeout(resizeTimer);
      clearTimeout(lateTimer);
      imgLoadHandlers.forEach(({ img, h }) => {
        try { img.removeEventListener('load', h); img.removeEventListener('error', h); } catch(e) {}
      });
      if (observer) {
        try { observer.disconnect(); } catch (e) {}
      }
      window.removeEventListener('resize', onResize);
      try { window.removeEventListener('error', onErrorEvent); } catch (e) {}
      try { window.onerror = null; } catch (e) {}
      if (leftColRef.current) leftColRef.current.style.minHeight = '';
      if (rightColRef.current) rightColRef.current.style.minHeight = '';
    };
  }, [id, article, activeTab]);

  // cleanup runtime handlers on unmount
  useEffect(() => {
    return () => {
      try {
        window.onerror = null;
      } catch (e) {}
    };
  }, []);

  // Load article on mount
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      (async () => {
        setIsLoading(true);
        try {
          if (!kbService.getArticle) return;
          const fetchedArticle = await Promise.resolve(kbService.getArticle(id));
          if (cancelled) return;
          setArticle(fetchedArticle || null);

          // Enforce system-admin-only visibility
          try {
            const isAdminOnly = fetchedArticle?.visibility === 'System Admin';
            const currentRole = authService.getUserRole();
            setUnauthorized(Boolean(isAdminOnly && currentRole !== 'System Admin'));
          } catch (e) {
            setUnauthorized(false);
          }

          // Load category
          if (fetchedArticle && kbService.listCategories) {
            try {
              const categories = await Promise.resolve(kbService.listCategories());
              if (!cancelled) {
                const cat = (categories || []).find(
                  (c) => c.id === fetchedArticle.category_id || c.id === fetchedArticle.categoryId
                );
                setCategory(cat || null);
              }
            } catch (err) {
              console.error('Failed to load categories:', err);
              if (!cancelled) setCategory(null);
            }
          }

          // Load feedbacks
          if (fetchedArticle && kbService.listFeedback) {
            try {
              const fetchedFeedbacks = await Promise.resolve(kbService.listFeedback(id));
              if (!cancelled) setFeedbacks(Array.isArray(fetchedFeedbacks) ? fetchedFeedbacks : []);
            } catch (err) {
              console.error('Failed to load feedbacks:', err);
              if (!cancelled) setFeedbacks([]);
            }
          }
        } catch (err) {
          console.error('Failed to load article:', err);
          if (!cancelled) setArticle(null);
        } finally {
          if (!cancelled) setIsLoading(false);
        }
      })();
    }, 300);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [id]);

  const openDeleteModal = () => {
    setDeleteModal({ isOpen: true, isDeleting: false });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, isDeleting: false });
  };

  const confirmDelete = async () => {
    setDeleteModal((prev) => ({ ...prev, isDeleting: true }));
    try {
      // Use the dedicated deleteArticle backend call which performs a
      // DELETE /api/articles/:id/ request. The previous implementation
      // attempted to PATCH { deleted: true } which is not a valid field
      // on the backend and caused the delete to fail.
      if (kbService.deleteArticle) {
        await kbService.deleteArticle(article.id);
        navigate('/admin/knowledge/articles');
      }
    } catch (err) {
      console.error('Failed to delete article:', err);
      setDeleteModal({ isOpen: false, isDeleting: false });
    }
  };

  const openArchiveModal = () => {
    setArchiveModal({ isOpen: true, isArchiving: false });
  };

  const closeArchiveModal = () => {
    setArchiveModal({ isOpen: false, isArchiving: false });
  };

  const confirmArchive = async () => {
    setArchiveModal((prev) => ({ ...prev, isArchiving: true }));
    try {
      // Use the archiveArticle helper which calls the custom archive
      // endpoint (POST /api/articles/:id/archive/). Sending { archived: true }
      // via PATCH is not compatible with the serializer which expects
      // the field name `is_archived`, so prefer the explicit endpoint.
      if (kbService.archiveArticle) {
        await kbService.archiveArticle(article.id);
        navigate('/admin/knowledge/articles');
      }
    } catch (err) {
      console.error('Failed to archive article:', err);
      setArchiveModal({ isOpen: false, isArchiving: false });
    }
  };

  const userRole = authService.getUserRole();
  const canEdit = userRole === 'System Admin' || userRole === 'Ticket Coordinator';

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const d = new Date(dateString);
      if (isNaN(d)) return 'N/A';
      const monthName = d.toLocaleString('en-US', { month: 'long' });
      const day = d.getDate();
      const year = d.getFullYear();
      return `${monthName} ${day}, ${year}`;
    } catch (e) {
      return 'N/A';
    }
  };

  const formatShortDate = (dateInput) => {
    if (!dateInput) return 'N/A';
    const d = new Date(dateInput);
    if (isNaN(d)) return 'N/A';
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
  };


  if (isLoading) {
    return (
      <main className={styles.employeeTicketTrackerPage}>
        <ViewCard>
          <div style={{ padding: '48px 24px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Loading text="Loading article..." centered />
          </div>
        </ViewCard>
      </main>
    );
  }

  if (!article) {
    return (
      <div className={localStyles.notFoundContainer}>
        <h1 className={localStyles.notFoundText}>Article Not Found</h1>
        <Button onClick={() => navigate('/admin/knowledge/articles')} className={localStyles.backButton}>
          <FaArrowLeft /> Go Back
        </Button>
      </div>
    );
  }

  if (unauthorized) {
    return (
      <div className={localStyles.notFoundContainer}>
        <h1 className={localStyles.notFoundText}>Not authorized</h1>
        <p style={{ color: '#6b7280', marginBottom: '16px' }}>You do not have permission to view this article.</p>
        <Button onClick={() => navigate('/admin/knowledge/articles')} className={localStyles.backButton}>
          <FaArrowLeft /> Go Back
        </Button>
      </div>
    );
  }

  if (runtimeError) {
    return (
      <ViewCard>
        <div style={{ padding: 24 }}>
          <h2 style={{ color: '#b91c1c' }}>Application Error</h2>
          <p>An unexpected error occurred while rendering this article.</p>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#0f172a', color: '#e5e7eb', padding: '12px', borderRadius: 6 }}>{String(runtimeError)}</pre>
          <div style={{ marginTop: 12 }}>
            <Button onClick={() => window.location.reload()}>Reload</Button>
            <Button onClick={() => navigate('/admin/knowledge/articles')} style={{ marginLeft: 8 }}>Go Back</Button>
          </div>
        </div>
      </ViewCard>
    );
  }

  const visibilityMap = {
    'system admin': { badge: 'System Admin', color: '#FEF3C7', textColor: '#92400E' },
    'ticket coordinator': { badge: 'Coordinator', color: '#DBEAFE', textColor: '#1E40AF' },
    'employee': { badge: 'Employee', color: '#D1FAE5', textColor: '#065F46' }
  };
  const visData = visibilityMap[article.visibility?.toLowerCase()] || visibilityMap['employee'];

  // Feedback aggregates
  const helpfulCount = (feedbacks || []).filter(f => f.helpful).length;
  const notHelpfulCount = (feedbacks || []).filter(f => !f.helpful).length;
  const totalFeedbacks = helpfulCount + notHelpfulCount;
  const helpfulPercent = totalFeedbacks ? Math.round((helpfulCount / totalFeedbacks) * 100) : 0;
  const notHelpfulPercent = totalFeedbacks ? Math.round((notHelpfulCount / totalFeedbacks) * 100) : 0;
  const feedbackDates = (feedbacks || []).map(f => new Date(f.date || f.createdAt || f.timestamp)).filter(d => !isNaN(d));
  const lastFeedbackDate = feedbackDates.length ? new Date(Math.max(...feedbackDates.map(d => d.getTime()))) : null;

  return (
    <>
      <main className={styles.employeeTicketTrackerPage}>
        <Breadcrumb
          root="Knowledge Base"
          currentPage="Article View"
          rootNavigatePage="/admin/knowledge/articles"
          title={article.title}
        />
        <ViewCard>
          <div className={styles.contentGrid}>
            {/* LEFT COLUMN - Article Details */}
            <div ref={leftColRef} className={styles.leftColumn}>
              <section className={styles.ticketCard}>
                {/* Header with Visibility Badge and Title */}
                <div className={styles.ticketHeader}>
                  <div className={styles.headerLeft}>
                    <div
                      className={`${styles.priorityBadge} ${styles.priorityMedium}`}
                      style={{
                        background: visData.color,
                        color: visData.textColor,
                      }}
                    >
                      {visData.badge}
                    </div>
                    <h2 className={styles.ticketSubject}>{article.title}</h2>
                  </div>
                  <div className={localStyles.currentBadge}>CURRENT VERSION: 1.1.2</div>
                </div>

                {/* Meta Information */}
                <div className={styles.ticketMeta}>
                  <div className={styles.ticketMetaItem}>
                    <span className={styles.ticketMetaLabel}>
                      Date Created <span className={styles.ticketMetaValue}>{formatDate(article.date_created || article.dateCreated)}</span>
                    </span>
                  </div>
                  <div className={styles.ticketMetaItem}>
                    <span className={styles.ticketMetaLabel}>
                      Date Updated <span className={styles.ticketMetaValue}>{formatDate(article.date_modified || article.dateModified)}</span>
                    </span>
                  </div>
                </div>

                {/* Details Grid */}
                <div className={styles.detailsGrid}>
                  <div className={styles.detailItem}>
                    <div className={styles.detailLabel}>Category</div>
                    <div className={styles.detailValue}>
                      {category ? category.name : 'Uncategorized'}
                    </div>
                  </div>

                  <div className={styles.detailItem}>
                    <div className={styles.detailLabel}>Author</div>
                    <div className={styles.detailValue}>
                      {(() => {
                        // Prefer explicit `author` field
                        if (article.author) return article.author;
                        // Backend may expose creator info in `created_by`, `created_by_name`, or similar
                        const cb = article.created_by || article.createdBy || article.created_by_user || null;
                        if (cb) {
                          if (typeof cb === 'string') return cb;
                          const first = cb.first_name || cb.firstname || cb.firstName || cb.given_name || '';
                          const last = cb.last_name || cb.lastname || cb.lastName || cb.family_name || '';
                          const full = `${first} ${last}`.trim();
                          if (full) return full;
                          if (cb.email) return cb.email;
                        }
                        if (article.created_by_name) return article.created_by_name;
                        if (article.createdByName) return article.createdByName;
                        // Fallback to generic label
                        return 'System Admin';
                      })()}
                    </div>
                  </div>

                  <div className={styles.detailItem}>
                    <div className={styles.detailLabel}>Visibility</div>
                    <div className={styles.detailValue}>
                      {visData.badge}
                    </div>
                  </div>

                  <div className={styles.detailItem}>
                    <div className={styles.detailLabel}>Status</div>
                    <div className={styles.detailValue}>
                      {article.archived ? 'Archived' : 'Active'}
                    </div>
                  </div>

                  <div className={styles.detailItem}>
                    <div className={styles.detailLabel}>Feedback Score</div>
                    <div className={styles.detailValue}>
                      <div className={localStyles.feedbackStats}>
                        <span className={localStyles.feedbackLikes}>👍 {helpfulCount} Helpful</span>
                        <span className={localStyles.feedbackDislikes}>👎 {notHelpfulCount} Not Helpful</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.detailItem}>
                    <div className={styles.detailLabel}>Last feedback</div>
                    <div className={styles.detailValue}>{lastFeedbackDate ? formatDate(lastFeedbackDate) : 'None'}</div>
                  </div>

                  {/* Full-width Content Section */}
                  <div className={styles.singleColumnGroup}>
                    <div className={styles.detailItem}>
                      <div className={styles.detailLabel}>Article Content</div>
                      <div className={styles.detailValue}>
                        <div style={{ whiteSpace: 'pre-wrap' }}>{article.content || 'No content provided.'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* RIGHT COLUMN - Actions and Feedback */}
            <div ref={rightColRef} className={`${styles.rightColumn} ${detailStyles.rightColumnFill}`}>
              {/* Action Buttons */}
              {canEdit && (
                <div className={localStyles.actionButtonsContainer}>
                  <Button
                    variant="primary"
                    className={`${localStyles.actionButton} ${localStyles.neutralButton}`}
                    onClick={() => navigate(`/admin/knowledge/edit/${article.id}`)}
                  >
                    <FaEdit /> <span className={localStyles.buttonText}>Edit</span>
                  </Button>
                  <Button
                    variant="primary"
                    className={`${localStyles.actionButton} ${localStyles.neutralButton}`}
                    onClick={openArchiveModal}
                  >
                    <FaArchive /> <span className={localStyles.buttonText}>Archive</span>
                  </Button>
                  <Button
                    variant="danger"
                    className={`${localStyles.actionButton} ${localStyles.dangerButton}`}
                    onClick={openDeleteModal}
                  >
                    <FaTrash /> <span className={localStyles.buttonText}>Delete</span>
                  </Button>
                </div>
              )}

              {/* Tabs for Feedback and Info */}
              <Tabs
                tabs={[{ label: 'Version History', value: 'info' }]}
                active={activeTab}
                onChange={setActiveTab}
                fullHeight={true}
                className={detailStyles.tabsFill}
              >
                <KnowledgeArticleVersionHistory article={article} category={category} />
              </Tabs>
            </div>
          </div>
        </ViewCard>
      </main>

      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        title="Article"
        message={`Are you sure you want to delete "${article?.title}"? This action cannot be undone.`}
        onConfirm={confirmDelete}
        onCancel={closeDeleteModal}
        isDeleting={deleteModal.isDeleting}
      />

      <ArchiveConfirmationModal
        isOpen={archiveModal.isOpen}
        title="Article"
        message={`Are you sure you want to archive "${article?.title}"? You can restore archived items later if needed.`}
        onConfirm={confirmArchive}
        onCancel={closeArchiveModal}
        isArchiving={archiveModal.isArchiving}
      />
    </>
  );
};

export default KnowledgeArticleView;
