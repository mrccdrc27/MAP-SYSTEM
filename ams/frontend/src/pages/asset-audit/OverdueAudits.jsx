import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../../components/NavBar";
import MediumButtons from "../../components/buttons/MediumButtons";
import Pagination from "../../components/Pagination";
import "../../styles/Table.css";
import ActionButtons from "../../components/ActionButtons";
import ConfirmationModal from "../../components/Modals/DeleteModal";
import TableBtn from "../../components/buttons/TableButtons";
import TabNavBar from "../../components/TabNavBar";
import "../../styles/AuditsOverdue.css";
import overdueAudit from "../../data/mockData/audits/overdue-audit-mockup-data.json";
import View from "../../components/Modals/View";
import Footer from "../../components/Footer";
import OverdueAuditFilterModal from "../../components/Modals/OverdueAuditFilterModal";
import { exportToExcel } from "../../utils/exportToExcel";
import authService from "../../services/auth-service";

// TableHeader
function TableHeader() {
  return (
    <tr>
      <th>DUE DATE</th>
      <th>OVERDUE BY</th>
      <th>ASSET</th>
      <th>CREATED</th>
      <th>AUDIT</th>
      <th>ACTION</th>
    </tr>
  );
}

// TableItem
function TableItem({ item, onDeleteClick, onViewClick }) {
  return (
    <tr>
      <td>{item.date}</td>
      <td>{item.overdue_by} day/s</td>
      <td>
        {item.asset.displayed_id} - {item.asset.name}
      </td>
      <td>{new Date(item.created_at).toLocaleDateString()}</td>
      <td>
        <TableBtn
          type="audit"
          navigatePage="/audits/new"
          data={item}
          previousPage={location.pathname}
        />
      </td>
      <td>
        <ActionButtons
          showEdit
          showDelete
          showView
          editPath={`edit/${item.id}`}
          editState={{ item, previousPage: "/audits/overdue" }}
          onDeleteClick={() => onDeleteClick(item.id)}
          onViewClick={() => onViewClick(item)}
        />
      </td>
    </tr>
  );
}

export default function OverdueAudits() {
  const navigate = useNavigate();

  const data = overdueAudit;

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

  // delete modal state
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const openDeleteModal = (id) => {
    setDeleteId(id);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setDeleteId(null);
  };

  const confirmDelete = () => {
    console.log("Deleting ID:", deleteId);
    // perform delete action here (API or filter)
    closeDeleteModal();
  };

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

    // Filter by Due Date
    if (filters.dueDate && filters.dueDate.trim() !== "") {
      filtered = filtered.filter((audit) => {
        const auditDate = new Date(audit.date);
        const filterDate = new Date(filters.dueDate);
        return auditDate.toDateString() === filterDate.toDateString();
      });
    }

    // Filter by Overdue By
    if (filters.overdueBy && filters.overdueBy.trim() !== "") {
      const overdueByValue = parseInt(filters.overdueBy);
      filtered = filtered.filter(
        (audit) => audit.overdue_by === overdueByValue
      );
    }

    // Filter by Asset
    if (filters.asset && filters.asset.trim() !== "") {
      filtered = filtered.filter((audit) =>
        audit.asset?.name?.toLowerCase().includes(filters.asset.toLowerCase())
      );
    }

    // Filter by Created
    if (filters.created && filters.created.trim() !== "") {
      filtered = filtered.filter((audit) => {
        const createdDate = new Date(audit.created_at);
        const filterDate = new Date(filters.created);
        return createdDate.toDateString() === filterDate.toDateString();
      });
    }

    // Filter by Audit
    if (filters.audit && filters.audit.trim() !== "") {
      filtered = filtered.filter((audit) =>
        audit.notes?.toLowerCase().includes(filters.audit.toLowerCase())
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
    exportToExcel(dataToExport, "Overdue_Audits.xlsx");
  };

  return (
    <>
      {isDeleteModalOpen && (
        <ConfirmationModal
          closeModal={closeDeleteModal}
          actionType="delete"
          onConfirm={confirmDelete}
        />
      )}

      {isViewModalOpen && selectedItem && (
        <View
          title={`${selectedItem.asset.name} : ${selectedItem.overdue_by} day/s overdue`}
          data={[
            { label: "Due Date", value: selectedItem.date },
            { label: "Overdue By", value: `${selectedItem.overdue_by} day/s` },
            {
              label: "Asset",
              value: `${selectedItem.asset.displayed_id} - ${selectedItem.asset.name}`,
            },
            { label: "Created At", value: selectedItem.created_at },
            { label: "Notes", value: selectedItem.notes },
          ]}
          closeModal={closeViewModal}
        />
      )}

      {/* Overdue Audit Filter Modal */}
      <OverdueAuditFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApplyFilter={handleApplyFilter}
        initialFilters={appliedFilters}
      />

      <section className="page-layout-with-table">
        <NavBar />

        <main className="main-with-table">
          <section className="audit-title-page-section">
            <h1>Asset Audits</h1>

            <div>
              <MediumButtons
                type="schedule-audits"
                navigatePage="/audits/schedule"
                previousPage="/audits/overdue"
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
                Overdue for Audits (
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
                {authService.getUserInfo().role === "Admin" && (
                  <MediumButtons type="export" onClick={handleExport} />
                )}
              </section>
            </section>

            <section className="overdue-audit-table-section">
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
                        onDeleteClick={openDeleteModal}
                        onViewClick={handleViewClick}
                        navigate={navigate}
                        location={location}
                      />
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="no-data-message">
                        No Overdue Audits Found.
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
