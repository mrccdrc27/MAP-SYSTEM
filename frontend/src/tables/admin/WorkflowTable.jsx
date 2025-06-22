// style
import general from "../../style/general.module.css";

// components
import { SearchBar } from "../../components/component/General";
import Pagination from "../../components/component/Pagination";

// react
import { useNavigate } from "react-router-dom";
import { useState } from "react";

// headers for the table
const workflowHeaders = [
  "WORKFLOW",
  "MAIN CATEGORY",
  "SUB CATEGORY",
  "DESCRIPTION",
  "STATUS",
  "ACTION",
];

function WorkflowHeader() {
  return (
    <tr className={general.header}>
      {workflowHeaders.map((header) => (
        <th key={header}>{header}</th>
      ))}
    </tr>
  );
}

function WorkflowItem({ item }) {
  const navigate = useNavigate();
  return (
    <tr className={general.item}>
      <td>{item.name}</td> 
      <td>{item.category}</td> 
      <td>{item.sub_category}</td> 
      <td>{item.description}</td> 
      <td>{item.status}</td> 
      <td>
        <button
          className={general.btn}
          onClick={() => navigate(`/admin/workflow/${item.workflow_id}`)}
        >
          👁
        </button>
      </td>
    </tr>
  );
}

export default function WorkflowTable({
  workflows,
  searchValue = "",
  onSearchChange,
  activeTab,
  onAddWorkflow,
}) {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedTickets = workflows.slice(startIndex, endIndex);

  return (
    <div className={general.ticketTableSection}>
      <div className={general.tableHeader}>
        <h2>Workflow</h2>
        <div className={general.tableActions}>
          <SearchBar value={searchValue} onChange={onSearchChange} />
          <button className={general.addButton} onClick={onAddWorkflow}>
            Create Workflow
          </button>
        </div>
      </div>
      <table className={general.ticketTable}>
        <thead>
          <WorkflowHeader />
        </thead>
        <tbody>
          {workflows.length > 0 ? (
            paginatedTickets.map((workflows) => (
              <WorkflowItem 
              key={workflows.workflow_id} item={workflows} 
              />
            ))
          ) : (
            <tr>
              <td colSpan={workflowHeaders.length} className={general.noData}>
                No workflow found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <div className={general.ttPagination}>
        <Pagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={workflows.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  );
}
