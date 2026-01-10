import React, { memo, useState, useEffect } from 'react';
import { History, RotateCcw, Eye, ChevronUp, ChevronDown, Clock, GitBranch, ArrowRight, Loader2 } from 'lucide-react';
import styles from './VersionHistoryPanel.module.css';

/**
 * Panel for viewing workflow version history and rollback
 */
const VersionHistoryPanel = memo(function VersionHistoryPanel({
  versions = [],
  selectedVersion = null,
  loading = false,
  isCollapsible = false,
  defaultExpanded = true,
  onFetchVersions,
  onSelectVersion,
  onRollback,
  onPreviewVersion,
  className = ''
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [rollbackConfirm, setRollbackConfirm] = useState(null);

  useEffect(() => {
    if (onFetchVersions) {
      onFetchVersions();
    }
  }, [onFetchVersions]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleRollbackClick = (version) => {
    setRollbackConfirm(version);
  };

  const handleConfirmRollback = () => {
    if (rollbackConfirm && onRollback) {
      onRollback(rollbackConfirm.id);
      setRollbackConfirm(null);
    }
  };

  const handleCancelRollback = () => {
    setRollbackConfirm(null);
  };

  const content = (
    <div className={styles.content}>
      {loading ? (
        <div className={styles.loadingState}>
          <Loader2 size={20} className={styles.spinner} />
          <span>Loading versions...</span>
        </div>
      ) : versions.length === 0 ? (
        <div className={styles.emptyState}>
          <History size={24} />
          <span>No versions yet</span>
          <p className={styles.emptyHint}>
            Versions are created when the workflow is initialized
          </p>
        </div>
      ) : (
        <ul className={styles.versionList}>
          {versions.map((version) => (
            <li
              key={version.id}
              className={`${styles.versionItem} ${version.is_active ? styles.activeVersion : ''} ${selectedVersion?.id === version.id ? styles.selected : ''}`}
            >
              <div className={styles.versionHeader}>
                <div className={styles.versionInfo}>
                  <span className={styles.versionNumber}>
                    v{version.version}
                    {version.is_active && (
                      <span className={styles.activeBadge}>Current</span>
                    )}
                  </span>
                  <span className={styles.versionDate}>
                    <Clock size={12} />
                    {formatDate(version.created_at)}
                  </span>
                </div>
                <div className={styles.versionStats}>
                  <span className={styles.stat}>
                    <GitBranch size={12} />
                    {version.node_count} steps
                  </span>
                  <span className={styles.stat}>
                    <ArrowRight size={12} />
                    {version.edge_count} transitions
                  </span>
                </div>
              </div>
              <div className={styles.versionActions}>
                {onPreviewVersion && (
                  <button
                    className={styles.actionBtn}
                    onClick={() => onPreviewVersion(version.id)}
                    title="Preview this version"
                  >
                    <Eye size={14} />
                    Preview
                  </button>
                )}
                {!version.is_active && onRollback && (
                  <button
                    className={`${styles.actionBtn} ${styles.rollbackBtn}`}
                    onClick={() => handleRollbackClick(version)}
                    title="Rollback to this version"
                  >
                    <RotateCcw size={14} />
                    Rollback
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Rollback Confirmation */}
      {rollbackConfirm && (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmDialog}>
            <h4>Confirm Rollback</h4>
            <p>
              Are you sure you want to rollback to <strong>version {rollbackConfirm.version}</strong>?
            </p>
            <p className={styles.confirmWarning}>
              This will replace the current workflow structure with the selected version's snapshot.
              A new version will be created after the rollback.
            </p>
            <div className={styles.confirmActions}>
              <button
                className={styles.cancelBtn}
                onClick={handleCancelRollback}
              >
                Cancel
              </button>
              <button
                className={styles.confirmBtn}
                onClick={handleConfirmRollback}
              >
                <RotateCcw size={14} />
                Rollback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (!isCollapsible) {
    return (
      <div className={`${styles.panel} ${className}`}>
        <div className={styles.header}>
          <h3 className={styles.title}>
            <History size={16} />
            Version History
            {versions.length > 0 && (
              <span className={styles.badge}>{versions.length}</span>
            )}
          </h3>
        </div>
        {content}
      </div>
    );
  }

  return (
    <div className={`${styles.panel} ${styles.collapsible} ${className}`}>
      <button
        className={styles.headerBtn}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className={styles.title}>
          <History size={16} />
          Version History
          {versions.length > 0 && (
            <span className={styles.badge}>{versions.length}</span>
          )}
        </h3>
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {isExpanded && content}
    </div>
  );
});

export default VersionHistoryPanel;
