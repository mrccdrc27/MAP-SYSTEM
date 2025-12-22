import "../styles/TabNavBar.css";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

export default function TabNavBar() {
  const navigate = useNavigate();
  const [countScheduleAudits, setCountScheduleAudits] = useState(0);
  const [countAudits, setCountAudits] = useState(0);
  const [countOverdueAudits, setCountOverdueAudits] = useState(0);

  // Retrieve the count of all the schedule audits, audits, and overdue audits.
  useEffect(() => {
    const makeRequest = async () => {
      const countScheduleAudits = await assetsService.countAllScheduleAudits();
      const countAudits = await assetsService.countAllAudits();
      const countOverdueAudits = await assetsService.countAllOverdueAudits();

      setCountScheduleAudits(countScheduleAudits);
      setCountAudits(countAudits);
      setCountOverdueAudits(countOverdueAudits);
    };

    makeRequest();
  }, []);

  return (
    <nav className="tab-nav">
      <ul>
        <li className={location.pathname === "/audits" ? "active" : ""}>
          <a
            className={location.pathname === "/audits" ? "active" : ""}
            onClick={() => navigate("/audits")}
          >
            Due to be Audited ({countScheduleAudits})
          </a>
        </li>
        <li className={location.pathname === "/audits/overdue" ? "active" : ""}>
          <a
            className={location.pathname === "/audits/overdue" ? "active" : ""}
            onClick={() => navigate("/audits/overdue")}
          >
            Overdue for Audit ({countOverdueAudits})
          </a>
        </li>
        <li
          className={location.pathname === "/audits/scheduled" ? "active" : ""}
        >
          <a
            className={
              location.pathname === "/audits/scheduled" ? "active" : ""
            }
            onClick={() => navigate("/audits/scheduled")}
          >
            Scheduled Audit ({countScheduleAudits})
          </a>
        </li>
        <li
          className={location.pathname === "/audits/completed" ? "active" : ""}
        >
          <a
            className={
              location.pathname === "/audits/completed" ? "active" : ""
            }
            onClick={() => navigate("/audits/completed")}
          >
            Completed Audit ({countAudits})
          </a>
        </li>
      </ul>
    </nav>
  );
}
