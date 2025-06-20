// style
import styles from "./workflow-detail.module.css";

// component
import AdminNav from "../../../components/navigation/AdminNav";

export default function WorkflowDetail() {
  return (
    <>
      <AdminNav />
      <main className={styles.workflowDetailPage}>
        <section className={styles.wpdHeader}>
          <h1>Workflow Detail</h1>
        </section>
        <section className={styles.wpdBody}>
          {/* content here */}
        </section>
      </main>
    </>
  );
}
