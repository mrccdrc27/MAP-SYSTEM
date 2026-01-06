import { useState, useCallback, useEffect } from 'react';
import { useWorkflowAPI } from '../../../../api/useWorkflowAPI';

/**
 * Helper to parse Django DurationField format to seconds
 * Django format: "D HH:MM:SS" or "HH:MM:SS" or numeric seconds
 */
function parseDurationToSeconds(duration) {
  if (!duration) return null;
  
  // If it's already a number, return it
  if (typeof duration === 'number') {
    return duration;
  }
  
  if (typeof duration === 'string') {
    const trimmed = duration.trim();
    
    // Check for "D HH:MM:SS" format (days + time)
    const dayTimeMatch = trimmed.match(/^(\d+)\s+(\d{1,2}):(\d{2}):(\d{2})$/);
    if (dayTimeMatch) {
      const days = parseInt(dayTimeMatch[1], 10);
      const hours = parseInt(dayTimeMatch[2], 10);
      const mins = parseInt(dayTimeMatch[3], 10);
      const secs = parseInt(dayTimeMatch[4], 10);
      return (days * 86400) + (hours * 3600) + (mins * 60) + secs;
    }
    
    // Check for "HH:MM:SS" format (time only)
    const timeMatch = trimmed.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1], 10);
      const mins = parseInt(timeMatch[2], 10);
      const secs = parseInt(timeMatch[3], 10);
      return (hours * 3600) + (mins * 60) + secs;
    }
    
    // Try parsing as a plain number string
    const numericValue = parseFloat(trimmed);
    if (!isNaN(numericValue)) {
      return numericValue;
    }
  }
  
  return null;
}

/**
 * Convert seconds to a display-friendly format for inputs
 * Returns object with { days, hours, minutes } for more granular control
 */
function secondsToTimeUnits(totalSeconds) {
  if (!totalSeconds || totalSeconds <= 0) return { days: 0, hours: 0, minutes: 0 };
  
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  
  return { days, hours, minutes };
}

/**
 * Convert time units back to seconds for API submission
 */
function timeUnitsToSeconds({ days = 0, hours = 0, minutes = 0 }) {
  return (days * 86400) + (hours * 3600) + (minutes * 60);
}

/**
 * Format seconds to Django DurationField format for API
 * Returns "D HH:MM:SS" format
 */
function secondsToDjangoDuration(totalSeconds) {
  if (!totalSeconds || totalSeconds <= 0) return null;
  
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  
  const timeStr = [
    String(hours).padStart(2, '0'),
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0')
  ].join(':');
  
  if (days > 0) {
    return `${days} ${timeStr}`;
  }
  return timeStr;
}

/**
 * Hook for managing workflow configuration state and updates
 * @param {Object} workflow - Current workflow data
 * @param {string} workflowId - Workflow ID for API calls
 * @param {Function} onUpdate - Callback after successful update
 */
export function useWorkflowConfig(workflow, workflowId, onUpdate) {
  const { updateWorkflowDetails, loading: apiLoading, error: apiError } = useWorkflowAPI();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    sub_category: '',
    department: '',
    end_logic: '',
    // SLA as time units for easier editing
    urgent_sla: { days: 0, hours: 0, minutes: 0 },
    high_sla: { days: 0, hours: 0, minutes: 0 },
    medium_sla: { days: 0, hours: 0, minutes: 0 },
    low_sla: { days: 0, hours: 0, minutes: 0 },
  });
  
  // Initialize form data from workflow
  useEffect(() => {
    if (workflow) {
      const urgentSeconds = parseDurationToSeconds(workflow.urgent_sla);
      const highSeconds = parseDurationToSeconds(workflow.high_sla);
      const mediumSeconds = parseDurationToSeconds(workflow.medium_sla);
      const lowSeconds = parseDurationToSeconds(workflow.low_sla);
      
      setFormData({
        name: workflow.name || '',
        description: workflow.description || '',
        category: workflow.category || '',
        sub_category: workflow.sub_category || '',
        department: workflow.department || '',
        end_logic: workflow.end_logic || '',
        urgent_sla: secondsToTimeUnits(urgentSeconds),
        high_sla: secondsToTimeUnits(highSeconds),
        medium_sla: secondsToTimeUnits(mediumSeconds),
        low_sla: secondsToTimeUnits(lowSeconds),
      });
      setHasChanges(false);
      setError(null);
    }
  }, [workflow]);
  
  // Handle basic field changes
  const handleChange = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    setHasChanges(true);
    setError(null);
  }, []);
  
  // Handle SLA time unit changes
  const handleSLAChange = useCallback((slaField, unit, value) => {
    setFormData(prev => ({
      ...prev,
      [slaField]: {
        ...prev[slaField],
        [unit]: parseInt(value, 10) || 0,
      },
    }));
    setHasChanges(true);
    setError(null);
  }, []);
  
  // Validate SLA ordering: urgent < high < medium < low
  const validateSLAs = useCallback(() => {
    const urgentSeconds = timeUnitsToSeconds(formData.urgent_sla);
    const highSeconds = timeUnitsToSeconds(formData.high_sla);
    const mediumSeconds = timeUnitsToSeconds(formData.medium_sla);
    const lowSeconds = timeUnitsToSeconds(formData.low_sla);
    
    // Only validate if SLAs are set (non-zero)
    if (urgentSeconds > 0 && highSeconds > 0 && urgentSeconds >= highSeconds) {
      return 'Urgent SLA must be less than High SLA';
    }
    if (highSeconds > 0 && mediumSeconds > 0 && highSeconds >= mediumSeconds) {
      return 'High SLA must be less than Medium SLA';
    }
    if (mediumSeconds > 0 && lowSeconds > 0 && mediumSeconds >= lowSeconds) {
      return 'Medium SLA must be less than Low SLA';
    }
    
    return null;
  }, [formData]);
  
  // Save configuration
  const saveConfig = useCallback(async () => {
    if (!workflowId) {
      setError('No workflow ID available');
      return false;
    }
    
    // Validate required fields
    if (!formData.name?.trim()) {
      setError('Workflow name is required');
      return false;
    }
    
    // Validate SLA ordering
    const slaError = validateSLAs();
    if (slaError) {
      setError(slaError);
      return false;
    }
    
    setIsSaving(true);
    setError(null);
    
    try {
      // Convert SLA time units to Django duration format
      const updateData = {
        name: formData.name.trim(),
        description: formData.description?.trim() || '',
        category: formData.category?.trim() || '',
        sub_category: formData.sub_category?.trim() || '',
        department: formData.department?.trim() || '',
        end_logic: formData.end_logic || '',
        urgent_sla: secondsToDjangoDuration(timeUnitsToSeconds(formData.urgent_sla)),
        high_sla: secondsToDjangoDuration(timeUnitsToSeconds(formData.high_sla)),
        medium_sla: secondsToDjangoDuration(timeUnitsToSeconds(formData.medium_sla)),
        low_sla: secondsToDjangoDuration(timeUnitsToSeconds(formData.low_sla)),
      };
      
      const result = await updateWorkflowDetails(workflowId, updateData);
      
      setHasChanges(false);
      setIsEditing(false);
      
      // Notify parent of update
      if (onUpdate) {
        onUpdate(result);
      }
      
      return true;
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to save workflow configuration';
      setError(errorMsg);
      console.error('Error saving workflow config:', err);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [workflowId, formData, validateSLAs, updateWorkflowDetails, onUpdate]);
  
  // Cancel editing and reset form
  const cancelEdit = useCallback(() => {
    if (workflow) {
      const urgentSeconds = parseDurationToSeconds(workflow.urgent_sla);
      const highSeconds = parseDurationToSeconds(workflow.high_sla);
      const mediumSeconds = parseDurationToSeconds(workflow.medium_sla);
      const lowSeconds = parseDurationToSeconds(workflow.low_sla);
      
      setFormData({
        name: workflow.name || '',
        description: workflow.description || '',
        category: workflow.category || '',
        sub_category: workflow.sub_category || '',
        department: workflow.department || '',
        end_logic: workflow.end_logic || '',
        urgent_sla: secondsToTimeUnits(urgentSeconds),
        high_sla: secondsToTimeUnits(highSeconds),
        medium_sla: secondsToTimeUnits(mediumSeconds),
        low_sla: secondsToTimeUnits(lowSeconds),
      });
    }
    setHasChanges(false);
    setIsEditing(false);
    setError(null);
  }, [workflow]);
  
  // Start editing
  const startEdit = useCallback(() => {
    setIsEditing(true);
    setError(null);
  }, []);
  
  return {
    // State
    formData,
    isEditing,
    isSaving,
    hasChanges,
    error: error || apiError,
    
    // Actions
    handleChange,
    handleSLAChange,
    saveConfig,
    cancelEdit,
    startEdit,
    
    // Utilities
    validateSLAs,
  };
}

// Export utility functions for use elsewhere
export { parseDurationToSeconds, secondsToTimeUnits, timeUnitsToSeconds, secondsToDjangoDuration };
