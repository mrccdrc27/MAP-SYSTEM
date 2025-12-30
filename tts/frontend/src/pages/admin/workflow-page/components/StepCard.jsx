import React, { memo } from 'react';
import { 
  X, Play, Square, ChevronUp, MoreVertical, 
  ArrowUpRight, Scale, Info, Edit3 
} from 'lucide-react';
import styles from '../create-workflow.module.css';

/**
 * Step card component for workflow step editing
 */
const StepCard = memo(function StepCard({ 
  node, 
  index, 
  roles, 
  onUpdate, 
  onRemove 
}) {
  return (
    <div 
      className={`${styles.stepCardCompact} ${node.is_start ? styles.stepStartCompact : ''} ${node.is_end ? styles.stepEndCompact : ''} ${node.expanded ? styles.stepCardExpanded : ''}`}
    >
      <div className={styles.stepCardHeader}>
        <span className={styles.stepBadge}>{index + 1}</span>
        <input
          type="text"
          value={node.name}
          onChange={(e) => onUpdate(index, 'name', e.target.value)}
          className={styles.stepInput}
          placeholder="Step name"
        />
        <button 
          className={styles.expandBtnSmall} 
          onClick={() => onUpdate(index, 'expanded', !node.expanded)}
          title={node.expanded ? 'Collapse' : 'Show more options'}
        >
          {node.expanded ? <ChevronUp size={14} /> : <MoreVertical size={14} />}
        </button>
        <button className={styles.removeBtnSmall} onClick={() => onRemove(index)}>
          <X size={14} />
        </button>
      </div>
      
      <div className={styles.stepCardBody}>
        <select
          value={node.role || ''}
          onChange={(e) => onUpdate(index, 'role', e.target.value)}
          className={styles.roleSelectCompact}
          title="Assigned role for this step"
        >
          <option value="">-- Role --</option>
          {roles.map(r => (
            <option key={r.role_id || r.id} value={r.name}>{r.name}</option>
          ))}
        </select>
        <div className={styles.flagsCompact}>
          <label title="Start Step">
            <input
              type="checkbox"
              checked={node.is_start}
              onChange={(e) => onUpdate(index, 'is_start', e.target.checked)}
            />
            <span className={styles.flagIconStart}>
              <Play size={10} fill="currentColor" />
            </span>
          </label>
          <label title="End Step">
            <input
              type="checkbox"
              checked={node.is_end}
              onChange={(e) => onUpdate(index, 'is_end', e.target.checked)}
            />
            <span className={styles.flagIconEnd}>
              <Square size={10} fill="currentColor" />
            </span>
          </label>
        </div>
      </div>
      
      {/* Expanded Section */}
      {node.expanded && (
        <div className={styles.stepCardExpansion}>
          <div className={styles.expansionDivider} />
          
          <div className={styles.expansionRow}>
            <label className={styles.expansionLabel}>
              <ArrowUpRight size={12} /> Escalate To
            </label>
            <select
              value={node.escalate_to || ''}
              onChange={(e) => onUpdate(index, 'escalate_to', e.target.value)}
              className={styles.expansionSelect}
              title="Role to escalate to when step times out"
            >
              <option value="">-- None --</option>
              {roles.map(r => (
                <option key={r.role_id || r.id} value={r.name}>{r.name}</option>
              ))}
            </select>
          </div>
          
          <div className={styles.expansionRow}>
            <label className={styles.expansionLabel}>
              <Scale size={12} /> Weight
            </label>
            <div className={styles.weightInputWrapper}>
              <input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={node.weight ?? 0.5}
                onChange={(e) => onUpdate(index, 'weight', parseFloat(e.target.value) || 0.5)}
                className={styles.expansionInput}
                title="Step weight (0-1) for progress calculation"
              />
              <span className={styles.weightHint}>(0-1)</span>
            </div>
          </div>
          
          <div className={styles.expansionRowFull}>
            <label className={styles.expansionLabel}>
              <Info size={12} /> Description
            </label>
            <input
              type="text"
              value={node.description || ''}
              onChange={(e) => onUpdate(index, 'description', e.target.value)}
              className={styles.expansionInputFull}
              placeholder="Brief description of this step"
              maxLength={256}
            />
          </div>
          
          <div className={styles.expansionRowFull}>
            <label className={styles.expansionLabel}>
              <Edit3 size={12} /> Instructions
            </label>
            <textarea
              value={node.instruction || ''}
              onChange={(e) => onUpdate(index, 'instruction', e.target.value)}
              className={styles.expansionTextarea}
              placeholder="Detailed instructions for agents handling this step..."
              rows={2}
            />
          </div>
        </div>
      )}
    </div>
  );
});

export default StepCard;
