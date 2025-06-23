import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import StepForm from './StepForm';
import StepList from './StepList';
import TransitionList from './TransitionList';
import AddTransitionForm from './AddTransitionForm';
import StepModal from './StepModal';
import TransitionModal from './TransitionModal';
import useWorkflowEditorState from './useWorkflowEditorState';
import NewWorkflowVisualizer from "../../../../components/workflow/NewWorkflowVisualizer";
import { useWorkflowRefresh } from '../../../../components/workflow/WorkflowRefreshContext';

export default function WorkflowEditor2() {

  const { triggerRefresh } = useWorkflowRefresh()
  const { uuid } = useParams();
  const state = useWorkflowEditorState(uuid);
  const { workflow, loading, error } = state;

  const [activeTab, setActiveTab] = useState('steps');

  if (loading) return <div style={styles.centerText}>Loading workflow...</div>;
  if (error) return <div style={{ ...styles.centerText, color: 'red' }}>Error: {error}</div>;
  if (!workflow) return <div style={styles.centerText}>No workflow found.</div>;

  return (
    <div style={styles.wrapper}>
      {/* Header */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>{workflow.name}</h1>
          <p style={styles.subtitle}>{workflow.description}</p>
        </div>

        <button
          onClick={async () => {
            await state.handleUndoTransition();
            triggerRefresh(); // ensure it's called after undo finishes
          }}
          
          disabled={!state.previousTransition}
          style={{
            ...styles.undoButton,
            opacity: state.previousTransition ? 1 : 0.4,
            cursor: state.previousTransition ? 'pointer' : 'not-allowed'
          }}
        >
          ⟲ Undo Transition Edit
        </button>
        
      </header>

      {/* Main Area */}
      <main style={styles.main}>
        {/* Sidebar */}
        <aside style={styles.sidebar}>
          <nav style={styles.tabBar}>
            <button
              onClick={() => setActiveTab('steps')}
              style={activeTab === 'steps' ? styles.tabActive : styles.tab}
            >
              Steps
            </button>
            <button
              onClick={() => setActiveTab('transitions')}
              style={activeTab === 'transitions' ? styles.tabActive : styles.tab}
            >
              Transitions
            </button>
          </nav>

          <section style={styles.sidebarContent}>
            {activeTab === 'steps' ? (
              <>
                <StepForm {...state} />
                <StepList {...state} />
              </>
            ) : (
              <>
                <AddTransitionForm {...state} />
                <TransitionList {...state} />
              </>
            )}
          </section>
        </aside>

        {/* Workflow Visualizer */}
        <section style={styles.visualizer}>
          <NewWorkflowVisualizer workflowId={uuid} />
        </section>
      </main>

      {/* Modals */}
      <StepModal {...state} />
      <TransitionModal {...state} />
    </div>
  );
}

// Auto-spacing + fluid layout styles
const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    fontFamily: 'sans-serif',
  },
  header: {
    padding: '1rem',
    backgroundColor: '#f5f5f5',
    borderBottom: '1px solid #ddd',
  },
  title: {
    margin: 0,
    fontSize: '1.2rem',
    fontWeight: 'bold',
  },
  subtitle: {
    margin: 0,
    fontSize: '0.9rem',
    color: '#555',
  },
  main: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  sidebar: {
    flex: '0 0 300px',
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid #ddd',
    backgroundColor: '#fafafa',
  },
  tabBar: {
    display: 'flex',
    borderBottom: '1px solid #ccc',
  },
  tab: {
    flex: 1,
    padding: '0.75rem',
    backgroundColor: '#eee',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  tabActive: {
    flex: 1,
    padding: '0.75rem',
    backgroundColor: '#ddd',
    border: 'none',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  sidebarContent: {
    flex: 1,
    overflowY: 'auto',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  visualizer: {
    flex: 1,
    padding: '1rem',
    overflow: 'hidden',
  },
  centerText: {
    padding: '2rem',
    textAlign: 'center',
    fontSize: '1rem',
  },
};
