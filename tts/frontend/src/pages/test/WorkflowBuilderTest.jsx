import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';

const WORKFLOW_API = '/workflows';
const ROLES_API = '/roles';

// Predefined workflow templates
const TEMPLATES = {
  empty: {
    name: 'Empty Workflow',
    description: 'Start from scratch',
    nodes: [],
    edges: []
  },
  simple: {
    name: 'Simple 2-Step',
    description: 'Basic start → end flow',
    nodes: [
      { id: 'temp-1', name: 'Start', role: null, is_start: true, is_end: false },
      { id: 'temp-2', name: 'Complete', role: null, is_start: false, is_end: true }
    ],
    edges: [
      { id: 'temp-e1', from: 'temp-1', to: 'temp-2', name: 'Submit' }
    ]
  },
  linear3: {
    name: 'Linear 3-Step',
    description: 'Start → Process → End',
    nodes: [
      { id: 'temp-1', name: 'Intake', role: null, is_start: true, is_end: false },
      { id: 'temp-2', name: 'Processing', role: null, is_start: false, is_end: false },
      { id: 'temp-3', name: 'Resolved', role: null, is_start: false, is_end: true }
    ],
    edges: [
      { id: 'temp-e1', from: 'temp-1', to: 'temp-2', name: 'Assign' },
      { id: 'temp-e2', from: 'temp-2', to: 'temp-3', name: 'Complete' }
    ]
  },
  approval: {
    name: 'Approval Flow',
    description: 'Start → Review → Approve/Reject → End',
    nodes: [
      { id: 'temp-1', name: 'Submit Request', role: null, is_start: true, is_end: false },
      { id: 'temp-2', name: 'Manager Review', role: null, is_start: false, is_end: false },
      { id: 'temp-3', name: 'Approved', role: null, is_start: false, is_end: true },
      { id: 'temp-4', name: 'Rejected', role: null, is_start: false, is_end: true }
    ],
    edges: [
      { id: 'temp-e1', from: 'temp-1', to: 'temp-2', name: 'Submit for Review' },
      { id: 'temp-e2', from: 'temp-2', to: 'temp-3', name: 'Approve' },
      { id: 'temp-e3', from: 'temp-2', to: 'temp-4', name: 'Reject' }
    ]
  },
  escalation: {
    name: 'Escalation Flow',
    description: 'Tiered support with escalation path',
    nodes: [
      { id: 'temp-1', name: 'New Ticket', role: null, is_start: true, is_end: false },
      { id: 'temp-2', name: 'Tier 1 Support', role: null, is_start: false, is_end: false },
      { id: 'temp-3', name: 'Tier 2 Support', role: null, is_start: false, is_end: false },
      { id: 'temp-4', name: 'Resolved', role: null, is_start: false, is_end: true }
    ],
    edges: [
      { id: 'temp-e1', from: 'temp-1', to: 'temp-2', name: 'Assign to T1' },
      { id: 'temp-e2', from: 'temp-2', to: 'temp-3', name: 'Escalate' },
      { id: 'temp-e3', from: 'temp-2', to: 'temp-4', name: 'Resolve' },
      { id: 'temp-e4', from: 'temp-3', to: 'temp-4', name: 'Resolve' }
    ]
  }
};

export default function WorkflowBuilderTest() {
  // API Data
  const [roles, setRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  
  // Workflow data
  const [workflowMeta, setWorkflowMeta] = useState({
    name: '',
    description: '',
    category: '',
    sub_category: '',
    department: ''
  });
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  
  // UI state
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [output, setOutput] = useState([]);
  const [createdWorkflows, setCreatedWorkflows] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load roles on mount
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await api.get(`${ROLES_API}/`);
        setRoles(response.data || []);
        log('✅ Loaded ' + response.data.length + ' roles', 'success');
      } catch (err) {
        log('❌ Failed to load roles: ' + (err.response?.data?.error || err.message), 'error');
      } finally {
        setLoadingRoles(false);
      }
    };
    fetchRoles();
  }, []);

  const log = useCallback((message, type = 'info') => {
    setOutput(prev => [...prev, { message, type, time: new Date().toLocaleTimeString() }]);
  }, []);

  const clearLog = () => setOutput([]);

  // Template selection
  const applyTemplate = (templateKey) => {
    if (!templateKey) return;
    
    const template = TEMPLATES[templateKey];
    setSelectedTemplate(templateKey);
    setNodes(JSON.parse(JSON.stringify(template.nodes)));
    setEdges(JSON.parse(JSON.stringify(template.edges)));
    
    // Auto-fill meta with timestamp
    const ts = Date.now();
    setWorkflowMeta({
      name: `Test ${template.name} ${ts}`,
      description: `E2E Test - ${template.description}`,
      category: `E2E-${templateKey}-${ts}`,
      sub_category: `Test-${ts}`,
      department: 'Testing'
    });
    
    log(`📋 Applied template: ${template.name}`, 'info');
  };

  // Node management
  const addNode = () => {
    const id = `temp-${Date.now()}`;
    const newNode = {
      id,
      name: `Step ${nodes.length + 1}`,
      role: roles[0]?.name || '',
      is_start: nodes.length === 0,
      is_end: false
    };
    setNodes([...nodes, newNode]);
    log(`➕ Added node: ${newNode.name}`, 'info');
  };

  const updateNode = (index, field, value) => {
    const updated = [...nodes];
    updated[index] = { ...updated[index], [field]: value };
    
    // Enforce single start node
    if (field === 'is_start' && value === true) {
      updated.forEach((n, i) => {
        if (i !== index) n.is_start = false;
      });
    }
    
    setNodes(updated);
  };

  const removeNode = (index) => {
    const nodeId = nodes[index].id;
    setNodes(nodes.filter((_, i) => i !== index));
    // Remove connected edges
    setEdges(edges.filter(e => e.from !== nodeId && e.to !== nodeId));
    log(`🗑️ Removed node at index ${index}`, 'info');
  };

  // Edge management
  const addEdge = () => {
    if (nodes.length < 2) {
      log('⚠️ Need at least 2 nodes to create an edge', 'warn');
      return;
    }
    const id = `temp-edge-${Date.now()}`;
    const newEdge = {
      id,
      from: nodes[0]?.id || '',
      to: nodes[1]?.id || '',
      name: `Transition ${edges.length + 1}`
    };
    setEdges([...edges, newEdge]);
    log(`➕ Added edge: ${newEdge.name}`, 'info');
  };

  const updateEdge = (index, field, value) => {
    const updated = [...edges];
    updated[index] = { ...updated[index], [field]: value };
    setEdges(updated);
  };

  const removeEdge = (index) => {
    setEdges(edges.filter((_, i) => i !== index));
    log(`🗑️ Removed edge at index ${index}`, 'info');
  };

  // Submit workflow
  const submitWorkflow = async () => {
    setIsSubmitting(true);
    log('\n📤 Submitting workflow...', 'info');
    
    // Validate
    if (!workflowMeta.name || !workflowMeta.category || !workflowMeta.sub_category || !workflowMeta.department) {
      log('❌ Missing required fields (name, category, sub_category, department)', 'error');
      setIsSubmitting(false);
      return;
    }
    
    if (nodes.length > 0) {
      const startNodes = nodes.filter(n => n.is_start);
      if (startNodes.length !== 1) {
        log(`❌ Must have exactly 1 start node (found ${startNodes.length})`, 'error');
        setIsSubmitting(false);
        return;
      }
      
      const endNodes = nodes.filter(n => n.is_end);
      if (endNodes.length === 0) {
        log('⚠️ Warning: No end nodes defined', 'warn');
      }
      
      const missingRoles = nodes.filter(n => !n.role);
      if (missingRoles.length > 0) {
        log(`❌ ${missingRoles.length} node(s) missing role assignment`, 'error');
        setIsSubmitting(false);
        return;
      }
    }
    
    const payload = {
      workflow: workflowMeta,
      graph: { nodes, edges }
    };
    
    log('📦 Payload: ' + JSON.stringify(payload, null, 2), 'info');
    
    try {
      const response = await api.post(`${WORKFLOW_API}/`, payload);
      log(`📊 Response: ${JSON.stringify(response.data, null, 2)}`, 'info');
      
      // Handle nested response structure (workflow + graph)
      const workflowData = response.data.workflow || response.data;
      const workflowId = workflowData.workflow_id || workflowData.id;
      const workflowName = workflowData.name || workflowMeta.name;
      
      if (!workflowId) {
        log(`❌ Response missing workflow ID. Full response: ${JSON.stringify(response.data)}`, 'error');
        setIsSubmitting(false);
        return;
      }
      
      log(`✅ Created workflow! ID: ${workflowId}`, 'success');
      
      setCreatedWorkflows(prev => [...prev, {
        id: workflowId,
        name: workflowName
      }]);
    } catch (err) {
      log(`❌ Failed: ${err.response?.data?.error || err.message}`, 'error');
      if (err.response?.data) {
        log(`📋 Error details: ${JSON.stringify(err.response.data, null, 2)}`, 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete workflow
  const deleteWorkflow = async (workflowId) => {
    if (!workflowId) {
      log(`❌ Cannot delete: workflowId is missing (${workflowId})`, 'error');
      return;
    }
    
    try {
      await api.delete(`${WORKFLOW_API}/${workflowId}/`);
      log(`✅ Deleted workflow #${workflowId}`, 'success');
      setCreatedWorkflows(prev => prev.filter(w => w.id !== workflowId));
    } catch (err) {
      log(`❌ Failed to delete #${workflowId}: ${err.response?.data?.error || err.message}`, 'error');
    }
  };

  // Cleanup all
  const cleanupAll = async () => {
    log('\n🧹 Cleaning up all created workflows...', 'info');
    for (const wf of createdWorkflows) {
      await deleteWorkflow(wf.id);
    }
  };

  // Reset form
  const resetForm = () => {
    setWorkflowMeta({ name: '', description: '', category: '', sub_category: '', department: '' });
    setNodes([]);
    setEdges([]);
    setSelectedTemplate('');
    log('🔄 Form reset', 'info');
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🔧 Workflow Builder Test</h1>
      
      {/* Templates Section */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>📋 Templates</h2>
        <div style={styles.templateGrid}>
          {Object.entries(TEMPLATES).map(([key, template]) => (
            <button
              key={key}
              style={{
                ...styles.templateBtn,
                ...(selectedTemplate === key ? styles.templateBtnActive : {})
              }}
              onClick={() => applyTemplate(key)}
            >
              <strong>{template.name}</strong>
              <small style={styles.templateDesc}>{template.description}</small>
              <small style={styles.templateMeta}>
                {template.nodes.length} nodes, {template.edges.length} edges
              </small>
            </button>
          ))}
        </div>
      </section>

      {/* Workflow Meta */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>📝 Workflow Details</h2>
        <div style={styles.formGrid}>
          <input
            style={styles.input}
            placeholder="Name *"
            value={workflowMeta.name}
            onChange={e => setWorkflowMeta({ ...workflowMeta, name: e.target.value })}
          />
          <input
            style={styles.input}
            placeholder="Description"
            value={workflowMeta.description}
            onChange={e => setWorkflowMeta({ ...workflowMeta, description: e.target.value })}
          />
          <input
            style={styles.input}
            placeholder="Category *"
            value={workflowMeta.category}
            onChange={e => setWorkflowMeta({ ...workflowMeta, category: e.target.value })}
          />
          <input
            style={styles.input}
            placeholder="Sub-Category *"
            value={workflowMeta.sub_category}
            onChange={e => setWorkflowMeta({ ...workflowMeta, sub_category: e.target.value })}
          />
          <input
            style={styles.input}
            placeholder="Department *"
            value={workflowMeta.department}
            onChange={e => setWorkflowMeta({ ...workflowMeta, department: e.target.value })}
          />
        </div>
      </section>

      {/* Nodes Section */}
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>📍 Nodes ({nodes.length})</h2>
          <button style={styles.addBtn} onClick={addNode}>+ Add Node</button>
        </div>
        
        {nodes.length === 0 ? (
          <p style={styles.emptyMsg}>No nodes yet. Add one or select a template.</p>
        ) : (
          <div style={styles.itemList}>
            {nodes.map((node, idx) => (
              <div key={node.id} style={styles.itemCard}>
                <div style={styles.itemRow}>
                  <span style={styles.itemIndex}>#{idx + 1}</span>
                  <input
                    style={styles.inputSmall}
                    placeholder="Name"
                    value={node.name}
                    onChange={e => updateNode(idx, 'name', e.target.value)}
                  />
                  <select
                    style={styles.select}
                    value={node.role || ''}
                    onChange={e => updateNode(idx, 'role', e.target.value)}
                  >
                    <option value="">-- Select Role --</option>
                    {roles.map(r => (
                      <option key={r.role_id || r.id} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                  <label style={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={node.is_start}
                      onChange={e => updateNode(idx, 'is_start', e.target.checked)}
                    />
                    Start
                  </label>
                  <label style={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={node.is_end}
                      onChange={e => updateNode(idx, 'is_end', e.target.checked)}
                    />
                    End
                  </label>
                  <button style={styles.removeBtn} onClick={() => removeNode(idx)}>×</button>
                </div>
                <small style={styles.nodeId}>ID: {node.id}</small>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Edges Section */}
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>🔗 Edges ({edges.length})</h2>
          <button style={styles.addBtn} onClick={addEdge} disabled={nodes.length < 2}>
            + Add Edge
          </button>
        </div>
        
        {edges.length === 0 ? (
          <p style={styles.emptyMsg}>No edges yet. Add nodes first, then connect them.</p>
        ) : (
          <div style={styles.itemList}>
            {edges.map((edge, idx) => (
              <div key={edge.id} style={styles.itemCard}>
                <div style={styles.itemRow}>
                  <span style={styles.itemIndex}>#{idx + 1}</span>
                  <input
                    style={styles.inputSmall}
                    placeholder="Transition Name"
                    value={edge.name || ''}
                    onChange={e => updateEdge(idx, 'name', e.target.value)}
                  />
                  <select
                    style={styles.select}
                    value={edge.from}
                    onChange={e => updateEdge(idx, 'from', e.target.value)}
                  >
                    <option value="">-- From --</option>
                    {nodes.map(n => (
                      <option key={n.id} value={n.id}>{n.name}</option>
                    ))}
                  </select>
                  <span style={styles.arrow}>→</span>
                  <select
                    style={styles.select}
                    value={edge.to}
                    onChange={e => updateEdge(idx, 'to', e.target.value)}
                  >
                    <option value="">-- To --</option>
                    {nodes.map(n => (
                      <option key={n.id} value={n.id}>{n.name}</option>
                    ))}
                  </select>
                  <button style={styles.removeBtn} onClick={() => removeEdge(idx)}>×</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Visual Preview */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>👁️ Visual Preview</h2>
        <div style={styles.preview}>
          {nodes.length === 0 ? (
            <p style={styles.emptyMsg}>No nodes to display</p>
          ) : (
            <div style={styles.flowPreview}>
              {nodes.map((node, idx) => {
                const outgoing = edges.filter(e => e.from === node.id);
                return (
                  <div key={node.id} style={styles.previewNodeWrapper}>
                    <div style={{
                      ...styles.previewNode,
                      ...(node.is_start ? styles.startNode : {}),
                      ...(node.is_end ? styles.endNode : {})
                    }}>
                      <strong>{node.name}</strong>
                      <small style={styles.previewRole}>{node.role || '(no role)'}</small>
                      {node.is_start && <span style={styles.badge}>START</span>}
                      {node.is_end && <span style={{...styles.badge, background: '#dc3545'}}>END</span>}
                    </div>
                    {outgoing.length > 0 && (
                      <div style={styles.previewEdges}>
                        {outgoing.map(e => {
                          const targetNode = nodes.find(n => n.id === e.to);
                          return (
                            <div key={e.id} style={styles.previewEdge}>
                              ↳ <em>{e.name || 'transition'}</em> → {targetNode?.name || '?'}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Actions */}
      <section style={styles.section}>
        <div style={styles.actionRow}>
          <button 
            style={{...styles.btn, ...styles.primaryBtn}} 
            onClick={submitWorkflow}
            disabled={isSubmitting}
          >
            {isSubmitting ? '⏳ Submitting...' : '🚀 Submit Workflow'}
          </button>
          <button style={{...styles.btn, ...styles.secondaryBtn}} onClick={resetForm}>
            🔄 Reset
          </button>
          <button 
            style={{...styles.btn, ...styles.warningBtn}} 
            onClick={cleanupAll}
            disabled={createdWorkflows.length === 0}
          >
            🧹 Cleanup ({createdWorkflows.length})
          </button>
          <button style={{...styles.btn, ...styles.dangerBtn}} onClick={clearLog}>
            🗑️ Clear Log
          </button>
        </div>
      </section>

      {/* Created Workflows */}
      {createdWorkflows.length > 0 && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>✅ Created Workflows</h2>
          <div style={styles.createdList}>
            {createdWorkflows.map(wf => (
              <div key={wf.id} style={styles.createdItem}>
                <span>#{wf.id} - {wf.name}</span>
                <button 
                  style={styles.deleteBtn}
                  onClick={() => deleteWorkflow(wf.id)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Output Log */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>📋 Output Log</h2>
        <div style={styles.logOutput}>
          {output.length === 0 ? (
            <span style={{ color: '#666' }}>Waiting for actions...</span>
          ) : (
            output.map((line, i) => (
              <div key={i} style={getLogStyle(line.type)}>
                <span style={styles.logTime}>[{line.time}]</span> {line.message}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

const getLogStyle = (type) => {
  const colors = {
    success: '#4ec9b0',
    error: '#f14c4c',
    warn: '#dcdcaa',
    info: '#569cd6'
  };
  return { color: colors[type] || colors.info, whiteSpace: 'pre-wrap' };
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  title: {
    color: 'var(--heading-color, #333)',
    borderBottom: '2px solid var(--primary-color, #007bff)',
    paddingBottom: '10px',
    marginBottom: '20px',
  },
  section: {
    marginBottom: '24px',
    padding: '16px',
    background: 'var(--bg1-color, #fff)',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  sectionTitle: {
    margin: '0 0 12px 0',
    fontSize: '16px',
    color: 'var(--heading-color, #333)',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  templateGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '10px',
  },
  templateBtn: {
    padding: '12px',
    border: '2px solid #ddd',
    borderRadius: '8px',
    background: 'var(--bg-content-color, #f8f9fa)',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  templateBtnActive: {
    borderColor: 'var(--primary-color, #007bff)',
    background: 'var(--primary-color-light, #e7f3ff)',
  },
  templateDesc: {
    color: 'var(--muted-text-color, #666)',
    fontSize: '12px',
  },
  templateMeta: {
    color: 'var(--muted-text-color, #999)',
    fontSize: '11px',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '10px',
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    background: 'var(--input-bg, #fff)',
    color: 'var(--text-color, #333)',
  },
  inputSmall: {
    padding: '6px 10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '13px',
    flex: 1,
    minWidth: '100px',
    background: 'var(--input-bg, #fff)',
    color: 'var(--text-color, #333)',
  },
  select: {
    padding: '6px 10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '13px',
    minWidth: '120px',
    background: 'var(--input-bg, #fff)',
    color: 'var(--text-color, #333)',
  },
  addBtn: {
    padding: '8px 16px',
    background: 'var(--primary-color, #007bff)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  itemList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  itemCard: {
    padding: '10px',
    background: 'var(--bg-content-color, #f8f9fa)',
    borderRadius: '6px',
    border: '1px solid #eee',
  },
  itemRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  },
  itemIndex: {
    fontWeight: 'bold',
    color: 'var(--muted-text-color, #666)',
    minWidth: '30px',
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '13px',
    color: 'var(--text-color, #333)',
  },
  removeBtn: {
    padding: '4px 10px',
    background: 'var(--error-color, #dc3545)',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    lineHeight: 1,
  },
  nodeId: {
    color: 'var(--muted-text-color, #999)',
    fontSize: '11px',
    marginTop: '4px',
    display: 'block',
  },
  arrow: {
    fontSize: '18px',
    color: 'var(--muted-text-color, #666)',
  },
  emptyMsg: {
    color: 'var(--muted-text-color, #999)',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: '20px',
  },
  preview: {
    background: 'var(--bg-content-color, #f0f4f8)',
    borderRadius: '8px',
    padding: '20px',
    minHeight: '150px',
  },
  flowPreview: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  previewNodeWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  previewNode: {
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: '12px 16px',
    background: 'white',
    border: '2px solid #ddd',
    borderRadius: '8px',
    maxWidth: 'fit-content',
    gap: '4px',
  },
  startNode: {
    borderColor: '#28a745',
    background: '#e8f5e9',
  },
  endNode: {
    borderColor: '#dc3545',
    background: '#ffebee',
  },
  previewRole: {
    color: 'var(--muted-text-color, #666)',
    fontSize: '12px',
  },
  badge: {
    fontSize: '10px',
    padding: '2px 6px',
    background: '#28a745',
    color: 'white',
    borderRadius: '10px',
    fontWeight: 'bold',
  },
  previewEdges: {
    marginLeft: '20px',
    fontSize: '13px',
    color: 'var(--muted-text-color, #666)',
  },
  previewEdge: {
    padding: '4px 0',
  },
  actionRow: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  btn: {
    padding: '12px 24px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  primaryBtn: {
    background: 'var(--primary-color, #007bff)',
    color: 'white',
  },
  secondaryBtn: {
    background: 'var(--muted-text-color, #6c757d)',
    color: 'white',
  },
  warningBtn: {
    background: 'var(--warning-color, #ffc107)',
    color: '#333',
  },
  dangerBtn: {
    background: 'var(--error-color, #dc3545)',
    color: 'white',
  },
  createdList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  createdItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px',
    background: 'var(--bg-content-color, #e8f5e9)',
    borderRadius: '6px',
  },
  deleteBtn: {
    padding: '6px 12px',
    background: 'var(--error-color, #dc3545)',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  logOutput: {
    background: '#1e1e1e',
    color: '#d4d4d4',
    padding: '16px',
    borderRadius: '8px',
    fontFamily: '"Consolas", "Monaco", monospace',
    fontSize: '12px',
    lineHeight: '1.5',
    minHeight: '200px',
    maxHeight: '400px',
    overflowY: 'auto',
  },
  logTime: {
    color: '#888',
    marginRight: '8px',
  },
};
