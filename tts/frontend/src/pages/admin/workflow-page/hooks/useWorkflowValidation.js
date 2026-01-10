import { useCallback, useMemo } from 'react';

/**
 * Parse ISO 8601 duration (PT24H30M) to {hours, minutes}
 */
export const parseDuration = (duration) => {
  if (!duration) return { hours: '', minutes: '' };
  const hoursMatch = duration.match(/PT(\d+)H/);
  const minutesMatch = duration.match(/(\d+)M/);
  return {
    hours: hoursMatch ? hoursMatch[1] : '',
    minutes: minutesMatch ? minutesMatch[1] : ''
  };
};

/**
 * Create ISO 8601 duration from hours and minutes
 */
export const createDuration = (hours, minutes) => {
  const h = parseInt(hours) || 0;
  const m = parseInt(minutes) || 0;
  if (h === 0 && m === 0) return null;
  let duration = 'PT';
  if (h > 0) duration += `${h}H`;
  if (m > 0) duration += `${m}M`;
  return duration;
};

/**
 * Extract total minutes from ISO 8601 duration
 */
export const extractTotalMinutes = (sla) => {
  if (!sla) return null;
  let totalMinutes = 0;
  const hoursMatch = sla.match(/PT(\d+)H/);
  const minutesMatch = sla.match(/(\d+)M/);
  if (hoursMatch) totalMinutes += parseInt(hoursMatch[1]) * 60;
  if (minutesMatch) totalMinutes += parseInt(minutesMatch[1]);
  return totalMinutes > 0 ? totalMinutes : null;
};

/**
 * Custom hook for workflow validation
 * @param {Object} workflowMetadata - The workflow metadata being created/edited
 * @param {Array} simpleNodes - Simple mode nodes
 * @param {Array} simpleEdges - Simple mode edges
 * @param {Array} nodes - Flow mode nodes
 * @param {Array} edges - Flow mode edges
 * @param {string} editorMode - 'simple' or 'flow'
 * @param {Array} existingWorkflows - List of existing workflows for duplicate checking
 * @param {number|null} currentWorkflowId - ID of current workflow (for edit mode, to exclude self)
 */
export function useWorkflowValidation(workflowMetadata, simpleNodes, simpleEdges, nodes, edges, editorMode, existingWorkflows = [], currentWorkflowId = null) {
  const validateWorkflowData = useCallback(() => {
    const errors = [];
    const currentNodes = editorMode === 'simple' ? simpleNodes : nodes;
    const currentEdges = editorMode === 'simple' ? simpleEdges : edges;

    // Required field validations
    if (!workflowMetadata.name.trim()) errors.push('Workflow name is required');
    if (workflowMetadata.name.length > 64) errors.push('Workflow name must be 64 characters or less');
    if (!workflowMetadata.category.trim()) errors.push('Category is required');
    if (workflowMetadata.category.length > 64) errors.push('Category must be 64 characters or less');
    if (!workflowMetadata.sub_category.trim()) errors.push('Sub-category is required');
    if (workflowMetadata.sub_category.length > 64) errors.push('Sub-category must be 64 characters or less');
    if (!workflowMetadata.department.trim()) errors.push('Department is required');
    if (workflowMetadata.department.length > 64) errors.push('Department must be 64 characters or less');
    
    if (!workflowMetadata.description || !workflowMetadata.description.trim()) {
      errors.push('Description is required');
    } else if (workflowMetadata.description.length > 256) {
      errors.push('Description must be 256 characters or less');
    }

    // Duplicate workflow validation (only if we have existing workflows to check against)
    if (existingWorkflows && existingWorkflows.length > 0) {
      const trimmedName = workflowMetadata.name.trim().toLowerCase();
      const trimmedCategory = workflowMetadata.category.trim().toLowerCase();
      const trimmedSubCategory = workflowMetadata.sub_category.trim().toLowerCase();

      // Check for duplicate workflow name
      const duplicateName = existingWorkflows.find(wf => {
        // Skip the current workflow in edit mode
        if (currentWorkflowId && wf.id === currentWorkflowId) return false;
        return wf.name?.toLowerCase() === trimmedName;
      });

      if (duplicateName && trimmedName) {
        errors.push(`A workflow with the name "${duplicateName.name}" already exists`);
      }

      // Check for duplicate category + sub_category pair
      const duplicateCategoryPair = existingWorkflows.find(wf => {
        // Skip the current workflow in edit mode
        if (currentWorkflowId && wf.id === currentWorkflowId) return false;
        return (
          wf.category?.toLowerCase() === trimmedCategory &&
          wf.sub_category?.toLowerCase() === trimmedSubCategory
        );
      });

      if (duplicateCategoryPair && trimmedCategory && trimmedSubCategory) {
        errors.push(`A workflow with category "${duplicateCategoryPair.category}" and sub-category "${duplicateCategoryPair.sub_category}" already exists`);
      }
    }

    // SLA ordering validation
    const urgent_mins = extractTotalMinutes(workflowMetadata.urgent_sla);
    const high_mins = extractTotalMinutes(workflowMetadata.high_sla);
    const medium_mins = extractTotalMinutes(workflowMetadata.medium_sla);
    const low_mins = extractTotalMinutes(workflowMetadata.low_sla);

    if (urgent_mins !== null && high_mins !== null && urgent_mins >= high_mins) {
      errors.push('Urgent SLA must be less than High SLA');
    }
    if (high_mins !== null && medium_mins !== null && high_mins >= medium_mins) {
      errors.push('High SLA must be less than Medium SLA');
    }
    if (medium_mins !== null && low_mins !== null && medium_mins >= low_mins) {
      errors.push('Medium SLA must be less than Low SLA');
    }

    if (urgent_mins !== null && high_mins === null) {
      errors.push('If Urgent SLA is set, High SLA should also be set');
    }
    if (high_mins !== null && medium_mins === null) {
      errors.push('If High SLA is set, Medium SLA should also be set');
    }
    if (medium_mins !== null && low_mins === null) {
      errors.push('If Medium SLA is set, Low SLA should also be set');
    }

    if (currentNodes.length > 0) {
      const startNodes = editorMode === 'simple' 
        ? simpleNodes.filter((n) => n.is_start)
        : nodes.filter((n) => n.data?.is_start);
      if (startNodes.length !== 1) {
        errors.push('Workflow must have exactly one start step');
      }
      
      const missingRoles = editorMode === 'simple'
        ? simpleNodes.filter(n => !n.role)
        : nodes.filter(n => !n.data?.role);
      if (missingRoles.length > 0) {
        errors.push(`${missingRoles.length} step(s) missing role assignment`);
      }
      
      const nodeIds = new Set(currentNodes.map(n => n.id));
      const orphanedEdges = currentEdges.filter(e => {
        const sourceId = e.from || e.source;
        const targetId = e.to || e.target;
        return !nodeIds.has(sourceId) || !nodeIds.has(targetId);
      });
      
      if (orphanedEdges.length > 0) {
        errors.push(`${orphanedEdges.length} transition(s) reference deleted steps`);
      }
    }

    return errors;
  }, [editorMode, simpleNodes, simpleEdges, nodes, edges, workflowMetadata, existingWorkflows, currentWorkflowId]);

  const validationErrors = useMemo(() => {
    return validateWorkflowData();
  }, [validateWorkflowData]);

  return { validateWorkflowData, validationErrors };
}

/**
 * Prepare workflow data for API submission
 */
export function prepareWorkflowPayload(workflowMetadata, simpleNodes, simpleEdges, nodes, edges, editorMode) {
  let graphNodes, graphEdges;
  
  if (editorMode === 'simple') {
    graphNodes = simpleNodes.map((node) => ({
      id: node.id,
      name: node.name,
      role: node.role || 'User',
      escalate_to: node.escalate_to || null,
      description: node.description || '',
      instruction: node.instruction || '',
      weight: node.weight ?? 0.5,
      design: { x: 0, y: 0 },
      is_start: node.is_start || false,
      is_end: node.is_end || false,
    }));
    
    graphEdges = simpleEdges.map((edge) => ({
      id: edge.id,
      from: edge.from,
      to: edge.to,
      name: edge.name || '',
    }));
  } else {
    graphNodes = nodes.map((node) => ({
      id: node.id,
      name: node.data?.label || node.id,
      role: node.data?.role || 'User',
      escalate_to: node.data?.escalate_to || null,
      description: node.data?.description || '',
      instruction: node.data?.instruction || '',
      weight: node.data?.weight ?? 0.5,
      design: {
        x: node.position?.x || 0,
        y: node.position?.y || 0,
      },
      is_start: node.data?.is_start || false,
      is_end: node.data?.is_end || false,
    }));

    graphEdges = edges.map((edge) => {
      let edgeId = edge.id;
      if (!String(edgeId).startsWith('temp-') && isNaN(parseInt(edgeId))) {
        edgeId = `temp-${edgeId}`;
      }
      return {
        id: edgeId,
        from: edge.source,
        to: edge.target,
        name: edge.data?.label || '',
      };
    });
  }

  // Clean metadata
  const cleanedMetadata = { ...workflowMetadata };
  ['low_sla', 'medium_sla', 'high_sla', 'urgent_sla'].forEach(key => {
    if (!cleanedMetadata[key]) delete cleanedMetadata[key];
  });

  return { metadata: cleanedMetadata, graph: { nodes: graphNodes, edges: graphEdges } };
}

/**
 * Prepare diagram data for sequence diagram visualization
 */
export function getDiagramData(simpleNodes, simpleEdges, nodes, edges, editorMode) {
  if (editorMode === 'simple') {
    return {
      nodes: simpleNodes.map(n => ({
        id: n.id,
        name: n.name,
        role: n.role || 'User',
        is_start: n.is_start,
        is_end: n.is_end
      })),
      edges: simpleEdges.map(e => ({
        from: e.from,
        to: e.to,
        name: e.name || ''
      }))
    };
  }
  
  return {
    nodes: nodes.map(n => ({
      id: n.id,
      name: n.data?.label || n.id,
      role: n.data?.role || 'User',
      is_start: n.data?.is_start,
      is_end: n.data?.is_end
    })),
    edges: edges.map(e => ({
      from: e.source,
      to: e.target,
      name: e.data?.label || ''
    }))
  };
}
