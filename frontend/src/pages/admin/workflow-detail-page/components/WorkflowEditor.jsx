// react and routing
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

// local components
import StepForm from "./StepForm";
import StepList from "./StepList";
import TransitionList from "./TransitionList";
import AddTransitionForm from "./AddTransitionForm";
import StepModal from "./StepModal";
import TransitionModal from "./TransitionModal";

// hooks
import useWorkflowEditorState from "./useWorkflowEditorState";

// shared components
import NewWorkflowVisualizer from "../../../../components/workflow/NewWorkflowVisualizer";
import { useWorkflowRefresh } from "../../../../components/workflow/WorkflowRefreshContext";

// styles
import styles from "./workflow-editor2.module.css";

// import styles from './WorkflowHeader.module.css';
import WorkflowHeader from './WorkflowHeader';


export default function WorkflowEditor2() {
  const { triggerRefresh } = useWorkflowRefresh();
  const { uuid } = useParams();
  const state = useWorkflowEditorState(uuid);
  const { workflow, loading, error } = state;
  const [activeTab, setActiveTab] = useState("steps");
  const navigate = useNavigate();

  if (loading)
    return <div className={styles.centerText}>Loading workflow...</div>;
  if (error)
    return (
      <div className={`${styles.centerText} ${styles.error}`}>
        Error: {error}
      </div>
    );
  if (!workflow)
    return <div className={styles.centerText}>No workflow found.</div>;

  return (
    <div className={styles.wrapper}>
      <WorkflowHeader workflow={workflow}/>
      <header className={styles.header}>
        <button
          onClick={async () => {
            await state.handleUndoTransition();
            triggerRefresh();
          }}
          disabled={!state.previousTransition}
          className={`${styles.undoButton} ${
            !state.previousTransition ? styles.disabled : ""
          }`}
        >
          ⟲ Undo Transition Edit
        </button>
      </header>

      <main className={styles.main}>
        <aside className={styles.sidebar}>
          <nav className={styles.tabBar}>
            <button
              onClick={() => setActiveTab("steps")}
              className={activeTab === "steps" ? styles.tabActive : styles.tab}
            >
              Steps
            </button>
            <button
              onClick={() => setActiveTab("transitions")}
              className={
                activeTab === "transitions" ? styles.tabActive : styles.tab
              }
            >
              Transitions
            </button>
          </nav>

          <section className={styles.sidebarContent}>
            {activeTab === "steps" ? (
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

      <StepModal {...state} />
      <TransitionModal {...state} />
    </div>
  );
}
