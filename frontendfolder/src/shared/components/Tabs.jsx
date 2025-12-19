import React from 'react';
import styles from './Tabs.module.css';

/**
 * Clean Tabs component
 * Props:
 * - tabs: [{ label, value }]
 * - active or activeTab: string (current active value)
 * - onChange or onTabChange: function(value)
 * - children: optional content (rendered in a single panel)
 * - className: optional extra class for container
 */
export default function Tabs({ tabs = [], active, activeTab, onChange, onTabChange, children, className = '', fullHeight = false }) {
  const current = active ?? activeTab;
  const handleChange = onChange ?? onTabChange ?? (() => {});

  const handleKeyDown = (e, idx) => {
    if (!tabs || tabs.length === 0) return;
    const key = e.key;
    if (key === 'ArrowRight' || key === 'ArrowLeft') {
      e.preventDefault();
      const dir = key === 'ArrowRight' ? 1 : -1;
      const next = (idx + dir + tabs.length) % tabs.length;
      handleChange(tabs[next].value);
      const nextEl = document.getElementById(`tab-${tabs[next].value}`);
      if (nextEl) nextEl.focus();
    }
  };

  const handleClick = (value) => {
    // debug: confirm clicks reach this component
    // eslint-disable-next-line no-console
    console.log('[Tabs] click', value);
    handleChange(value);
  };

  return (
    <div className={`${styles.tabsContainer} ${className}`.trim()}>
      <div className={styles.tabList} role="tablist" aria-orientation="horizontal">
        {tabs.map((tab, idx) => {
          const isActive = current === tab.value;
          const classNameForTab = `${styles.tab} ${isActive ? styles.activeTab : ''}`.trim();

          return (
            <button
              key={tab.value}
              id={`tab-${tab.value}`}
              className={classNameForTab}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.value}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => handleClick(tab.value)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              type="button"
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {children && (
        <div className={`${styles.tabContent} ${fullHeight ? styles.fullHeight : ''}`.trim()}>
          <div id={`panel-${current}`} role="tabpanel" aria-labelledby={`tab-${current}`}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}