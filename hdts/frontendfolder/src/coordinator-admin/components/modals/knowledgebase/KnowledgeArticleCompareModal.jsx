import React, { useEffect, useRef } from 'react';
import styles from './KnowledgeArticleCompareModal.module.css';
import Button from '../../../../shared/components/Button';
import ModalWrapper from '../../../../shared/modals/ModalWrapper';

// Lightweight in-file word diff using LCS (copied from History page)
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

const renderDiffSide = (leftText, rightText, side) => {
  const parts = computeWordDiff(leftText || '', rightText || '');
  return parts.map((part, i) => {
    const isAdded = part.added;
    const isRemoved = part.removed;
    if (side === 'left') {
      const cls = isRemoved ? styles.diffRemoved : styles.diffContext;
      return <span key={i} className={cls}>{part.value} </span>;
    }
    const cls = isAdded ? styles.diffAdded : styles.diffContext;
    return <span key={i} className={cls}>{part.value} </span>;
  });
};

const KnowledgeArticleCompareModal = ({ leftVersion = {}, rightVersion = {}, leftLabel, rightLabel, onClose, article }) => {
  // keep Escape handling; ModalWrapper locks background scroll
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const leftContent = leftVersion.content || leftVersion.body || leftVersion.text || leftVersion.html || leftVersion.raw || '';
  const rightContent = rightVersion.content || rightVersion.body || rightVersion.text || rightVersion.html || rightVersion.raw || '';
  
  // Check if content is available for meaningful comparison
  const hasLeftContent = Boolean(leftContent);
  const hasRightContent = Boolean(rightContent);
  const canCompare = hasLeftContent || hasRightContent;
  
  const noContentMessage = 'Content not available for this version (created before content snapshots were enabled).';
  
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      if (isNaN(d)) return '';
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (e) {
      return '';
    }
  };

  const authorName = article?.created_by_external_name || article?.created_by_name || 'Unknown';

  return (
    <ModalWrapper onClose={onClose} className={styles.modal} contentProps={{ role: 'dialog', 'aria-modal': true }}>
        <div className={styles.header}>
          <div className={styles.title}>Compare Versions</div>
        </div>

        <div className={styles.body}>
          <div className={styles.column}>
            <div className={styles.colHeader}>Version 1.1.{leftLabel}</div>
            <div className={styles.colMeta}>{authorName} • {formatDate(leftVersion.date || leftVersion.updated_at || leftVersion.dateModified || leftVersion.modified)}</div>
            <div className={styles.colBody} style={!hasLeftContent ? { fontStyle: 'italic', color: '#6b7280' } : undefined}>
              {hasLeftContent ? renderDiffSide(leftContent, rightContent, 'left') : noContentMessage}
            </div>
          </div>

          <div className={styles.column}>
            <div className={styles.colHeader}>Version 1.1.{rightLabel}</div>
            <div className={styles.colMeta}>{authorName} • {formatDate(rightVersion.date || rightVersion.updated_at || rightVersion.dateModified || rightVersion.modified)}</div>
            <div className={styles.colBody} style={!hasRightContent ? { fontStyle: 'italic', color: '#6b7280' } : undefined}>
              {hasRightContent ? renderDiffSide(leftContent, rightContent, 'right') : noContentMessage}
            </div>
          </div>
        </div>
    </ModalWrapper>
  );
};

export default KnowledgeArticleCompareModal;
