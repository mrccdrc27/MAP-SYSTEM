import React, { memo, useMemo } from 'react';
import { X, Clock, GitBranch, ArrowRight, User } from 'lucide-react';
import styles from './VersionPreviewModal.module.css';

/**
 * Modal to preview a workflow version's complete definition
 */
const VersionPreviewModal = memo(function VersionPreviewModal({
  version,
  onClose,
}) {
  if (!version) return null;

  const { definition } = version;
  const nodes = definition?.nodes || [];
  const edges = definition?.edges || [];
  const metadata = definition?.metadata || {};

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

  // Build a map of step IDs to step names for edge display
  const stepMap = useMemo(() => {
    const map = {};
    nodes.forEach(node => {
      map[node.id] = node.label || node.name || `Step ${node.id}`;
    });
    return map;
  }, [nodes]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerInfo}>
            <h2>Version {version.version}</h2>
            <span className={styles.date}>
              <Clock size={14} />
              {formatDate(version.created_at)}
            </span>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.content}>
          {/* Metadata Section */}
          <section className={styles.section}>
            <h3>Workflow Metadata</h3>
            <div className={styles.metadataGrid}>
              <div className={styles.metaItem}>
                <label>Name</label>
                <span>{metadata.workflow_name || 'N/A'}</span>
              </div>
              <div className={styles.metaItem}>
                <label>Category</label>
                <span>{metadata.category || 'N/A'}</span>
              </div>
              <div className={styles.metaItem}>
                <label>Sub-Category</label>
                <span>{metadata.sub_category || 'N/A'}</span>
              </div>
              <div className={styles.metaItem}>
                <label>Department</label>
                <span>{metadata.department || 'N/A'}</span>
              </div>
              {metadata.description && (
                <div className={`${styles.metaItem} ${styles.fullWidth}`}>
                  <label>Description</label>
                  <span>{metadata.description}</span>
                </div>
              )}
            </div>
          </section>

          {/* Steps Section */}
          <section className={styles.section}>
            <h3>
              <GitBranch size={16} />
              Steps ({nodes.length})
            </h3>
            <div className={styles.stepsList}>
              {nodes.map((node, index) => (
                <div key={node.id} className={styles.stepItem}>
                  <div className={styles.stepHeader}>
                    <span className={styles.stepNumber}>{index + 1}</span>
                    <span className={styles.stepName}>{node.label || node.name}</span>
                    {node.is_start && <span className={styles.badge}>Start</span>}
                    {node.is_end && <span className={`${styles.badge} ${styles.endBadge}`}>End</span>}
                  </div>
                  <div className={styles.stepDetails}>
                    <span className={styles.stepRole}>
                      <User size={12} />
                      {node.role_name || 'No role'}
                    </span>
                    {node.description && (
                      <p className={styles.stepDescription}>{node.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Transitions Section */}
          <section className={styles.section}>
            <h3>
              <ArrowRight size={16} />
              Transitions ({edges.length})
            </h3>
            <div className={styles.transitionsList}>
              {edges.map((edge, index) => (
                <div key={edge.id || index} className={styles.transitionItem}>
                  <span className={styles.transitionFrom}>
                    {stepMap[edge.from_step_id] || `Step ${edge.from_step_id}`}
                  </span>
                  <ArrowRight size={14} className={styles.transitionArrow} />
                  <span className={styles.transitionTo}>
                    {stepMap[edge.to_step_id] || `Step ${edge.to_step_id}`}
                  </span>
                  {edge.name && (
                    <span className={styles.transitionName}>"{edge.name}"</span>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
});

export default VersionPreviewModal;
