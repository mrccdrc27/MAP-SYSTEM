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

import styles from './WorkflowHeader.module.css';
import WorkflowHeader from './WorkflowHeader';


export default function WorkflowEditor2() {

  const { triggerRefresh } = useWorkflowRefresh()
  const { uuid } = useParams();
  const state = useWorkflowEditorState(uuid);
  const { workflow, loading, error } = state;

  const [activeTab, setActiveTab] = useState('steps');

  if (loading) return <div className={styles.centerText}>Loading workflow...</div>;
  if (error) return <div className={{ ...styles.centerText, color: 'red' }}>Error: {error}</div>;
  if (!workflow) return <div className={styles.centerText}>No workflow found.</div>;
  console.log('workflow', workflow)


  return (
    <div className={styles.wrapper}>
      {/* Header */}
        <header className={styles.header}>
        <WorkflowHeader workflow={workflow}/>
        <button
          onClick={async () => {
            await state.handleUndoTransition();
            triggerRefresh(); // ensure it's called after undo finishes
          }}
          
          disabled={!state.previousTransition}
          className={{
            ...styles.undoButton,
            opacity: state.previousTransition ? 1 : 0.4,
            cursor: state.previousTransition ? 'pointer' : 'not-allowed'
          }}
        >
          ⟲ Undo Transition Edit
        </button>
        
        </header>

      {/* Main Area */}
      <main className={styles.main}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <nav className={styles.tabBar}>
            <button
              onClick={() => setActiveTab('steps')}
              className={activeTab === 'steps' ? styles.tabActive : styles.tab}
            >
              Steps
            </button>
            <button
              onClick={() => setActiveTab('transitions')}
              className={activeTab === 'transitions' ? styles.tabActive : styles.tab}
            >
              Transitions
            </button>
          </nav>

          <section className={styles.sidebarContent}>
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
        <section className={styles.visualizer}>
          <NewWorkflowVisualizer workflowId={uuid} />
        </section>
      </main>

      {/* Modals */}
      <StepModal {...state} />
      <TransitionModal {...state} />
    </div>
  );
}
