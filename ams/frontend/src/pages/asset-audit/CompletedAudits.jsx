import { useState } from "react";
import NavBar from "../../components/NavBar";
import MediumButtons from "../../components/buttons/MediumButtons";
import Pagination from "../../components/Pagination";
import "../../styles/Table.css";
import ActionButtons from "../../components/ActionButtons";
import ConfirmationModal from "../../components/Modals/DeleteModal";
import TabNavBar from "../../components/TabNavBar";
import "../../styles/AuditsCompleted.css";
import completedAudit from "../../data/mockData/audits/completed-audit-mockup-data.json";
import View from "../../components/Modals/View";
import Footer from "../../components/Footer";
import CompletedAuditFilterModal from "../../components/Modals/CompletedAuditFilterModal";
import { exportToExcel } from "../../utils/exportToExcel";
import { useAuth } from "../../context/AuthContext";

// TableHeader
function TableHeader() {
  return (
    <tr>
      <th>AUDIT DATE</th>
      <th>ASSET</th>
      <th>LOCATION</th>
      <th>PERFOMED BY</th>
      <th>ACTION</th>
    </tr>
  );
}

// TableItem
function TableItem({ item, onViewClick }) {
  return (
    <tr>
      <td>{item.audit_date}</td>
      <td>
        {item.audit_schedule.asset.displayed_id} -{" "}
        {item.audit_schedule.asset.name}
      </td>
      <td>{item.location}</td>
      <td>{item.performed_by}</td>
      <td>
        <ActionButtons showView onViewClick={() => onViewClick(item)} />
      </td>
    </tr>
  );
}

export default function CompletedAudits() {
  const { isAdmin } = useAuth();
  const data = completedAudit;

  // Filter modal state
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState({});
  const [filteredData, setFilteredData] = useState([]);

  // pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedActivity =
    filteredData.length > 0
      ? filteredData.slice(startIndex, endIndex)
      : data.slice(startIndex, endIndex);

  // Add state for view modal
  const [isViewModalOpen, setViewModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Add view handler
  const handleViewClick = (item) => {
    setSelectedItem(item);
    setViewModalOpen(true);
  };

  const closeViewModal = () => {
    setViewModalOpen(false);
    setSelectedItem(null);
  };

  // Apply filters to data
  const applyFilters = (filters) => {
    let filtered = [...data];

    // Filter by Audit Date
    if (filters.auditDate && filters.auditDate.trim() !== "") {
      filtered = filtered.filter((audit) => {
        const auditDate = new Date(audit.audit_date);
        const filterDate = new Date(filters.auditDate);
        return auditDate.toDateString() === filterDate.toDateString();
      });
    }

    // Filter by Asset
    if (filters.asset && filters.asset.trim() !== "") {
      filtered = filtered.filter((audit) =>
        audit.audit_schedule?.asset?.name
          ?.toLowerCase()
          .includes(filters.asset.toLowerCase())
      );
    }

    // Filter by Location
    if (filters.location && filters.location.trim() !== "") {
      filtered = filtered.filter((audit) =>
        audit.location?.toLowerCase().includes(filters.location.toLowerCase())
      );
    }

    // Filter by Performed By
    if (filters.performedBy && filters.performedBy.trim() !== "") {
      filtered = filtered.filter((audit) =>
        audit.performed_by
          ?.toLowerCase()
          .includes(filters.performedBy.toLowerCase())
      );
    }

    return filtered;
  };

  // Handle filter apply
  const handleApplyFilter = (filters) => {
    setAppliedFilters(filters);
    const filtered = applyFilters(filters);
    setFilteredData(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleExport = () => {
    const baseData = data;
    const dataToExport = filteredData.length > 0 ? filteredData : baseData;
    exportToExcel(dataToExport, "Completed_Audits.xlsx");
  };

  return (
    <>
      {isViewModalOpen && selectedItem && (
        <View
          title={`${selectedItem.audit_schedule.asset.name} : ${selectedItem.audit_date}`}
          data={[
            {
              label: "Asset",
              value: `${selectedItem.audit_schedule.asset.displayed_id} - ${selectedItem.audit_schedule.asset.name}`,
            },
            { label: "Location", value: selectedItem.location },
            { label: "Performed By", value: selectedItem.performed_by },
            { label: "Audit Date", value: selectedItem.audit_date },
            { label: "Next Audit Date", value: selectedItem.next_audit_date },
            { label: "Created At", value: selectedItem.created_at },
            { label: "Notes", value: selectedItem.notes },
            {
              label: "Files",
              value: selectedItem.files.map((f) => f.file).join(", "),
            },
          ]}
          closeModal={closeViewModal}
        />
      )}

      {/* Completed Audit Filter Modal */}
      <CompletedAuditFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApplyFilter={handleApplyFilter}
        initialFilters={appliedFilters}
      />

      <section className="page-layout-with-table">
        <NavBar />

        <main className="main-with-table">
          <section className="completed-audit-title-page-section">
            <h1>Asset Audits</h1>

            <div>
              <MediumButtons
                type="schedule-audits"
                navigatePage="/audits/schedule"
                previousPage="/audits/completed"
              />
              <MediumButtons
                type="perform-audits"
                navigatePage="/audits/new"
                previousPage={location.pathname}
              />
            </div>
          </section>

          <section>
            <TabNavBar />
          </section>

          <section className="table-layout">
            <section className="table-header">
              <h2 className="h2">
                Completed Audits (
                {filteredData.length > 0 ? filteredData.length : data.length})
              </h2>
              <section className="table-actions">
                <input
                  type="search"
                  placeholder="Search..."
                  className="search"
                />
                <button
                  type="button"
                  className="medium-button-filter"
                  onClick={() => setIsFilterModalOpen(true)}
                >
                  Filter
                </button>
                {isAdmin() && (
                  <MediumButtons type="export" onClick={handleExport} />
                )}
              </section>
            </section>

            <section className="completed-audit-table-section">
              <table>
                <thead>
                  <TableHeader />
                </thead>
                <tbody>
                  {paginatedActivity.length > 0 ? (
                    paginatedActivity.map((item) => (
                      <TableItem
                        key={item.id}
                        item={item}
                        onViewClick={handleViewClick}
                      />
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="no-data-message">
                        No Completed Audits Found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>

            <section className="table-pagination">
              <Pagination
                currentPage={currentPage}
                pageSize={pageSize}
                totalItems={data.length}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            </section>
          </section>
        </main>
        <Footer />
      </section>
    </>
  );
}
