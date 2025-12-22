/**
 * Workflow Editor E2E Verification Test Script
 * 
 * This script verifies that the frontend workflow editor is aligned with 
 * the backend API expectations. It can be run in the browser console or 
 * as a standalone test.
 * 
 * Backend endpoints tested:
 * - GET /roles/ - List available roles
 * - GET /workflows/{id}/detail/ - Get workflow details
 * - PUT /workflows/{id}/update-graph/ - Update workflow graph
 * 
 * Usage:
 * 1. Open the frontend application in a browser
 * 2. Open browser developer console
 * 3. Copy and paste this script
 * 4. Call runAllTests() or individual test functions
 */

const WORKFLOW_API_BASE = '/workflows';
const ROLES_API_BASE = '/roles';

// Helper to get the API base URL from environment
const getApiBaseUrl = () => {
  // For browser console testing, check window or use fallback
  if (typeof window !== 'undefined' && window.__VITE_BACKEND_API__) {
    return window.__VITE_BACKEND_API__;
  }
  // Fallback for console testing
  return 'http://localhost:8002';
};

// Helper to get auth token (assumes token is stored in localStorage)
const getAuthToken = () => {
  const token = localStorage.getItem('accessToken') || 
                sessionStorage.getItem('accessToken') ||
                document.cookie.split(';').find(c => c.trim().startsWith('accessToken='))?.split('=')[1];
  return token;
};

// API client for tests
const testApi = {
  async get(url) {
    const response = await fetch(`${getApiBaseUrl()}${url}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      credentials: 'include'
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`API Error ${response.status}: ${error.error || response.statusText}`);
    }
    return response.json();
  },
  
  async put(url, data) {
    const response = await fetch(`${getApiBaseUrl()}${url}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      credentials: 'include',
      body: JSON.stringify(data)
    });
    const json = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, data: json };
  }
};

// Test results collector
const testResults = {
  passed: 0,
  failed: 0,
  results: []
};

function logTest(name, passed, message) {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${name}`);
  if (message) console.log(`   └─ ${message}`);
  testResults.results.push({ name, passed, message });
  if (passed) testResults.passed++;
  else testResults.failed++;
}

// ============================================
// TEST: Roles API Availability
// ============================================
async function testRolesApiAvailability() {
  console.log('\n📋 Testing Roles API...');
  
  try {
    const roles = await testApi.get(`${ROLES_API_BASE}/`);
    
    if (!Array.isArray(roles)) {
      logTest('Roles API returns array', false, 'Expected array response');
      return null;
    }
    
    logTest('Roles API returns array', true, `Found ${roles.length} roles`);
    
    if (roles.length === 0) {
      logTest('Roles exist in system', false, 'No roles configured - step creation will fail');
      return [];
    }
    
    logTest('Roles exist in system', true);
    
    // Verify role structure
    const sampleRole = roles[0];
    const hasRoleId = 'role_id' in sampleRole || 'id' in sampleRole;
    const hasName = 'name' in sampleRole;
    
    logTest('Role has ID field', hasRoleId, hasRoleId ? '' : 'Missing role_id or id');
    logTest('Role has name field', hasName, hasName ? `Sample: "${sampleRole.name}"` : 'Missing name');
    
    return roles;
  } catch (error) {
    logTest('Roles API accessible', false, error.message);
    return null;
  }
}

// ============================================
// TEST: Workflow Detail API
// ============================================
async function testWorkflowDetailApi(workflowId = 1) {
  console.log(`\n📋 Testing Workflow Detail API (ID: ${workflowId})...`);
  
  try {
    const detail = await testApi.get(`${WORKFLOW_API_BASE}/${workflowId}/detail/`);
    
    // Verify structure
    const hasWorkflow = 'workflow' in detail;
    const hasGraph = 'graph' in detail;
    
    logTest('Response has workflow object', hasWorkflow);
    logTest('Response has graph object', hasGraph);
    
    if (hasGraph) {
      const hasNodes = 'nodes' in detail.graph;
      const hasEdges = 'edges' in detail.graph;
      
      logTest('Graph has nodes array', hasNodes, hasNodes ? `${detail.graph.nodes?.length || 0} nodes` : '');
      logTest('Graph has edges array', hasEdges, hasEdges ? `${detail.graph.edges?.length || 0} edges` : '');
      
      // Verify node structure
      if (detail.graph.nodes?.length > 0) {
        const node = detail.graph.nodes[0];
        logTest('Node has id', 'id' in node);
        logTest('Node has name', 'name' in node);
        logTest('Node has role', 'role' in node, `Role: "${node.role}"`);
        logTest('Node has design', 'design' in node);
        logTest('Node has is_start flag', 'is_start' in node);
        logTest('Node has is_end flag', 'is_end' in node);
      }
      
      // Verify edge structure
      if (detail.graph.edges?.length > 0) {
        const edge = detail.graph.edges[0];
        logTest('Edge has id', 'id' in edge);
        logTest('Edge has from', 'from' in edge);
        logTest('Edge has to', 'to' in edge);
      }
    }
    
    return detail;
  } catch (error) {
    logTest('Workflow detail API accessible', false, error.message);
    return null;
  }
}

// ============================================
// TEST: Graph Update Validation - Start Node
// ============================================
async function testStartNodeValidation(workflowId = 1) {
  console.log(`\n📋 Testing Start Node Validation (Backend Rule)...`);
  
  try {
    // Get current workflow
    const detail = await testApi.get(`${WORKFLOW_API_BASE}/${workflowId}/detail/`);
    const nodes = detail.graph?.nodes || [];
    
    if (nodes.length === 0) {
      logTest('Start node validation', false, 'No nodes to test with');
      return;
    }
    
    // Test 1: Remove all start nodes (should fail)
    const noStartNodes = nodes.map(n => ({
      id: n.id,
      name: n.name,
      role: n.role,
      is_start: false,
      is_end: n.is_end
    }));
    
    const result1 = await testApi.put(
      `${WORKFLOW_API_BASE}/${workflowId}/update-graph/`,
      { nodes: noStartNodes, edges: [] }
    );
    
    logTest('Backend rejects graph with no start nodes', 
      !result1.ok || result1.data?.error?.includes('start'),
      result1.ok ? 'Backend accepted invalid graph!' : 'Correctly rejected'
    );
    
    // Test 2: Multiple start nodes (should fail)
    if (nodes.length >= 2) {
      const multiStartNodes = nodes.map(n => ({
        id: n.id,
        name: n.name,
        role: n.role,
        is_start: true,
        is_end: n.is_end
      }));
      
      const result2 = await testApi.put(
        `${WORKFLOW_API_BASE}/${workflowId}/update-graph/`,
        { nodes: multiStartNodes, edges: [] }
      );
      
      logTest('Backend rejects graph with multiple start nodes',
        !result2.ok,
        result2.ok ? 'Backend accepted invalid graph!' : 'Correctly rejected'
      );
    }
    
  } catch (error) {
    logTest('Start node validation test', false, error.message);
  }
}

// ============================================
// TEST: Role Validation on Step Creation
// ============================================
async function testRoleValidation(workflowId = 1) {
  console.log(`\n📋 Testing Role Validation on Step Creation...`);
  
  try {
    // Get current workflow
    const detail = await testApi.get(`${WORKFLOW_API_BASE}/${workflowId}/detail/`);
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
      is_end: false
    };
    
    const allNodes = [...currentNodes.map(n => ({
      id: n.id,
      name: n.name,
      role: n.role,
      description: n.description,
      instruction: n.instruction,
      design: n.design,
      is_start: n.is_start,
      is_end: n.is_end
    })), invalidNode];
    
    const result = await testApi.put(
      `${WORKFLOW_API_BASE}/${workflowId}/update-graph/`,
      { 
        nodes: allNodes, 
        edges: currentEdges.map(e => ({
          id: e.id,
          from: e.from,
          to: e.to,
          name: e.name
        }))
      }
    );
    
    logTest('Backend rejects invalid role',
      !result.ok && (result.data?.error?.toLowerCase().includes('role') || result.status === 400),
      result.ok ? 'Backend accepted invalid role!' : `Rejected with: ${result.data?.error || 'validation error'}`
    );
    
  } catch (error) {
    logTest('Role validation test', false, error.message);
  }
}

// ============================================
// TEST: Node ID Format Validation
// ============================================
async function testNodeIdFormat() {
  console.log(`\n📋 Testing Node ID Format Rules...`);
  
  // These are frontend validation rules that mirror backend
  const validIds = ['1', '123', 'temp-1', 'temp-abc123', 'temp-n1234567890'];
  const invalidIds = ['abc', 'node-1', 'new-step', ''];
  
  const isValidId = (id) => {
    if (!id) return false;
    if (String(id).startsWith('temp-')) return true;
    return !isNaN(parseInt(String(id)));
  };
  
  validIds.forEach(id => {
    logTest(`Valid ID format: "${id}"`, isValidId(id));
  });
  
  invalidIds.forEach(id => {
    logTest(`Invalid ID rejected: "${id}"`, !isValidId(id));
  });
}

// ============================================
// TEST: Frontend Validation Functions
// ============================================
function testFrontendValidation() {
  console.log(`\n📋 Testing Frontend Validation Functions...`);
  
  // Import validation functions (this works when script is in src/utils context)
  // For console testing, we'll define minimal versions
  
  const STEP_NAME_MAX = 64;
  const STEP_DESC_MAX = 256;
  
  // Test step name validation
  const testNames = [
    { value: '', expected: false, desc: 'Empty name' },
    { value: '   ', expected: false, desc: 'Whitespace only' },
    { value: 'Valid Step', expected: true, desc: 'Normal name' },
    { value: 'A'.repeat(65), expected: false, desc: 'Too long (65 chars)' },
    { value: 'A'.repeat(64), expected: true, desc: 'Max length (64 chars)' },
  ];
  
  testNames.forEach(test => {
    const isValid = test.value.trim().length > 0 && test.value.length <= STEP_NAME_MAX;
    logTest(`Step name validation: ${test.desc}`, isValid === test.expected);
  });
  
  // Test description validation
  const testDescs = [
    { value: '', expected: true, desc: 'Empty (optional)' },
    { value: 'A'.repeat(257), expected: false, desc: 'Too long (257 chars)' },
    { value: 'A'.repeat(256), expected: true, desc: 'Max length (256 chars)' },
  ];
  
  testDescs.forEach(test => {
    const isValid = test.value.length <= STEP_DESC_MAX;
    logTest(`Description validation: ${test.desc}`, isValid === test.expected);
  });
}

// ============================================
// TEST: Workflow Structure Validation
// ============================================
function testWorkflowStructureValidation() {
  console.log(`\n📋 Testing Workflow Structure Validation...`);
  
  // Test exactly one start node rule
  const scenarios = [
    {
      name: 'No start nodes',
      nodes: [{ id: 1, is_start: false }, { id: 2, is_start: false }],
      expectedValid: false
    },
    {
      name: 'One start node',
      nodes: [{ id: 1, is_start: true }, { id: 2, is_start: false }],
      expectedValid: true
    },
    {
      name: 'Multiple start nodes',
      nodes: [{ id: 1, is_start: true }, { id: 2, is_start: true }],
      expectedValid: false
    },
    {
      name: 'Empty workflow',
      nodes: [],
      expectedValid: false
    }
  ];
  
  scenarios.forEach(scenario => {
    const startCount = scenario.nodes.filter(n => n.is_start).length;
    const isValid = startCount === 1 || (scenario.nodes.length === 0 && scenario.expectedValid);
    const actualValid = startCount === 1;
    logTest(`Start node rule: ${scenario.name}`, actualValid === scenario.expectedValid);
  });
}

// ============================================
// MAIN: Run All Tests
// ============================================
async function runAllTests(workflowId = 1) {
  console.log('═══════════════════════════════════════════════');
  console.log('🔬 WORKFLOW EDITOR E2E VERIFICATION TESTS');
  console.log('═══════════════════════════════════════════════');
  console.log(`API Base: ${getApiBaseUrl()}`);
  console.log(`Auth Token: ${getAuthToken() ? 'Present' : 'MISSING!'}`);
  console.log('═══════════════════════════════════════════════');
  
  // Reset results
  testResults.passed = 0;
  testResults.failed = 0;
  testResults.results = [];
  
  // Run tests
  await testRolesApiAvailability();
  await testWorkflowDetailApi(workflowId);
  testNodeIdFormat();
  testFrontendValidation();
  testWorkflowStructureValidation();
  
  // Optional: Run mutation tests (these modify data)
  const runMutationTests = false; // Set to true to test validation on actual API
  if (runMutationTests) {
    await testStartNodeValidation(workflowId);
    await testRoleValidation(workflowId);
  }
  
  // Summary
  console.log('\n═══════════════════════════════════════════════');
  console.log('📊 TEST SUMMARY');
  console.log('═══════════════════════════════════════════════');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Total:  ${testResults.passed + testResults.failed}`);
  console.log('═══════════════════════════════════════════════');
  
  if (testResults.failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    testResults.results
      .filter(r => !r.passed)
      .forEach(r => console.log(`   - ${r.name}: ${r.message || 'See above'}`));
  }
  
  return testResults;
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runAllTests,
    testRolesApiAvailability,
    testWorkflowDetailApi,
    testStartNodeValidation,
    testRoleValidation,
    testNodeIdFormat,
    testFrontendValidation,
    testWorkflowStructureValidation,
    testResults
  };
}

// Auto-run hint
console.log('📋 Workflow Editor E2E Test Script Loaded');
console.log('   Run: runAllTests(workflowId) to execute all tests');
console.log('   Example: runAllTests(1)');
