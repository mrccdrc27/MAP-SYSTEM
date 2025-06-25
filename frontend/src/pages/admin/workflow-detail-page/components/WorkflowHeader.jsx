import React, { useState } from 'react';
import styles from './WorkflowHeader.module.css';

export default function WorkflowHeader({ workflow, onSave }) {
    const [editable, setEditable] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [formData, setFormData] = useState({ ...workflow });

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString();

  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return styles.statusActive;
      case 'inactive': return styles.statusInactive;
      case 'draft':
      default: return styles.statusDraft;
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onSave?.(formData);
    setEditable(false);
  };

  return (
    <div className={styles.container}>
    <div className={styles.headerActions}>
    {!editable ? (
        <button className={styles.editBtn} onClick={() => 
        {
            setEditable(true)
            setShowDetails(true)
        }
        }>✏️ Edit</button>
    ) : (
        <>
        <button
            className={styles.editBtn}
            onClick={() => {
            setFormData({ ...workflow }); // Revert changes
            setEditable(false);          // Exit edit mode
            setShowDetails(false)
            }}
        >
            ❌ Cancel
        </button>

        <button className={styles.saveBtn} onClick={handleSave}>💾 Save</button>
        </>
    )}
        <button className={styles.toggleBtn} onClick={() => setShowDetails(!showDetails)}>
        {showDetails ? '▾ Hide Details' : '▸ Show Details'}
        </button>
    </div>


      {editable ? (
        <input
          className={styles.titleInput}
          name="name"
          value={formData.name}
          onChange={handleChange}
        />
      ) : (
        <h1 className={styles.title}>{workflow.name}</h1>
      )}

      {editable ? (
        <textarea
          className={styles.subtitleInput}
          name="description"
          value={formData.description}
          onChange={handleChange}
        />
      ) : (
        <p className={styles.subtitle}>{workflow.description}</p>
      )}

      {showDetails && (
        <>
          <div className={styles.metadata}>
            <div className={styles.metadataItem}>
              <span className={styles.metadataLabel}>Status</span>
              <span className={`${styles.status} ${getStatusClass(workflow.status)}`}>
                {workflow.status}
              </span>
            </div>

            <div className={styles.metadataItem}>
              <span className={styles.metadataLabel}>Category</span>
              {editable ? (
                <>
                  <input
                    className={styles.categoryInput}
                    name="category"
                    placeholder="Category"
                    value={formData.category}
                    onChange={handleChange}
                  />
                  <input
                    className={styles.categoryInput}
                    name="sub_category"
                    placeholder="Subcategory"
                    value={formData.sub_category}
                    onChange={handleChange}
                  />
                </>
              ) : (
                <span className={styles.category}>
                  {workflow.category}
                  {workflow.sub_category && ` • ${workflow.sub_category}`}
                </span>
              )}
            </div>
          </div>

          <div className={styles.slaContainer}>
            {['low', 'medium', 'high', 'urgent'].map((priority) => {
              const label = `${priority[0].toUpperCase()}${priority.slice(1)} Priority`;
              const slaKey = `${priority}_sla`;
              const sla = formData[slaKey] || {};

              return (
                <div
                  key={priority}
                  className={`${styles.slaItem} ${styles[`sla${priority.charAt(0).toUpperCase() + priority.slice(1)}`]}`}
                >
                  <span className={styles.slaLabel}>{label}</span>
                  {editable ? (
                    <div className={styles.slaInputGroup}>
                      {['days', 'hours', 'minutes'].map((unit, idx) => (
                        <div className={styles.slaField} key={idx}>
                          <label className={styles.unitLabel}>{unit[0].toUpperCase() + unit.slice(1)}</label>
                          <input
                            type="number"
                            min="0"
                            max={unit === 'hours' ? 23 : unit === 'minutes' ? 59 : 365}
                            name={`${slaKey}_${unit}`}
                            value={sla[unit] || ''}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                [slaKey]: {
                                  ...prev[slaKey],
                                  [unit]: e.target.value,
                                },
                              }))
                            }
                            className={styles.slaInput}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className={styles.slaValue}>
                      {sla.days || 0}d {sla.hours || 0}h {sla.minutes || 0}m
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className={styles.dates}>
            <div className={styles.dateItem}>
              <span className={styles.dateLabel}>Created</span>
              <span className={styles.dateValue}>{formatDate(workflow.createdAt)}</span>
            </div>
            <div className={styles.dateItem}>
              <span className={styles.dateLabel}>Updated</span>
              <span className={styles.dateValue}>{formatDate(workflow.updatedAt)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
