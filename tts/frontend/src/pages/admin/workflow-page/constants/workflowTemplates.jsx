import React from 'react';
import { FileText, CheckCircle, BarChart, ThumbsUp, TrendingUp, Monitor, GitBranch } from 'lucide-react';

/**
 * Workflow templates with 6-handle system:
 * - Forward flow: out-B → in-T (vertical) or out-R → in-L (horizontal)
 * - Return/Reject flow: out-L → in-R (returnee transition)
 */
export const WORKFLOW_TEMPLATES = {
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
    edges: [{ from: 0, to: 1, name: 'Process', sourceHandle: 'out-B', targetHandle: 'in-T' }],
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
      { from: 0, to: 1, name: 'Assign', sourceHandle: 'out-B', targetHandle: 'in-T' },
      { from: 1, to: 2, name: 'Complete', sourceHandle: 'out-B', targetHandle: 'in-T' }
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
      { from: 0, to: 1, name: 'Submit for Review', sourceHandle: 'out-B', targetHandle: 'in-T' },
      { from: 1, to: 2, name: 'Approve', sourceHandle: 'out-R', targetHandle: 'in-T' },
      { from: 1, to: 3, name: 'Reject', sourceHandle: 'out-L', targetHandle: 'in-T' }
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
      { from: 0, to: 1, name: 'Assign T1', sourceHandle: 'out-B', targetHandle: 'in-T' },
      { from: 1, to: 2, name: 'Escalate', sourceHandle: 'out-R', targetHandle: 'in-L' },
      { from: 1, to: 3, name: 'Resolve', sourceHandle: 'out-B', targetHandle: 'in-T' },
      { from: 2, to: 3, name: 'Resolve', sourceHandle: 'out-B', targetHandle: 'in-T' }
    ],
    metadata: { category: 'IT', sub_category: 'Support' }
  },
  itRequest: {
    name: 'IT Service Request',
    description: 'Request → Approval → Fulfillment (with return loop)',
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
      { from: 0, to: 1, name: 'Request Approval', sourceHandle: 'out-B', targetHandle: 'in-T' },
      { from: 1, to: 2, name: 'Approve', sourceHandle: 'out-R', targetHandle: 'in-L' },
      { from: 1, to: 5, name: 'Deny', sourceHandle: 'out-L', targetHandle: 'in-T' },
      { from: 2, to: 3, name: 'Deliver', sourceHandle: 'out-B', targetHandle: 'in-T' },
      { from: 3, to: 4, name: 'Confirm', sourceHandle: 'out-B', targetHandle: 'in-T' },
      { from: 3, to: 2, name: 'Issues Found', sourceHandle: 'out-L', targetHandle: 'in-R', isReturn: true }
    ],
    metadata: { category: 'IT', sub_category: 'Service Request', department: 'IT Support' }
  },
  complexState: {
    name: 'Complex State Machine',
    description: 'Multi-loop workflow with reviews and rework',
    icon: <GitBranch size={16} />,
    nodes: [
      { name: 'Draft', role: null, is_start: true, is_end: false, description: 'Initial draft state', instruction: 'Create initial document/ticket', escalate_to: null, weight: 0.1 },
      { name: 'Peer Review', role: null, is_start: false, is_end: false, description: 'Under peer review', instruction: 'Review for quality and completeness', escalate_to: null, weight: 0.2 },
      { name: 'Manager Review', role: null, is_start: false, is_end: false, description: 'Manager approval pending', instruction: 'Final review and approval', escalate_to: null, weight: 0.2 },
      { name: 'Implementation', role: null, is_start: false, is_end: false, description: 'Being implemented', instruction: 'Execute the approved plan', escalate_to: null, weight: 0.3 },
      { name: 'Completed', role: null, is_start: false, is_end: true, description: 'Successfully completed', instruction: '', escalate_to: null, weight: 0.1 },
      { name: 'Cancelled', role: null, is_start: false, is_end: true, description: 'Request cancelled', instruction: '', escalate_to: null, weight: 0.1 }
    ],
    edges: [
      { from: 0, to: 1, name: 'Submit for Review', sourceHandle: 'out-B', targetHandle: 'in-T' },
      { from: 1, to: 2, name: 'Approve', sourceHandle: 'out-R', targetHandle: 'in-L' },
      { from: 2, to: 3, name: 'Authorize', sourceHandle: 'out-B', targetHandle: 'in-T' },
      { from: 3, to: 4, name: 'Complete', sourceHandle: 'out-B', targetHandle: 'in-T' },
      { from: 2, to: 1, name: 'Escalate Back', sourceHandle: 'out-L', targetHandle: 'in-R', isReturn: true },
      { from: 3, to: 2, name: 'Issue Found', sourceHandle: 'out-L', targetHandle: 'in-R', isReturn: true },
      { from: 2, to: 5, name: 'Reject', sourceHandle: 'out-R', targetHandle: 'in-T' }
    ],
    metadata: { category: 'Process', sub_category: 'Complex Workflow', department: 'Operations' }
  }
};

export const SLA_PRIORITIES = [
  { key: 'urgent', label: 'Urgent', color: '#ef4444' },
  { key: 'high', label: 'High', color: '#f97316' },
  { key: 'medium', label: 'Medium', color: '#eab308' },
  { key: 'low', label: 'Low', color: '#22c55e' }
];

export const DEFAULT_WORKFLOW_METADATA = {
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
};
