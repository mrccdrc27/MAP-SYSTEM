import React, { useState, useCallback, useEffect } from 'react';
import { useWorkflowRoles } from '../../api/useWorkflowRoles';
import { useWorkflowAPI } from '../../api/useWorkflowAPI';
import api from '../../api/axios';
import { hasAccessToken, getAccessToken } from '../../api/TokenUtils';
import {
  validateStepName,
  validateStepRole,
  validateStepDescription,
  validateWorkflowGraph,
  validateStartNodes,
  validateNodeId,
  VALIDATION_RULES,
} from '../../utils/workflowValidation';

const styles = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  card: {
    background: 'white',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  title: {
    color: '#1f2937',
    marginBottom: '20px',
  },
  button: {
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    marginRight: '8px',
  },
  buttonSecondary: {
    background: '#6b7280',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    marginRight: '8px',
  },
  buttonDanger: {
    background: '#ef4444',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    marginRight: '8px',
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    marginBottom: '8px',
  },
  label: {
    display: 'block',
    marginBottom: '4px',
    fontWeight: '500',
    color: '#374151',
  },
  pass: {
    padding: '8px 12px',
    margin: '4px 0',
    borderRadius: '4px',
    fontSize: '14px',
    background: '#d1fae5',
    color: '#065f46',
  },
  fail: {
    padding: '8px 12px',
    margin: '4px 0',
    borderRadius: '4px',
    fontSize: '14px',
    background: '#fee2e2',
    color: '#991b1b',
  },
  info: {
    padding: '8px 12px',
    margin: '4px 0',
    borderRadius: '4px',
    fontSize: '14px',
    background: '#dbeafe',
    color: '#1e40af',
  },
  summary: {
    background: '#1f2937',
    color: 'white',
    padding: '16px',
    borderRadius: '8px',
    marginTop: '20px',
  },
  pre: {
    background: '#f3f4f6',
    padding: '12px',
    borderRadius: '6px',
    overflow: 'auto',
    fontSize: '13px',
    maxHeight: '300px',
  },
};

export default function WorkflowEditorTests() {
  const [workflowId, setWorkflowId] = useState(1);
  const [testResults, setTestResults] = useState([]);
  const [summary, setSummary] = useState(null);
  const [apiResponse, setApiResponse] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication status
  useEffect(() => {
    const checkAuth = () => {
      const hasToken = hasAccessToken();
      const token = getAccessToken();
      setIsAuthenticated(hasToken && !!token);
    };
    checkAuth();
    // Re-check periodically in case user logs in
    const interval = setInterval(checkAuth, 2000);
    return () => clearInterval(interval);
  }, []);

  const { roles, loading: rolesLoading, error: rolesError } = useWorkflowRoles();
  const { getWorkflowDetail } = useWorkflowAPI();

  const clearResults = () => {
    setTestResults([]);
    setSummary(null);
    setApiResponse(null);
  };

  const addResult = useCallback((name, passed, message = '') => {
    setTestResults(prev => [...prev, { name, passed, message }]);
  }, []);

  const addInfo = useCallback((message) => {
    setTestResults(prev => [...prev, { name: message, passed: null, isInfo: true }]);
  }, []);

  // ============================================
  // TEST: Roles API
  // ============================================
  const testRolesApi = useCallback(async () => {
    addInfo('📋 Testing Roles API...');

    try {
      const response = await api.get('/roles/');
      setApiResponse(response.data);

      addResult('Roles API accessible', true);
      addResult('Response is array', Array.isArray(response.data), `Found ${response.data.length} roles`);

      if (response.data.length > 0) {
        const role = response.data[0];
        addResult('Role has role_id or id', 'role_id' in role || 'id' in role);
        addResult('Role has name', 'name' in role, `Sample: "${role.name}"`);
        addResult('Role has system', 'system' in role, `Value: "${role.system}"`);
      } else {
        addResult('Roles exist in system', false, 'No roles configured - step creation will fail!');
      }

      return response.data;
    } catch (error) {
      addResult('Roles API', false, error.response?.data?.error || error.message);
      return null;
    }
  }, [addResult, addInfo]);

  // ============================================
  // TEST: Workflow Detail API
  // ============================================
  const testWorkflowApi = useCallback(async () => {
    addInfo(`📋 Testing Workflow Detail API (ID: ${workflowId})...`);

    try {
      const data = await getWorkflowDetail(workflowId);
      setApiResponse(data);

      addResult('Workflow detail API accessible', true);
      addResult('Response has workflow object', 'workflow' in data);
      addResult('Response has graph object', 'graph' in data);

      if (data.graph) {
        const { nodes, edges } = data.graph;
        addResult('Graph has nodes', 'nodes' in data.graph, `${nodes?.length || 0} nodes`);
        addResult('Graph has edges', 'edges' in data.graph, `${edges?.length || 0} edges`);

        if (nodes?.length > 0) {
          const node = nodes[0];
          addResult('Node has id', 'id' in node);
          addResult('Node has name', 'name' in node, `"${node.name}"`);
          addResult('Node has role', 'role' in node, `"${node.role}"`);
          addResult('Node has is_start', 'is_start' in node);
          addResult('Node has is_end', 'is_end' in node);
          addResult('Node has design', 'design' in node);

          // Check start node count
          const startNodes = nodes.filter(n => n.is_start);
          addResult('Exactly one start node', startNodes.length === 1,
            `Found ${startNodes.length} start node(s)`);
        }
      }

      return data;
    } catch (error) {
      addResult('Workflow API', false, error.response?.data?.error || error.message);
      return null;
    }
  }, [workflowId, getWorkflowDetail, addResult, addInfo]);

  // ============================================
  // TEST: Role Validation (Backend)
  // ============================================
  const testRoleValidation = useCallback(async () => {
    addInfo(`📋 Testing Role Validation on Step Creation...`);

    try {
      const detail = await getWorkflowDetail(workflowId);
      const currentNodes = detail.graph?.nodes || [];
      const currentEdges = detail.graph?.edges || [];

      // Test: Create node with invalid role
      const invalidNode = {
        id: 'temp-test-' + Date.now(),
        name: 'Test Invalid Role Step',
        role: 'NonExistentRole_' + Date.now(),
        description: '',
        instruction: '',
        design: { x: 100, y: 100 },
        is_start: false,
        is_end: false,
      };

      const allNodes = [...currentNodes.map(n => ({
        id: n.id,
        name: n.name,
        role: n.role,
        description: n.description,
        instruction: n.instruction,
        design: n.design,
        is_start: n.is_start,
        is_end: n.is_end,
      })), invalidNode];

      try {
        await api.put(`/workflows/${workflowId}/update-graph/`, {
          nodes: allNodes,
          edges: currentEdges.map(e => ({
            id: e.id,
            from: e.from,
            to: e.to,
            name: e.name,
          })),
        });
        addResult('Backend rejects invalid role', false, 'Backend accepted invalid role!');
      } catch (error) {
        const errorMsg = error.response?.data?.error || '';
        addResult('Backend rejects invalid role', 
          error.response?.status === 400 || errorMsg.toLowerCase().includes('role'),
          `Rejected with: ${errorMsg || 'validation error'}`
        );
      }
    } catch (error) {
      addResult('Role validation test', false, error.message);
    }
  }, [workflowId, getWorkflowDetail, addResult, addInfo]);

  // ============================================
  // TEST: Start Node Validation (Backend)
  // ============================================
  const testStartNodeValidation = useCallback(async () => {
    addInfo(`📋 Testing Start Node Validation (Backend Rule)...`);

    try {
      const detail = await getWorkflowDetail(workflowId);
      const nodes = detail.graph?.nodes || [];

      if (nodes.length === 0) {
        addResult('Start node validation', false, 'No nodes to test with');
        return;
      }

      // Test: Remove all start nodes (should fail)
      const noStartNodes = nodes.map(n => ({
        id: n.id,
        name: n.name,
        role: n.role,
        is_start: false,
        is_end: n.is_end,
      }));

      try {
        await api.put(`/workflows/${workflowId}/update-graph/`, {
          nodes: noStartNodes,
          edges: [],
        });
        addResult('Backend rejects graph with no start nodes', false, 'Backend accepted invalid graph!');
      } catch (error) {
        addResult('Backend rejects graph with no start nodes', true, 'Correctly rejected');
      }

    } catch (error) {
      addResult('Start node validation test', false, error.message);
    }
  }, [workflowId, getWorkflowDetail, addResult, addInfo]);

  // ============================================
  // TEST: Frontend Validation Functions
  // ============================================
  const testFrontendValidation = useCallback(() => {
    addInfo('📋 Testing Frontend Validation Functions...');

    // Step Name Validation
    addResult('Empty name invalid', !validateStepName('').isValid);
    addResult('Whitespace name invalid', !validateStepName('   ').isValid);
    addResult('Valid name accepted', validateStepName('Review Step').isValid);
    addResult('Max length name (64)', validateStepName('A'.repeat(64)).isValid);
    addResult('Over max length rejected', !validateStepName('A'.repeat(65)).isValid);

    // Role Validation
    const mockRoles = [{ name: 'Admin' }, { name: 'Agent' }];
    addResult('Empty role invalid', !validateStepRole('', mockRoles).isValid);
    addResult('Unassigned role invalid', !validateStepRole('Unassigned', mockRoles).isValid);
    addResult('Valid role accepted', validateStepRole('Admin', mockRoles).isValid);
    addResult('Invalid role rejected', !validateStepRole('FakeRole', mockRoles).isValid);

    // Description Validation
    addResult('Empty description valid (optional)', validateStepDescription('').isValid);
    addResult('Max description (256)', validateStepDescription('A'.repeat(256)).isValid);
    addResult('Over max description rejected', !validateStepDescription('A'.repeat(257)).isValid);

    // Node ID Format
    addResult('Integer ID valid', validateNodeId('123').isValid);
    addResult('Temp ID valid', validateNodeId('temp-n123').isValid);
    addResult('Invalid ID rejected', !validateNodeId('abc').isValid);

    // Start Node Rule
    const noStartNodes = [{ id: 1, is_start: false }, { id: 2, is_start: false }];
    const oneStartNode = [{ id: 1, is_start: true }, { id: 2, is_start: false }];
    const multiStartNodes = [{ id: 1, is_start: true }, { id: 2, is_start: true }];

    addResult('No start nodes = invalid', !validateStartNodes(noStartNodes).isValid);
    addResult('One start node = valid', validateStartNodes(oneStartNode).isValid);
    addResult('Multiple start nodes = invalid', !validateStartNodes(multiStartNodes).isValid);
  }, [addResult, addInfo]);

  // ============================================
  // TEST: Full Graph Validation
  // ============================================
  const testGraphValidation = useCallback(async () => {
    addInfo('📋 Testing Full Graph Validation...');

    try {
      const detail = await getWorkflowDetail(workflowId);
      const nodes = detail.graph?.nodes || [];
      const edges = detail.graph?.edges || [];

      // Convert to ReactFlow format for validation
      const rfNodes = nodes.map(n => ({
        id: String(n.id),
        data: {
          label: n.name,
          role: n.role,
          is_start: n.is_start,
          is_end: n.is_end,
        },
      }));

      const rfEdges = edges.map(e => ({
        id: String(e.id),
        source: e.from, // Keep null as null (START edge)
        target: e.to,   // Keep null as null (END edge)
      }));

      const validation = validateWorkflowGraph(rfNodes, rfEdges, roles);
      
      addResult('Current workflow graph valid', validation.isValid,
        validation.isValid ? 'All checks passed' : validation.errors.join(', ')
      );

      if (validation.warnings?.length > 0) {
        validation.warnings.forEach(w => addInfo(`⚠️ Warning: ${w}`));
      }
    } catch (error) {
      addResult('Graph validation', false, error.message);
    }
  }, [workflowId, roles, getWorkflowDetail, addResult, addInfo]);

  // ============================================
  // Run All Tests
  // ============================================
  const runAllTests = useCallback(async () => {
    setIsRunning(true);
    clearResults();

    addInfo('═══════════════════════════════════════════════');
    addInfo('🔬 WORKFLOW EDITOR E2E VERIFICATION TESTS');
    addInfo('═══════════════════════════════════════════════');
    addInfo(`Workflow ID: ${workflowId}`);
    addInfo(`Roles loaded: ${roles.length} (loading: ${rolesLoading}, error: ${rolesError || 'none'})`);

    await testRolesApi();
    await testWorkflowApi();
    testFrontendValidation();
    await testGraphValidation();

    // Calculate summary
    const passed = testResults.filter(r => r.passed === true).length;
    const failed = testResults.filter(r => r.passed === false).length;
    setSummary({ passed, failed, total: passed + failed });

    setIsRunning(false);
  }, [workflowId, roles, rolesLoading, rolesError, testRolesApi, testWorkflowApi, testFrontendValidation, testGraphValidation, addInfo, testResults]);

  // Run mutation tests (these modify data - be careful!)
  const runMutationTests = useCallback(async () => {
    if (!window.confirm('⚠️ Mutation tests will attempt to modify workflow data. Continue?')) {
      return;
    }

    setIsRunning(true);
    addInfo('═══════════════════════════════════════════════');
    addInfo('🔬 RUNNING MUTATION TESTS (Backend Validation)');
    addInfo('═══════════════════════════════════════════════');

    await testRoleValidation();
    await testStartNodeValidation();

    setIsRunning(false);
  }, [testRoleValidation, testStartNodeValidation, addInfo]);

  // Calculate summary after results change
  React.useEffect(() => {
    if (testResults.length > 0 && !isRunning) {
      const passed = testResults.filter(r => r.passed === true).length;
      const failed = testResults.filter(r => r.passed === false).length;
      setSummary({ passed, failed, total: passed + failed });
    }
  }, [testResults, isRunning]);

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🔬 Workflow Editor E2E Tests</h1>

      {/* Auth Warning Banner */}
      {!isAuthenticated && (
        <div style={{
          background: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '20px',
        }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#92400e' }}>⚠️ Not Authenticated</h4>
          <p style={{ margin: 0, color: '#92400e', fontSize: '14px' }}>
            You are not logged in. API tests will fail with <strong>401 Unauthorized</strong>.
          </p>
          <p style={{ margin: '8px 0 0 0', color: '#92400e', fontSize: '14px' }}>
            👉 <a href="/login" style={{ color: '#1d4ed8' }}>Login first</a>, then come back to this page.
          </p>
        </div>
      )}

      <div style={styles.card}>
        <h3>Configuration</h3>
        <div>
          <label style={styles.label}>Workflow ID to Test</label>
          <input
            type="number"
            value={workflowId}
            onChange={(e) => setWorkflowId(parseInt(e.target.value) || 1)}
            style={styles.input}
            min="1"
          />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '13px', color: isAuthenticated ? '#059669' : '#ef4444' }}>
            {isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'} - Using JWT from localStorage
          </p>
          <p style={{ fontSize: '13px', color: '#6b7280' }}>
            📊 Roles from hook: {rolesLoading ? 'Loading...' : `${roles.length} roles loaded`}
            {rolesError && <span style={{ color: '#ef4444' }}> (Error: {rolesError})</span>}
          </p>
        </div>
        <button style={styles.button} onClick={runAllTests} disabled={isRunning}>
          {isRunning ? '⏳ Running...' : '▶️ Run All Tests'}
        </button>
        <button style={styles.buttonDanger} onClick={runMutationTests} disabled={isRunning}>
          ⚠️ Run Mutation Tests
        </button>
        <button style={styles.buttonSecondary} onClick={clearResults}>
          Clear Results
        </button>
      </div>

      <div style={styles.card}>
        <h3>Test Results</h3>
        <div style={{ minHeight: '100px', maxHeight: '400px', overflow: 'auto' }}>
          {testResults.map((result, idx) => (
            <div
              key={idx}
              style={result.isInfo ? styles.info : result.passed ? styles.pass : styles.fail}
            >
              {result.isInfo ? 'ℹ️' : result.passed ? '✅' : '❌'}{' '}
              <strong>{result.name}</strong>
              {result.message && `: ${result.message}`}
            </div>
          ))}
          {testResults.length === 0 && (
            <p style={{ color: '#6b7280' }}>Click "Run All Tests" to start</p>
          )}
        </div>

        {summary && (
          <div style={styles.summary}>
            <h4 style={{ marginTop: 0 }}>📊 Test Summary</h4>
            <p>✅ Passed: {summary.passed}</p>
            <p>❌ Failed: {summary.failed}</p>
            <p>📈 Total: {summary.total}</p>
          </div>
        )}
      </div>

      <div style={styles.card}>
        <h3>Quick Tests</h3>
        <button style={styles.button} onClick={testRolesApi} disabled={isRunning}>
          Test Roles API
        </button>
        <button style={styles.button} onClick={testWorkflowApi} disabled={isRunning}>
          Test Workflow API
        </button>
        <button style={styles.button} onClick={testFrontendValidation} disabled={isRunning}>
          Test Validation Rules
        </button>
        <button style={styles.button} onClick={testGraphValidation} disabled={isRunning}>
          Test Graph Validation
        </button>
      </div>

      <div style={styles.card}>
        <h3>Last API Response</h3>
        <pre style={styles.pre}>
          {apiResponse ? JSON.stringify(apiResponse, null, 2) : 'API responses will appear here...'}
        </pre>
      </div>
    </div>
  );
}
