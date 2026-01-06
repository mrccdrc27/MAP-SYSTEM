import React, { useState, useCallback, useEffect } from 'react';
import { X, Info } from 'lucide-react';
// Use shared styles from CreateWorkflowPage for consistency
import styles from '../workflow-page/create-workflow.module.css';
import { useWorkflowAPI } from '../../../api/useWorkflowAPI';

export default function SLAWeightEditor({ workflowId, onClose }) {
  const [workflowData, setWorkflowData] = useState(null);
  const [weights, setWeights] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  const { getWeightData, updateStepWeights } = useWorkflowAPI();

  // Fetch weight data
  useEffect(() => {
    const fetchWeightData = async () => {
      try {
        setLoading(true);
        const data = await getWeightData(workflowId);
        setWorkflowData(data);

        // Initialize weights state
        const weightsMap = {};
        data.steps.forEach(step => {
          weightsMap[step.step_id] = parseFloat(step.weight) || 0.5;
        });
        setWeights(weightsMap);
        setError(null);
      } catch (err) {
        console.error('Error fetching weight data:', err);
        setError(err.message || 'Failed to load weight data');
      } finally {
        setLoading(false);
      }
    };

    fetchWeightData();
  }, [workflowId, getWeightData]);

  const handleWeightChange = useCallback((stepId, newWeight) => {
    setWeights(prev => ({
      ...prev,
      [stepId]: newWeight,
    }));
  }, []);

  const calculateStepSLA = useCallback((stepId, slaValue) => {
    if (!workflowData || !slaValue) return 'N/A';

    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
    const stepWeight = weights[stepId] || 0;
    
    if (totalWeight === 0) return 'N/A';

    const seconds = parseFloat(slaValue);
    const stepSeconds = (seconds * stepWeight) / totalWeight;

    return formatDuration(stepSeconds);
  }, [weights, workflowData]);

  const formatDuration = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return 'N/A';

    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (mins > 0) parts.push(`${mins}m`);

    return parts.length > 0 ? parts.join(' ') : '< 1m';
  };

  const handleSaveWeights = useCallback(async () => {
    try {
      setIsSaving(true);
      setSaveStatus('saving');

      const stepsData = Object.entries(weights).map(([stepId, weight]) => ({
        step_id: parseInt(stepId, 10),
        weight: weight,
      }));

      await updateStepWeights(workflowId, stepsData);
      setSaveStatus('success');
      setTimeout(() => {
        setSaveStatus(null);
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Error saving weights:', err);
      setSaveStatus('error');
      setError(err.message || 'Failed to save weights');
    } finally {
      setIsSaving(false);
    }
  }, [weights, workflowId, updateStepWeights, onClose]);

  if (loading) {
    return (
      <div className={styles.slaModal}>
        <div className={styles.slaModalContent} style={{ padding: '32px' }}>
          <div className={styles.loadingContent}>
            <div className={styles.loadingSpinner}></div>
            <p className={styles.loadingText}>Loading weight management data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !workflowData) {
    return (
      <div className={styles.slaModal}>
        <div className={styles.slaModalContent} style={{ padding: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <p style={{ color: '#dc2626', marginBottom: '16px' }}>{error}</p>
          <button onClick={onClose} className={styles.btnSecondary}>
            Close
          </button>
        </div>
      </div>
    );
  }

  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);

  return (
    <div className={styles.slaModal}>
      <div className={styles.slaModalContent}>
        <div className={styles.slaModalHeader}>
          <div className={styles.slaModalHeaderInfo}>
            <h2>SLA Time Distribution</h2>
            <p>{workflowData?.workflow_name}</p>
          </div>
          <button onClick={onClose} className={styles.slaModalCloseBtn}>
            <X />
          </button>
        </div>

        <div className={styles.slaModalBody}>
          <div className={styles.slaInfoBox}>
            <Info className={styles.slaInfoIcon} />
            <div className={styles.slaInfoText}>
              <p>Weights determine the relative time allocation for each step.</p>
              <p>Higher weights = more time allocated to that step.</p>
            </div>
          </div>

          {/* SLA Reference */}
          <div className={styles.slaSummary}>
            <h3 className={styles.slaSummaryTitle}>Total SLAs by Priority</h3>
            <div className={styles.slaSummaryGrid}>
              {[
                { label: 'Urgent', value: workflowData?.slas?.urgent_sla },
                { label: 'High', value: workflowData?.slas?.high_sla },
                { label: 'Medium', value: workflowData?.slas?.medium_sla },
                { label: 'Low', value: workflowData?.slas?.low_sla },
              ].map((sla) => (
                <div key={sla.label} className={styles.slaSummaryCard}>
                  <div className={styles.slaSummaryLabel}>{sla.label}</div>
                  <div className={styles.slaSummaryValue}>{formatDuration(parseFloat(sla.value))}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Steps List */}
          <div className={styles.slaStepsList}>
            {workflowData?.steps?.map((step) => {
              const stepWeight = weights[step.step_id] || 0;
              const percentage = totalWeight > 0 ? (stepWeight / totalWeight) * 100 : 0;

              return (
                <div key={step.step_id} className={styles.slaStepCard}>
                  <div className={styles.slaStepHeader}>
                    <div>
                      <div className={styles.slaStepName}>{step.name}</div>
                      <div className={styles.slaStepMeta}>{step.role_name} • Step {step.order}</div>
                    </div>
                    <div className={styles.slaStepWeight}>
                      <div className={styles.slaStepWeightValue}>{(stepWeight * 100).toFixed(0)}%</div>
                      <div className={styles.slaStepWeightPercent}>{percentage.toFixed(1)}% of total</div>
                    </div>
                  </div>
                  
                  <div className={styles.slaStepControls}>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.01"
                      value={stepWeight}
                      onChange={(e) => handleWeightChange(step.step_id, parseFloat(e.target.value))}
                      className={styles.slaStepSlider}
                    />
                    <input
                      type="number"
                      min="0.1"
                      max="1"
                      step="0.01"
                      value={stepWeight}
                      onChange={(e) => handleWeightChange(step.step_id, parseFloat(e.target.value) || 0.1)}
                      className={styles.slaStepInput}
                    />
                  </div>

                  {/* SLA Breakdown for this step */}
                  <div className={styles.slaStepBreakdown}>
                    {[
                      { label: 'Urgent', value: workflowData?.slas?.urgent_sla },
                      { label: 'High', value: workflowData?.slas?.high_sla },
                      { label: 'Medium', value: workflowData?.slas?.medium_sla },
                      { label: 'Low', value: workflowData?.slas?.low_sla },
                    ].map((sla) => (
                      <div key={sla.label} className={styles.slaStepBreakdownItem}>
                        <div className={styles.slaStepBreakdownLabel}>{sla.label}</div>
                        <div className={styles.slaStepBreakdownValue}>{calculateStepSLA(step.step_id, sla.value)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.slaModalFooter}>
          <div className={styles.slaModalFooterInfo}>
            {workflowData?.steps?.length || 0} steps
            {saveStatus === 'success' && (
              <span className={styles.slaModalFooterSuccess}>✓ Saved successfully</span>
            )}
            {saveStatus === 'error' && (
              <span className={styles.slaModalFooterError}>✕ Error saving</span>
            )}
          </div>
          <div className={styles.slaModalFooterActions}>
            <button onClick={onClose} disabled={isSaving} className={styles.btnSecondary}>
              Cancel
            </button>
            <button onClick={handleSaveWeights} disabled={isSaving} className={styles.btnPrimary}>
              {isSaving ? 'Saving...' : 'Save Weights'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
