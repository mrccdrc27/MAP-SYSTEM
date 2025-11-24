# Create Workflow Feature - Implementation Summary

## Overview
The create workflow feature has been successfully implemented using the workflow editor engine (ReactFlow). Users can now design workflows visually with drag-and-drop interface, add steps, define transitions, and save them to the backend.

## Files Created

### 1. **Hook: useCreateWorkflow** 
- **Path**: `frontend/src/api/useCreateWorkflow.jsx`
- **Purpose**: API wrapper for creating workflows
- **Method**: `createWorkflow(workflowData, graphData)`
  - `workflowData`: Workflow metadata (name, category, sub_category, department, SLAs, etc.)
  - `graphData`: Graph structure with nodes (steps) and edges (transitions)
- **Returns**: Created workflow object with all details

### 2. **Page: CreateWorkflowPage**
- **Path**: `frontend/src/pages/admin/workflow-page/CreateWorkflowPage.jsx`
- **Features**:
  - **Left Sidebar**: Workflow metadata form
    - Basic info: Name, Description, Category, Sub-category, Department
    - SLA configuration: Low, Medium, High, Urgent (in hours)
    - Steps list with add button
    - Node editor for editing selected steps
  - **Main Area**: ReactFlow visual editor
    - Add nodes (steps) with auto-positioning
    - Create edges (transitions) by connecting nodes
    - Click nodes to edit in sidebar
    - Real-time node count display
  - **Toolbar**: Create/Cancel buttons with save status
  - **Validation**:
    - Required fields: Name, Category, Sub-category, Department
    - Minimum 2 steps required
    - Minimum 1 transition required
  - **Confirmation Modal**: Shows after successful creation

### 3. **Modal: WorkflowCreationConfirmation**
- **Path**: `frontend/src/pages/admin/workflow-page/modals/WorkflowCreationConfirmation.jsx`
- **Displays**:
  - Success message with green checkmark
  - Workflow ID
  - Workflow name
  - Category / Sub-category
  - Department
  - Status (draft)
  - Creation timestamp
- **Actions**:
  - "Back to Workflows": Returns to workflow list
  - "Edit Workflow": Navigates to edit page with full editor

### 4. **Styles**
- **CreateWorkflowPage CSS**: `frontend/src/pages/admin/workflow-page/create-workflow.module.css`
- **Confirmation Modal CSS**: `frontend/src/pages/admin/workflow-page/modals/workflow-creation-confirmation.module.css`

## Routes Added

### New Routes in `frontend/src/routes/MainRoute.jsx`
```
/admin/workflows              → Workflow list (existing page)
/admin/workflows/create       → Create new workflow (NEW)
/admin/workflows/:workflowId/edit → Edit existing workflow (uses WorkflowEditorPage)
```

### Updated Workflow.jsx
- Added "Create Workflow" button in header
- Button navigates to `/admin/workflows/create`
- Updated styles to accommodate header button

## Data Flow

### Creating a Workflow
```
CreateWorkflowPage
  ↓ (user fills metadata & designs workflow)
  ↓ (click Create Workflow button)
  ↓ (validate form & graph)
  ↓ (transform data to API format)
  ↓ POST /workflows/
useCreateWorkflow Hook
  ↓ (calls API endpoint)
  ↓ (response includes {workflow: {...}, graph: {...}})
Backend: WorkflowViewSet.create()
  ↓ (creates Workflow model)
  ↓ (creates Steps for each node)
  ↓ (creates StepTransitions for each edge)
  ↓ (returns 201 with full workflow data)
CreateWorkflowPage
  ↓ (extracts workflow data from response)
  ↓ (shows confirmation modal)
  ↓ (user can navigate to edit or back to list)
```

### API Request Format
```json
POST /workflows/
{
  "workflow": {
    "name": "Infrastructure Support",
    "description": "Handles IT reset requests",
    "category": "IT",
    "sub_category": "Support",
    "department": "IT Support",
    "end_logic": "",
    "low_sla": "PT72H",
    "medium_sla": "PT48H",
    "high_sla": "PT24H",
    "urgent_sla": "PT4H"
  },
  "graph": {
    "nodes": [
      {
        "id": "temp-xxx",
        "name": "Request Received",
        "role": "System",
        "description": "",
        "instruction": "",
        "design": {"x": 0, "y": 0},
        "is_start": true,
        "is_end": false
      }
    ],
    "edges": [
      {
        "id": "e1",
        "from": "temp-xxx",
        "to": "temp-yyy",
        "name": "Proceed"
      }
    ]
  }
}
```

### API Response Format
```json
201 Created
{
  "workflow": {
    "workflow_id": 42,
    "name": "Infrastructure Support",
    "description": "...",
    "category": "IT",
    "sub_category": "Support",
    "department": "IT Support",
    "status": "draft",
    "is_published": false,
    "created_at": "2025-11-21T10:30:00Z",
    "updated_at": "2025-11-21T10:30:00Z"
  },
  "graph": {
    "nodes": [...],
    "edges": [...]
  }
}
```

## Key Features

### 1. Visual Workflow Design
- Drag-and-drop interface using ReactFlow
- Auto-position nodes in grid layout
- Easy node selection and editing
- Real-time display of node/edge counts

### 2. Comprehensive Metadata
- Support for multiple SLA tiers (Low, Medium, High, Urgent)
- Optional end logic (Asset Management, Budget Management, Send Notification)
- Category and sub-category for organization
- Department tracking for workflow ownership

### 3. Node Management
- Add steps with predefined roles
- Edit step names, descriptions, and role assignments
- Mark steps as start/end points
- Delete steps (with automatic edge cleanup)
- Visual feedback for selected step

### 4. Validation
- Required field validation with clear error messages
- Graph validation (minimum 2 steps, 1 transition)
- Prevents creation of invalid workflows

### 5. Confirmation & Navigation
- Success modal shows all workflow details
- Allows immediate editing or return to workflow list
- Smooth navigation between create/edit/view workflows

## Integration Points

### With Existing Components
- **WorkflowEditorLayout**: Used for editing existing workflows at `/admin/workflows/:workflowId/edit`
- **StepNode**: Component from workflow editor for node rendering
- **AdminNav**: Navigation bar consistent with admin pages
- **LoadingSpinner**: Loading state while fetching roles

### With Backend
- **POST /workflows/**: Create workflow with graph (WorkflowViewSet.create)
- **GET /roles/**: Fetch available roles for step assignment (useWorkflowRoles)
- Response includes full workflow details for confirmation modal

## User Workflow

1. **Navigate to Workflows**: Click admin → workflows
2. **Create New**: Click "Create Workflow" button
3. **Fill Metadata**: 
   - Enter workflow name, description
   - Select category, sub-category, department
   - Configure SLA times
4. **Design Steps**: 
   - Click "Add Step" to create nodes
   - Click step to edit name, role, description
   - Mark first step as "Start"
5. **Connect Steps**: 
   - Drag connections between nodes in canvas
   - Edit transition names (optional)
6. **Validate**: 
   - Ensure 2+ steps
   - Ensure transitions connect all steps
7. **Create**: Click "Create Workflow" button
8. **Confirm**: View confirmation modal with workflow ID
9. **Next Steps**: 
   - Edit to add more details/configure weights
   - Back to list to manage workflows

## Testing Checklist

- [ ] Navigate to `/admin/workflows/create`
- [ ] Add workflow metadata
- [ ] Add multiple steps
- [ ] Create transitions between steps
- [ ] Try to create with missing data (should show errors)
- [ ] Successfully create workflow
- [ ] Confirm modal appears with correct data
- [ ] Click "Edit Workflow" → goes to editor
- [ ] Click "Back to Workflows" → returns to list
- [ ] New workflow appears in workflow list

## Future Enhancements

1. **Step Templates**: Pre-built step configurations
2. **Workflow Templates**: Clone existing workflows
3. **Conditional Branching**: Multiple transition paths based on conditions
4. **Parallel Steps**: Execute steps concurrently
5. **Step Dependency Management**: Advanced sequencing rules
6. **Workflow Publishing**: Deploy to production
7. **Version Control**: Track workflow changes
8. **Workflow Simulation**: Preview workflow execution

## Notes

- SLA times are stored as ISO 8601 duration format (PT{hours}H)
- Node positioning uses absolute coordinates (x, y)
- Workflow ID is auto-generated by backend
- Status defaults to "draft" on creation
- All role assignments reference existing roles in the system
- Workflow creation is transactional - all or nothing
