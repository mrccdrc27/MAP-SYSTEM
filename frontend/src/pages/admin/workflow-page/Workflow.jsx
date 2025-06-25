// styles
import styles from "./workflow.module.css";
import general from "../../../style/general.module.css";

// components
import AdminNav from "../../../components/navigation/AdminNav";
import FilterPanel from "../../../components/component/FilterPanel";

// modal
import AddWorkflow from "./modals/AddWorkflow";

// react
import { useEffect, useState } from "react";

// table
import WorkflowTable from "../../../tables/admin/WorkflowTable";

// axios
import axios from "axios";
import useFetchWorkflows from "../../../api/useFetchWorkflows";
// api
const workflowURL = import.meta.env.VITE_TICKET_API;



export default function Workflow() {
  // open ticket action modal
  const [openAddWorkflow, setOpenAddWorkflow] = useState(false);
  const {workflows, refetch} = useFetchWorkflows();
  const [allworkflow, setAllWorkflow] = useState([]);

  useEffect(() => {
    if (workflows.length > 0) {
      // setOpenAddWorkflow(workflows)
      setAllWorkflow(workflows)
    }
  }, [workflows])


  return (
    <>
      <AdminNav />
      <main className={styles.workflowPage}>
        <section className={styles.wpHeader}>
          <h1>Workflow</h1>
        </section>
        <section className={styles.wpBody}>
          <div className={styles.wpFilterSection}>
            <FilterPanel />
          </div>
          <div className={styles.wpTableSection}>
            <div className={general.tpTable}>
              <WorkflowTable workflows={allworkflow} onAddWorkflow={setOpenAddWorkflow}/>
            </div>
          </div>
        </section>
      </main>
      {openAddWorkflow && (
        <AddWorkflow closeAddWorkflow={() => 
          setOpenAddWorkflow(false)
        } />
      )}
    </>
  );
}
