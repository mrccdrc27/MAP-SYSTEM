import React, { useEffect, useRef } from 'react';
import styles from './KnowledgeArticleViewVersion.module.css';
import Button from '../../../../shared/components/Button';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import ModalWrapper from '../../../../shared/modals/ModalWrapper';

const KnowledgeArticleViewVersion = ({
  version,
  index,
  total,
  onClose,
  onPrev,
  onNext,
  onRestore,
  canRestore,
  article
}) => {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      } else if (e.key === 'ArrowLeft') {
        onPrev?.();
      } else if (e.key === 'ArrowRight') {
        onNext?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext]);

  // Lock background scroll while modal is open
  // ModalWrapper handles scroll locking

  // overlay click handled by ModalWrapper

  const versionLabel = version?.number ?? version?.version ?? index + 1;
  const content = version?.content || version?.body || version?.text || version?.html || version?.raw || 'No content available for this version.';
  

  return (
    <ModalWrapper onClose={onClose} className={styles.modalContent} contentProps={{ role: 'dialog', 'aria-modal': true }}>
        <div className={styles.header}>
          <div className={styles.versionInfo}>
            <h2 className={styles.versionTitle}>Version {versionLabel}</h2>
            <div className={styles.authorInfo}>{version?.author || version?.editor || article?.author || 'Unknown'}</div>
          </div>
          <div className={styles.navigationButtons}>
            <Button type="button" variant="nav" onClick={onPrev} disabled={index >= total - 1} title="Previous version (Left Arrow)"><FaChevronLeft /> <span style={{marginLeft:6}}>Prev</span></Button>
            <Button type="button" variant="nav" onClick={onNext} disabled={index <= 0} title="Next version (Right Arrow)"><span style={{marginRight:6}}>Next</span> <FaChevronRight /></Button>
            <Button type="button" variant="nav" onClick={onClose} className={styles.closeButton} title="Close (Esc)">Close</Button>
          </div>
        </div>

        <div className={styles.contentArea}>
          <div className={styles.previewSection}>
            <div className={styles.previewLabel}>Full Preview</div>
            <div className={styles.previewContent}>{content}</div>
          </div>

          {/* Change summary removed per design */}
        </div>

        <div className={styles.footer}>
          <div className={styles.footerActions}>
            {canRestore && (
              <Button type="button" variant="primary" onClick={() => onRestore?.(version)} className={`${styles.actionButton} ${styles.primaryAction}`} title="Restore this version" disabled={!canRestore}>Restore</Button>
            )}
          </div>
        </div>
    </ModalWrapper>
  );
};

export default KnowledgeArticleViewVersion;
