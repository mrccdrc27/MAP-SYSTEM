/**
 * Workflow Creation E2E Test Suite
 * 
 * Tests the workflow creation flow from frontend to backend.
 * Covers API endpoints, validation, and UI component interactions.
 * 
 * Backend endpoints tested:
 * - POST /workflows/ - Create new workflow with optional graph
 * - GET /roles/ - List available roles for step assignment
 * 
 * Run in browser console after navigating to /admin/workflows/create
 */

const WORKFLOW_API_BASE = '/workflows';
const ROLES_API_BASE = '/roles';

// Get API base URL from environment or fallback
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // Check if Vite env variable is available
    try {
      return import.meta?.env?.VITE_BACKEND_API || 'http://localhost:8002';
    } catch {
      return 'http://localhost:8002';
    }
  }
  return 'http://localhost:8002';
};

// Get auth token from various storage locations
const getAuthToken = () => {
  const sources = [
    () => localStorage.getItem('accessToken'),
    () => sessionStorage.getItem('accessToken'),
    () => {
      const match = document.cookie.match(/accessToken=([^;]+)/);
      return match ? match[1] : null;
    }
  ];
  
  for (const source of sources) {
    const token = source();
    if (token) return token;
  }
  return null;
};

// API client for tests
const api = {
  async request(method, url, data = null) {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      credentials: 'include'
    };
    
    if (data) {
      options.body = JSON.stringify(data);
    }
    
    const response = await fetch(`${getApiBaseUrl()}${url}`, options);
    const json = await response.json().catch(() => ({}));
    
    return {
      ok: response.ok,
      status: response.status,
      data: json
    };
  },
  
  get: (url) => api.request('GET', url),
  post: (url, data) => api.request('POST', url, data),
  put: (url, data) => api.request('PUT', url, data),
  delete: (url) => api.request('DELETE', url)
};

// Test results collector
const testResults = {
  passed: 0,
  failed: 0,
  results: [],
  
  reset() {
    this.passed = 0;
    this.failed = 0;
    this.results = [];
  },
  
  log(name, passed, message = '') {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status}: ${name}`);
    if (message) console.log(`   └─ ${message}`);
    this.results.push({ name, passed, message });
    if (passed) this.passed++;
    else this.failed++;
  }
};

// ============================================
// TEST: API Endpoint Configuration
// ============================================
async function testApiEndpointConfiguration() {
  console.log('\n🔧 Testing API Endpoint Configuration...');
  
  const baseUrl = getApiBaseUrl();
  const token = getAuthToken();
  
  testResults.log('API Base URL is configured', !!baseUrl, `URL: ${baseUrl}`);
  testResults.log('Auth token is available', !!token, token ? 'Token found' : 'No token');
  
  // Test connectivity
  try {
    const response = await fetch(`${baseUrl}/`, {
      headers: { 'Authorization': `Bearer ${token}` },
      credentials: 'include'
    });
    testResults.log('API is reachable', response.ok || response.status === 401, 
      `Status: ${response.status}`);
  } catch (err) {
    testResults.log('API is reachable', false, `Error: ${err.message}`);
  }
}

// ============================================
// TEST: Roles API for Step Assignment
// ============================================
async function testRolesApi() {
  console.log('\n👤 Testing Roles API...');
  
  const result = await api.get(`${ROLES_API_BASE}/`);
  
  testResults.log('Roles endpoint returns OK', result.ok, `Status: ${result.status}`);
  
  if (!result.ok) {
    testResults.log('Roles data structure', false, 'Cannot test - API failed');
    return null;
  }
  
  const roles = result.data;
  
  testResults.log('Roles response is array', Array.isArray(roles), 
    `Found ${roles?.length || 0} roles`);
  
  if (roles.length === 0) {
    testResults.log('Roles exist in system', false, 
      'No roles found - workflow creation will fail!');
    return [];
  }
  
  testResults.log('Roles exist in system', true);
  
  // Verify role structure
  const sampleRole = roles[0];
  const hasId = 'role_id' in sampleRole || 'id' in sampleRole;
  const hasName = 'name' in sampleRole;
  
  testResults.log('Role has ID field', hasId);
  testResults.log('Role has name field', hasName, 
    hasName ? `Sample role: "${sampleRole.name}"` : '');
  
  return roles;
}

// ============================================
// TEST: Workflow Creation - Basic (No Graph)
// ============================================
async function testCreateWorkflowBasic() {
  console.log('\n📝 Testing Basic Workflow Creation (No Graph)...');
  
  const timestamp = Date.now();
  const workflowData = {
    name: `Test Workflow ${timestamp}`,
    description: 'E2E test workflow',
    category: 'Test',
    sub_category: 'Automated',
    department: 'Testing'
  };
  
  const result = await api.post(`${WORKFLOW_API_BASE}/`, workflowData);
  
  testResults.log('Basic workflow creation succeeds', result.ok, 
    result.ok ? `Created ID: ${result.data?.workflow_id}` : `Error: ${result.data?.error}`);
  
  if (result.ok) {
    // Verify response structure
    const data = result.data;
    testResults.log('Response has workflow_id', 'workflow_id' in data);
    testResults.log('Response has name', data.name === workflowData.name);
    testResults.log('Response has category', data.category === workflowData.category);
  }
  
  return result;
}

// ============================================
// TEST: Workflow Creation - With Graph
// ============================================
async function testCreateWorkflowWithGraph() {
  console.log('\n📊 Testing Workflow Creation With Graph...');
  
  // First get available roles
  const rolesResult = await api.get(`${ROLES_API_BASE}/`);
  if (!rolesResult.ok || !rolesResult.data?.length) {
    testResults.log('Workflow with graph creation', false, 'No roles available');
    return null;
  }
  
  const roleName = rolesResult.data[0].name;
  const timestamp = Date.now();
  
  const payload = {
    workflow: {
      name: `Graph Workflow ${timestamp}`,
      description: 'E2E test workflow with graph',
      category: 'Test',
      sub_category: 'Automated',
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
  };
  
  const result = await api.post(`${WORKFLOW_API_BASE}/`, payload);
  
  testResults.log('Workflow with graph creation succeeds', result.ok,
    result.ok ? '' : `Error: ${result.data?.error || JSON.stringify(result.data)}`);
  
  if (result.ok) {
    const data = result.data;
    
    // Verify workflow structure
    testResults.log('Response has workflow object', 'workflow' in data);
    testResults.log('Response has graph object', 'graph' in data);
    
    if (data.graph) {
      testResults.log('Graph has nodes', Array.isArray(data.graph.nodes),
        `${data.graph.nodes?.length || 0} nodes`);
      testResults.log('Graph has edges', Array.isArray(data.graph.edges),
        `${data.graph.edges?.length || 0} edges`);
      
      // Verify temp_id_mapping
      if (data.temp_id_mapping) {
        testResults.log('Temp ID mapping returned', true,
          `Mapped: ${Object.keys(data.temp_id_mapping).join(', ')}`);
      }
    }
  }
  
  return result;
}

// ============================================
// TEST: Validation - Required Fields
// ============================================
async function testValidationRequiredFields() {
  console.log('\n⚠️ Testing Validation - Required Fields...');
  
  // Test missing name
  const noName = await api.post(`${WORKFLOW_API_BASE}/`, {
    description: 'Test',
    category: 'Test',
    sub_category: 'Test',
    department: 'Test'
  });
  testResults.log('Rejects missing name', !noName.ok, 
    noName.ok ? 'Should have been rejected!' : 'Correctly rejected');
  
  // Test missing category
  const noCategory = await api.post(`${WORKFLOW_API_BASE}/`, {
    name: 'Test',
    description: 'Test',
    sub_category: 'Test',
    department: 'Test'
  });
  testResults.log('Rejects missing category', !noCategory.ok,
    noCategory.ok ? 'Should have been rejected!' : 'Correctly rejected');
  
  // Test missing sub_category
  const noSubCategory = await api.post(`${WORKFLOW_API_BASE}/`, {
    name: 'Test',
    description: 'Test',
    category: 'Test',
    department: 'Test'
  });
  testResults.log('Rejects missing sub_category', !noSubCategory.ok,
    noSubCategory.ok ? 'Should have been rejected!' : 'Correctly rejected');
  
  // Test missing department
  const noDept = await api.post(`${WORKFLOW_API_BASE}/`, {
    name: 'Test',
    description: 'Test',
    category: 'Test',
    sub_category: 'Test'
  });
  testResults.log('Rejects missing department', !noDept.ok,
    noDept.ok ? 'Should have been rejected!' : 'Correctly rejected');
}

// ============================================
// TEST: Validation - Start Node Rules
// ============================================
async function testValidationStartNode() {
  console.log('\n🚀 Testing Validation - Start Node Rules...');
  
  const rolesResult = await api.get(`${ROLES_API_BASE}/`);
  if (!rolesResult.ok || !rolesResult.data?.length) {
    testResults.log('Start node validation', false, 'No roles available');
    return;
  }
  
  const roleName = rolesResult.data[0].name;
  const timestamp = Date.now();
  
  // Test: No start node (should fail when nodes exist)
  const noStartPayload = {
    workflow: {
      name: `NoStart ${timestamp}`,
      category: 'Test',
      sub_category: 'Test',
      department: 'Test'
    },
    graph: {
      nodes: [
        {
          id: 'temp-1',
          name: 'Step 1',
          role: roleName,
          is_start: false,
          is_end: false
        },
        {
          id: 'temp-2',
          name: 'Step 2',
          role: roleName,
          is_start: false,
          is_end: true
        }
      ],
      edges: []
    }
  };
  
  const noStartResult = await api.post(`${WORKFLOW_API_BASE}/`, noStartPayload);
  testResults.log('Rejects graph with no start node', !noStartResult.ok,
    noStartResult.ok ? 'Should have been rejected!' : 'Correctly rejected');
  
  // Test: Multiple start nodes (should fail)
  const multiStartPayload = {
    workflow: {
      name: `MultiStart ${timestamp}`,
      category: 'Test',
      sub_category: 'Test',
      department: 'Test'
    },
    graph: {
      nodes: [
        {
          id: 'temp-1',
          name: 'Start 1',
          role: roleName,
          is_start: true,
          is_end: false
        },
        {
          id: 'temp-2',
          name: 'Start 2',
          role: roleName,
          is_start: true,
          is_end: true
        }
      ],
      edges: []
    }
  };
  
  const multiStartResult = await api.post(`${WORKFLOW_API_BASE}/`, multiStartPayload);
  testResults.log('Rejects graph with multiple start nodes', !multiStartResult.ok,
    multiStartResult.ok ? 'Should have been rejected!' : 'Correctly rejected');
}

// ============================================
// TEST: Validation - Invalid Role
// ============================================
async function testValidationInvalidRole() {
  console.log('\n👥 Testing Validation - Invalid Role...');
  
  const timestamp = Date.now();
  
  const invalidRolePayload = {
    workflow: {
      name: `InvalidRole ${timestamp}`,
      category: 'Test',
      sub_category: 'Test',
      department: 'Test'
    },
    graph: {
      nodes: [
        {
          id: 'temp-1',
          name: 'Start',
          role: `NonExistentRole_${timestamp}`,
          is_start: true,
          is_end: true
        }
      ],
      edges: []
    }
  };
  
  const result = await api.post(`${WORKFLOW_API_BASE}/`, invalidRolePayload);
  
  testResults.log('Rejects invalid role name', !result.ok,
    result.ok ? 'Should have been rejected!' : 
    `Correctly rejected: ${result.data?.error || 'validation error'}`);
}

// ============================================
// TEST: SLA Duration Format
// ============================================
async function testSlaDurationFormat() {
  console.log('\n⏱️ Testing SLA Duration Format...');
  
  const timestamp = Date.now();
  
  // Valid ISO 8601 duration format
  const validSlaPayload = {
    name: `SLATest ${timestamp}`,
    description: 'Test SLA duration format',
    category: 'Test',
    sub_category: 'Test',
    department: 'Test',
    low_sla: 'PT24H',      // 24 hours
    medium_sla: 'PT12H',   // 12 hours
    high_sla: 'PT4H',      // 4 hours
    urgent_sla: 'PT1H'     // 1 hour
  };
  
  const validResult = await api.post(`${WORKFLOW_API_BASE}/`, validSlaPayload);
  testResults.log('Accepts valid ISO 8601 SLA duration', validResult.ok,
    validResult.ok ? '' : `Error: ${validResult.data?.error}`);
  
  // Test P format (days)
  const daysPayload = {
    name: `SLADays ${timestamp}`,
    category: 'Test',
    sub_category: 'Test',
    department: 'Test',
    low_sla: 'P7D'  // 7 days
  };
  
  const daysResult = await api.post(`${WORKFLOW_API_BASE}/`, daysPayload);
  testResults.log('Accepts P7D duration format', daysResult.ok,
    daysResult.ok ? '' : `Error: ${daysResult.data?.error}`);
}

// ============================================
// TEST: Frontend UI Component Verification
// ============================================
function testFrontendUIComponents() {
  console.log('\n🖼️ Testing Frontend UI Components...');
  
  // These tests run in browser and check DOM elements
  if (typeof document === 'undefined') {
    console.log('   Skipping UI tests (not in browser)');
    return;
  }
  
  // Check if on correct page
  const isCreatePage = window.location.pathname.includes('/workflows/create');
  testResults.log('On workflow creation page', isCreatePage,
    `Current path: ${window.location.pathname}`);
  
  if (!isCreatePage) {
    console.log('   Navigate to /admin/workflows/create to run UI tests');
    return;
  }
  
  // Check required form fields exist
  const nameInput = document.querySelector('input[placeholder*="workflow name" i]');
  testResults.log('Workflow name input exists', !!nameInput);
  
  const categoryInput = document.querySelector('input[placeholder*="category" i]');
  testResults.log('Category input exists', !!categoryInput);
  
  const departmentInput = document.querySelector('input[placeholder*="department" i]');
  testResults.log('Department input exists', !!departmentInput);
  
  // Check ReactFlow canvas
  const reactFlowContainer = document.querySelector('.react-flow');
  testResults.log('ReactFlow canvas exists', !!reactFlowContainer);
  
  // Check Add Step button
  const addBtn = Array.from(document.querySelectorAll('button'))
    .find(btn => btn.textContent.toLowerCase().includes('add step') || 
                 btn.textContent.toLowerCase().includes('+ add'));
  testResults.log('Add Step button exists', !!addBtn);
  
  // Check Create/Save button
  const saveBtn = Array.from(document.querySelectorAll('button'))
    .find(btn => btn.textContent.toLowerCase().includes('create') ||
                 btn.textContent.toLowerCase().includes('save'));
  testResults.log('Create/Save button exists', !!saveBtn);
}

// ============================================
// TEST: Frontend Validation Logic
// ============================================
function testFrontendValidationLogic() {
  console.log('\n✓ Testing Frontend Validation Logic...');
  
  // Simulated validation functions (mirrors CreateWorkflowPage.jsx logic)
  
  const validateWorkflowMetadata = (metadata) => {
    const errors = [];
    if (!metadata.name?.trim()) errors.push('Workflow name is required');
    if (!metadata.category?.trim()) errors.push('Category is required');
    if (!metadata.sub_category?.trim()) errors.push('Sub-category is required');
    if (!metadata.department?.trim()) errors.push('Department is required');
    return errors;
  };
  
  const validateNodes = (nodes) => {
    if (nodes.length === 0) return [];
    const startNodes = nodes.filter(n => n.data?.is_start);
    if (startNodes.length !== 1) {
      return ['Workflow must have exactly one start step'];
    }
    return [];
  };
  
  // Test metadata validation
  const emptyMeta = validateWorkflowMetadata({});
  testResults.log('Validates empty metadata', emptyMeta.length === 4);
  
  const partialMeta = validateWorkflowMetadata({ name: 'Test' });
  testResults.log('Validates partial metadata', partialMeta.length === 3);
  
  const validMeta = validateWorkflowMetadata({
    name: 'Test',
    category: 'Test',
    sub_category: 'Test',
    department: 'Test'
  });
  testResults.log('Accepts valid metadata', validMeta.length === 0);
  
  // Test node validation
  const noNodes = validateNodes([]);
  testResults.log('Empty nodes passes validation', noNodes.length === 0);
  
  const noStartNode = validateNodes([
    { data: { is_start: false } },
    { data: { is_start: false } }
  ]);
  testResults.log('Rejects nodes without start', noStartNode.length > 0);
  
  const oneStartNode = validateNodes([
    { data: { is_start: true } },
    { data: { is_start: false } }
  ]);
  testResults.log('Accepts one start node', oneStartNode.length === 0);
  
  const multiStart = validateNodes([
    { data: { is_start: true } },
    { data: { is_start: true } }
  ]);
  testResults.log('Rejects multiple start nodes', multiStart.length > 0);
}

// ============================================
// TEST: Temp ID to Real ID Mapping
// ============================================
async function testTempIdMapping() {
  console.log('\n🔄 Testing Temp ID to Real ID Mapping...');
  
  const rolesResult = await api.get(`${ROLES_API_BASE}/`);
  if (!rolesResult.ok || !rolesResult.data?.length) {
    testResults.log('Temp ID mapping', false, 'No roles available');
    return;
  }
  
  const roleName = rolesResult.data[0].name;
  const timestamp = Date.now();
  
  const payload = {
    workflow: {
      name: `TempID Test ${timestamp}`,
      category: 'Test',
      sub_category: 'Test',
      department: 'Test'
    },
    graph: {
      nodes: [
        {
          id: `temp-mapping-${timestamp}-1`,
          name: 'Node A',
          role: roleName,
          is_start: true,
          is_end: false
        },
        {
          id: `temp-mapping-${timestamp}-2`,
          name: 'Node B',
          role: roleName,
          is_start: false,
          is_end: true
        }
      ],
      edges: [
        {
          id: `temp-edge-${timestamp}`,
          from: `temp-mapping-${timestamp}-1`,
          to: `temp-mapping-${timestamp}-2`
        }
      ]
    }
  };
  
  const result = await api.post(`${WORKFLOW_API_BASE}/`, payload);
  
  if (!result.ok) {
    testResults.log('Temp ID mapping', false, `API error: ${result.data?.error}`);
    return;
  }
  
  // Check temp_id_mapping in response
  const mapping = result.data.temp_id_mapping;
  
  testResults.log('Response includes temp_id_mapping', !!mapping,
    mapping ? `Keys: ${Object.keys(mapping).length}` : '');
  
  if (mapping) {
    // Verify all temp IDs are mapped to real IDs
    const tempIds = Object.keys(mapping);
    const allMapped = tempIds.every(tid => typeof mapping[tid] === 'number');
    testResults.log('All temp IDs mapped to real IDs', allMapped);
    
    // Verify nodes use real IDs
    const graphNodes = result.data.graph?.nodes || [];
    const allRealIds = graphNodes.every(n => typeof n.id === 'number');
    testResults.log('Graph nodes have real IDs', allRealIds,
      `IDs: ${graphNodes.map(n => n.id).join(', ')}`);
  }
}

// ============================================
// MAIN: Run All Tests
// ============================================
async function runAllTests() {
  console.log('═══════════════════════════════════════════════');
  console.log('🔬 WORKFLOW CREATION E2E TEST SUITE');
  console.log('═══════════════════════════════════════════════');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`API Base: ${getApiBaseUrl()}`);
  console.log(`Auth: ${getAuthToken() ? 'Available' : 'MISSING!'}`);
  console.log('═══════════════════════════════════════════════');
  
  testResults.reset();
  
  // Configuration tests
  await testApiEndpointConfiguration();
  await testRolesApi();
  
  // Frontend validation tests (no API calls)
  testFrontendValidationLogic();
  testFrontendUIComponents();
  
  // API validation tests
  await testValidationRequiredFields();
  await testValidationStartNode();
  await testValidationInvalidRole();
  await testSlaDurationFormat();
  
  // Creation tests
  await testCreateWorkflowBasic();
  await testCreateWorkflowWithGraph();
  await testTempIdMapping();
  
  // Summary
  console.log('\n═══════════════════════════════════════════════');
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('═══════════════════════════════════════════════');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Total:  ${testResults.passed + testResults.failed}`);
  
  const passRate = ((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1);
  console.log(`📊 Pass Rate: ${passRate}%`);
  console.log('═══════════════════════════════════════════════');
  
  if (testResults.failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    testResults.results
      .filter(r => !r.passed)
      .forEach(r => console.log(`   • ${r.name}: ${r.message || 'Failed'}`));
  }
  
  return testResults;
}

// Quick validation test (no API mutations)
async function runQuickTests() {
  console.log('Running quick validation tests (no API mutations)...\n');
  
  testResults.reset();
  
  await testApiEndpointConfiguration();
  await testRolesApi();
  testFrontendValidationLogic();
  
  console.log(`\n✅ ${testResults.passed} passed, ❌ ${testResults.failed} failed`);
  return testResults;
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runAllTests,
    runQuickTests,
    testApiEndpointConfiguration,
    testRolesApi,
    testCreateWorkflowBasic,
    testCreateWorkflowWithGraph,
    testValidationRequiredFields,
    testValidationStartNode,
    testValidationInvalidRole,
    testSlaDurationFormat,
    testFrontendUIComponents,
    testFrontendValidationLogic,
    testTempIdMapping,
    testResults
  };
}

// Console usage hints
console.log('📋 Workflow Creation E2E Tests Loaded');
console.log('═══════════════════════════════════════════════');
console.log('Available commands:');
console.log('  runAllTests()      - Run complete test suite');
console.log('  runQuickTests()    - Run quick validation tests');
console.log('═══════════════════════════════════════════════');
