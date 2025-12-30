import React, { memo, useMemo } from 'react';
import ReactFlow, { Background, Controls, MarkerType } from 'reactflow';
import { GitBranch, Play } from 'lucide-react';
import StepNode from '../WorkflowDetails/StepNode';
import styles from '../create-workflow.module.css';

const nodeTypes = { step: StepNode };

/**
 * ReactFlow visualization component for workflow preview
 */
const WorkflowFlowView = memo(function WorkflowFlowView({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  showFlowAnimation,
  setShowFlowAnimation
}) {
  // Memoize edges with animation
  const animatedEdges = useMemo(() => {
    return edges.map(edge => ({
      ...edge,
      animated: showFlowAnimation,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: edge.style?.stroke || '#64748b',
      },
    }));
  }, [edges, showFlowAnimation]);

  const defaultEdgeOptions = useMemo(() => ({
    type: 'smoothstep',
    style: { strokeWidth: 2 },
    animated: showFlowAnimation,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: '#64748b',
    },
  }), [showFlowAnimation]);

  if (nodes.length === 0) {
    return (
      <div className={styles.flowEmptyState}>
        <GitBranch size={48} strokeWidth={1} />
        <span>Add steps to see the flow visualization</span>
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={animatedEdges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      defaultEdgeOptions={defaultEdgeOptions}
      connectionLineType="smoothstep"
      connectionLineStyle={{ stroke: '#3b82f6', strokeWidth: 2 }}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      nodesDraggable={true}
      nodesConnectable={false}
      elementsSelectable={true}
    >
      <Background variant="dots" gap={16} size={1} />
      <Controls />
      
      <div className={styles.flowAnimationToggle}>
        <button
          className={`${styles.animationBtn} ${showFlowAnimation ? styles.animationActive : ''}`}
          onClick={() => setShowFlowAnimation(!showFlowAnimation)}
          title={showFlowAnimation ? 'Stop Flow Animation' : 'Show Flow Animation'}
        >
          <Play size={16} />
          {showFlowAnimation ? 'Stop' : 'Animate'}
        </button>
      </div>
    </ReactFlow>
  );
});

export default WorkflowFlowView;
