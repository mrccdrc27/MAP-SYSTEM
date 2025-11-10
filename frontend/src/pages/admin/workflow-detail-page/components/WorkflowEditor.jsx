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
  const [activeTab, setActiveTab] = useState("manage");
  const [isEditMode, setIsEditMode] = useState(false);

  if (loading)
    return <div className={styles.centerText}>Loading workflow...</div>;
  if (error)
    return <div className={`${styles.centerText} ${styles.error}`}>Error: {error}</div>;
  if (!workflow)
    return <div className={styles.centerText}>No workflow found.</div>;

  return (
    <div className={styles.wrapper}>
      {/* TOP RIBBON - Workflow Management */}
      <div className={styles.topRibbon}>
        <div className={styles.ribbonLeft}>
          <h2 className={styles.workflowTitle}>{workflow.name}</h2>
          <span className={styles.workflowMeta}>
            {workflow.category && `${workflow.category}`}
            {workflow.category && workflow.sub_category && " • "}
            {workflow.sub_category && `${workflow.sub_category}`}
          </span>
        </div>

        <nav className={styles.ribbonTabs}>
          <button
            onClick={() => setActiveTab("manage")}
            className={activeTab === "manage" ? styles.ribbonTabActive : styles.ribbonTab}
          >
            Manage
          </button>
          <button
            onClick={() => setActiveTab("details")}
            className={activeTab === "details" ? styles.ribbonTabActive : styles.ribbonTab}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab("edit")}
            className={activeTab === "edit" ? styles.ribbonTabActive : styles.ribbonTab}
          >
            Edit
          </button>
        </nav>

        <div className={styles.ribbonRight}>
          <button
            className={`${styles.modeToggle} ${isEditMode ? styles.modeActive : ""}`}
            onClick={() => setIsEditMode(!isEditMode)}
            title={isEditMode ? "Lock editing" : "Unlock editing"}
          >
            {isEditMode ? "🔓 Editing" : "🔒 Locked"}
          </button>
        </div>
      </div>

      {/* MANAGE TAB - Main Editor */}
      {activeTab === "manage" && (
        <div className={styles.editorContainer}>
          {/* LEFT PANEL - Steps/Transitions List */}
          <aside className={styles.leftPanel}>
            <nav className={styles.panelTabs}>
              <button
                onClick={() => setMainTab("steps")}
                className={mainTab === "steps" ? styles.panelTabActive : styles.panelTab}
              >
                <span className={styles.tabIcon}>📋</span>
                Steps
              </button>
              <button
                onClick={() => setMainTab("transitions")}
                className={mainTab === "transitions" ? styles.panelTabActive : styles.panelTab}
              >
                <span className={styles.tabIcon}>🔀</span>
                Transitions
              </button>
            </nav>

            <div className={styles.panelContent}>
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
            </div>
          </aside>

          {/* CENTER - Main Graph/Visualizer */}
          <main className={styles.centerArea}>
            <NewWorkflowVisualizer workflowId={uuid} />
          </main>

          {/* RIGHT TOOLBAR - Actions */}
          <aside className={styles.rightToolbar}>
            <div className={styles.toolbarSection}>
              <h4 className={styles.toolbarTitle}>Actions</h4>
              
              <button
                className={styles.actionBtn}
                onClick={async () => {
                  await state.handleUndoTransition();
                  triggerRefresh();
                }}
                disabled={!state.previousTransition}
                title="Undo the last transition edit"
              >
                <span className={styles.btnIcon}>↶</span>
                <span className={styles.btnText}>Undo</span>
              </button>

              <button
                className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                onClick={() => state.handleSaveWorkflow()}
                title="Save all changes to workflow"
              >
                <span className={styles.btnIcon}>💾</span>
                <span className={styles.btnText}>Save</span>
              </button>
            </div>

            <div className={styles.toolbarSection}>
              <h4 className={styles.toolbarTitle}>Info</h4>
              <div className={styles.infoBox}>
                <p className={styles.infoLabel}>Steps:</p>
                <p className={styles.infoValue}>
                  {workflow.graph?.nodes?.length || 0}
                </p>
              </div>
              <div className={styles.infoBox}>
                <p className={styles.infoLabel}>Transitions:</p>
                <p className={styles.infoValue}>
                  {workflow.graph?.edges?.length || 0}
                </p>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* DETAILS TAB */}
      {activeTab === "details" && (
        <div className={styles.detailsContainer}>
          <WorkflowHeader workflow={workflow} forceDetailsOnly />
        </div>
      )}

      {/* EDIT TAB */}
      {activeTab === "edit" && (
        <div className={styles.editContainer}>
          <WorkflowHeader
            workflow={workflow}
            onSave={state.handleSaveWorkflow}
            forceEditable
          />
        </div>
      )}

      {/* MODALS */}
      <StepModal {...state} />
      <TransitionModal {...state} />
    </div>
  );
}
