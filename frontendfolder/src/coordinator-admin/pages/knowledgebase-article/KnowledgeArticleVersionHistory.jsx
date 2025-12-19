import React, { useState, useRef, useEffect } from 'react';
import styles from './KnowledgeArticleVersionHistory.module.css';
import viewStyles from './KnowledgeArticleView.module.css';
import { FaEye, FaColumns, FaUndo } from 'react-icons/fa';
import kbService from '../../../services/kbService';
import authService from '../../../utilities/service/authService';
import Button from '../../../shared/components/Button';
import KnowledgeArticleViewVersion from '../../components/modals/knowledgebase/KnowledgeArticleViewVersion';
import KnowledgeArticleCompareModal from '../../components/modals/knowledgebase/KnowledgeArticleCompareModal';
import ModalWrapper from '../../../shared/modals/ModalWrapper';
import KnowledgeArticleRestoreModal from '../../components/modals/knowledgebase/KnowledgeArticleRestoreModal';
import Loading from '../../../shared/components/Loading/Loading';
// use shared Button 'nav' variant instead of modal-specific CSS

// Lightweight in-file word diff using LCS so we don't require the `diff` package.
const computeWordDiff = (leftText = '', rightText = '') => {
  const a = String(leftText).split(/\s+/).filter(Boolean);
  const b = String(rightText).split(/\s+/).filter(Boolean);
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const parts = [];
  let i = n, j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      parts.push({ value: a[i - 1], added: false, removed: false });
      i--; j--; 
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      parts.push({ value: b[j - 1], added: true, removed: false });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      parts.push({ value: a[i - 1], added: false, removed: true });
      i--;
    }
  }
  parts.reverse();

  // Merge contiguous tokens of same type into single strings
  const merged = [];
  for (const p of parts) {
    const last = merged[merged.length - 1];
    if (last && last.added === p.added && last.removed === p.removed) {
      last.value = last.value + ' ' + p.value;
    } else {
      merged.push({ ...p });
    }
  }
  return merged;
};

// alias for compatibility with earlier naming
const diffWords = computeWordDiff;

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

const KnowledgeArticleVersionHistory = ({ article, category }) => {
  const [modalIndex, setModalIndex] = useState(null);
  const [editModeIndex, setEditModeIndex] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [restoreVersion, setRestoreVersion] = useState(null);

  if (!article) return null;

  // If the article includes an explicit versions array, render that as a history list.
  // If `article.versions` is undefined (still loading from service), show skeleton placeholders.
  const rawVersions = article?.versions;
  const isVersionsLoading = article && !Array.isArray(rawVersions);
  const versions = Array.isArray(rawVersions) ? rawVersions : [];

  // Sort versions by modified date (newest first). Use common date fields and fall back to index.
  const sortedVersions = versions
    .slice()
    .sort((a, b) => {
      const getDate = (v) => {
        const d = v?.date || v?.updated_at || v?.dateModified || v?.modified || v?.updatedAt || null;
        const t = d ? Date.parse(d) : NaN;
        return Number.isFinite(t) ? t : -Infinity;
      };
      return getDate(b) - getDate(a);
    });

  const canRestore = () => {
    try {
      const role = authService.getUserRole();
      return role === 'System Admin' || role === 'Ticket Coordinator';
    } catch (e) {
      return false;
    }
  };

  const openModal = (i) => {
    const v = sortedVersions[i];
    setEditContent(v?.content || v?.body || v?.text || v?.html || v?.raw || '');
    setModalIndex(i);
  };

  const [compareModalPair, setCompareModalPair] = useState(null);
  const [compareModalData, setCompareModalData] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);

  // Note: inline compare UI removed; side-by-side modal retained via `compareModalPair` state.

  const renderDiffSide = (leftText, rightText, side) => {
    // side = 'left' | 'right'
    const parts = diffWords(leftText || '', rightText || '');
    return parts.map((part, i) => {
      const isAdded = part.added;
      const isRemoved = part.removed;
      if (side === 'left') {
        // show removed parts as highlighted on left
        const cls = isRemoved ? styles.diffRemoved : styles.diffContext;
        return <span key={i} className={cls}>{part.value}</span>;
      }
      // right side: show added parts
      const cls = isAdded ? styles.diffAdded : styles.diffContext;
      return <span key={i} className={cls}>{part.value}</span>;
    });
  };

  const doRestore = async (v) => {
    if (!canRestore()) {
      alert('You do not have permission to restore versions.');
      return;
    }
    // Open restore confirmation modal instead of inline confirm
    setRestoreVersion(v);
  };

  const startEdit = (i) => {
    const v = sortedVersions[i];
    setEditModeIndex(i);
    setEditContent(v?.content || v?.body || v?.text || v?.html || v?.raw || '');
  };

  const cancelEdit = () => {
    setEditModeIndex(null);
    // leave preview open
  };

  const saveEdit = async (v) => {
    if (!canRestore()) {
      alert('You do not have permission to edit/restore versions.');
      return;
    }
    const ok = window.confirm('Save edited content to the current article? This will overwrite the current content.');
    if (!ok) return;
    try {
      if (!kbService.updateArticle) throw new Error('kbService.updateArticle is not available');
      await kbService.updateArticle(article.id, { content: editContent });
      alert('Article updated. Reloading...');
      window.location.reload();
    } catch (err) {
      console.error('Failed to save edited content:', err);
      alert('Failed to save edited content: ' + (err.message || String(err)));
    }
  };

  return (
    <div className={styles.ticketList}>
      {isVersionsLoading ? (
        <div className={styles.ticketItem}>
          <div className={styles.ticketInfo}>
            <div style={{ padding: 16 }}>
              <Loading text="Loading versions..." centered />
            </div>
          </div>
        </div>
      ) : sortedVersions.length > 0 ? (
        sortedVersions.map((v, idx) => {
          const versionNumber = v.number ?? v.version ?? idx + 1;
          const modifiedDate = v.date || v.updated_at || v.dateModified || v.modified || article.date_modified || article.dateModified;
          const author = v.author || v.editor || v.updatedBy || article.author || article.editor || 'System Admin';
          const changes = v.changes || v.summary || v.description || v.notes || '';

          // Determine role label. Prefer explicit visibility/role fields; otherwise infer from version number components.
          const inferRoleFromString = (s) => {
            if (!s) return null;
            const t = String(s).toLowerCase();
            if (t.includes('system')) return 'System Admin';
            if (t.includes('coordinator')) return 'Ticket Coordinator';
            if (t.includes('employee')) return 'Employee';
            return null;
          };

          let roleLabel = inferRoleFromString(v.visibility || v.role || v.target || v.scope || article.visibility);
          if (!roleLabel) {
            // parse version number like 1.1.3 and use middle digit as role code (1=Employee,2=Ticket Coordinator,3=System Admin)
            try {
              const parts = String(versionNumber).split('.');
              if (parts.length >= 2) {
                const code = parts[1];
                if (code === '1') roleLabel = 'Employee';
                else if (code === '2') roleLabel = 'Ticket Coordinator';
                else if (code === '3') roleLabel = 'System Admin';
              }
            } catch (e) {
              roleLabel = null;
            }
          }
          if (!roleLabel) roleLabel = inferRoleFromString(article.visibility) || 'Unknown';
          // Build a small list of change bullets if available
          const changeItems = (String(changes || '')
            .split(/\r?\n|•|\-|\*+/)
            .map((s) => s.trim())
            .filter(Boolean)
          );

          // determine if this is the current (latest) version
          const isCurrent = idx === 0;
          const compareLabel = isCurrent ? 'Compare Changes' : 'Compare to Current';
          const compareTitle = isCurrent ? 'This is the current version' : 'Compare this version to current';

          return (
            <div key={idx} className={styles.ticketItem}>
              <div className={`${styles.timelineDot} ${idx === 0 ? styles.currentVersionDot : styles.oldVersionDot}`} aria-hidden="true" />
              <div className={styles.ticketInfo}>
                <div className={styles.ticketHeader}>
                  <div className={styles.ticketHeaderLeft}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className={styles.ticketNumber}>Version {versionNumber}</div>
                      <div className={styles.versionBadge}>MINOR</div>
                    </div>
                    <div className={styles.modifiedDate}>{formatDate(modifiedDate)}</div>
                  </div>
                  <div className={styles.ticketHeaderRight}>
                    <Button
                      type="button"
                      variant="nav"
                      onClick={() => {
                        if (!isCurrent) {
                          // Open side-by-side compare modal for current vs selected
                          // Fetch full version content if needed and then open modal
                          (async () => {
                            try {
                              setCompareLoading(true);
                              const leftIdx = 0;
                              const rightIdx = idx;
                                  const leftRaw = sortedVersions[leftIdx] || {};
                                  const rightRaw = sortedVersions[rightIdx] || {};
                                  const leftIdentifier = leftRaw.number ?? leftRaw.id ?? leftIdx;
                                  const rightIdentifier = rightRaw.number ?? rightRaw.id ?? rightIdx;
                                  let leftV = leftRaw;
                                  let rightV = rightRaw;

                                  // If version objects already include content, prefer them and avoid
                                  // calling the backend per-version endpoint (which may not exist).
                                  if (!leftV.content && !leftV.body && !leftV.text && (typeof kbService.getArticleVersion === 'function')) {
                                    try {
                                      const fetched = await kbService.getArticleVersion(article.id, leftIdentifier);
                                      if (fetched) leftV = fetched;
                                    } catch (e) {
                                      /* ignore and use leftRaw */
                                    }
                                  }
                                  if (!rightV.content && !rightV.body && !rightV.text && (typeof kbService.getArticleVersion === 'function')) {
                                    try {
                                      const fetched = await kbService.getArticleVersion(article.id, rightIdentifier);
                                      if (fetched) rightV = fetched;
                                    } catch (e) {
                                      /* ignore and use rightRaw */
                                    }
                                  }

                                  const leftLabel = leftV.number ?? leftV.version ?? (leftIdx + 1);
                                  const rightLabel = rightV.number ?? rightV.version ?? (rightIdx + 1);
                                  setCompareModalData({ leftVersion: leftV, rightVersion: rightV, leftLabel, rightLabel });
                            } catch (err) {
                              console.error('Failed to load compare versions:', err);
                              alert('Failed to load version content for compare.');
                            } finally {
                              setCompareLoading(false);
                            }
                          })();
                        }
                      }}
                      title={compareTitle}
                      disabled={isCurrent}
                    >
                      <FaColumns style={{ marginRight: 8 }} /> {compareLabel}
                    </Button>
                  </div>
                </div>

                <div className={styles.ticketDetailsGrid}>
                  <div>
                    <div className={styles.ticketLabel}>Author</div>
                    <div className={styles.ticketValue}>John Smith</div>
                  </div>
                  <div>
                    <div className={styles.ticketLabel}>Status</div>
                    <div className={styles.ticketValue}>Published</div>
                  </div>
                </div>

                <div className={styles.versionSummary} style={{ marginTop: 8 }}>Minor clarifications to instructions.</div>

                {/* Modal preview opens when user clicks "View This Version" */}


              </div>

              <div className={styles.ticketActions}>
                <div className={styles.actionButtons}>
                  <Button type="button" variant="nav" onClick={() => openModal(idx)} title={isCurrent ? 'This is the current version' : 'View this version'} disabled={isCurrent}><FaEye style={{marginRight:8}}/> View This Version</Button>
                  {canRestore() && (
                    <Button type="button" variant="primary" className={viewStyles.actionButton} onClick={() => doRestore(v)} title="Restore this version" disabled={idx === 0}><FaUndo /> Restore</Button>
                  )}
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <div className={styles.ticketItem}>
          <div className={styles.ticketInfo}>
            <div className={styles.ticketHeader}>
              <div className={styles.ticketNumber}>{article.title}</div>
              <div style={{ color: '#6b7280', fontSize: 13 }}>{formatDate(article.date_modified || article.dateModified || article.date_created || article.dateCreated)}</div>
            </div>

            <div className={styles.ticketDetailsGrid}>
              <div>
                <div className={styles.ticketLabel}>Created</div>
                <div className={styles.ticketValue}>{formatDate(article.date_created || article.dateCreated)}</div>
              </div>
              <div>
                <div className={styles.ticketLabel}>Category</div>
                <div className={styles.ticketValue}>{category ? category.name : 'Uncategorized'}</div>
              </div>
            </div>

            {article.tags && article.tags.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div className={styles.ticketLabel}>Tags</div>
                <div className={styles.ticketValue}>{article.tags.join(', ')}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Inline compare area removed in favor of side-by-side modal. */}

        {/* Modal: full preview of a selected version with keyboard navigation and actions */}
        {modalIndex !== null && sortedVersions[modalIndex] && (
          <KnowledgeArticleViewVersion
            version={sortedVersions[modalIndex]}
            index={modalIndex}
            total={sortedVersions.length}
            onClose={() => setModalIndex(null)}
            onPrev={() => setModalIndex((cur) => Math.min(sortedVersions.length - 1, (cur ?? modalIndex) + 1))}
            onNext={() => setModalIndex((cur) => Math.max(0, (cur ?? modalIndex) - 1))}
            onRestore={doRestore}
            canRestore={canRestore()}
            article={article}
          />
        )}

        {/* Side-by-side compare modal (when user requests a quick visual compare) */}
        {compareLoading && (
          <ModalWrapper onClose={() => {}} className={styles.modal}>
            <div style={{ padding: 24 }}>
              <Loading text="Loading compare..." centered />
            </div>
          </ModalWrapper>
        )}

        {compareModalData && (
          <KnowledgeArticleCompareModal
            leftVersion={compareModalData.leftVersion}
            rightVersion={compareModalData.rightVersion}
            leftLabel={compareModalData.leftLabel}
            rightLabel={compareModalData.rightLabel}
            onClose={() => setCompareModalData(null)}
          />
        )}

        {/* Restore confirmation modal */}
        {restoreVersion && (
          <KnowledgeArticleRestoreModal
            version={restoreVersion}
            article={article}
            onClose={() => setRestoreVersion(null)}
            onRestoreSuccess={() => {
              setRestoreVersion(null);
              alert('Article restored successfully. Reloading...');
              window.location.reload();
            }}
          />
        )}
    </div>
  );
};

export default KnowledgeArticleVersionHistory;
