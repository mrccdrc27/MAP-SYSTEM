/**
 * Workflow Connection Validation System
 * 
 * Implements strict connection validation rules:
 * - Only output → input connections are valid
 * - Cardinality rules are enforced
 * - No self-loops unless explicitly allowed
 * - No duplicate edges
 */

import { HandleType } from './workflowHandles';

// ============================================
// VALIDATION ERROR TYPES
// ============================================

export const ConnectionErrorType = {
  INVALID_SOURCE_HANDLE: 'INVALID_SOURCE_HANDLE',
  INVALID_TARGET_HANDLE: 'INVALID_TARGET_HANDLE',
  WRONG_DIRECTION: 'WRONG_DIRECTION',
  SAME_TYPE_CONNECTION: 'SAME_TYPE_CONNECTION',
  SELF_LOOP: 'SELF_LOOP',
  DUPLICATE_EDGE: 'DUPLICATE_EDGE',
  CARDINALITY_EXCEEDED: 'CARDINALITY_EXCEEDED',
  SOURCE_NOT_FOUND: 'SOURCE_NOT_FOUND',
  TARGET_NOT_FOUND: 'TARGET_NOT_FOUND',
  HANDLE_NOT_FOUND: 'HANDLE_NOT_FOUND',
};

/**
 * Connection validation result
 */
export class ConnectionValidationResult {
  constructor(isValid, errors = []) {
    this.isValid = isValid;
    this.errors = errors;
  }

  static valid() {
    return new ConnectionValidationResult(true, []);
  }

  static invalid(errors) {
    return new ConnectionValidationResult(false, Array.isArray(errors) ? errors : [errors]);
  }

  addError(error) {
    this.errors.push(error);
    this.isValid = false;
    return this;
  }

  getErrorMessages() {
    return this.errors.map(e => e.message);
  }
}

/**
 * Creates a connection error object
 */
function createError(type, message, details = {}) {
  return {
    type,
    message,
    details,
    timestamp: Date.now(),
  };
}

// ============================================
// CONNECTION VALIDATION
// ============================================

/**
 * Validates a connection between two handles
 * 
 * @param {Object} connection - The connection to validate
 * @param {string} connection.source - Source node ID
 * @param {string} connection.target - Target node ID
 * @param {string} connection.sourceHandle - Source handle ID
 * @param {string} connection.targetHandle - Target handle ID
 * @param {Object} context - Validation context
 * @param {Array} context.nodes - All nodes in the graph
 * @param {Array} context.edges - Existing edges in the graph
 * @param {Function} context.getNodeHandles - Function to get handles for a node
 * @param {Object} options - Validation options
 * @param {boolean} options.allowSelfLoops - Allow connections to same node (default: false)
 * @returns {ConnectionValidationResult}
 */
export function validateConnection(connection, context, options = {}) {
  const { source, target, sourceHandle, targetHandle } = connection;
  const { nodes = [], edges = [], getNodeHandles } = context;
  const { allowSelfLoops = false } = options;

  const result = ConnectionValidationResult.valid();

  // 1. Check source and target nodes exist
  const sourceNode = nodes.find(n => n.id === source);
  const targetNode = nodes.find(n => n.id === target);

  if (!sourceNode) {
    return ConnectionValidationResult.invalid(
      createError(ConnectionErrorType.SOURCE_NOT_FOUND, 'Source node not found', { nodeId: source })
    );
  }

  if (!targetNode) {
    return ConnectionValidationResult.invalid(
      createError(ConnectionErrorType.TARGET_NOT_FOUND, 'Target node not found', { nodeId: target })
    );
  }

  // 2. Check self-loop
  if (source === target && !allowSelfLoops) {
    return ConnectionValidationResult.invalid(
      createError(ConnectionErrorType.SELF_LOOP, 'Cannot connect a node to itself', { nodeId: source })
    );
  }

  // 3. Get handle schemas
  const sourceHandles = getNodeHandles ? getNodeHandles(sourceNode) : getDefaultHandles(sourceNode);
  const targetHandles = getNodeHandles ? getNodeHandles(targetNode) : getDefaultHandles(targetNode);

  // 4. Find specific handles
  const sourceHandleDef = sourceHandles.getHandle(sourceHandle);
  const targetHandleDef = targetHandles.getHandle(targetHandle);

  if (!sourceHandleDef) {
    return ConnectionValidationResult.invalid(
      createError(ConnectionErrorType.HANDLE_NOT_FOUND, `Source handle "${sourceHandle}" not found on node`, { 
        nodeId: source, 
        handleId: sourceHandle 
      })
    );
  }

  if (!targetHandleDef) {
    return ConnectionValidationResult.invalid(
      createError(ConnectionErrorType.HANDLE_NOT_FOUND, `Target handle "${targetHandle}" not found on node`, { 
        nodeId: target, 
        handleId: targetHandle 
      })
    );
  }

  // 5. Validate handle types - MUST be output → input
  if (sourceHandleDef.type !== HandleType.OUTPUT) {
    return ConnectionValidationResult.invalid(
      createError(ConnectionErrorType.INVALID_SOURCE_HANDLE, 
        'Connection must originate from an output handle', 
        { handleId: sourceHandle, actualType: sourceHandleDef.type }
      )
    );
  }

  if (targetHandleDef.type !== HandleType.INPUT) {
    return ConnectionValidationResult.invalid(
      createError(ConnectionErrorType.INVALID_TARGET_HANDLE, 
        'Connection must terminate at an input handle', 
        { handleId: targetHandle, actualType: targetHandleDef.type }
      )
    );
  }

  // 6. Check for duplicate edge
  const isDuplicate = edges.some(e => 
    e.source === source && 
    e.target === target && 
    e.sourceHandle === sourceHandle && 
    e.targetHandle === targetHandle
  );

  if (isDuplicate) {
    return ConnectionValidationResult.invalid(
      createError(ConnectionErrorType.DUPLICATE_EDGE, 
        'A connection between these handles already exists', 
        { source, target, sourceHandle, targetHandle }
      )
    );
  }

  // 7. Check cardinality rules
  // Count existing connections for source handle (outgoing)
  const sourceConnections = edges.filter(e => 
    e.source === source && e.sourceHandle === sourceHandle
  ).length;

  if (sourceHandleDef.maxConnections !== Infinity && 
      sourceConnections >= sourceHandleDef.maxConnections) {
    return ConnectionValidationResult.invalid(
      createError(ConnectionErrorType.CARDINALITY_EXCEEDED, 
        `Output handle "${sourceHandle}" has reached maximum connections (${sourceHandleDef.maxConnections})`, 
        { handleId: sourceHandle, current: sourceConnections, max: sourceHandleDef.maxConnections }
      )
    );
  }

  // Count existing connections for target handle (incoming)
  const targetConnections = edges.filter(e => 
    e.target === target && e.targetHandle === targetHandle
  ).length;

  if (targetHandleDef.maxConnections !== Infinity && 
      targetConnections >= targetHandleDef.maxConnections) {
    return ConnectionValidationResult.invalid(
      createError(ConnectionErrorType.CARDINALITY_EXCEEDED, 
        `Input handle "${targetHandle}" has reached maximum connections (${targetHandleDef.maxConnections})`, 
        { handleId: targetHandle, current: targetConnections, max: targetHandleDef.maxConnections }
      )
    );
  }

  return result;
}

/**
 * Default handles getter for nodes without custom handles
 */
function getDefaultHandles(node) {
  const isStart = node.data?.is_start || false;
  const isEnd = node.data?.is_end || false;

  const handles = [];

  if (!isStart) {
    handles.push({
      id: 'input-main',
      type: HandleType.INPUT,
      position: 'top',
      maxConnections: Infinity, // Allow fan-in
    });
  }

  if (!isEnd) {
    handles.push({
      id: 'output-main',
      type: HandleType.OUTPUT,
      position: 'bottom',
      maxConnections: Infinity,
    });
  }

  return {
    getAllHandles: () => handles,
    getHandle: (id) => handles.find(h => h.id === id),
    hasHandle: (id) => handles.some(h => h.id === id),
  };
}

// ============================================
// BATCH VALIDATION
// ============================================

/**
 * Validates all edges in a graph
 * Returns orphaned edges and validation errors
 */
export function validateAllEdges(nodes, edges, getNodeHandles) {
  const validEdges = [];
  const invalidEdges = [];
  const orphanedEdges = [];

  edges.forEach(edge => {
    const connection = {
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle || 'output-main',
      targetHandle: edge.targetHandle || 'input-main',
    };

    // Check if nodes exist first
    const sourceExists = nodes.some(n => n.id === edge.source);
    const targetExists = nodes.some(n => n.id === edge.target);

    if (!sourceExists || !targetExists) {
      orphanedEdges.push({
        edge,
        reason: !sourceExists ? 'Source node deleted' : 'Target node deleted',
      });
      return;
    }

    const result = validateConnection(connection, { nodes, edges: [], getNodeHandles });

    if (result.isValid) {
      validEdges.push(edge);
    } else {
      invalidEdges.push({
        edge,
        errors: result.errors,
      });
    }
  });

  return {
    validEdges,
    invalidEdges,
    orphanedEdges,
    isGraphValid: invalidEdges.length === 0 && orphanedEdges.length === 0,
  };
}

/**
 * Checks if a handle can accept more connections
 */
export function canHandleAcceptConnection(nodeId, handleId, handleType, edges, maxConnections) {
  if (maxConnections === Infinity || maxConnections === null) {
    return true;
  }

  const currentConnections = edges.filter(e => {
    if (handleType === HandleType.INPUT) {
      return e.target === nodeId && e.targetHandle === handleId;
    } else {
      return e.source === nodeId && e.sourceHandle === handleId;
    }
  }).length;

  return currentConnections < maxConnections;
}

/**
 * Gets connection count for a handle
 */
export function getHandleConnectionCount(nodeId, handleId, handleType, edges) {
  return edges.filter(e => {
    if (handleType === HandleType.INPUT) {
      return e.target === nodeId && e.targetHandle === handleId;
    } else {
      return e.source === nodeId && e.sourceHandle === handleId;
    }
  }).length;
}

// ============================================
// REACT FLOW INTEGRATION
// ============================================

/**
 * Creates a React Flow isValidConnection function
 */
export function createConnectionValidator(getNodeHandles, options = {}) {
  return (connection, nodes, edges) => {
    const result = validateConnection(
      {
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle || 'output-main',
        targetHandle: connection.targetHandle || 'input-main',
      },
      { nodes, edges, getNodeHandles },
      options
    );

    return result.isValid;
  };
}

/**
 * Creates an onConnect handler with validation
 */
export function createValidatedConnectHandler(setEdges, nodes, edges, getNodeHandles, options = {}) {
  const { onValidConnection, onInvalidConnection } = options;

  return (connection) => {
    const validationResult = validateConnection(
      {
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle || 'output-main',
        targetHandle: connection.targetHandle || 'input-main',
      },
      { nodes, edges, getNodeHandles },
      options
    );

    if (validationResult.isValid) {
      if (onValidConnection) {
        onValidConnection(connection, validationResult);
      }
      return true;
    } else {
      if (onInvalidConnection) {
        onInvalidConnection(connection, validationResult);
      }
      return false;
    }
  };
}

// ============================================
// EXPORTS
// ============================================

export const connectionValidation = {
  ConnectionErrorType,
  ConnectionValidationResult,
  validateConnection,
  validateAllEdges,
  canHandleAcceptConnection,
  getHandleConnectionCount,
  createConnectionValidator,
  createValidatedConnectHandler,
};

export default connectionValidation;
