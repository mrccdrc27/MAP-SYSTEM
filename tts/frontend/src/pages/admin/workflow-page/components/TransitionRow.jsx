import React, { memo } from 'react';
import { X, ArrowRight } from 'lucide-react';
import styles from '../create-workflow.module.css';

/**
 * Transition row component for workflow edge editing
 */
const TransitionRow = memo(function TransitionRow({ 
  edge, 
  index, 
  nodes, 
  onUpdate, 
  onRemove 
}) {
  return (
    <div className={styles.transitionRow}>
      <select
        value={edge.from}
        onChange={(e) => onUpdate(index, 'from', e.target.value)}
        className={styles.transitionSelectSmall}
      >
        <option value="">From</option>
        {nodes.map(n => (
          <option key={n.id} value={n.id}>{n.name}</option>
        ))}
      </select>
      <span className={styles.arrowSmall}><ArrowRight size={14} /></span>
      <select
        value={edge.to}
        onChange={(e) => onUpdate(index, 'to', e.target.value)}
        className={styles.transitionSelectSmall}
      >
        <option value="">To</option>
        {nodes.map(n => (
          <option key={n.id} value={n.id}>{n.name}</option>
        ))}
      </select>
      <input
        type="text"
        value={edge.name || ''}
        onChange={(e) => onUpdate(index, 'name', e.target.value)}
        placeholder="Action"
        className={styles.transitionInputSmall}
      />
      <button className={styles.removeBtnSmall} onClick={() => onRemove(index)}>
        <X size={14} />
      </button>
    </div>
  );
});

export default TransitionRow;
