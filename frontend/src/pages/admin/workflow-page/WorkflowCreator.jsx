import { useNavigate } from "react-router-dom";

import AdminNav from "../../../components/navigations/admin-nav/AdminNav";
import TitleCard from "../../../components/TitleCard";

import style from "./WorkflowCreator.module.css";
// import forms from "../../../forms.module.css";
// import CreateStep from "./components/createstep";
// import WorkflowSteps from "./components/stepcard";
// import WorkflowManager from "./components/WorkflowManager.jsx";
import WorkflowManager from "./workflowmanager";
import CreateWorkflowForm from "./CreateWorkflowForm";

export default function WorkflowCreate() {
  const navigate = useNavigate();

  return (
    <>
      <AdminNav />
      <main className={style.main}>
        <section>
          <i class="fa-solid fa-angle-left"
          style={{
              fontSize:'30px',
              color:'blue'
          }}
          onClick={() => navigate("/admin/workflow")}
          />
          <div className={style.title}>
            <TitleCard 
              title="Workflow Creator"
              name="jessa"
            />
          </div>
          <hr />
        </section>
        <section className={style.whole}>
          <CreateWorkflowForm />
        </section>
      </main>
    </>
  );
} 