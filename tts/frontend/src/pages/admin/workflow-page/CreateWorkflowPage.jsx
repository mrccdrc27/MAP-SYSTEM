import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactFlow, { ReactFlowProvider, useNodesState, useEdgesState, Background, Controls, addEdge } from 'reactflow';
import 'reactflow/dist/style.css';
import styles from './create-workflow.module.css';
import WorkflowCreationConfirmation from './modals/WorkflowCreationConfirmation';
import SequenceDiagramModal from './modals/SequenceDiagramModal';
import { useCreateWorkflow } from '../../../api/useCreateWorkflow';
import { useWorkflowRoles } from '../../../api/useWorkflowRoles';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { useNavigate } from 'react-router-dom';
import StepNode from '../../../components/workflow/WorkflowEditor/StepNode';
import { v4 as uuidv4 } from 'uuid';
import { layoutWorkflow } from '../../../utils/workflowAutoLayout';
import { 
  ClipboardList, 
  FileText, 
  CheckCircle, 
  BarChart, 
  ThumbsUp, 
  TrendingUp, 
  Monitor, 
  Settings, 
  HelpCircle, 
  X, 
  Play, 
  Square, 
  Eye, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Save, 
  ChevronUp, 
  ChevronDown, 
  GitBranch, 
  Clock, 
  Lightbulb, 
  Link, 
  ArrowRight,
  ArrowLeft,
  Layout,
  MoreVertical,
  ArrowUpRight,
  Scale,
  Info,
  Edit3
} from 'lucide-react';

const nodeTypes = {
  step: StepNode,
};

// ============================================
// WORKFLOW TEMPLATES
// ============================================
const WORKFLOW_TEMPLATES = {
  empty: {
    name: 'Start from Scratch',
    description: 'Empty workflow - add your own steps',
    icon: <FileText size={16} />,
    nodes: [],
    edges: [],
    metadata: {}
  },
  simple: {
    name: 'Simple Request',
    description: '2 steps: Submit → Complete',
    icon: <CheckCircle size={16} />,
    nodes: [
      { name: 'Submit Request', role: null, is_start: true, is_end: false, description: 'Initial request submission', instruction: '', escalate_to: null, weight: 0.3 },
      { name: 'Complete', role: null, is_start: false, is_end: true, description: 'Request completed', instruction: '', escalate_to: null, weight: 0.7 }
    ],
    edges: [{ from: 0, to: 1, name: 'Process' }],
    metadata: { category: 'Request', sub_category: 'General' }
  },
  threeStep: {
    name: 'Standard Flow',
    description: '3 steps: New → Processing → Resolved',
    icon: <BarChart size={16} />,
    nodes: [
      { name: 'New Ticket', role: null, is_start: true, is_end: false, description: 'Ticket created', instruction: 'Review the ticket and assign to appropriate agent', escalate_to: null, weight: 0.2 },
      { name: 'In Progress', role: null, is_start: false, is_end: false, description: 'Work in progress', instruction: 'Work on resolving the issue', escalate_to: null, weight: 0.5 },
      { name: 'Resolved', role: null, is_start: false, is_end: true, description: 'Issue resolved', instruction: '', escalate_to: null, weight: 0.3 }
    ],
    edges: [
      { from: 0, to: 1, name: 'Assign' },
      { from: 1, to: 2, name: 'Complete' }
    ],
    metadata: { category: 'Support', sub_category: 'Ticket' }
  },
  approval: {
    name: 'Approval Workflow',
    description: 'Submit → Review → Approve/Reject',
    icon: <ThumbsUp size={16} />,
    nodes: [
      { name: 'Submit', role: null, is_start: true, is_end: false, description: 'Request submitted for approval', instruction: 'Submit all required documents', escalate_to: null, weight: 0.2 },
      { name: 'Manager Review', role: null, is_start: false, is_end: false, description: 'Pending manager review', instruction: 'Review the request and either approve or reject', escalate_to: null, weight: 0.5 },
      { name: 'Approved', role: null, is_start: false, is_end: true, description: 'Request approved', instruction: '', escalate_to: null, weight: 0.15 },
      { name: 'Rejected', role: null, is_start: false, is_end: true, description: 'Request rejected', instruction: '', escalate_to: null, weight: 0.15 }
    ],
    edges: [
      { from: 0, to: 1, name: 'Submit for Review' },
      { from: 1, to: 2, name: 'Approve' },
      { from: 1, to: 3, name: 'Reject' }
    ],
    metadata: { category: 'Approval', sub_category: 'Request' }
  },
  escalation: {
    name: 'Tiered Support',
    description: 'Multi-level support with escalation',
    icon: <TrendingUp size={16} />,
    nodes: [
      { name: 'New Ticket', role: null, is_start: true, is_end: false, description: 'Ticket created', instruction: 'Triage and assign to Tier 1', escalate_to: null, weight: 0.1 },
      { name: 'Tier 1 Support', role: null, is_start: false, is_end: false, description: 'First level support', instruction: 'Attempt to resolve. Escalate if unable to resolve within SLA.', escalate_to: null, weight: 0.3 },
      { name: 'Tier 2 Support', role: null, is_start: false, is_end: false, description: 'Escalated support', instruction: 'Handle complex issues escalated from Tier 1', escalate_to: null, weight: 0.4 },
      { name: 'Resolved', role: null, is_start: false, is_end: true, description: 'Issue resolved', instruction: '', escalate_to: null, weight: 0.2 }
    ],
    edges: [
      { from: 0, to: 1, name: 'Assign T1' },
      { from: 1, to: 2, name: 'Escalate' },
      { from: 1, to: 3, name: 'Resolve' },
      { from: 2, to: 3, name: 'Resolve' }
    ],
    metadata: { category: 'IT', sub_category: 'Support' }
  },
  itRequest: {
    name: 'IT Service Request',
    description: 'Request → Approval → Fulfillment',
    icon: <Monitor size={16} />,
    nodes: [
      { name: 'Submit Request', role: null, is_start: true, is_end: false, description: 'Service request submitted', instruction: 'Fill out all required fields and attach supporting documents', escalate_to: null, weight: 0.1 },
      { name: 'Manager Approval', role: null, is_start: false, is_end: false, description: 'Awaiting manager approval', instruction: 'Review request details and approve or deny', escalate_to: null, weight: 0.2 },
      { name: 'IT Fulfillment', role: null, is_start: false, is_end: false, description: 'IT working on request', instruction: 'Complete the service request and prepare for delivery', escalate_to: null, weight: 0.35 },
      { name: 'User Verification', role: null, is_start: false, is_end: false, description: 'User verifying delivery', instruction: 'Verify the service/item meets your requirements', escalate_to: null, weight: 0.15 },
      { name: 'Completed', role: null, is_start: false, is_end: true, description: 'Request completed', instruction: '', escalate_to: null, weight: 0.1 },
      { name: 'Rejected', role: null, is_start: false, is_end: true, description: 'Request rejected', instruction: '', escalate_to: null, weight: 0.1 }
    ],
    edges: [
      { from: 0, to: 1, name: 'Request Approval' },
      { from: 1, to: 2, name: 'Approve' },
      { from: 1, to: 5, name: 'Deny' },
      { from: 2, to: 3, name: 'Deliver' },
      { from: 3, to: 4, name: 'Confirm' },
      { from: 3, to: 2, name: 'Issues Found' }
    ],
    metadata: { category: 'IT', sub_category: 'Service Request', department: 'IT Support' }
  }
};

// ============================================
// HELP TIPS
// ============================================
const HELP_TIPS = {
  workflow: {
    title: 'Workflow Basics',
    icon: <ClipboardList size={16} />,
    tips: [
      'A workflow defines the path a ticket takes from creation to resolution',
      'Each workflow must have a unique Category + Sub-Category combination',
      'Name should be descriptive (e.g., "IT Support Request")'
    ]
  },
  steps: {
    title: 'Steps (Nodes)',
    icon: <GitBranch size={16} />,
    tips: [
      'Steps represent stages in your workflow',
      'Must have exactly ONE start step (green border)',
      'Can have multiple end steps (red border)',
      'Each step needs a role assigned to handle it',
      'Click the ⋮ button to expand and set escalation, weight, instructions'
    ]
  },
  transitions: {
    title: 'Transitions (Edges)',
    icon: <Link size={16} />,
    tips: [
      'Transitions connect steps and define possible paths',
      'In Advanced mode, drag from one step to another to connect',
      'Name transitions with actions (e.g., "Approve", "Reject", "Escalate")'
    ]
  },
  sla: {
    title: 'SLA Configuration',
    icon: <Clock size={16} />,
    tips: [
      'SLA = Service Level Agreement (time to resolve)',
      'Set different times for different priorities',
      'Values are in hours (e.g., Low: 72, Urgent: 4)'
    ]
  }
};

export default function CreateWorkflowPage() {
  const navigate = useNavigate();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // Editor mode: 'simple' or 'advanced'
  const [editorMode, setEditorMode] = useState('simple');
  const [showHelp, setShowHelp] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templatesCollapsed, setTemplatesCollapsed] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  
  // Simple mode state
  const [simpleNodes, setSimpleNodes] = useState([]);
  const [simpleEdges, setSimpleEdges] = useState([]);

  const [workflowMetadata, setWorkflowMetadata] = useState({
    name: '',
    description: '',
    category: '',
    sub_category: '',
    department: '',
    end_logic: '',
    low_sla: null,
    medium_sla: null,
    high_sla: null,
    urgent_sla: null,
  });

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [createdWorkflow, setCreatedWorkflow] = useState(null);
  const [showSequenceDiagram, setShowSequenceDiagram] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);

  const [editingNode, setEditingNode] = useState(null);
  const [editingSimpleNodeIndex, setEditingSimpleNodeIndex] = useState(null);

  const contentRef = useRef();
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const { createWorkflow, loading: isCreating, error: createError } = useCreateWorkflow();
  const { roles } = useWorkflowRoles();

  // Helper to parse ISO 8601 duration (PT24H30M) to {hours, minutes}
  const parseDuration = (duration) => {
    if (!duration) return { hours: '', minutes: '' };
    const hoursMatch = duration.match(/PT(\d+)H/);
    const minutesMatch = duration.match(/(\d+)M/);
    return {
      hours: hoursMatch ? hoursMatch[1] : '',
      minutes: minutesMatch ? minutesMatch[1] : ''
    };
  };

  // Helper to create ISO 8601 duration from hours and minutes
  const createDuration = (hours, minutes) => {
    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;
    if (h === 0 && m === 0) return null;
    let duration = 'PT';
    if (h > 0) duration += `${h}H`;
    if (m > 0) duration += `${m}M`;
    return duration;
  };

  // ============================================
  // TEMPLATE HANDLING
  // ============================================
  const applyTemplate = useCallback((templateKey) => {
    const template = WORKFLOW_TEMPLATES[templateKey];
    if (!template) return;
    
    setSelectedTemplate(templateKey);
    
    // Apply metadata
    setWorkflowMetadata(prev => ({
      ...prev,
      ...template.metadata,
      name: template.metadata.name || prev.name,
    }));
    
    // Create nodes with temp IDs
    const defaultRole = roles?.[0]?.name || 'User';
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
    
    // Create edges referencing node indices
    const newEdges = template.edges.map((edge) => ({
      id: `temp-edge-${uuidv4()}`,
      from: newNodes[edge.from]?.id || '',
      to: newNodes[edge.to]?.id || '',
      name: edge.name || ''
    }));
    
    // Set simple mode state
    setSimpleNodes(newNodes);
    setSimpleEdges(newEdges);
    
    // Also set ReactFlow state for advanced mode with auto-layout
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
      position: { x: 0, y: 0 }, // Will be auto-layouted
      type: 'step',
    }));
    
    const rfEdges = newEdges.map(edge => ({
      id: edge.id,
      source: edge.from,
      target: edge.to,
      data: { label: edge.name },
      type: 'smoothstep',
    }));
    
    // Apply auto-layout to prevent tangles
    const { nodes: layoutedNodes, edges: layoutedEdges } = layoutWorkflow(rfNodes, rfEdges);
    
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    
    setEditingSimpleNodeIndex(null);
  }, [roles, setNodes, setEdges]);

  // ============================================
  // SIMPLE MODE HANDLERS
  // ============================================
  const addSimpleNode = useCallback(() => {
    const defaultRole = roles?.[0]?.name || 'User';
    const newNode = {
      id: `temp-${uuidv4()}`,
      name: `Step ${simpleNodes.length + 1}`,
      role: defaultRole,
      escalate_to: '', // Role to escalate to when step times out
      description: '',
      instruction: '',
      weight: 0.5, // Default weight for step progress calculation
      is_start: simpleNodes.length === 0,
      is_end: false,
      expanded: false // UI state for expandable card
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
  }, [simpleNodes.length, roles, setNodes]);

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
          return {
            ...n,
            data: { ...n.data, [dataField]: value }
          };
        }
        // Reset other start nodes
        if (field === 'is_start' && value === true) {
          return { ...n, data: { ...n.data, is_start: false } };
        }
        return n;
      });
    });
  }, [simpleNodes, setNodes]);

  const removeSimpleNode = useCallback((index) => {
    const nodeId = simpleNodes[index]?.id;
    setSimpleNodes(prev => prev.filter((_, i) => i !== index));
    setSimpleEdges(prev => prev.filter(e => e.from !== nodeId && e.to !== nodeId));
    
    // Sync to ReactFlow
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId));
    
    if (editingSimpleNodeIndex === index) {
      setEditingSimpleNodeIndex(null);
    }
  }, [simpleNodes, editingSimpleNodeIndex, setNodes, setEdges]);

  const addSimpleEdge = useCallback(() => {
    if (simpleNodes.length < 2) return;
    
    const newEdge = {
      id: `temp-edge-${uuidv4()}`,
      from: simpleNodes[0]?.id || '',
      to: simpleNodes[1]?.id || '',
      name: `Transition ${simpleEdges.length + 1}`
    };
    setSimpleEdges(prev => [...prev, newEdge]);
    
    // Sync to ReactFlow with smoothstep type
    setEdges(prev => [...prev, {
      id: newEdge.id,
      source: newEdge.from,
      target: newEdge.to,
      data: { label: newEdge.name },
      type: 'smoothstep',
    }]);
  }, [simpleNodes, simpleEdges.length, setEdges]);

  const updateSimpleEdge = useCallback((index, field, value) => {
    setSimpleEdges(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    
    // Sync to ReactFlow (preserve smoothstep type)
    const edge = simpleEdges[index];
    if (edge) {
      setEdges(prev => prev.map(e => {
        if (e.id === edge.id) {
          if (field === 'from') return { ...e, source: value, type: 'smoothstep' };
          if (field === 'to') return { ...e, target: value, type: 'smoothstep' };
          if (field === 'name') return { ...e, data: { ...e.data, label: value }, type: 'smoothstep' };
        }
        return e;
      }));
    }
  }, [simpleEdges, setEdges]);

  const removeSimpleEdge = useCallback((index) => {
    const edgeId = simpleEdges[index]?.id;
    setSimpleEdges(prev => prev.filter((_, i) => i !== index));
    setEdges(prev => prev.filter(e => e.id !== edgeId));
  }, [simpleEdges, setEdges]);

  // ============================================
  // ADVANCED MODE (REACTFLOW) HANDLERS
  // ============================================
  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const delta = e.clientX - startXRef.current;
      const newWidth = Math.max(200, Math.min(500, startWidthRef.current + delta));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        localStorage.setItem('workflow-sidebar-width', sidebarWidth.toString());
      }
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, sidebarWidth]);

  const handleAddNode = useCallback(() => {
    if (!roles || roles.length === 0) {
      alert('No roles available. Please contact an administrator to configure roles.');
      return;
    }
    
    const tempId = `temp-${uuidv4()}`;
    const newNode = {
      id: tempId,
      data: {
        label: `Step ${nodes.length + 1}`,
        role: roles[0].name,
        escalate_to: '',
        description: '',
        instruction: '',
        weight: 0.5,
        is_start: nodes.length === 0,
        is_end: false,
      },
      position: { x: 0, y: 0 }, // Will be auto-layouted
      type: 'step',
    };
    
    // Add node and re-layout
    setNodes((nds) => {
      const updatedNodes = [...nds, newNode];
      const { nodes: layoutedNodes } = layoutWorkflow(updatedNodes, edges);
      return layoutedNodes;
    });
    
    // Sync to simple mode
    setSimpleNodes(prev => [...prev, {
      id: tempId,
      name: newNode.data.label,
      role: newNode.data.role,
      escalate_to: '',
      description: '',
      instruction: '',
      weight: 0.5,
      is_start: newNode.data.is_start,
      is_end: newNode.data.is_end,
      expanded: false
    }]);
  }, [nodes.length, setNodes, roles, edges]);

  const handleNodeClick = useCallback((event, node) => {
    setEditingNode(node);
  }, []);

  const handleUpdateNode = useCallback((field, value) => {
    if (!editingNode) return;
    
    if (field === 'is_start' && value === true) {
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          data: {
            ...n.data,
            is_start: n.id === editingNode.id ? true : false,
          },
        }))
      );
      setEditingNode({
        ...editingNode,
        data: {
          ...editingNode.data,
          is_start: true,
        },
      });
      
      // Sync to simple mode
      setSimpleNodes(prev => prev.map(n => ({
        ...n,
        is_start: n.id === editingNode.id
      })));
      return;
    }
    
    const updated = {
      ...editingNode,
      data: {
        ...editingNode.data,
        [field]: value,
      },
    };
    setEditingNode(updated);
    setNodes((nds) =>
      nds.map((n) => (n.id === editingNode.id ? updated : n))
    );
    
    // Sync to simple mode
    const simpleField = field === 'label' ? 'name' : field;
    setSimpleNodes(prev => prev.map(n => 
      n.id === editingNode.id ? { ...n, [simpleField]: value } : n
    ));
  }, [editingNode, setNodes]);

  const handleDeleteNode = useCallback(() => {
    if (!editingNode) return;
    setNodes((nds) => nds.filter((n) => n.id !== editingNode.id));
    setEdges((eds) =>
      eds.filter((e) => e.source !== editingNode.id && e.target !== editingNode.id)
    );
    
    // Sync to simple mode
    setSimpleNodes(prev => prev.filter(n => n.id !== editingNode.id));
    setSimpleEdges(prev => prev.filter(e => e.from !== editingNode.id && e.to !== editingNode.id));
    
    setEditingNode(null);
  }, [editingNode, setNodes, setEdges]);

  // Re-layout function for manually triggering auto-layout
  const handleAutoLayout = useCallback(() => {
    if (nodes.length === 0) return;
    
    const { nodes: layoutedNodes, edges: layoutedEdges } = layoutWorkflow(nodes, edges);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [nodes, edges, setNodes, setEdges]);

  // Auto-layout when switching to advanced mode
  const handleModeChange = useCallback((newMode) => {
    if (newMode === 'advanced' && simpleNodes.length > 0) {
      // Sync simple mode data to ReactFlow and apply layout
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
        data: { label: edge.name },
        type: 'smoothstep',
      }));
      
      // Apply auto-layout
      const { nodes: layoutedNodes, edges: layoutedEdges } = layoutWorkflow(rfNodes, rfEdges);
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    }
    setEditorMode(newMode);
  }, [simpleNodes, simpleEdges, setNodes, setEdges]);

  const onConnect = useCallback((connection) => {
    const edgeId = `temp-${uuidv4()}`;
    const newEdge = {
      ...connection,
      id: edgeId,
      type: 'smoothstep',
    };
    
    // Add edge and re-layout to optimize routing
    setEdges((eds) => {
      const updatedEdges = addEdge(newEdge, eds);
      // Get optimized edges after adding new connection
      const { edges: optimizedEdges } = layoutWorkflow(nodes, updatedEdges);
      return optimizedEdges;
    });
    
    // Sync to simple mode
    setSimpleEdges(prev => [...prev, {
      id: edgeId,
      from: connection.source,
      to: connection.target,
      name: ''
    }]);
  }, [setEdges, nodes]);

  // ============================================
  // VALIDATION & SUBMISSION
  // ============================================
  const validateWorkflowData = useCallback(() => {
    const errors = [];
    const currentNodes = editorMode === 'simple' ? simpleNodes : nodes;

    // Required field validations
    if (!workflowMetadata.name.trim()) errors.push('Workflow name is required');
    if (workflowMetadata.name.length > 64) errors.push('Workflow name must be 64 characters or less');
    if (!workflowMetadata.category.trim()) errors.push('Category is required');
    if (workflowMetadata.category.length > 64) errors.push('Category must be 64 characters or less');
    if (!workflowMetadata.sub_category.trim()) errors.push('Sub-category is required');
    if (workflowMetadata.sub_category.length > 64) errors.push('Sub-category must be 64 characters or less');
    if (!workflowMetadata.department.trim()) errors.push('Department is required');
    if (workflowMetadata.department.length > 64) errors.push('Department must be 64 characters or less');
    
    // Description max length validation
    if (workflowMetadata.description && workflowMetadata.description.length > 256) {
      errors.push('Description must be 256 characters or less');
    }

    // SLA ordering validation: urgent < high < medium < low
    // Extract total minutes from ISO 8601 duration format (PT<hours>H<minutes>M or PT<hours>H or PT<minutes>M)
    const extractTotalMinutes = (sla) => {
      if (!sla) return null;
      let totalMinutes = 0;
      const hoursMatch = sla.match(/PT(\d+)H/);
      const minutesMatch = sla.match(/(\d+)M/);
      if (hoursMatch) totalMinutes += parseInt(hoursMatch[1]) * 60;
      if (minutesMatch) totalMinutes += parseInt(minutesMatch[1]);
      return totalMinutes > 0 ? totalMinutes : null;
    };

    const urgent_mins = extractTotalMinutes(workflowMetadata.urgent_sla);
    const high_mins = extractTotalMinutes(workflowMetadata.high_sla);
    const medium_mins = extractTotalMinutes(workflowMetadata.medium_sla);
    const low_mins = extractTotalMinutes(workflowMetadata.low_sla);

    // Validate SLA ordering if any are provided
    if (urgent_mins !== null && high_mins !== null && urgent_mins >= high_mins) {
      errors.push('Urgent SLA must be less than High SLA');
    }
    if (high_mins !== null && medium_mins !== null && high_mins >= medium_mins) {
      errors.push('High SLA must be less than Medium SLA');
    }
    if (medium_mins !== null && low_mins !== null && medium_mins >= low_mins) {
      errors.push('Medium SLA must be less than Low SLA');
    }

    // Additional SLA validation: if urgent is set, high should be set, etc.
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
      
      // Check roles assigned
      const missingRoles = editorMode === 'simple'
        ? simpleNodes.filter(n => !n.role)
        : nodes.filter(n => !n.data?.role);
      if (missingRoles.length > 0) {
        errors.push(`${missingRoles.length} step(s) missing role assignment`);
      }
    }

    return errors;
  }, [editorMode, simpleNodes, nodes, workflowMetadata]);

  // Live validation on changes
  useEffect(() => {
    if (editorMode === 'simple') {
      const errors = validateWorkflowData();
      setValidationErrors(errors);
    }
  }, [editorMode, simpleNodes, simpleEdges, workflowMetadata, validateWorkflowData]);

  const handleCreateWorkflow = async () => {
    const errors = validateWorkflowData();
    setValidationErrors(errors);

    if (errors.length > 0) {
      return; // Validation errors shown in UI
    }

    try {
      let graphNodes, graphEdges;
      
      if (editorMode === 'simple') {
        graphNodes = simpleNodes.map((node) => ({
          id: node.id,
          name: node.name,
          role: node.role || 'User',
          escalate_to: node.escalate_to || null, // Role to escalate to
          description: node.description || '',
          instruction: node.instruction || '',
          weight: node.weight ?? 0.5, // Step weight for progress calculation
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

      const cleanedMetadata = { ...workflowMetadata };
      if (!cleanedMetadata.low_sla) delete cleanedMetadata.low_sla;
      if (!cleanedMetadata.medium_sla) delete cleanedMetadata.medium_sla;
      if (!cleanedMetadata.high_sla) delete cleanedMetadata.high_sla;
      if (!cleanedMetadata.urgent_sla) delete cleanedMetadata.urgent_sla;

      console.log('Creating workflow with metadata:', cleanedMetadata);
      console.log('Nodes:', graphNodes);
      console.log('Edges:', graphEdges);

      const response = await createWorkflow(cleanedMetadata, {
        nodes: graphNodes,
        edges: graphEdges,
      });

      const workflowData = response.workflow || response;
      setCreatedWorkflow(workflowData);
      setShowConfirmation(true);
    } catch (error) {
      console.error('Failed to create workflow:', error);
      alert(
        createError ||
          'Failed to create workflow. Please check the console for details.'
      );
    }
  };

  const handleCloseConfirmation = () => {
    setShowConfirmation(false);
    navigate('/admin/workflows');
  };

  const handleEditWorkflow = (workflowId) => {
    navigate(`/admin/workflows/${workflowId}/edit`);
  };

  // Prepare nodes/edges for sequence diagram
  const getDiagramData = useCallback(() => {
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
    } else {
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
  }, [editorMode, simpleNodes, simpleEdges, nodes, edges]);

  if (!roles) {
    return <LoadingSpinner height="100vh" />;
  }

  // ============================================
  // RENDER: SIMPLE MODE (Single Page Layout)
  // ============================================
  const renderSimpleMode = () => (
    <div className={styles.simpleMode}>
      {/* Split Top Ribbon: Templates + SLA Configuration */}
      <div className={styles.topRibbon}>
        {/* Left: Templates */}
        <div className={styles.ribbonSection}>
          <button 
            className={styles.ribbonToggle}
            onClick={() => setTemplatesCollapsed(!templatesCollapsed)}
          >
            <span style={{display: 'flex', alignItems: 'center', gap: '8px'}}><ClipboardList size={16} /> Templates</span>
            <span className={styles.toggleIcon}>{templatesCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}</span>
          </button>
          {!templatesCollapsed && (
            <div className={styles.templateStrip}>
              {Object.entries(WORKFLOW_TEMPLATES).map(([key, template]) => (
                <button
                  key={key}
                  className={`${styles.templatePill} ${selectedTemplate === key ? styles.templatePillActive : ''}`}
                  onClick={() => applyTemplate(key)}
                  title={template.description}
                >
                  <span>{template.icon}</span>
                  <span>{template.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: SLA Configuration */}
        <div className={styles.ribbonSection}>
          <div className={styles.slaRibbonHeader}>
            <Clock size={14} />
            <span>SLA Configuration</span>
            <span className={styles.slaHintInline}>Set response time limits (Urgent &lt; High &lt; Medium &lt; Low)</span>
          </div>
          <div className={styles.slaRibbonGrid}>
            {[
              { key: 'urgent', label: 'Urgent', color: '#ef4444' },
              { key: 'high', label: 'High', color: '#f97316' },
              { key: 'medium', label: 'Medium', color: '#eab308' },
              { key: 'low', label: 'Low', color: '#22c55e' }
            ].map(({ key, label, color }) => {
              const { hours, minutes } = parseDuration(workflowMetadata[`${key}_sla`]);
              return (
                <div key={key} className={styles.slaRibbonItem}>
                  <label className={styles.slaRibbonLabel} style={{ borderLeftColor: color }}>
                    {label}
                  </label>
                  <div className={styles.slaTimeInputs}>
                    <div className={styles.slaTimeGroup}>
                      <input
                        type="number"
                        value={hours}
                        onChange={(e) => {
                          const newHours = e.target.value;
                          const duration = createDuration(newHours, minutes);
                          setWorkflowMetadata({ ...workflowMetadata, [`${key}_sla`]: duration });
                        }}
                        placeholder="0"
                        min="0"
                        step="1"
                        className={styles.slaTimeInput}
                      />
                      <span className={styles.slaTimeUnit}>h</span>
                    </div>
                    <div className={styles.slaTimeGroup}>
                      <input
                        type="number"
                        value={minutes}
                        onChange={(e) => {
                          const newMinutes = e.target.value;
                          const duration = createDuration(hours, newMinutes);
                          setWorkflowMetadata({ ...workflowMetadata, [`${key}_sla`]: duration });
                        }}
                        placeholder="0"
                        min="0"
                        max="59"
                        step="1"
                        className={styles.slaTimeInput}
                      />
                      <span className={styles.slaTimeUnit}>m</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Layout - 3 Column */}
      <div className={styles.simpleLayout}>
        {/* LEFT SIDEBAR: Workflow Details + SLA */}
        <aside className={styles.leftSidebar}>
          <div className={styles.sidebarSection}>
            <h3 className={styles.sidebarTitle}><FileText size={14} /> Details</h3>
            <div className={styles.compactForm}>
              <div className={styles.inputGroup}>
                <label>Name <span className={styles.required}>*</span></label>
                <input
                  type="text"
                  value={workflowMetadata.name}
                  onChange={(e) => setWorkflowMetadata({ ...workflowMetadata, name: e.target.value })}
                  placeholder="Workflow name"
                />
              </div>
              <div className={styles.inputRow}>
                <div className={styles.inputGroup}>
                  <label>Category <span className={styles.required}>*</span></label>
                  <input
                    type="text"
                    value={workflowMetadata.category}
                    onChange={(e) => setWorkflowMetadata({ ...workflowMetadata, category: e.target.value })}
                    placeholder="IT, HR"
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>Sub-Cat <span className={styles.required}>*</span></label>
                  <input
                    type="text"
                    value={workflowMetadata.sub_category}
                    onChange={(e) => setWorkflowMetadata({ ...workflowMetadata, sub_category: e.target.value })}
                    placeholder="Support"
                  />
                </div>
              </div>
              <div className={styles.inputGroup}>
                <label>Department <span className={styles.required}>*</span></label>
                <input
                  type="text"
                  value={workflowMetadata.department}
                  onChange={(e) => setWorkflowMetadata({ ...workflowMetadata, department: e.target.value })}
                  placeholder="IT Support"
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Description</label>
                <textarea
                  value={workflowMetadata.description}
                  onChange={(e) => setWorkflowMetadata({ ...workflowMetadata, description: e.target.value })}
                  placeholder="Optional..."
                  rows={2}
                />
              </div>
            </div>
          </div>
        </aside>

        {/* CENTER: Steps + Transitions */}
        <main className={styles.centerPanel}>
          {/* Steps */}
          <div className={styles.panelSection}>
            <div className={styles.panelHeader}>
              <h3><GitBranch size={16} /> Steps ({simpleNodes.length})</h3>
              <button className={styles.addBtnSmall} onClick={addSimpleNode}>
                <Plus size={14} /> Add
              </button>
            </div>
            <div className={styles.stepsGrid}>
              {simpleNodes.length === 0 ? (
                <div className={styles.emptySmall}>Select a template or add steps</div>
              ) : (
                simpleNodes.map((node, idx) => (
                  <div 
                    key={node.id} 
                    className={`${styles.stepCardCompact} ${node.is_start ? styles.stepStartCompact : ''} ${node.is_end ? styles.stepEndCompact : ''} ${node.expanded ? styles.stepCardExpanded : ''}`}
                  >
                    <div className={styles.stepCardHeader}>
                      <span className={styles.stepBadge}>{idx + 1}</span>
                      <input
                        type="text"
                        value={node.name}
                        onChange={(e) => updateSimpleNode(idx, 'name', e.target.value)}
                        className={styles.stepInput}
                        placeholder="Step name"
                      />
                      <button 
                        className={styles.expandBtnSmall} 
                        onClick={() => updateSimpleNode(idx, 'expanded', !node.expanded)}
                        title={node.expanded ? 'Collapse' : 'Show more options'}
                      >
                        {node.expanded ? <ChevronUp size={14} /> : <MoreVertical size={14} />}
                      </button>
                      <button className={styles.removeBtnSmall} onClick={() => removeSimpleNode(idx)}>
                        <X size={14} />
                      </button>
                    </div>
                    <div className={styles.stepCardBody}>
                      <select
                        value={node.role || ''}
                        onChange={(e) => updateSimpleNode(idx, 'role', e.target.value)}
                        className={styles.roleSelectCompact}
                        title="Assigned role for this step"
                      >
                        <option value="">-- Role --</option>
                        {roles.map(r => (
                          <option key={r.role_id || r.id} value={r.name}>{r.name}</option>
                        ))}
                      </select>
                      <div className={styles.flagsCompact}>
                        <label title="Start Step">
                          <input
                            type="checkbox"
                            checked={node.is_start}
                            onChange={(e) => updateSimpleNode(idx, 'is_start', e.target.checked)}
                          />
                          <span className={styles.flagIconStart}>
                            <Play size={10} fill="currentColor" />
                          </span>
                        </label>
                        <label title="End Step">
                          <input
                            type="checkbox"
                            checked={node.is_end}
                            onChange={(e) => updateSimpleNode(idx, 'is_end', e.target.checked)}
                          />
                          <span className={styles.flagIconEnd}>
                            <Square size={10} fill="currentColor" />
                          </span>
                        </label>
                      </div>
                    </div>
                    
                    {/* Expanded Section - Additional Fields */}
                    {node.expanded && (
                      <div className={styles.stepCardExpansion}>
                        <div className={styles.expansionDivider} />
                        
                        {/* Escalate To */}
                        <div className={styles.expansionRow}>
                          <label className={styles.expansionLabel}>
                            <ArrowUpRight size={12} /> Escalate To
                          </label>
                          <select
                            value={node.escalate_to || ''}
                            onChange={(e) => updateSimpleNode(idx, 'escalate_to', e.target.value)}
                            className={styles.expansionSelect}
                            title="Role to escalate to when step times out"
                          >
                            <option value="">-- None --</option>
                            {roles.map(r => (
                              <option key={r.role_id || r.id} value={r.name}>{r.name}</option>
                            ))}
                          </select>
                        </div>
                        
                        {/* Weight */}
                        <div className={styles.expansionRow}>
                          <label className={styles.expansionLabel}>
                            <Scale size={12} /> Weight
                          </label>
                          <div className={styles.weightInputWrapper}>
                            <input
                              type="number"
                              min="0"
                              max="1"
                              step="0.1"
                              value={node.weight ?? 0.5}
                              onChange={(e) => updateSimpleNode(idx, 'weight', parseFloat(e.target.value) || 0.5)}
                              className={styles.expansionInput}
                              title="Step weight (0-1) for progress calculation"
                            />
                            <span className={styles.weightHint}>(0-1)</span>
                          </div>
                        </div>
                        
                        {/* Description */}
                        <div className={styles.expansionRowFull}>
                          <label className={styles.expansionLabel}>
                            <Info size={12} /> Description
                          </label>
                          <input
                            type="text"
                            value={node.description || ''}
                            onChange={(e) => updateSimpleNode(idx, 'description', e.target.value)}
                            className={styles.expansionInputFull}
                            placeholder="Brief description of this step"
                            maxLength={256}
                          />
                        </div>
                        
                        {/* Instructions */}
                        <div className={styles.expansionRowFull}>
                          <label className={styles.expansionLabel}>
                            <Edit3 size={12} /> Instructions
                          </label>
                          <textarea
                            value={node.instruction || ''}
                            onChange={(e) => updateSimpleNode(idx, 'instruction', e.target.value)}
                            className={styles.expansionTextarea}
                            placeholder="Detailed instructions for agents handling this step..."
                            rows={2}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Transitions */}
          <div className={styles.panelSection}>
            <div className={styles.panelHeader}>
              <h3><Link size={16} /> Transitions ({simpleEdges.length})</h3>
              <button 
                className={styles.addBtnSmall} 
                onClick={addSimpleEdge}
                disabled={simpleNodes.length < 2}
              >
                <Plus size={14} /> Add
              </button>
            </div>
            <div className={styles.transitionsCompact}>
              {simpleEdges.length === 0 ? (
                <div className={styles.emptySmall}>Add transitions to connect steps</div>
              ) : (
                simpleEdges.map((edge, idx) => (
                  <div key={edge.id} className={styles.transitionRow}>
                    <select
                      value={edge.from}
                      onChange={(e) => updateSimpleEdge(idx, 'from', e.target.value)}
                      className={styles.transitionSelectSmall}
                    >
                      <option value="">From</option>
                      {simpleNodes.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                    </select>
                    <span className={styles.arrowSmall}><ArrowRight size={14} /></span>
                    <select
                      value={edge.to}
                      onChange={(e) => updateSimpleEdge(idx, 'to', e.target.value)}
                      className={styles.transitionSelectSmall}
                    >
                      <option value="">To</option>
                      {simpleNodes.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                    </select>
                    <input
                      type="text"
                      value={edge.name || ''}
                      onChange={(e) => updateSimpleEdge(idx, 'name', e.target.value)}
                      placeholder="Action"
                      className={styles.transitionInputSmall}
                    />
                    <button className={styles.removeBtnSmall} onClick={() => removeSimpleEdge(idx)}>
                      <X size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>

        {/* RIGHT SIDEBAR: Preview + Validation + Help */}
        <aside className={styles.rightSidebar}>
          {/* Validation Status */}
          <div className={`${styles.validationBox} ${validationErrors.length === 0 ? styles.validationOk : styles.validationError}`}>
            <div className={styles.validationHeader}>
              {validationErrors.length === 0 ? (
                <><CheckCircle size={16} /> Ready to Create</>
              ) : (
                <><AlertTriangle size={16} /> {validationErrors.length} Issue(s)</>
              )}
            </div>
            {validationErrors.length > 0 && (
              <ul className={styles.validationList}>
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Flow Preview */}
          <div className={styles.previewBox}>
            <h3 className={styles.previewTitle}><Eye size={16} /> Preview</h3>
            <div className={styles.previewContent}>
              {simpleNodes.length === 0 ? (
                <div className={styles.emptySmall}>No steps yet</div>
              ) : (
                <div className={styles.flowMini}>
                  {simpleNodes.map((node) => {
                    const outgoing = simpleEdges.filter(e => e.from === node.id);
                    return (
                      <div key={node.id} className={styles.flowMiniNode}>
                        <div className={`${styles.flowMiniBox} ${node.is_start ? styles.flowMiniStart : ''} ${node.is_end ? styles.flowMiniEnd : ''}`}>
                          <strong>{node.name}</strong>
                          <small>{node.role || '-'}</small>
                        </div>
                        {outgoing.map(e => {
                          const target = simpleNodes.find(n => n.id === e.to);
                          return (
                            <div key={e.id} className={styles.flowMiniArrow}>
                              ↳ <em>{e.name || 'next'}</em> <ArrowRight size={10} /> {target?.name || '?'}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Quick Tips - Only when help is enabled */}
          {showHelp && (
            <div className={styles.helpTipsBox}>
              <h3 className={styles.previewTitle}><Lightbulb size={16} /> Tips</h3>
              <div className={styles.helpTipsContent}>
                <div className={styles.tipItem}>
                  <strong><Play size={10} fill="currentColor" /> Start</strong> = Entry point
                </div>
                <div className={styles.tipItem}>
                  <strong><Square size={10} fill="currentColor" /> End</strong> = Final step
                </div>
                <div className={styles.tipItem}>
                  <strong>Transitions</strong> connect steps
                </div>
                <div className={styles.tipItem}>
                  Assign <strong>roles</strong> to each step
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );

  // ============================================
  // RENDER: ADVANCED MODE (ReactFlow)
  // ============================================
  const renderAdvancedMode = () => (
    <div className={styles.editorContainer}>
      <div className={styles.sidebar} style={{ width: `${sidebarWidth}px` }}>
        <div className={styles.sidebarContent}>
          <h3>Workflow Details</h3>
          
          <div className={styles.formGroup}>
            <label>Workflow Name *</label>
            <input
              type="text"
              value={workflowMetadata.name}
              onChange={(e) => setWorkflowMetadata({ ...workflowMetadata, name: e.target.value })}
              placeholder="Enter workflow name"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Description</label>
            <textarea
              value={workflowMetadata.description}
              onChange={(e) => setWorkflowMetadata({ ...workflowMetadata, description: e.target.value })}
              placeholder="Enter workflow description"
              rows={3}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Category *</label>
            <input
              type="text"
              value={workflowMetadata.category}
              onChange={(e) => setWorkflowMetadata({ ...workflowMetadata, category: e.target.value })}
              placeholder="e.g., IT, HR"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Sub-Category *</label>
            <input
              type="text"
              value={workflowMetadata.sub_category}
              onChange={(e) => setWorkflowMetadata({ ...workflowMetadata, sub_category: e.target.value })}
              placeholder="e.g., Support, Requests"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Department *</label>
            <input
              type="text"
              value={workflowMetadata.department}
              onChange={(e) => setWorkflowMetadata({ ...workflowMetadata, department: e.target.value })}
              placeholder="e.g., IT Support"
            />
          </div>

          <hr className={styles.divider} />
          <h4>SLA Configuration</h4>

          {['low', 'medium', 'high', 'urgent'].map((priority) => {
            const slaValue = workflowMetadata[`${priority}_sla`];
            const displayValue = slaValue 
              ? parseInt(slaValue.match(/\d+/)?.[0] || '0') 
              : '';
            
            return (
              <div key={priority} className={styles.formGroup}>
                <label>{priority.charAt(0).toUpperCase() + priority.slice(1)} SLA (Hours)</label>
                <input
                  type="number"
                  value={displayValue}
                  onChange={(e) => {
                    const hours = e.target.value ? parseInt(e.target.value) : null;
                    setWorkflowMetadata({
                      ...workflowMetadata,
                      [`${priority}_sla`]: hours ? `PT${hours}H` : null,
                    });
                  }}
                  placeholder="Hours"
                />
              </div>
            );
          })}

          <hr className={styles.divider} />
          <h4>Steps ({nodes.length})</h4>
          <button className={styles.addBtn} onClick={handleAddNode}>
            <Plus size={16} /> Add Step
          </button>

          {editingNode && (
            <div className={styles.nodeEditor}>
              <h5>Editing: {editingNode.data.label}</h5>
              <div className={styles.formGroup}>
                <label>Step Name</label>
                <input
                  type="text"
                  value={editingNode.data.label}
                  onChange={(e) => handleUpdateNode('label', e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Assigned Role</label>
                <select
                  value={editingNode.data.role}
                  onChange={(e) => handleUpdateNode('role', e.target.value)}
                >
                  {roles.map((role) => (
                    <option key={role.id} value={role.name}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Escalate To</label>
                <select
                  value={editingNode.data.escalate_to || ''}
                  onChange={(e) => handleUpdateNode('escalate_to', e.target.value)}
                >
                  <option value="">-- None --</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.name}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Weight (0-1)</label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={editingNode.data.weight ?? 0.5}
                  onChange={(e) => handleUpdateNode('weight', parseFloat(e.target.value) || 0.5)}
                  placeholder="0.5"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea
                  value={editingNode.data.description || ''}
                  onChange={(e) => handleUpdateNode('description', e.target.value)}
                  rows={2}
                  placeholder="Brief description of this step"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Instructions</label>
                <textarea
                  value={editingNode.data.instruction || ''}
                  onChange={(e) => handleUpdateNode('instruction', e.target.value)}
                  rows={3}
                  placeholder="Detailed instructions for agents handling this step..."
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={editingNode.data.is_start || false}
                    onChange={(e) => handleUpdateNode('is_start', e.target.checked)}
                  />
                  Start Step
                </label>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={editingNode.data.is_end || false}
                    onChange={(e) => handleUpdateNode('is_end', e.target.checked)}
                  />
                  End Step
                </label>
              </div>
              <button className={styles.deleteBtn} onClick={handleDeleteNode}>
                <Trash2 size={16} /> Delete Step
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={styles.resizeHandle} onMouseDown={handleResizeStart} />

      <div className={styles.content} ref={contentRef}>
        <div className={styles.editorContent}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onNodeClick={handleNodeClick}
            defaultEdgeOptions={{
              type: 'smoothstep',
              style: { strokeWidth: 2 },
              animated: false,
            }}
            connectionLineType="smoothstep"
            fitView
            fitViewOptions={{ padding: 0.2 }}
          >
            <Background variant="dots" gap={16} size={1} />
            <Controls />
          </ReactFlow>
        </div>
      </div>
    </div>
  );

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <main className={styles.createWorkflowPage}>
      <ReactFlowProvider>
        {/* Top Toolbar */}
        <div className={styles.topToolbar}>
          <div className={styles.toolbarLeft}>
            <button
              className={styles.backBtn}
              onClick={() => navigate('/admin/workflows')}
              title="Back to Workflows"
            >
              <ArrowLeft size={20} />
            </button>
            <h2>Create Workflow</h2>
            <div className={styles.modeToggle}>
                <button 
                  className={`${styles.modeBtn} ${editorMode === 'simple' ? styles.modeBtnActive : ''}`}
                  onClick={() => handleModeChange('simple')}
                >
                  <FileText size={16} /> Simple
                </button>
                <button 
                  className={`${styles.modeBtn} ${editorMode === 'advanced' ? styles.modeBtnActive : ''}`}
                  onClick={() => handleModeChange('advanced')}
                >
                  <Settings size={16} /> Advanced
                </button>
              </div>
            </div>
            <div className={styles.toolbarRight}>
              {editorMode === 'advanced' && (
                <button
                  className={styles.layoutBtn}
                  onClick={handleAutoLayout}
                  disabled={nodes.length === 0}
                  title="Auto-arrange nodes"
                >
                  <GitBranch size={16} /> Auto Layout
                </button>
              )}
              <button
                className={styles.diagramBtn}
                onClick={() => setShowSequenceDiagram(true)}
                disabled={(editorMode === 'simple' ? simpleNodes.length : nodes.length) === 0}
                title="View as Sequence Diagram"
              >
                <Layout size={16} /> Diagram
              </button>
              <button
                className={styles.helpBtn}
                onClick={() => setShowHelp(!showHelp)}
              >
                {showHelp ? <><X size={16} /> Hide Help</> : <><HelpCircle size={16} /> Help</>}
              </button>
              <button
                className={styles.cancelBtn}
                onClick={() => navigate('/admin/workflows')}
              >
                Cancel
              </button>
              <button
                className={styles.saveBtn}
                onClick={handleCreateWorkflow}
                disabled={isCreating || validationErrors.length > 0}
                title={validationErrors.length > 0 ? `Cannot create: ${validationErrors.length} validation error(s)` : ''}
              >
                <Save size={16} /> {isCreating ? 'Creating...' : 'Create Workflow'}
              </button>
            </div>
          </div>

          {/* Help Panel - Only show when help enabled and in advanced mode */}
          {showHelp && editorMode === 'advanced' && (
            <div className={styles.helpPanel}>
              {Object.entries(HELP_TIPS).map(([key, section]) => (
                <div key={key} className={styles.helpCard}>
                  <h4>{section.icon} {section.title}</h4>
                  <ul>
                    {section.tips.map((tip, i) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

        {/* Editor Content */}
        {editorMode === 'simple' ? renderSimpleMode() : renderAdvancedMode()}
      </ReactFlowProvider>

      {showConfirmation && createdWorkflow && (
        <WorkflowCreationConfirmation
          workflow={createdWorkflow}
          onClose={handleCloseConfirmation}
          onEditWorkflow={handleEditWorkflow}
        />
      )}

      {/* Sequence Diagram Modal */}
      <SequenceDiagramModal
        isOpen={showSequenceDiagram}
        onClose={() => setShowSequenceDiagram(false)}
        nodes={getDiagramData().nodes}
        edges={getDiagramData().edges}
        workflowName={workflowMetadata.name || 'New Workflow'}
      />
    </main>
  );
}