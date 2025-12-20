/**
 * Workflow Editor Validation Utilities
 * 
 * These validation rules mirror the backend validation in:
 * - workflow_api/workflow/serializers.py
 * - workflow_api/workflow/services.py
 * 
 * Backend Rules:
 * 1. There must be exactly one start node (is_start: true)
 * 2. Role must exist in the backend Roles table
 * 3. Node ID must be integer or start with 'temp-'
 * 4. Edge ID must be integer or start with 'temp-'
 * 5. Edges must reference existing nodes
 * 6. Step name is required (max 64 chars)
 * 7. Description max 256 chars
 * 8. Workflow must have a name
 */

export const VALIDATION_RULES = {
  STEP_NAME_MAX_LENGTH: 64,
  STEP_DESCRIPTION_MAX_LENGTH: 256,
  WORKFLOW_NAME_MAX_LENGTH: 64,
  WORKFLOW_DESCRIPTION_MAX_LENGTH: 256,
  TRANSITION_NAME_MAX_LENGTH: 64,
  MIN_STEPS_FOR_WORKFLOW: 1,
  EXACTLY_ONE_START_NODE: true,
};

/**
 * Validate step name
 */
export const validateStepName = (name) => {
  const errors = [];
  
  if (!name || name.trim().length === 0) {
    errors.push('Step name is required');
  } else if (name.length > VALIDATION_RULES.STEP_NAME_MAX_LENGTH) {
    errors.push(`Step name must be ${VALIDATION_RULES.STEP_NAME_MAX_LENGTH} characters or less`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate step role against available roles from backend
 * @param {string} roleName - The role name to validate
 * @param {Array} availableRoles - List of roles from backend {role_id, name, system}
 */
export const validateStepRole = (roleName, availableRoles = []) => {
  const errors = [];
  
  if (!roleName || roleName.trim().length === 0) {
    errors.push('Role is required');
  } else if (roleName === 'Unassigned') {
    errors.push('Please select a valid role from the dropdown');
  } else if (availableRoles.length > 0) {
    const roleExists = availableRoles.some(
      (role) => role.name?.toLowerCase() === roleName.toLowerCase()
    );
    if (!roleExists) {
      errors.push(`Role "${roleName}" does not exist. Please select from available roles.`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate step description
 */
export const validateStepDescription = (description) => {
  const errors = [];
  
  if (description && description.length > VALIDATION_RULES.STEP_DESCRIPTION_MAX_LENGTH) {
    errors.push(`Description must be ${VALIDATION_RULES.STEP_DESCRIPTION_MAX_LENGTH} characters or less`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate a complete step object
 */
export const validateStep = (step, availableRoles = []) => {
  const allErrors = [];
  
  const nameValidation = validateStepName(step.name || step.label);
  const roleValidation = validateStepRole(step.role, availableRoles);
  const descValidation = validateStepDescription(step.description);
  
  allErrors.push(...nameValidation.errors);
  allErrors.push(...roleValidation.errors);
  allErrors.push(...descValidation.errors);
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
};

/**
 * Validate transition name
 */
export const validateTransitionName = (name) => {
  const errors = [];
  
  if (name && name.length > VALIDATION_RULES.TRANSITION_NAME_MAX_LENGTH) {
    errors.push(`Transition name must be ${VALIDATION_RULES.TRANSITION_NAME_MAX_LENGTH} characters or less`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate node ID format (must be integer or temp-*)
 */
export const validateNodeId = (id) => {
  const errors = [];
  const idStr = String(id);
  
  if (idStr.startsWith('temp-')) {
    return { isValid: true, errors: [] };
  }
  
  const parsed = parseInt(idStr);
  if (isNaN(parsed)) {
    errors.push(`Node ID must be an integer or start with 'temp-'`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate edge references - edges must point to existing nodes
 * NOTE: null is valid for:
 *   - from/source: null means this is a START edge (entry point to the workflow)
 *   - to/target: null means this is an END edge (exit point from the workflow)
 */
export const validateEdgeReferences = (edges, nodes) => {
  const errors = [];
  const nodeIds = new Set(nodes.map((n) => String(n.id)));
  
  edges.forEach((edge, index) => {
    const sourceRaw = edge.source ?? edge.from;
    const targetRaw = edge.target ?? edge.to;
    
    // Skip edges marked for deletion
    if (edge.to_delete) {
      return;
    }
    
    // null source = START edge (valid - entry point to start node)
    // null target = END edge (valid - exit point from end node)
    const sourceId = sourceRaw === null ? null : String(sourceRaw);
    const targetId = targetRaw === null ? null : String(targetRaw);
    
    // Validate source - null is valid (START edge), otherwise must exist
    if (sourceId !== null && sourceId !== 'null' && !nodeIds.has(sourceId)) {
      errors.push(`Edge ${index + 1}: Source node "${sourceId}" does not exist`);
    }
    
    // Validate target - null is valid (END edge), otherwise must exist
    if (targetId !== null && targetId !== 'null' && !nodeIds.has(targetId)) {
      errors.push(`Edge ${index + 1}: Target node "${targetId}" does not exist`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate that there is exactly one start node
 * (Backend enforces this in UpdateWorkflowGraphSerializer)
 */
export const validateStartNodes = (nodes) => {
  const errors = [];
  const activeNodes = nodes.filter((n) => !n.to_delete && !n.data?.to_delete);
  const startNodes = activeNodes.filter((n) => 
    n.is_start || n.data?.is_start || n.isStart
  );
  
  if (startNodes.length === 0) {
    errors.push('Workflow must have exactly one start node');
  } else if (startNodes.length > 1) {
    errors.push(`Workflow has ${startNodes.length} start nodes, but must have exactly one`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate that workflow has at least one step
 */
export const validateMinimumSteps = (nodes) => {
  const errors = [];
  const activeNodes = nodes.filter((n) => !n.to_delete && !n.data?.to_delete);
  
  if (activeNodes.length < VALIDATION_RULES.MIN_STEPS_FOR_WORKFLOW) {
    errors.push(`Workflow must have at least ${VALIDATION_RULES.MIN_STEPS_FOR_WORKFLOW} step(s)`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate all steps have valid roles
 */
export const validateAllStepsRoles = (nodes, availableRoles = []) => {
  const errors = [];
  const activeNodes = nodes.filter((n) => !n.to_delete && !n.data?.to_delete);
  
  activeNodes.forEach((node) => {
    const roleName = node.role || node.data?.role;
    const nodeName = node.name || node.data?.label || node.data?.name || `Node ${node.id}`;
    const roleValidation = validateStepRole(roleName, availableRoles);
    
    if (!roleValidation.isValid) {
      errors.push(`Step "${nodeName}": ${roleValidation.errors.join(', ')}`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Comprehensive workflow graph validation
 * This should be called before saving to catch all issues
 */
export const validateWorkflowGraph = (nodes, edges, availableRoles = []) => {
  const allErrors = [];
  const warnings = [];
  
  // 1. Validate minimum steps
  const minStepsValidation = validateMinimumSteps(nodes);
  allErrors.push(...minStepsValidation.errors);
  
  // 2. Validate start nodes (exactly one)
  const startNodesValidation = validateStartNodes(nodes);
  allErrors.push(...startNodesValidation.errors);
  
  // 3. Validate edge references
  const edgeRefsValidation = validateEdgeReferences(edges, nodes);
  allErrors.push(...edgeRefsValidation.errors);
  
  // 4. Validate all step roles
  const rolesValidation = validateAllStepsRoles(nodes, availableRoles);
  allErrors.push(...rolesValidation.errors);
  
  // 5. Check for orphan nodes (no incoming or outgoing edges) - warning only
  const activeNodes = nodes.filter((n) => !n.to_delete && !n.data?.to_delete);
  const activeEdges = edges.filter((e) => !e.to_delete && !e.data?.to_delete);
  
  activeNodes.forEach((node) => {
    const nodeId = String(node.id);
    const hasIncoming = activeEdges.some((e) => String(e.target || e.to) === nodeId);
    const hasOutgoing = activeEdges.some((e) => String(e.source || e.from) === nodeId);
    const isStart = node.is_start || node.data?.is_start;
    const isEnd = node.is_end || node.data?.is_end;
    
    if (!hasIncoming && !isStart) {
      const nodeName = node.name || node.data?.label || node.data?.name || `Node ${node.id}`;
      warnings.push(`Step "${nodeName}" has no incoming transitions (unreachable)`);
    }
    if (!hasOutgoing && !isEnd) {
      const nodeName = node.name || node.data?.label || node.data?.name || `Node ${node.id}`;
      warnings.push(`Step "${nodeName}" has no outgoing transitions (dead end)`);
    }
  });
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings
  };
};

/**
 * Format validation errors for display to user
 */
export const formatValidationErrors = (validation) => {
  let message = '';
  
  if (validation.errors.length > 0) {
    message += 'Errors:\n';
    validation.errors.forEach((error, i) => {
      message += `  ${i + 1}. ${error}\n`;
    });
  }
  
  if (validation.warnings && validation.warnings.length > 0) {
    if (message) message += '\n';
    message += 'Warnings:\n';
    validation.warnings.forEach((warning, i) => {
      message += `  ${i + 1}. ${warning}\n`;
    });
  }
  
  return message.trim();
};

/**
 * Show validation alert with errors and warnings
 */
export const showValidationAlert = (validation, title = 'Validation Issues') => {
  if (!validation.isValid || (validation.warnings && validation.warnings.length > 0)) {
    const message = formatValidationErrors(validation);
    if (message) {
      alert(`${title}\n\n${message}`);
    }
    return false;
  }
  return true;
};

/**
 * Get default role - returns first available role or null
 */
export const getDefaultRole = (availableRoles = []) => {
  if (availableRoles.length === 0) return null;
  // Prefer a role that looks like a default worker role
  const preferredNames = ['Agent', 'Worker', 'Staff', 'Support', 'User'];
  for (const name of preferredNames) {
    const found = availableRoles.find(
      (r) => r.name?.toLowerCase() === name.toLowerCase()
    );
    if (found) return found.name;
  }
  return availableRoles[0].name;
};

export default {
  VALIDATION_RULES,
  validateStepName,
  validateStepRole,
  validateStepDescription,
  validateStep,
  validateTransitionName,
  validateNodeId,
  validateEdgeReferences,
  validateStartNodes,
  validateMinimumSteps,
  validateAllStepsRoles,
  validateWorkflowGraph,
  formatValidationErrors,
  showValidationAlert,
  getDefaultRole,
};
