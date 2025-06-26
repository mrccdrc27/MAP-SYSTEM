// style
import styles from "./workflow-detail.module.css";

// component
import AdminNav from "../../../components/navigation/AdminNav";
import WorkflowEditor from "./components/WorkflowEditor";

// react
import { useParams, useNavigate } from "react-router-dom";

import WorkflowVisualizer from "../../../components/ticket/WorkflowVisualizer";
import TestFlow from "../../../components/workflow/testflow";
import NewWorkflowVisualizer from "../../../components/workflow/NewWorkflowVisualizer";


export default function WorkflowDetail() {
  const navigate = useNavigate()
  const { uuid } = useParams();
  return (
    <>
      <AdminNav />
      <main className={styles.workflowDetailPage}>
        <section className={styles.wpdHeader}>
          <div>
            <span className={styles.wpdBack} onClick={() => navigate(-1)}>Workflow </span>
            <span className={styles.wpdCurrent}>/ Workflow Detail</span>
          </div>
        </section>
        <section className={styles.wpdBody}>
          <WorkflowEditor />
        </section>
      </main>
    </>
  );
}
