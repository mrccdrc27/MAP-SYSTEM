import { useState } from "react";
import { useParams } from "react-router-dom";

// Components
import StepForm from "./StepForm";
import StepList from "./StepList";
import TransitionList from "./TransitionList";
import AddTransitionForm from "./AddTransitionForm";
import StepModal from "./StepModal";
import TransitionModal from "./TransitionModal";
import WorkflowHeader from "./WorkflowHeader";
import NewWorkflowVisualizer from "../../../../components/workflow/NewWorkflowVisualizer";

// Hooks
import useWorkflowEditorState from "./useWorkflowEditorState";
import { useWorkflowRefresh } from "../../../../components/workflow/WorkflowRefreshContext";

// Styles
import styles from "./workflow-editor2.module.css";

export default function WorkflowEditor2() {
  const { uuid } = useParams();
  const { triggerRefresh } = useWorkflowRefresh();
  const state = useWorkflowEditorState(uuid);
  const { workflow, loading, error } = state;

  const [mainTab, setMainTab] = useState("steps");
  const [activeTab, setActiveTab] = useState("details"); // "details", "main", or "edit"

  if (loading)
    return <div className={styles.centerText}>Loading workflow...</div>;
  if (error)
    return <div className={`${styles.centerText} ${styles.error}`}>Error: {error}</div>;
  if (!workflow)
    return <div className={styles.centerText}>No workflow found.</div>;

  return (
    <div className={styles.wrapper}>
      <div className={styles.title}>
        <h2>Preview</h2>
      </div>

      {/* Tab Navigation */}
      <nav className={styles.topTabBar}>
        <button
          onClick={() => setActiveTab("details")}
          className={activeTab === "details" ? styles.tabActive : styles.tab}
        >
          Details
        </button>
        <button
          onClick={() => setActiveTab("main")}
          className={activeTab === "main" ? styles.tabActive : styles.tab}
        >
          Manage Workflow
        </button>
        <button
          onClick={() => setActiveTab("edit")}
          className={activeTab === "edit" ? styles.tabActive : styles.tab}
        >
          Edit
        </button>
      </nav>

      {/* Always show full details in details tab (read-only) */}
      {activeTab === "details" && (
        <WorkflowHeader workflow={workflow} forceDetailsOnly />
      )}

      {/* Workflow Steps/Transitions Tab */}
      {activeTab === "main" && (
        <>
          <header className={styles.header}>
            <button
              onClick={async () => {
                await state.handleUndoTransition();
                triggerRefresh();
              }}
              disabled={!state.previousTransition}
              className={`${styles.undoButton} ${!state.previousTransition ? styles.disabled : ""}`}
            >
              ⟲ Undo Transition Edit
            </button>
          </header>

          <main className={styles.main}>
            <aside className={styles.sidebar}>
              <nav className={styles.tabBar}>
                <button
                  onClick={() => setMainTab("steps")}
                  className={mainTab === "steps" ? styles.tabActive : styles.tab}
                >
                  Steps
                </button>
                <button
                  onClick={() => setMainTab("transitions")}
                  className={mainTab === "transitions" ? styles.tabActive : styles.tab}
                >
                  Transitions
                </button>
              </nav>

              <section className={styles.sidebarContent}>
                {mainTab === "steps" ? (
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

            <section className={styles.visualizer}>
              <NewWorkflowVisualizer workflowId={uuid} />
            </section>
          </main>
        </>
      )}

      {/* Edit tab: editable form version shown immediately */}
      {activeTab === "edit" && (
        <WorkflowHeader
          workflow={workflow}
          onSave={state.handleSaveWorkflow}
          forceEditable
        />
      )}

      <StepModal {...state} />
      <TransitionModal {...state} />
    </div>
  );
}
