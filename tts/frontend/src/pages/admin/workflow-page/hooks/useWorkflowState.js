import { useCallback, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { WORKFLOW_TEMPLATES } from '../constants/workflowTemplates';
import { layoutWorkflow } from '../../../../utils/workflowAutoLayout';

/**
 * Custom hook to manage workflow nodes and edges state
 * Handles both simple mode state and ReactFlow state synchronization
 */
export function useWorkflowState(roles, setNodes, setEdges) {
  const [simpleNodes, setSimpleNodes] = useState([]);
  const [simpleEdges, setSimpleEdges] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [editingSimpleNodeIndex, setEditingSimpleNodeIndex] = useState(null);

  const getDefaultRole = useCallback(() => {
    return roles?.[0]?.name || 'User';
  }, [roles]);

  // Apply a template to the workflow
  const applyTemplate = useCallback((templateKey) => {
    const template = WORKFLOW_TEMPLATES[templateKey];
    if (!template) return null;
    
    setSelectedTemplate(templateKey);
    
    const defaultRole = getDefaultRole();
    
    // Create nodes with temp IDs
    const newNodes = template.nodes.map((node, idx) => ({
      id: `temp-${uuidv4()}`,
      name: node.name,
      role: node.role || defaultRole,
      escalate_to: node.escalate_to || '',
      description: node.description || '',
      instruction: node.instruction || '',
      weight: node.weight ?? 0.5,
      is_start: node.is_start,
      is_end: node.is_end,
      expanded: false,
      _index: idx
    }));
    
    // Create edges with exact handle IDs from template
    const newEdges = template.edges.map((edge) => ({
      id: `temp-edge-${uuidv4()}`,
      from: newNodes[edge.from]?.id || '',
      to: newNodes[edge.to]?.id || '',
      name: edge.name || '',
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      isReturn: edge.isReturn || false
    }));
    
    setSimpleNodes(newNodes);
    setSimpleEdges(newEdges);
    
    // Create ReactFlow nodes
    const rfNodes = newNodes.map((node) => ({
      id: node.id,
      data: {
        label: node.name,
        role: node.role,
        escalate_to: node.escalate_to,
        description: node.description,
        instruction: node.instruction,
        weight: node.weight,
        is_start: node.is_start,
        is_end: node.is_end,
      },
      position: { x: 0, y: 0 },
      type: 'step',
    }));
    
    // Create ReactFlow edges
    const rfEdges = newEdges.map(edge => ({
      id: edge.id,
      source: edge.from,
      target: edge.to,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      label: edge.name,
      data: { label: edge.name, isReturn: edge.isReturn },
      type: 'smoothstep',
      style: edge.isReturn 
        ? { strokeDasharray: '5,5', strokeWidth: 2 } 
        : { strokeWidth: 2 },
    }));
    
    // Layout nodes
    const { nodes: layoutedNodes } = layoutWorkflow(rfNodes, rfEdges);
    
    setNodes(layoutedNodes);
    setEdges(rfEdges);
    setEditingSimpleNodeIndex(null);
    
    return template.metadata;
  }, [getDefaultRole, setNodes, setEdges]);

  // Add a new node
  const addSimpleNode = useCallback(() => {
    const defaultRole = getDefaultRole();
    const newNode = {
      id: `temp-${uuidv4()}`,
      name: `Step ${simpleNodes.length + 1}`,
      role: defaultRole,
      escalate_to: '',
      description: '',
      instruction: '',
      weight: 0.5,
      is_start: simpleNodes.length === 0,
      is_end: false,
      expanded: false
    };
    
    setSimpleNodes(prev => [...prev, newNode]);
    
    // Sync to ReactFlow
    const rfNode = {
      id: newNode.id,
      data: {
        label: newNode.name,
        role: newNode.role,
        escalate_to: '',
        description: '',
        instruction: '',
        weight: 0.5,
        is_start: newNode.is_start,
        is_end: newNode.is_end,
      },
      position: { x: (simpleNodes.length % 3) * 250, y: Math.floor(simpleNodes.length / 3) * 180 },
      type: 'step',
    };
    setNodes(prev => [...prev, rfNode]);
  }, [simpleNodes.length, getDefaultRole, setNodes]);

  // Update a node field
  const updateSimpleNode = useCallback((index, field, value) => {
    setSimpleNodes(prev => {
      const updated = [...prev];
      
      // Enforce single start node
      if (field === 'is_start' && value === true) {
        updated.forEach((n, i) => {
          if (i !== index) n.is_start = false;
        });
      }
      
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    
    // Sync to ReactFlow
    setNodes(prev => {
      const node = simpleNodes[index];
      if (!node) return prev;
      
      return prev.map(n => {
        if (n.id === node.id) {
          const dataField = field === 'name' ? 'label' : field;
          return { ...n, data: { ...n.data, [dataField]: value } };
        }
        if (field === 'is_start' && value === true) {
          return { ...n, data: { ...n.data, is_start: false } };
        }
        return n;
      });
    });
  }, [simpleNodes, setNodes]);

  // Remove a node
  const removeSimpleNode = useCallback((index) => {
    const nodeId = simpleNodes[index]?.id;
    setSimpleNodes(prev => prev.filter((_, i) => i !== index));
    setSimpleEdges(prev => prev.filter(e => e.from !== nodeId && e.to !== nodeId));
    
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId));
    
    if (editingSimpleNodeIndex === index) {
      setEditingSimpleNodeIndex(null);
    }
  }, [simpleNodes, editingSimpleNodeIndex, setNodes, setEdges]);

  // Add a new edge
  const addSimpleEdge = useCallback(() => {
    if (simpleNodes.length < 2) return;
    
    const newEdge = {
      id: `temp-edge-${uuidv4()}`,
      from: simpleNodes[0]?.id || '',
      to: simpleNodes[1]?.id || '',
      name: `Transition ${simpleEdges.length + 1}`,
      sourceHandle: 'out-B',
      targetHandle: 'in-T',
      isReturn: false
    };
    setSimpleEdges(prev => [...prev, newEdge]);
    
    setEdges(prev => [...prev, {
      id: newEdge.id,
      source: newEdge.from,
      target: newEdge.to,
      sourceHandle: 'out-B',
      targetHandle: 'in-T',
      label: newEdge.name,
      data: { label: newEdge.name, isReturn: false },
      type: 'smoothstep',
      style: { strokeWidth: 2 },
    }]);
  }, [simpleNodes, simpleEdges.length, setEdges]);

  // Update an edge
  const updateSimpleEdge = useCallback((index, field, value) => {
    setSimpleEdges(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    
    const edge = simpleEdges[index];
    if (edge) {
      setEdges(prev => prev.map(e => {
        if (e.id === edge.id) {
          if (field === 'from') return { ...e, source: value };
          if (field === 'to') return { ...e, target: value };
          if (field === 'name') return { ...e, label: value, data: { ...e.data, label: value } };
          if (field === 'sourceHandle') return { ...e, sourceHandle: value };
          if (field === 'targetHandle') return { ...e, targetHandle: value };
        }
        return e;
      }));
    }
  }, [simpleEdges, setEdges]);

  // Remove an edge
  const removeSimpleEdge = useCallback((index) => {
    const edgeId = simpleEdges[index]?.id;
    setSimpleEdges(prev => prev.filter((_, i) => i !== index));
    setEdges(prev => prev.filter(e => e.id !== edgeId));
  }, [simpleEdges, setEdges]);

  // Sync simple mode to ReactFlow when switching modes
  const syncToReactFlow = useCallback(() => {
    if (simpleNodes.length === 0) return;
    
    const rfNodes = simpleNodes.map((node) => ({
      id: node.id,
      data: {
        label: node.name,
        role: node.role,
        escalate_to: node.escalate_to,
        description: node.description,
        instruction: node.instruction,
        weight: node.weight,
        is_start: node.is_start,
        is_end: node.is_end,
      },
      position: { x: 0, y: 0 },
      type: 'step',
    }));
    
    const rfEdges = simpleEdges.map(edge => ({
      id: edge.id,
      source: edge.from,
      target: edge.to,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      label: edge.name,
      data: { label: edge.name, isReturn: edge.isReturn || false },
      type: 'smoothstep',
      style: edge.isReturn ? { strokeDasharray: '5,5', strokeWidth: 2 } : { strokeWidth: 2 },
    }));
    
    const { nodes: layoutedNodes } = layoutWorkflow(rfNodes, rfEdges);
    setNodes(layoutedNodes);
    setEdges(rfEdges);
  }, [simpleNodes, simpleEdges, setNodes, setEdges]);

  return {
    simpleNodes,
    setSimpleNodes,
    simpleEdges,
    setSimpleEdges,
    selectedTemplate,
    setSelectedTemplate,
    editingSimpleNodeIndex,
    setEditingSimpleNodeIndex,
    applyTemplate,
    addSimpleNode,
    updateSimpleNode,
    removeSimpleNode,
    addSimpleEdge,
    updateSimpleEdge,
    removeSimpleEdge,
    syncToReactFlow,
  };
}
