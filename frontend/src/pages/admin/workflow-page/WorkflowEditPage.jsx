import { useNavigate } from "react-router-dom";
import { useParams } from 'react-router-dom';

import AdminNav from "../../../components/navigations/admin-nav/AdminNav";
import TitleCard from "../../../components/TitleCard";

import style from "./Workflow.module.css";
import forms from "../../../forms.module.css";
import WorkflowEditor from "./WorkflowEditor";

export default function WorkflowEditorPage() {
  const navigate = useNavigate();
  const { uuid } = useParams(); // Get workflow UUID from route

  return (
    <>
      <AdminNav />
      <main className={style.main}>
        <section>
          <div className={style.title}>
            <TitleCard 
              title="Workflow"
              name="jessa"
            />
          </div>
          <hr />
        </section>
        <section>
            <WorkflowEditor />
        </section>
      </main>
    </>
  );
} 