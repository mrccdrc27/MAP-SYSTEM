/**
 * Auto-layout utility for workflow graphs using dagre
 * Prevents tangled edges and organizes nodes in a clean hierarchical layout
 */
import dagre from 'dagre';

const DEFAULT_NODE_WIDTH = 220;
const DEFAULT_NODE_HEIGHT = 100;

/**
 * Creates a hierarchical layout for workflow nodes and edges
 * @param {Array} nodes - ReactFlow nodes array
 * @param {Array} edges - ReactFlow edges array
 * @param {Object} options - Layout options
 * @returns {Object} - { nodes: layoutedNodes, edges: layoutedEdges }
 */
export function getLayoutedElements(nodes, edges, options = {}) {
  const {
    direction = 'TB', // TB (top-bottom), LR (left-right), BT, RL
    nodeWidth = DEFAULT_NODE_WIDTH,
    nodeHeight = DEFAULT_NODE_HEIGHT,
    nodeSep = 80,      // Horizontal spacing between nodes
    rankSep = 100,     // Vertical spacing between ranks/levels
    marginX = 50,
    marginY = 50,
    align = 'UL',      // Node alignment: UL, UR, DL, DR
  } = options;

  if (!nodes.length) return { nodes: [], edges: [] };

  // Create dagre graph
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    nodesep: nodeSep,
    ranksep: rankSep,
    marginx: marginX,
    marginy: marginY,
    align: align,
  });

  // Add nodes to graph
  nodes.forEach((node) => {
    g.setNode(node.id, { 
      width: nodeWidth, 
      height: nodeHeight 
    });
  });

  // Add edges to graph
  edges.forEach((edge) => {
    if (edge.source && edge.target) {
      g.setEdge(edge.source, edge.target);
    }
  });

  // Run dagre layout
  dagre.layout(g);

  // Apply calculated positions to nodes
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = g.node(node.id);
    
    // Set source/target positions based on direction
    const isHorizontal = direction === 'LR' || direction === 'RL';
    
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
      targetPosition: isHorizontal ? 'left' : 'top',
      sourcePosition: isHorizontal ? 'right' : 'bottom',
    };
  });

  // Apply overlap prevention
  const finalNodes = preventOverlaps(layoutedNodes, nodeWidth, nodeHeight);

  return { nodes: finalNodes, edges };
}

/**
 * Prevents node overlaps by pushing overlapping nodes apart
 * @param {Array} nodes - Layouted nodes
 * @param {number} nodeWidth - Node width
 * @param {number} nodeHeight - Node height
 * @returns {Array} - Nodes with adjusted positions
 */
function preventOverlaps(nodes, nodeWidth, nodeHeight) {
  const fixed = [...nodes];
  const minDistance = 30;
  const iterations = 5; // Multiple passes for better results

  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < fixed.length; i++) {
      for (let j = i + 1; j < fixed.length; j++) {
        const a = fixed[i];
        const b = fixed[j];
        
        const dx = a.position.x - b.position.x;
        const dy = a.position.y - b.position.y;
        const distance = Math.hypot(dx, dy);
        
        const requiredDistance = Math.hypot(
          nodeWidth + minDistance, 
          nodeHeight + minDistance
        ) / 2;
        
        if (distance < requiredDistance && distance > 0) {
          const separation = (requiredDistance - distance) / 2;
          const sepX = (dx / distance) * separation;
          const sepY = (dy / distance) * separation;
          
          a.position.x += sepX;
          a.position.y += sepY;
          b.position.x -= sepX;
          b.position.y -= sepY;
        }
      }
    }
  }
  
  return fixed;
}

/**
 * Calculates optimal layout for workflow with start/end node awareness
 * @param {Array} nodes - ReactFlow nodes
 * @param {Array} edges - ReactFlow edges
 * @param {Object} options - Layout options
 * @returns {Object} - { nodes, edges }
 */
export function getWorkflowLayout(nodes, edges, options = {}) {
  if (!nodes.length) return { nodes: [], edges: [] };

  // Identify start and end nodes
  const startNodes = nodes.filter(n => n.data?.is_start);
  const endNodes = nodes.filter(n => n.data?.is_end);
  const middleNodes = nodes.filter(n => !n.data?.is_start && !n.data?.is_end);

  // Build adjacency for topological analysis
  const outgoing = {};
  const incoming = {};
  
  nodes.forEach(n => {
    outgoing[n.id] = [];
    incoming[n.id] = [];
  });
  
  edges.forEach(e => {
    if (outgoing[e.source]) outgoing[e.source].push(e.target);
    if (incoming[e.target]) incoming[e.target].push(e.source);
  });

  // Calculate node levels/ranks
  const levels = {};
  const visited = new Set();
  
  function assignLevel(nodeId, level) {
    if (visited.has(nodeId)) {
      levels[nodeId] = Math.max(levels[nodeId] || 0, level);
      return;
    }
    visited.add(nodeId);
    levels[nodeId] = level;
    
    (outgoing[nodeId] || []).forEach(targetId => {
      assignLevel(targetId, level + 1);
    });
  }
  
  // Start from start nodes
  startNodes.forEach(n => assignLevel(n.id, 0));
  
  // Handle disconnected nodes
  nodes.forEach(n => {
    if (!visited.has(n.id)) {
      assignLevel(n.id, 1);
    }
  });

  // Use dagre with calculated hints
  return getLayoutedElements(nodes, edges, {
    direction: 'TB',
    nodeWidth: 220,
    nodeHeight: 100,
    nodeSep: 100,
    rankSep: 120,
    ...options,
  });
}

/**
 * Creates optimized edges while preserving existing handle IDs (6-handle system)
 * @param {Array} edges - Original edges
 * @param {Array} nodes - Layouted nodes
 * @returns {Array} - Edges with optimized properties
 */
export function getOptimizedEdges(edges, nodes) {
  const nodePositions = {};
  nodes.forEach(n => {
    nodePositions[n.id] = n.position;
  });

  return edges.map(edge => {
    const sourcePos = nodePositions[edge.source];
    const targetPos = nodePositions[edge.target];
    
    if (!sourcePos || !targetPos) return edge;

    // IMPORTANT: Preserve existing handle IDs from templates (6-handle system)
    // Only set defaults if handles are not already specified
    let sourceHandle = edge.sourceHandle;
    let targetHandle = edge.targetHandle;
    
    // Only auto-determine if not already set (for backwards compatibility)
    if (!sourceHandle || !targetHandle) {
      const dx = targetPos.x - sourcePos.x;
      const dy = targetPos.y - sourcePos.y;
      
      // Default to vertical flow with new 6-handle IDs
      sourceHandle = sourceHandle || 'out-B';
      targetHandle = targetHandle || 'in-T';
      
      // If target is significantly to the right, use horizontal handles
      if (Math.abs(dx) > Math.abs(dy) * 1.5 && dx > 0) {
        sourceHandle = sourceHandle || 'out-R';
        targetHandle = targetHandle || 'in-L';
      }
    }

    return {
      ...edge,
      sourceHandle,
      targetHandle,
      type: edge.type || 'smoothstep',
      animated: edge.animated !== undefined ? edge.animated : false,
      style: edge.style || { strokeWidth: 2 },
    };
  });
}

/**
 * Full workflow layout with optimized edges
 * @param {Array} nodes - ReactFlow nodes
 * @param {Array} edges - ReactFlow edges
 * @param {Object} options - Layout options
 * @returns {Object} - { nodes, edges }
 */
export function layoutWorkflow(nodes, edges, options = {}) {
  const { nodes: layoutedNodes, edges: basicEdges } = getWorkflowLayout(nodes, edges, options);
  const optimizedEdges = getOptimizedEdges(basicEdges, layoutedNodes);
  
  return {
    nodes: layoutedNodes,
    edges: optimizedEdges,
  };
}

export default {
  getLayoutedElements,
  getWorkflowLayout,
  getOptimizedEdges,
  layoutWorkflow,
};
