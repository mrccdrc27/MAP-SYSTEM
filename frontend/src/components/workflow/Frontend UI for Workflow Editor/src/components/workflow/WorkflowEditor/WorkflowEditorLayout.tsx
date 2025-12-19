import { useState, useEffect, useCallback } from 'react';
import { Save, RefreshCw, Undo, Redo, AlertCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import WorkflowEditorContent from './WorkflowEditorContent';
import WorkflowEditorSidebar from './WorkflowEditorSidebar';
import WorkflowEditorToolbar from './WorkflowEditorToolbar';
import SLAWeightEditor from './SLAWeightEditor';
import ConfirmDialog from './ConfirmDialog';
import { useWorkflowRefresh } from '../WorkflowRefreshContext';

export interface WorkflowStep {
  id: string;
  label: string;
  role: string;
  isStart?: boolean;
  isEnd?: boolean;
  slaWeight?: number;
}

export interface WorkflowTransition {
  id: string;
  source: string;
  target: string;
  label: string;
}

export interface WorkflowData {
  name: string;
  description: string;
  totalSLA: number;
  steps: WorkflowStep[];
  transitions: WorkflowTransition[];
}

interface WorkflowEditorLayoutProps {
  workflowId: string;
}

export default function WorkflowEditorLayout({ workflowId }: WorkflowEditorLayoutProps) {
  const { triggerRefresh } = useWorkflowRefresh();
  const [selectedElement, setSelectedElement] = useState<{ type: 'step' | 'transition' | 'workflow'; id?: string } | null>(null);
  const [showSLAModal, setShowSLAModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [toolbarCollapsed, setToolbarCollapsed] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    type: 'deleteStep' | 'deleteTransition';
    id: string;
    title: string;
    message: string;
  } | null>(null);
  
  const [workflowData, setWorkflowData] = useState<WorkflowData>({
    name: 'Customer Onboarding',
    description: 'Workflow for onboarding new customers',
    totalSLA: 48,
    steps: [
      { id: '1', label: 'Submit Application', role: 'Customer', isStart: true, slaWeight: 1 },
      { id: '2', label: 'Review Documents', role: 'Admin', slaWeight: 2 },
      { id: '3', label: 'Approve Account', role: 'Manager', slaWeight: 1 },
      { id: '4', label: 'Setup Complete', role: 'System', isEnd: true, slaWeight: 1 },
    ],
    transitions: [
      { id: 'e1-2', source: '1', target: '2', label: 'Submit' },
      { id: 'e2-3', source: '2', target: '3', label: 'Approved' },
      { id: 'e3-4', source: '3', target: '4', label: 'Activate' },
    ],
  });

  // History management for undo/redo
  const [history, setHistory] = useState<WorkflowData[]>([workflowData]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [savedHistoryIndex, setSavedHistoryIndex] = useState(0);

  // Track unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(historyIndex !== savedHistoryIndex);
  }, [historyIndex, savedHistoryIndex]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y for redo
      if ((e.ctrlKey || e.metaKey) && (e.shiftKey && e.key === 'z') || e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
      // Ctrl/Cmd + S for save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history]);

  const addToHistory = useCallback((newData: WorkflowData) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newData);
      // Limit history to 50 states
      if (newHistory.length > 50) {
        return newHistory.slice(-50);
      }
      return newHistory;
    });
    setHistoryIndex((prev) => {
      const newIndex = prev + 1;
      return newIndex >= 50 ? 49 : newIndex;
    });
  }, [historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setWorkflowData(history[newIndex]);
    }
  }, [historyIndex, history]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setWorkflowData(history[newIndex]);
    }
  }, [historyIndex, history]);

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API save
    setTimeout(() => {
      console.log('Saving workflow:', workflowData);
      setIsSaving(false);
      setSavedHistoryIndex(historyIndex);
      setHasUnsavedChanges(false);
      triggerRefresh();
    }, 500);
  };

  const handleUpdateStep = (stepId: string, updates: Partial<WorkflowStep>) => {
    const newData = {
      ...workflowData,
      steps: workflowData.steps.map((step) =>
        step.id === stepId ? { ...step, ...updates } : step
      ),
    };
    setWorkflowData(newData);
    addToHistory(newData);
  };

  const handleUpdateTransition = (transitionId: string, updates: Partial<WorkflowTransition>) => {
    const newData = {
      ...workflowData,
      transitions: workflowData.transitions.map((transition) =>
        transition.id === transitionId ? { ...transition, ...updates } : transition
      ),
    };
    setWorkflowData(newData);
    addToHistory(newData);
  };

  const handleUpdateWorkflow = (updates: Partial<WorkflowData>) => {
    const newData = { ...workflowData, ...updates };
    setWorkflowData(newData);
    addToHistory(newData);
  };

  const handleAddStep = (label: string) => {
    const newId = String(workflowData.steps.length + 1);
    const newStep: WorkflowStep = {
      id: newId,
      label,
      role: 'Unassigned',
      slaWeight: 1,
    };
    const newData = {
      ...workflowData,
      steps: [...workflowData.steps, newStep],
    };
    setWorkflowData(newData);
    addToHistory(newData);
  };

  const handleUpdateSLAWeights = (weights: Record<string, number>) => {
    const newData = {
      ...workflowData,
      steps: workflowData.steps.map((step) => ({
        ...step,
        slaWeight: weights[step.id] ?? step.slaWeight ?? 1,
      })),
    };
    setWorkflowData(newData);
    addToHistory(newData);
  };

  const handleDeleteStep = (stepId: string) => {
    const step = workflowData.steps.find((s) => s.id === stepId);
    if (!step) return;

    setConfirmDialog({
      type: 'deleteStep',
      id: stepId,
      title: 'Delete Step',
      message: `Are you sure you want to delete "${step.label}"? This will also remove all connected transitions.`,
    });
  };

  const handleDeleteTransition = (transitionId: string) => {
    const transition = workflowData.transitions.find((t) => t.id === transitionId);
    if (!transition) return;

    setConfirmDialog({
      type: 'deleteTransition',
      id: transitionId,
      title: 'Delete Transition',
      message: `Are you sure you want to delete the transition "${transition.label}"?`,
    });
  };

  const confirmDelete = () => {
    if (!confirmDialog) return;

    if (confirmDialog.type === 'deleteStep') {
      const newData = {
        ...workflowData,
        steps: workflowData.steps.filter((s) => s.id !== confirmDialog.id),
        transitions: workflowData.transitions.filter(
          (t) => t.source !== confirmDialog.id && t.target !== confirmDialog.id
        ),
      };
      setWorkflowData(newData);
      addToHistory(newData);
      setSelectedElement(null);
    } else if (confirmDialog.type === 'deleteTransition') {
      const newData = {
        ...workflowData,
        transitions: workflowData.transitions.filter((t) => t.id !== confirmDialog.id),
      };
      setWorkflowData(newData);
      addToHistory(newData);
      setSelectedElement(null);
    }

    setConfirmDialog(null);
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <div className="h-full flex flex-col">
      {/* Unsaved Changes Warning */}
      {hasUnsavedChanges && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-yellow-800">
            <AlertCircle className="w-4 h-4" />
            <span>You have unsaved changes</span>
          </div>
          <button
            onClick={handleSave}
            className="text-sm text-yellow-800 hover:text-yellow-900 underline"
          >
            Save now
          </button>
        </div>
      )}

      {/* Ribbon Actions */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={isSaving || !hasUnsavedChanges}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
          
          <div className="h-6 w-px bg-gray-300 mx-1" />
          
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="p-2 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Undo className="w-4 h-4 text-gray-700" />
          </button>
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className="p-2 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Redo className="w-4 h-4 text-gray-700" />
          </button>

          <div className="h-6 w-px bg-gray-300 mx-1" />

          <button
            onClick={() => setShowSLAModal(true)}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Manage SLA
          </button>
        </div>
        <div className="text-sm text-gray-600">
          {workflowData.steps.length} steps • {workflowData.transitions.length} transitions
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Toolbar */}
        {!toolbarCollapsed ? (
          <div className="relative">
            <WorkflowEditorToolbar
              onAddStep={handleAddStep}
              stepCount={workflowData.steps.length}
              transitionCount={workflowData.transitions.length}
            />
            <button
              onClick={() => setToolbarCollapsed(true)}
              className="absolute top-2 -right-3 p-1 bg-white border border-gray-200 rounded shadow-sm hover:bg-gray-50 transition-colors"
              title="Hide toolbar"
            >
              <ChevronLeft className="w-3 h-3 text-gray-600" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setToolbarCollapsed(false)}
            className="w-8 bg-white border-r border-gray-200 hover:bg-gray-50 transition-colors flex items-center justify-center"
            title="Show toolbar"
          >
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        )}

        {/* Canvas */}
        <div className="flex-1">
          <WorkflowEditorContent
            workflowData={workflowData}
            onSelectElement={setSelectedElement}
            onUpdateSteps={(steps) => {
              const newData = { ...workflowData, steps };
              setWorkflowData(newData);
              addToHistory(newData);
            }}
            onUpdateTransitions={(transitions) => {
              const newData = { ...workflowData, transitions };
              setWorkflowData(newData);
              addToHistory(newData);
            }}
          />
        </div>

        {/* Sidebar */}
        {!sidebarCollapsed ? (
          <div className="relative">
            <WorkflowEditorSidebar
              selectedElement={selectedElement}
              workflowData={workflowData}
              onUpdateStep={handleUpdateStep}
              onUpdateTransition={handleUpdateTransition}
              onUpdateWorkflow={handleUpdateWorkflow}
              onDeleteStep={handleDeleteStep}
              onDeleteTransition={handleDeleteTransition}
              onClose={() => setSelectedElement(null)}
            />
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="absolute top-2 -left-3 p-1 bg-white border border-gray-200 rounded shadow-sm hover:bg-gray-50 transition-colors"
              title="Hide sidebar"
            >
              <ChevronRight className="w-3 h-3 text-gray-600" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="w-8 bg-white border-l border-gray-200 hover:bg-gray-50 transition-colors flex items-center justify-center"
            title="Show sidebar"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
        )}
      </div>

      {/* SLA Weight Modal */}
      {showSLAModal && (
        <SLAWeightEditor
          steps={workflowData.steps}
          totalSLA={workflowData.totalSLA}
          onSave={handleUpdateSLAWeights}
          onClose={() => setShowSLAModal(false)}
        />
      )}

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          variant="danger"
          onConfirm={confirmDelete}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
}