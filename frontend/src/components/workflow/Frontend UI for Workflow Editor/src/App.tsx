import { useState } from 'react';
import { WorkflowRefreshProvider } from './components/workflow/WorkflowRefreshContext';
import NewWorkflowVisualizer from './components/workflow/NewWorkflowVisualizer';
import WorkflowEditorLayout from './components/workflow/WorkflowEditor/WorkflowEditorLayout';
import { Eye, Edit3 } from 'lucide-react';

export default function App() {
  const [view, setView] = useState<'visualizer' | 'editor'>('visualizer');
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('workflow-1');

  return (
    <WorkflowRefreshProvider>
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h1 className="text-gray-900">Workflow Manager</h1>
              </div>
              <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setView('visualizer')}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    view === 'visualizer'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  Visualizer
                </button>
                <button
                  onClick={() => setView('editor')}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    view === 'editor'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Edit3 className="w-4 h-4" />
                  Editor
                </button>
              </div>
            </div>
            <select
              value={selectedWorkflowId}
              onChange={(e) => setSelectedWorkflowId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
            >
              <option value="workflow-1">Customer Onboarding</option>
              <option value="workflow-2">Order Processing</option>
              <option value="workflow-3">Support Ticket</option>
            </select>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          {view === 'visualizer' ? (
            <NewWorkflowVisualizer workflowId={selectedWorkflowId} />
          ) : (
            <WorkflowEditorLayout workflowId={selectedWorkflowId} />
          )}
        </main>
      </div>
    </WorkflowRefreshProvider>
  );
}