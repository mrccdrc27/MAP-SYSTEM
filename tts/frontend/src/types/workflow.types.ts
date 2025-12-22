/**
 * Workflow Management System - TypeScript Interfaces
 * 
 * These interfaces define the data structures used throughout the workflow editor.
 * They align with the workflow_api backend responses.
 */

// Workflow related interfaces
export interface Step {
  id: number;
  name: string;
  role: string;
  description?: string;
  instruction?: string;
  design?: {
    x: number;
    y: number;
  };
  to_delete?: boolean;
}

export interface Transition {
  id: number;
  from: number; // Step ID
  to: number; // Step ID
  name: string;
  action?: string;
  to_delete?: boolean;
}

export interface WorkflowGraph {
  nodes: Step[];
  edges: Transition[];
}

export interface WorkflowMetadata {
  id: number;
  workflow_id?: number;
  name: string;
  description?: string;
  category?: string;
  sub_category?: string;
  department?: string;
  end_logic?: string;
  low_sla?: number;
  medium_sla?: number;
  high_sla?: number;
  urgent_sla?: number;
  user_id?: number;
  created_at?: string;
  updated_at?: string;
}

export interface WorkflowDetail {
  workflow: WorkflowMetadata;
  graph: WorkflowGraph;
}

export interface Role {
  id: number;
  name: string;
  system?: string;
}

// ReactFlow Node and Edge types
export interface WorkflowNode {
  id: string;
  data: {
    label: string;
    role: string;
    description?: string;
    instruction?: string;
    id: number;
    onStepClick?: (data: any) => void;
  };
  type: 'stepNode';
  position: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  data?: Transition;
  markerEnd?: {
    type: string;
  };
}

// API Request/Response types
export interface UpdateGraphRequest {
  nodes: Step[];
  edges: Transition[];
}

export interface UpdateDetailsRequest {
  name: string;
  description?: string;
  category?: string;
  sub_category?: string;
  department?: string;
  end_logic?: string;
  low_sla?: number;
  medium_sla?: number;
  high_sla?: number;
  urgent_sla?: number;
}

export interface UpdateStepRequest {
  name: string;
  description?: string;
  instruction?: string;
  role: string;
}

export interface UpdateTransitionRequest {
  name: string;
}
