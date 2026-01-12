import React, { useState } from 'react';
import { FaCheck, FaTimes, FaExclamationTriangle } from 'react-icons/fa';
import styles from './KnowledgeArticleRestoreModal.module.css';
import kbService from '../../../../services/kbService';
import ModalWrapper from '../../../../shared/modals/ModalWrapper';

const KnowledgeArticleRestoreModal = ({ version, article, onClose, onRestoreSuccess, versionIndex, totalVersions }) => {
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState(null);

  const versionNumber = `1.1.${totalVersions - versionIndex}`;
  const modifiedDate = version?.date || version?.updated_at || version?.dateModified || 'Unknown';
  const authorName = article?.created_by_external_name || article?.created_by_name || 'Unknown';

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

  const handleRestore = async () => {
    setIsRestoring(true);
    setError(null);

    try {
      // Check if the version has content to restore
      const hasContent = version?.content || version?.body || version?.text || version?.html || version?.raw || version?.description_snapshot;
      
      // Use the dedicated restore-version endpoint if available
      if (kbService.restoreArticleVersion && version?.id) {
        await kbService.restoreArticleVersion(article.id, version.id);
      } else if (hasContent && kbService.updateArticle) {
        // Fallback to updating article with version content
        const newContent = version?.content || version?.body || version?.text || version?.html || version?.raw || '';
        await kbService.updateArticle(article.id, { 
          content: newContent,
          summary: `Restored from version ${versionNumber}`,
          restore_version_number: versionNumber
        });
      } else {
        throw new Error('This version does not have content to restore. Only versions created after the recent update can be restored.');
      }

      if (onRestoreSuccess) {
        onRestoreSuccess();
      } else {
        alert('Article restored successfully. Reloading...');
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to restore version:', err);
      setError(err.message || 'Failed to restore version. Please try again.');
      setIsRestoring(false);
    }
  };

  const handleCancel = () => {
    if (isRestoring) return;
    onClose();
  };

  return (
    <ModalWrapper onClose={null} className={styles.modalContent} contentProps={{ role: 'dialog', 'aria-modal': true }}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            <FaExclamationTriangle style={{ marginRight: 8, color: '#F59E0B' }} />
            Restore Version
          </h2>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.warningBox}>
            <FaCheck className={styles.warningIcon} style={{ color: '#10B981' }} />
            <p className={styles.warningText}>
              You are about to restore the article to a previous version. This will overwrite the current content.
            </p>
          </div>

          <div className={styles.versionDetails}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Version</span>
              <span className={styles.detailValue}>{versionNumber}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Modified Date</span>
              <span className={styles.detailValue}>{formatDate(modifiedDate)}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Author</span>
              <span className={styles.detailValue}>{authorName}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Article</span>
              <span className={styles.detailValue}>{article?.title || 'Unknown'}</span>
            </div>
          </div>

          {error && (
            <div className={styles.errorBox}>
              <p className={styles.errorText}>{error}</p>
            </div>
          )}

          <div className={styles.confirmationText}>
            <p>Are you sure you want to proceed?</p>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button
            className={styles.buttonCancel}
            onClick={handleCancel}
            disabled={isRestoring}
          >
            <FaTimes style={{ marginRight: 6 }} />
            Cancel
          </button>
          <button
            className={styles.buttonRestore}
            onClick={handleRestore}
            disabled={isRestoring}
          >
            {isRestoring ? (
              <>
                <span className={styles.spinner} />
                Restoring...
              </>
            ) : (
              <>
                <FaCheck style={{ marginRight: 6 }} />
                Restore Version
              </>
            )}
          </button>
        </div>
    </ModalWrapper>
  );
};

export default KnowledgeArticleRestoreModal;
