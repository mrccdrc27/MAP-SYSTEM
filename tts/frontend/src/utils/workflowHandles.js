/**
 * Workflow Handle System
 * 
 * This module implements a comprehensive handle and connection ruleset for workflow nodes.
 * Handles are dynamic, typed, and directional - enforcing a strict producer → consumer model.
 */

// ============================================
// HANDLE TYPES & CONSTANTS
// ============================================

/**
 * Handle type enum - maps to React Flow handle types
 */
export const HandleType = {
  INPUT: 'input',   // React Flow: target (receives flow)
  OUTPUT: 'output', // React Flow: source (emits flow)
};

/**
 * Handle position enum
 */
export const HandlePosition = {
  TOP: 'top',
  BOTTOM: 'bottom',
  LEFT: 'left',
  RIGHT: 'right',
};

/**
 * Default cardinality rules
 */
export const CardinalityRules = {
  INPUT_DEFAULT_MAX: 1,      // Default: one incoming connection per input
  OUTPUT_DEFAULT_MAX: Infinity, // Default: unlimited outgoing connections
};

// ============================================
// HANDLE DEFINITION SCHEMA
// ============================================

/**
 * Creates a handle definition
 * @param {Object} config - Handle configuration
 * @returns {Object} Handle definition
 */
export function createHandleDefinition({
  id,
  type,
  position,
  label = '',
  maxConnections = null, // null = use defaults
  metadata = {},
}) {
  if (!id || !type || !position) {
    throw new Error('Handle definition requires id, type, and position');
  }

  if (type !== HandleType.INPUT && type !== HandleType.OUTPUT) {
    throw new Error(`Invalid handle type: ${type}. Must be 'input' or 'output'`);
  }

  const defaultMax = type === HandleType.INPUT 
    ? CardinalityRules.INPUT_DEFAULT_MAX 
    : CardinalityRules.OUTPUT_DEFAULT_MAX;

  return {
    id,
    type,
    position,
    label,
    maxConnections: maxConnections ?? defaultMax,
    metadata,
  };
}

/**
 * Creates a node handle schema from configuration
 * @param {Object} config - Node configuration with handles array
 * @returns {Object} Schema with inputs and outputs arrays
 */
export function createNodeHandleSchema(config = {}) {
  const { handles = [], nodeType = 'step' } = config;
  
  const inputs = [];
  const outputs = [];

  handles.forEach(handle => {
    const definition = createHandleDefinition(handle);
    if (definition.type === HandleType.INPUT) {
      inputs.push(definition);
    } else {
      outputs.push(definition);
    }
  });

  return {
    nodeType,
    inputs,
    outputs,
    getAllHandles: () => [...inputs, ...outputs],
    getHandle: (handleId) => [...inputs, ...outputs].find(h => h.id === handleId),
    hasHandle: (handleId) => [...inputs, ...outputs].some(h => h.id === handleId),
  };
}

// ============================================
// DEFAULT HANDLE CONFIGURATIONS
// ============================================

/**
 * Default handles for a standard workflow step node
 * Dynamically generated based on node properties
 * 
 * Regular nodes have 3 handles:
 * - Input at TOP (main incoming flow)
 * - Input at BOTTOM (for returning/loopback edges)
 * - Output at BOTTOM (main outgoing flow)
 * 
 * Start nodes: only output at bottom
 * End nodes: only input at top
 */
export function getDefaultStepHandles(nodeData = {}) {
  const { is_start = false, is_end = false, customHandles = [] } = nodeData;
  
  const handles = [];

  // Input handle at TOP - not on start nodes
  if (!is_start) {
    handles.push({
      id: 'input-top',
      type: HandleType.INPUT,
      position: HandlePosition.TOP,
      label: 'In',
      maxConnections: null, // Allow multiple inputs (fan-in for merge scenarios)
      metadata: { primary: true },
    });
  }

  // For regular nodes (not start, not end): add bottom input for returning edges
  if (!is_start && !is_end) {
    handles.push({
      id: 'input-bottom',
      type: HandleType.INPUT,
      position: HandlePosition.BOTTOM,
      label: 'Return',
      maxConnections: null, // Allow multiple return connections
      metadata: { primary: false, isReturn: true },
    });
  }

  // Output handle at BOTTOM - not on end nodes
  if (!is_end) {
    handles.push({
      id: 'output-bottom',
      type: HandleType.OUTPUT,
      position: HandlePosition.BOTTOM,
      label: 'Out',
      maxConnections: null, // Unlimited by default
      metadata: { primary: true },
    });
  }

  // Add any custom handles from node data
  customHandles.forEach(custom => {
    handles.push(custom);
  });

  return createNodeHandleSchema({ handles, nodeType: 'step' });
}

/**
 * Get handles for decision/branch nodes (multiple outputs)
 */
export function getDecisionNodeHandles(branches = []) {
  const handles = [
    {
      id: 'input-main',
      type: HandleType.INPUT,
      position: HandlePosition.TOP,
      label: 'In',
      maxConnections: 1,
      metadata: { primary: true },
    },
  ];

  // Create output handle for each branch
  branches.forEach((branch, index) => {
    handles.push({
      id: `output-branch-${index}`,
      type: HandleType.OUTPUT,
      position: HandlePosition.BOTTOM,
      label: branch.label || `Branch ${index + 1}`,
      maxConnections: 1, // Each branch goes to one destination
      metadata: { 
        branchIndex: index,
        condition: branch.condition || null,
      },
    });
  });

  // Default output if no branches defined
  if (branches.length === 0) {
    handles.push({
      id: 'output-true',
      type: HandleType.OUTPUT,
      position: HandlePosition.RIGHT,
      label: 'Yes',
      maxConnections: 1,
      metadata: { branchType: 'true' },
    });
    handles.push({
      id: 'output-false',
      type: HandleType.OUTPUT,
      position: HandlePosition.LEFT,
      label: 'No', 
      maxConnections: 1,
      metadata: { branchType: 'false' },
    });
  }

  return createNodeHandleSchema({ handles, nodeType: 'decision' });
}

/**
 * Get handles for parallel/fork nodes (multiple outputs, all execute)
 */
export function getParallelNodeHandles(parallelPaths = 2) {
  const handles = [
    {
      id: 'input-main',
      type: HandleType.INPUT,
      position: HandlePosition.TOP,
      label: 'In',
      maxConnections: 1,
      metadata: { primary: true },
    },
  ];

  for (let i = 0; i < parallelPaths; i++) {
    handles.push({
      id: `output-parallel-${i}`,
      type: HandleType.OUTPUT,
      position: HandlePosition.BOTTOM,
      label: `Path ${i + 1}`,
      maxConnections: 1,
      metadata: { parallelIndex: i },
    });
  }

  return createNodeHandleSchema({ handles, nodeType: 'parallel' });
}

/**
 * Get handles for merge/join nodes (multiple inputs, single output)
 */
export function getMergeNodeHandles(inputCount = 2) {
  const handles = [];

  for (let i = 0; i < inputCount; i++) {
    handles.push({
      id: `input-merge-${i}`,
      type: HandleType.INPUT,
      position: HandlePosition.TOP,
      label: `In ${i + 1}`,
      maxConnections: 1,
      metadata: { mergeIndex: i },
    });
  }

  handles.push({
    id: 'output-main',
    type: HandleType.OUTPUT,
    position: HandlePosition.BOTTOM,
    label: 'Out',
    maxConnections: null,
    metadata: { primary: true },
  });

  return createNodeHandleSchema({ handles, nodeType: 'merge' });
}

// ============================================
// HANDLE POSITION CALCULATIONS
// ============================================

/**
 * Calculate handle positions for rendering
 * Distributes handles evenly along a side
 */
export function calculateHandlePositions(handles, side, nodeWidth = 180, nodeHeight = 80) {
  const filtered = handles.filter(h => h.position === side);
  const count = filtered.length;
  
  if (count === 0) return [];

  const isVertical = side === HandlePosition.TOP || side === HandlePosition.BOTTOM;
  const dimension = isVertical ? nodeWidth : nodeHeight;
  const spacing = dimension / (count + 1);

  return filtered.map((handle, index) => ({
    ...handle,
    style: {
      [isVertical ? 'left' : 'top']: `${spacing * (index + 1)}px`,
      transform: 'translate(-50%, -50%)',
    },
  }));
}

/**
 * Get all positioned handles for a node
 */
export function getPositionedHandles(handleSchema, nodeWidth, nodeHeight) {
  const allHandles = handleSchema.getAllHandles();
  
  return [
    ...calculateHandlePositions(allHandles, HandlePosition.TOP, nodeWidth, nodeHeight),
    ...calculateHandlePositions(allHandles, HandlePosition.BOTTOM, nodeWidth, nodeHeight),
    ...calculateHandlePositions(allHandles, HandlePosition.LEFT, nodeWidth, nodeHeight),
    ...calculateHandlePositions(allHandles, HandlePosition.RIGHT, nodeWidth, nodeHeight),
  ];
}

// ============================================
// UTILITY EXPORTS
// ============================================

export const handleUtils = {
  HandleType,
  HandlePosition,
  CardinalityRules,
  createHandleDefinition,
  createNodeHandleSchema,
  getDefaultStepHandles,
  getDecisionNodeHandles,
  getParallelNodeHandles,
  getMergeNodeHandles,
  calculateHandlePositions,
  getPositionedHandles,
};

export default handleUtils;
