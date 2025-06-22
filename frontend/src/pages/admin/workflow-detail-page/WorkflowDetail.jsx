// style
import styles from "./workflow-detail.module.css";

// component
import AdminNav from "../../../components/navigation/AdminNav";

import WorkflowEditor from "./WorkflowEditor";
import WorkflowVisualizer from "../../../components/ticket/WorkflowVisualizer";
import { useParams } from "react-router-dom";
import TestFlow from "../../../components/workflow/testflow";
import NewWorkflowVisualizer from "../../../components/workflow/NewWorkflowVisualizer";

export default function WorkflowDetail() {
  const {uuid} = useParams();
  return (
    <>
      <AdminNav />
      <main className={styles.workflowDetailPage}>
        <section className={styles.wpdHeader}>
          <h1>Workflow Detail</h1>
        </section>
        <section className={styles.wpdBody}>
          <WorkflowEditor/>
        </section>
      </main>
    </>
  );
}
