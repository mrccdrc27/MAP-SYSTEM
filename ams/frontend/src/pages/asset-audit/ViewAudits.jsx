import NavBar from "../../components/NavBar";
import "../../styles/ViewAudits.css";
import TopSecFormPage from "../../components/TopSecFormPage";
import { useLocation } from "react-router-dom";
import Status from "../../components/Status";
import dateRelated from "../../utils/dateRelated";

export default function ViewAudits() {
  const location = useLocation();

  // Retrieve the "data" value passed from the navigation state.
  // If the "data" is not exist, the default value for this is "undifiend".
  const data = location.state?.data;
  const previousPage = location.state?.previousPage;

  // For debugging only.
  // console.log("root: ", previousPage);
  // console.log("data:", data);

  // Function to assign the appropriate value for the root props in TopSecFormPage component
  const assignRoot = () => {
    if (previousPage == "/audits") {
      return "Audits";
    } else if (previousPage == "/audits/overdue") {
      return "Overdue Audit";
    } else if (previousPage == "/audits/scheduled") {
      return "Scheduled Audit";
    } else {
      return "Completed Audits";
    }
  };

  return (
    <>
      <nav>
        <NavBar />
      </nav>
      <main className="view-audits-page">
        <section className="top">
          <TopSecFormPage
            root={assignRoot()}
            currentPage="View Audits"
            rootNavigatePage={previousPage}
            title={`${data.asset_info.displayed_id} - ${data.asset_info.name}`}
          />
        </section>
        <section className="view-audits-content">
          <fieldset>
            <label htmlFor="date-created">Date Created</label>
            <p>{dateRelated.formatDateWithTime(data.created_at)}</p>
          </fieldset>

          <fieldset>
            <label htmlFor="status">Status</label>
            <p>
              <Status
                type={data.asset_info.status_info.type}
                name={data.asset_info.status_info.name}
              />
            </p>
          </fieldset>

          <fieldset>
            <label htmlFor="asset">Asset</label>
            <p>{data.asset_info.name}</p>
          </fieldset>

          <fieldset>
            <label htmlFor="asset-id">Asset ID</label>
            <p>{data.asset_info.displayed_id}</p>
          </fieldset>

          {data.audit_info != null && (
            <fieldset>
              <label htmlFor="location">Location</label>
              <p>{data.audit_info.location}</p>
            </fieldset>
          )}

          <fieldset>
            <label htmlFor="date">
              {previousPage != "/audits/completed" ? "Due Date" : "Audit Date"}
            </label>
            <p>
              {previousPage != "/audits/completed"
                ? dateRelated.formatDate(data.date)
                : dateRelated.formatDate(data.audit_date)}
            </p>
          </fieldset>

          {previousPage == "/audits/completed" && (
            <fieldset>
              <label htmlFor="next-audit-date">Next Audit Date</label>
              <p>{dateRelated.formatDate(data.audit_schedule_info.date)}</p>
            </fieldset>
          )}

          <fieldset>
            <label htmlFor="notes">Notes</label>
            <p>{data.notes == "" || data.notes == null ? "-" : data.notes}</p>
          </fieldset>

          {data.audit_info != null &&
            data.audit_info.audit_files.length > 0 && (
              <fieldset>
                <label htmlFor="attachments">Attachments</label>
                <div className="attachments-container">
                  {data.audit_info.audit_files.map((file, index) => {
                    return (
                      <a
                        href={assetsService.auditFileUrl(
                          String(file.file).slice(1)
                        )}
                        key={index}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={
                          file.file.match(/\.(jpg|jpeg|png|gif|pdf)$/i)
                            ? "Click to view"
                            : "Click to download"
                        }
                      >
                        {file.file.split("/").pop()}
                      </a>
                    );
                  })}
                </div>
              </fieldset>
            )}

          {previousPage == "/audits/completed" &&
            Array.from(data.audit_files).length > 0 && (
              <fieldset>
                <label htmlFor="attachments">Attachments</label>
                <div className="attachments-container">
                  {data.audit_files.map((file, index) => {
                    return (
                      <a
                        href={assetsService.auditFileUrl(
                          String(file.file).slice(1)
                        )}
                        key={index}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={
                          file.file.match(/\.(jpg|jpeg|png|gif|pdf)$/i)
                            ? "Click to view"
                            : "Click to download"
                        }
                      >
                        {file.file.split("/").pop()}
                      </a>
                    );
                  })}
                </div>
              </fieldset>
            )}
        </section>
      </main>
    </>
  );
}
