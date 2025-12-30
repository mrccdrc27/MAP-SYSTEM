import React, { memo } from 'react';
import { Lightbulb, Play, Square } from 'lucide-react';
import styles from '../create-workflow.module.css';

/**
 * Help tips sidebar component
 */
const HelpTips = memo(function HelpTips() {
  return (
    <div className={styles.helpTipsBox}>
      <h3 className={styles.previewTitle}><Lightbulb size={16} /> Tips</h3>
      <div className={styles.helpTipsContent}>
        <div className={styles.tipItem}>
          <strong><Play size={10} fill="currentColor" /> Start</strong> = Entry point
        </div>
        <div className={styles.tipItem}>
          <strong><Square size={10} fill="currentColor" /> End</strong> = Final step
        </div>
        <div className={styles.tipItem}>
          <strong>Transitions</strong> connect steps
        </div>
        <div className={styles.tipItem}>
          Assign <strong>roles</strong> to each step
        </div>
      </div>
    </div>
  );
});

export default HelpTips;
