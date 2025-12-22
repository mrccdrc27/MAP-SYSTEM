# `src/components/workflow/**` Directory Analysis

The `src/components/workflow/` directory and its `WorkflowEditor` subdirectory provide a complete feature set for visualizing and editing ticket tracking workflows. It is built primarily using the `reactflow` library.

The functionality can be broken down into two main parts: a read-only visualizer and a full-featured workflow editor.

---

## 1. Workflow Visualization

This feature is primarily handled by `NewWorkflowVisualizer.jsx`.

-   **`NewWorkflowVisualizer.jsx`**: A React component that renders a read-only, auto-layouted graph of a given workflow.
    -   **`getLayout(nodes, edges)`**: Uses the `dagre` library to automatically calculate the positions of nodes and edges, creating a clean, top-down graph layout.
        -   **`preventOverlaps(nodes)`**: A utility function that adjusts node positions after the initial layout to ensure they do not overlap, improving readability.
            -   **`WorkflowVisualizer({ workflowId })`**: The main component that fetches workflow data from the API (`/api/graph/${workflowId}/`) and renders it using `reactflow`. It includes standard controls like a minimap and zoom/pan controls.

            -   **`WorkflowRefreshContext.jsx`**:
                -   **`WorkflowRefreshProvider`**: A context provider that manages a `refreshKey`.
                    -   **`useWorkflowRefresh()`**: A hook that allows any child component to call `triggerRefresh()`, which updates the `refreshKey` and forces a data reload in components that use it, like `NewWorkflowVisualizer`.

                    ---

                    ## 2. Workflow Editor (`WorkflowEditor/` sub-directory)

                    This is a comprehensive, multi-component system for creating, modifying, and managing every aspect of a workflow.

                    -   **`WorkflowEditorLayout.jsx`**: The main container and orchestrator for the entire editor UI.
                        -   It manages the overall state, such as which step or transition is being edited.
                            -   It renders the top ribbon with workflow details and primary actions.
                                -   It includes tabs to switch between different views: "Manage" (the main editor), "Details" (read-only properties), and "Edit" (editable properties).
                                    -   It presents `SLAWeightEditor` as a modal.
                                        -   **`handleSaveAll()`**: A key function that triggers the save operation for all unsaved changes in the graph.

                                        -   **`WorkflowEditorContent.jsx`**: The centerpiece of the editor, this component contains the interactive `reactflow` canvas.
                                            -   It fetches and displays the nodes (steps) and edges (transitions) of the workflow.
                                                -   Allows users to drag-and-drop nodes to change their position (in "Editing" mode).
                                                    -   Handles the creation of new edges when a user connects two nodes.
                                                        -   Listens for clicks on nodes and edges to trigger the edit panels in the sidebar.
                                                            -   **`saveChanges()`**: An async function (exposed via `useImperativeHandle`) that collects all the current node and edge data and sends it to the backend via an API call to `updateWorkflowGraph`.
                                                                -   **`handleAddNode()`**: Adds a new, temporary step node to the canvas.

                                                                -   **`WorkflowEditorSidebar.jsx`**: A sidebar on the right of the UI that displays the appropriate editing panel.
                                                                    -   It dynamically renders either `StepEditPanel` or `TransitionEditPanel` depending on whether the user has selected a step or a transition.
                                                                        -   Shows an empty state message when nothing is selected.

                                                                        -   **`WorkflowEditorToolbar.jsx`**: A toolbar on the left of the UI.
                                                                            -   **`handleAddStep`**: Contains a button to add a new step to the graph.
                                                                                -   **`onToggleEditMode`**: Contains a button to toggle the graph between a "Locked" state (no dragging) and an "Editing" state.
                                                                                    -   Displays informational widgets, like the current count of steps and transitions.

                                                                                    -   **`StepEditPanel.jsx`**: A form for editing the properties of a single workflow step.
                                                                                        -   Allows editing the step's name, assigned role, description, and instructions.
                                                                                            -   Includes checkboxes to designate a step as a "start" or "end" point of the workflow.
                                                                                                -   Handles both updating existing steps and configuring newly created (temporary) steps.

                                                                                                -   **`TransitionEditPanel.jsx`**: A form for editing the properties of a transition (the line between two steps).
                                                                                                    -   Allows editing the transition's name or label (e.g., "Approved", "Rejected").

                                                                                                    -   **`WorkflowEditPanel.jsx`**: A form for editing the global properties of the entire workflow.
                                                                                                        -   Edits fields like the workflow's name, description, category, department, and SLA times (in hours) for different priority levels.

                                                                                                        -   **`SLAWeightEditor.jsx`**: A sophisticated modal UI for managing Service Level Agreement (SLA) distribution.
                                                                                                            -   **`handleWeightChange()`**: Allows a user to adjust the "weight" of each step using a slider.
                                                                                                                -   **`calculateStepSLA()`**: Calculates and displays the portion of the total SLA time allocated to a specific step based on its weight relative to the total weight of all steps. This allows for fine-tuning how much time each step is expected to take.
                                                                                                                    -   **`handleSaveWeights()`**: Saves the updated weight distribution to the backend.

                                                                                                                    -   **`StepNode.jsx`**: A custom `reactflow` component that defines the visual appearance of a step node on the graph.
                                                                                                                        -   It displays the step's name, role, and description.
                                                                                                                            -   It also renders "START" and "END" badges if applicable.
