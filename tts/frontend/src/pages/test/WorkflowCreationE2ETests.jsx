import React, { useState, useCallback } from 'react';
import api from '../../api/axios';

const WORKFLOW_API_BASE = '/workflows';
const ROLES_API_BASE = '/roles';

// Test results state
const createTestResults = () => ({
  passed: 0,
  failed: 0,
  results: [],
  reset() {
    this.passed = 0;
    this.failed = 0;
    this.results = [];
  }
});

export default function WorkflowCreationE2ETests() {
  const [output, setOutput] = useState([]);
  const [testResults, setTestResults] = useState({ passed: 0, failed: 0, results: [] });
  const [isRunning, setIsRunning] = useState(false);
  const [createdWorkflows, setCreatedWorkflows] = useState([]); // Track created workflows for cleanup

  const log = useCallback((message, type = 'info') => {
    setOutput(prev => [...prev, { message, type, timestamp: new Date().toISOString() }]);
  }, []);

  const clearOutput = useCallback(() => {
    setOutput([]);
    setTestResults({ passed: 0, failed: 0, results: [] });
  }, []);

  const logTest = useCallback((name, passed, message = '') => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const type = passed ? 'pass' : 'fail';
    setOutput(prev => [...prev, 
      { message: `${status}: ${name}`, type, timestamp: new Date().toISOString() },
      ...(message ? [{ message: `   └─ ${message}`, type, timestamp: new Date().toISOString() }] : [])
    ]);
    setTestResults(prev => ({
      ...prev,
      passed: prev.passed + (passed ? 1 : 0),
      failed: prev.failed + (passed ? 0 : 1),
      results: [...prev.results, { name, passed, message }]
    }));
  }, []);

  // ============================================
  // TEST: API Configuration
  // ============================================
  const testApiConfig = useCallback(async () => {
    log('\n🔧 Testing API Configuration...', 'info');
    
    const baseUrl = api.defaults.baseURL;
    logTest('API Base URL configured', !!baseUrl, `URL: ${baseUrl}`);
    
    try {
      const response = await api.get('/');
      logTest('API is reachable', true, `Status: ${response.status}`);
    } catch (err) {
      const status = err.response?.status;
      // 401 means API is reachable but auth failed
      logTest('API is reachable', status === 401 || status === 200, 
        `Status: ${status || err.message}`);
    }
  }, [log, logTest]);

  // ============================================
  // TEST: Roles API
  // ============================================
  const testRolesApi = useCallback(async () => {
    log('\n👤 Testing Roles API...', 'info');
    
    try {
      const response = await api.get(`${ROLES_API_BASE}/`);
      const roles = response.data;
      
      logTest('Roles endpoint returns OK', true, `Status: ${response.status}`);
      logTest('Roles response is array', Array.isArray(roles), `Found ${roles?.length || 0} roles`);
      
      if (roles.length === 0) {
        logTest('Roles exist in system', false, 'No roles found - workflow creation will fail!');
        return [];
      }
      
      logTest('Roles exist in system', true);
      
      const sampleRole = roles[0];
      const hasId = 'role_id' in sampleRole || 'id' in sampleRole;
      const hasName = 'name' in sampleRole;
      
      logTest('Role has ID field', hasId);
      logTest('Role has name field', hasName, hasName ? `Sample: "${sampleRole.name}"` : '');
      
      return roles;
    } catch (err) {
      logTest('Roles endpoint returns OK', false, err.response?.data?.error || err.message);
      return [];
    }
  }, [log, logTest]);

  // ============================================
  // TEST: Validation - Required Fields
  // ============================================
  const testValidationRequiredFields = useCallback(async () => {
    log('\n⚠️ Testing Validation - Required Fields...', 'info');
    
    // Test missing name
    try {
      await api.post(`${WORKFLOW_API_BASE}/`, {
        description: 'Test',
        category: 'Test',
        sub_category: 'Test',
        department: 'Test'
      });
      logTest('Rejects missing name', false, 'Should have been rejected!');
    } catch {
      logTest('Rejects missing name', true, 'Correctly rejected');
    }
    
    // Test missing category
    try {
      await api.post(`${WORKFLOW_API_BASE}/`, {
        name: 'Test',
        description: 'Test',
        sub_category: 'Test',
        department: 'Test'
      });
      logTest('Rejects missing category', false, 'Should have been rejected!');
    } catch {
      logTest('Rejects missing category', true, 'Correctly rejected');
    }
    
    // Test missing sub_category
    try {
      await api.post(`${WORKFLOW_API_BASE}/`, {
        name: 'Test',
        description: 'Test',
        category: 'Test',
        department: 'Test'
      });
      logTest('Rejects missing sub_category', false, 'Should have been rejected!');
    } catch {
      logTest('Rejects missing sub_category', true, 'Correctly rejected');
    }
    
    // Test missing department
    try {
      await api.post(`${WORKFLOW_API_BASE}/`, {
        name: 'Test',
        description: 'Test',
        category: 'Test',
        sub_category: 'Test'
      });
      logTest('Rejects missing department', false, 'Should have been rejected!');
    } catch {
      logTest('Rejects missing department', true, 'Correctly rejected');
    }
  }, [log, logTest]);

  // ============================================
  // TEST: Validation - Start Node Rules
  // ============================================
  const testValidationStartNode = useCallback(async () => {
    log('\n🚀 Testing Validation - Start Node Rules...', 'info');
    
    let roles = [];
    try {
      const response = await api.get(`${ROLES_API_BASE}/`);
      roles = response.data;
    } catch {
      logTest('Start node validation', false, 'Cannot fetch roles');
      return;
    }
    
    if (!roles.length) {
      logTest('Start node validation', false, 'No roles available');
      return;
    }
    
    const roleName = roles[0].name;
    const timestamp = Date.now();
    
    // Test: No start node (should fail when nodes exist)
    try {
      await api.post(`${WORKFLOW_API_BASE}/`, {
        workflow: {
          name: `NoStart ${timestamp}`,
          category: 'Test',
          sub_category: 'Test',
          department: 'Test'
        },
        graph: {
          nodes: [
            { id: 'temp-1', name: 'Step 1', role: roleName, is_start: false, is_end: false },
            { id: 'temp-2', name: 'Step 2', role: roleName, is_start: false, is_end: true }
          ],
          edges: []
        }
      });
      logTest('Rejects graph with no start node', false, 'Should have been rejected!');
    } catch {
      logTest('Rejects graph with no start node', true, 'Correctly rejected');
    }
    
    // Test: Multiple start nodes (should fail)
    try {
      await api.post(`${WORKFLOW_API_BASE}/`, {
        workflow: {
          name: `MultiStart ${timestamp}`,
          category: 'Test',
          sub_category: 'Test',
          department: 'Test'
        },
        graph: {
          nodes: [
            { id: 'temp-1', name: 'Start 1', role: roleName, is_start: true, is_end: false },
            { id: 'temp-2', name: 'Start 2', role: roleName, is_start: true, is_end: true }
          ],
          edges: []
        }
      });
      logTest('Rejects graph with multiple start nodes', false, 'Should have been rejected!');
    } catch {
      logTest('Rejects graph with multiple start nodes', true, 'Correctly rejected');
    }
  }, [log, logTest]);

  // ============================================
  // TEST: Validation - Invalid Role
  // ============================================
  const testValidationInvalidRole = useCallback(async () => {
    log('\n👥 Testing Validation - Invalid Role...', 'info');
    
    const timestamp = Date.now();
    
    try {
      await api.post(`${WORKFLOW_API_BASE}/`, {
        workflow: {
          name: `InvalidRole ${timestamp}`,
          category: 'Test',
          sub_category: 'Test',
          department: 'Test'
        },
        graph: {
          nodes: [
            { id: 'temp-1', name: 'Start', role: `NonExistentRole_${timestamp}`, is_start: true, is_end: true }
          ],
          edges: []
        }
      });
      logTest('Rejects invalid role name', false, 'Should have been rejected!');
    } catch (err) {
      logTest('Rejects invalid role name', true, 
        `Correctly rejected: ${err.response?.data?.error || 'validation error'}`);
    }
  }, [log, logTest]);

  // ============================================
  // TEST: Create Workflow - Basic
  // ============================================
  const testCreateWorkflowBasic = useCallback(async () => {
    log('\n📝 Testing Basic Workflow Creation (No Graph)...', 'info');
    
    const timestamp = Date.now();
    
    try {
      const response = await api.post(`${WORKFLOW_API_BASE}/`, {
        name: `E2E Test ${timestamp}`,
        description: 'E2E test workflow - basic creation',
        category: `E2E-Basic-${timestamp}`,
        sub_category: `Automated-${timestamp}`,
        department: 'Testing'
      });
      
      logTest('Basic workflow creation succeeds', true, `ID: ${response.data?.workflow_id}`);
      
      const data = response.data;
      logTest('Response has workflow_id', 'workflow_id' in data);
      logTest('Response has correct name', data.name === `E2E Test ${timestamp}`);
      
      return response.data;
    } catch (err) {
      logTest('Basic workflow creation succeeds', false, 
        err.response?.data?.error || err.message);
      return null;
    }
  }, [log, logTest]);

  // ============================================
  // TEST: Create Workflow - With Graph
  // ============================================
  const testCreateWorkflowWithGraph = useCallback(async () => {
    log('\n📊 Testing Workflow Creation With Graph...', 'info');
    
    let roles = [];
    try {
      const response = await api.get(`${ROLES_API_BASE}/`);
      roles = response.data;
    } catch {
      logTest('Graph creation', false, 'Cannot fetch roles');
      return null;
    }
    
    if (!roles.length) {
      logTest('Graph creation', false, 'No roles available');
      return null;
    }
    
    const roleName = roles[0].name;
    const timestamp = Date.now();
    
    try {
      const response = await api.post(`${WORKFLOW_API_BASE}/`, {
        workflow: {
          name: `Graph Workflow ${timestamp}`,
          description: 'E2E test workflow with graph structure',
          category: `E2E-Graph-${timestamp}`,
          sub_category: `WithNodes-${timestamp}`,
          department: 'Testing'
        },
        graph: {
          nodes: [
            {
              id: 'temp-node-1',
              name: 'Start Step',
              role: roleName,
              description: 'Initial step',
              instruction: '',
              design: { x: 100, y: 100 },
              is_start: true,
              is_end: false
            },
            {
              id: 'temp-node-2',
              name: 'End Step',
              role: roleName,
              description: 'Final step',
              instruction: '',
              design: { x: 300, y: 100 },
              is_start: false,
              is_end: true
            }
          ],
          edges: [
            {
              id: 'temp-edge-1',
              from: 'temp-node-1',
              to: 'temp-node-2',
              name: 'Proceed'
            }
          ]
        }
      });
      
      logTest('Workflow with graph creation succeeds', true);
      
      const data = response.data;
      logTest('Response has workflow object', 'workflow' in data);
      logTest('Response has graph object', 'graph' in data);
      
      if (data.graph) {
        logTest('Graph has nodes', Array.isArray(data.graph.nodes), 
          `${data.graph.nodes?.length || 0} nodes`);
        logTest('Graph has edges', Array.isArray(data.graph.edges), 
          `${data.graph.edges?.length || 0} edges`);
      }
      
      if (data.temp_id_mapping) {
        logTest('Temp ID mapping returned', true, 
          `Mapped: ${Object.keys(data.temp_id_mapping).join(', ')}`);
      }
      
      return response.data;
    } catch (err) {
      logTest('Workflow with graph creation succeeds', false, 
        err.response?.data?.error || JSON.stringify(err.response?.data) || err.message);
      return null;
    }
  }, [log, logTest]);

  // ============================================
  // TEST: SLA Duration Format
  // ============================================
  const testSlaDurationFormat = useCallback(async () => {
    log('\n⏱️ Testing SLA Duration Format...', 'info');
    
    const timestamp = Date.now();
    
    // Valid ISO 8601 duration format
    try {
      const response = await api.post(`${WORKFLOW_API_BASE}/`, {
        name: `SLATest ${timestamp}`,
        description: 'Test SLA duration format',
        category: `SLA-Hours-${timestamp}`,
        sub_category: `Duration-${timestamp}`,
        department: 'Test',
        low_sla: 'PT24H',
        medium_sla: 'PT12H',
        high_sla: 'PT4H',
        urgent_sla: 'PT1H'
      });
      logTest('Accepts valid ISO 8601 SLA duration', true);
    } catch (err) {
      logTest('Accepts valid ISO 8601 SLA duration', false, 
        err.response?.data?.error || JSON.stringify(err.response?.data));
    }
    
    // Test P format (days)
    try {
      const response = await api.post(`${WORKFLOW_API_BASE}/`, {
        name: `SLADays ${timestamp}`,
        description: 'Test P7D duration format',
        category: `SLA-Days-${timestamp}`,
        sub_category: `Duration-${timestamp}`,
        department: 'Test',
        low_sla: 'P7D'
      });
      logTest('Accepts P7D duration format', true);
    } catch (err) {
      logTest('Accepts P7D duration format', false, 
        err.response?.data?.error || JSON.stringify(err.response?.data));
    }
  }, [log, logTest]);

  // ============================================
  // TEST: Frontend Validation Logic
  // ============================================
  const testFrontendValidation = useCallback(() => {
    log('\n✓ Testing Frontend Validation Logic...', 'info');
    
    const validateMeta = (meta) => {
      const errors = [];
      if (!meta.name?.trim()) errors.push('name');
      if (!meta.category?.trim()) errors.push('category');
      if (!meta.sub_category?.trim()) errors.push('sub_category');
      if (!meta.department?.trim()) errors.push('department');
      return errors;
    };
    
    logTest('Validates empty metadata', validateMeta({}).length === 4);
    logTest('Validates partial metadata', validateMeta({ name: 'Test' }).length === 3);
    logTest('Accepts valid metadata', validateMeta({
      name: 'Test', category: 'Test', sub_category: 'Test', department: 'Test'
    }).length === 0);
    
    // Node validation
    const validateNodes = (nodes) => {
      if (nodes.length === 0) return true;
      return nodes.filter(n => n.is_start).length === 1;
    };
    
    logTest('Empty nodes passes validation', validateNodes([]));
    logTest('One start node valid', validateNodes([{ is_start: true }, { is_start: false }]));
    logTest('No start node invalid', !validateNodes([{ is_start: false }, { is_start: false }]));
    logTest('Multiple start invalid', !validateNodes([{ is_start: true }, { is_start: true }]));
  }, [log, logTest]);

  // ============================================
  // TEST: Temp ID Mapping
  // ============================================
  const testTempIdMapping = useCallback(async () => {
    log('\n🔄 Testing Temp ID to Real ID Mapping...', 'info');
    
    let roles = [];
    try {
      const response = await api.get(`${ROLES_API_BASE}/`);
      roles = response.data;
    } catch {
      logTest('Temp ID mapping', false, 'Cannot fetch roles');
      return;
    }
    
    if (!roles.length) {
      logTest('Temp ID mapping', false, 'No roles available');
      return;
    }
    
    const roleName = roles[0].name;
    const timestamp = Date.now();
    
    try {
      const response = await api.post(`${WORKFLOW_API_BASE}/`, {
        workflow: {
          name: `TempID Test ${timestamp}`,
          description: 'Testing temp ID to real ID mapping',
          category: `E2E-TempID-${timestamp}`,
          sub_category: `Mapping-${timestamp}`,
          department: 'Test'
        },
        graph: {
          nodes: [
            { id: `temp-mapping-${timestamp}-1`, name: 'Node A', role: roleName, is_start: true, is_end: false },
            { id: `temp-mapping-${timestamp}-2`, name: 'Node B', role: roleName, is_start: false, is_end: true }
          ],
          edges: [
            { id: `temp-edge-${timestamp}`, from: `temp-mapping-${timestamp}-1`, to: `temp-mapping-${timestamp}-2` }
          ]
        }
      });
      
      const mapping = response.data.temp_id_mapping;
      
      logTest('Response includes temp_id_mapping', !!mapping, 
        mapping ? `Keys: ${Object.keys(mapping).length}` : '');
      
      if (mapping) {
        const tempIds = Object.keys(mapping);
        const allMapped = tempIds.every(tid => typeof mapping[tid] === 'number');
        logTest('All temp IDs mapped to real IDs', allMapped);
        
        const graphNodes = response.data.graph?.nodes || [];
        const allRealIds = graphNodes.every(n => typeof n.id === 'number');
        logTest('Graph nodes have real IDs', allRealIds, 
          `IDs: ${graphNodes.map(n => n.id).join(', ')}`);
      }
    } catch (err) {
      logTest('Temp ID mapping', false, err.response?.data?.error || err.message);
    }
  }, [log, logTest]);

  // ============================================
  // Delete Workflow (Cleanup)
  // ============================================
  const testDeleteWorkflow = useCallback(async (workflowId) => {
    if (!workflowId) {
      logTest('Delete workflow', false, 'No workflow ID provided');
      return;
    }
    
    try {
      await api.delete(`${WORKFLOW_API_BASE}/${workflowId}/`);
      logTest(`Delete workflow #${workflowId}`, true);
      return true;
    } catch (err) {
      logTest(`Delete workflow #${workflowId}`, false, 
        err.response?.data?.error || err.message);
      return false;
    }
  }, [logTest]);

  // ============================================
  // Delete All Created Workflows (Cleanup)
  // ============================================
  const cleanupCreatedWorkflows = useCallback(async () => {
    if (createdWorkflows.length === 0) {
      log('No workflows to cleanup', 'info');
      return;
    }
    
    log('\n🧹 Cleaning up created test workflows...', 'info');
    
    for (const workflow of createdWorkflows) {
      await testDeleteWorkflow(workflow.id);
    }
    
    setCreatedWorkflows([]);
    log(`✅ Cleanup complete - Deleted ${createdWorkflows.length} workflows`, 'info');
  }, [createdWorkflows, log, testDeleteWorkflow]);

  // ============================================
  // Run All Tests
  // ============================================
  const runAllTests = useCallback(async () => {
    setIsRunning(true);
    clearOutput();
    const createdIds = [];
    
    log('═══════════════════════════════════════════════', 'info');
    log('🔬 WORKFLOW CREATION E2E TEST SUITE', 'info');
    log('═══════════════════════════════════════════════', 'info');
    log(`Time: ${new Date().toISOString()}`, 'info');
    log(`API Base: ${api.defaults.baseURL}`, 'info');
    log('═══════════════════════════════════════════════', 'info');
    
    await testApiConfig();
    await testRolesApi();
    testFrontendValidation();
    await testValidationRequiredFields();
    await testValidationStartNode();
    await testValidationInvalidRole();
    await testSlaDurationFormat();
    
    // Create workflows and track IDs for cleanup
    const basicWf = await testCreateWorkflowBasic();
    if (basicWf?.workflow_id) createdIds.push({ id: basicWf.workflow_id, name: basicWf.name });
    
    const graphWf = await testCreateWorkflowWithGraph();
    if (graphWf?.workflow_id) createdIds.push({ id: graphWf.workflow_id, name: graphWf.name });
    
    await testTempIdMapping();
    
    // Store created workflows for cleanup
    setCreatedWorkflows(createdIds);
    
    log('\n═══════════════════════════════════════════════', 'info');
    log('📊 TESTS COMPLETE', 'info');
    if (createdIds.length > 0) {
      log(`⚠️ Created ${createdIds.length} test workflows - use "Cleanup" button to delete`, 'warn');
    }
    log('═══════════════════════════════════════════════', 'info');
    
    setIsRunning(false);
  }, [
    clearOutput, log, testApiConfig, testRolesApi, testFrontendValidation,
    testValidationRequiredFields, testValidationStartNode, testValidationInvalidRole,
    testSlaDurationFormat, testCreateWorkflowBasic, testCreateWorkflowWithGraph,
    testTempIdMapping
  ]);

  // ============================================
  // Run Quick Tests (No API mutations)
  // ============================================
  const runQuickTests = useCallback(async () => {
    setIsRunning(true);
    clearOutput();
    
    log('⚡ Running Quick Tests (Read-Only)...\n', 'info');
    
    await testApiConfig();
    await testRolesApi();
    testFrontendValidation();
    
    log('\n✅ Quick tests complete', 'info');
    
    setIsRunning(false);
  }, [clearOutput, log, testApiConfig, testRolesApi, testFrontendValidation]);

  const getLineClass = (type) => {
    switch (type) {
      case 'pass': return { color: '#4ec9b0' };
      case 'fail': return { color: '#f14c4c' };
      case 'warn': return { color: '#dcdcaa' };
      default: return { color: '#569cd6' };
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🔬 Workflow Creation E2E Tests</h1>
      
      <div style={styles.infoBox}>
        <h4 style={styles.infoTitle}>ℹ️ About This Test Suite</h4>
        <p>Tests the workflow creation flow including:</p>
        <ul>
          <li>API endpoint configuration and connectivity</li>
          <li>Roles API availability for step assignment</li>
          <li>Workflow creation validation (required fields, start nodes)</li>
          <li>Graph creation with nodes and edges</li>
          <li>Temp ID to real ID mapping</li>
        </ul>
      </div>
      
      <div style={styles.buttonGroup}>
        <button 
          style={{ ...styles.button, ...styles.primaryButton }}
          onClick={runAllTests}
          disabled={isRunning}
        >
          {isRunning ? '⏳ Running...' : '▶️ Run All Tests'}
        </button>
        <button 
          style={{ ...styles.button, ...styles.secondaryButton }}
          onClick={runQuickTests}
          disabled={isRunning}
        >
          ⚡ Quick Tests
        </button>
        <button 
          style={{ ...styles.button, ...styles.warningButton }}
          onClick={cleanupCreatedWorkflows}
          disabled={isRunning || createdWorkflows.length === 0}
        >
          🧹 Cleanup ({createdWorkflows.length})
        </button>
        <button 
          style={{ ...styles.button, ...styles.dangerButton }}
          onClick={clearOutput}
          disabled={isRunning}
        >
          🗑️ Clear
        </button>
      </div>
      
      {(testResults.passed > 0 || testResults.failed > 0) && (
        <div style={styles.summary}>
          <h3 style={styles.summaryTitle}>📊 Test Results</h3>
          <div style={styles.statsRow}>
            <div style={styles.stat}>
              <div style={{ ...styles.statValue, color: '#28a745' }}>{testResults.passed}</div>
              <div style={styles.statLabel}>Passed</div>
            </div>
            <div style={styles.stat}>
              <div style={{ ...styles.statValue, color: '#dc3545' }}>{testResults.failed}</div>
              <div style={styles.statLabel}>Failed</div>
            </div>
            <div style={styles.stat}>
              <div style={{ ...styles.statValue, color: '#007bff' }}>
                {testResults.passed + testResults.failed}
              </div>
              <div style={styles.statLabel}>Total</div>
            </div>
            <div style={styles.stat}>
              <div style={{ ...styles.statValue, color: '#6c757d' }}>
                {((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(0)}%
              </div>
              <div style={styles.statLabel}>Pass Rate</div>
            </div>
          </div>
        </div>
      )}
      
      <h3 style={styles.outputTitle}>📋 Test Output</h3>
      <div style={styles.output}>
        {output.length === 0 ? (
          <span style={{ color: '#666' }}>Click "Run All Tests" to start...</span>
        ) : (
          output.map((line, i) => (
            <div key={i} style={getLineClass(line.type)}>
              {line.message}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1000px',
    margin: '0 auto',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  title: {
    color: 'var(--heading-color, #333)',
    borderBottom: '2px solid var(--primary-color, #007bff)',
    paddingBottom: '10px',
  },
  infoBox: {
    background: 'var(--bg-content-color, #e7f3ff)',
    borderLeft: '4px solid var(--primary-color, #007bff)',
    padding: '15px',
    marginBottom: '20px',
    borderRadius: '0 8px 8px 0',
  },
  infoTitle: {
    margin: '0 0 10px 0',
    color: 'var(--primary-color, #007bff)',
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
  },
  button: {
    padding: '12px 24px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
  },
  primaryButton: {
    background: 'var(--primary-color, #007bff)',
    color: 'white',
  },
  secondaryButton: {
    background: 'var(--muted-text-color, #6c757d)',
    color: 'white',
  },
  warningButton: {
    background: 'var(--warning-color, #ffc107)',
    color: '#333',
  },
  dangerButton: {
    background: 'var(--error-color, #dc3545)',
    color: 'white',
  },
  summary: {
    background: 'var(--bg1-color, white)',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  summaryTitle: {
    margin: '0 0 15px 0',
    color: 'var(--heading-color, #333)',
  },
  statsRow: {
    display: 'flex',
    gap: '30px',
  },
  stat: {
    textAlign: 'center',
  },
  statValue: {
    fontSize: '36px',
    fontWeight: 'bold',
  },
  statLabel: {
    color: 'var(--muted-text-color, #666)',
    fontSize: '14px',
  },
  outputTitle: {
    color: 'var(--heading-color, #333)',
    marginBottom: '10px',
  },
  output: {
    background: '#1e1e1e',
    color: '#d4d4d4',
    padding: '20px',
    borderRadius: '8px',
    fontFamily: '"Consolas", "Monaco", monospace',
    fontSize: '13px',
    lineHeight: '1.6',
    minHeight: '400px',
    maxHeight: '600px',
    overflowY: 'auto',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
};
