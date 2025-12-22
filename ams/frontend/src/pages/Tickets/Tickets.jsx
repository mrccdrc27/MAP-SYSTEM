import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import NavBar from "../../components/NavBar";
import Pagination from "../../components/Pagination";
import MediumButtons from "../../components/buttons/MediumButtons";
import ConfirmationModal from "../../components/Modals/DeleteModal";
import TicketFilterModal from "../../components/Modals/TicketFilterModal";
import ActionButtons from "../../components/ActionButtons";
import Alert from "../../components/Alert";
import Footer from "../../components/Footer";
import DefaultImage from "../../assets/img/default-image.jpg";
import { fetchAllTickets } from "../../services/integration-ticket-tracking-service";
import { fetchAssetById } from "../../services/assets-service";
import {
  fetchAllEmployees,
  fetchEmployeeById,
} from "../../services/integration-auth-service";
import authService from "../../services/auth-service";

import "../../styles/Tickets/Tickets.css";

// TableHeader component to render the table header
function TableHeader({ allSelected, onHeaderChange }) {
  return (
    <tr>
      <th>
        <input
          type="checkbox"
          checked={allSelected}
          onChange={onHeaderChange}
        />
      </th>
      <th>TICKET NUMBER</th>
      <th>DATE</th>
      <th>REQUESTOR</th>
      <th>SUBJECT</th>
      <th>LOCATION</th>
      <th>CHECK-IN / CHECK-OUT</th>
      <th>ACTIONS</th>
    </tr>
  );
}

// TableItem component to render each ticket row
function TableItem({
  ticket,
  isSelected,
  onRowChange,
  onDeleteClick,
  onViewClick,
  onCheckInOut,
}) {
  return (
    <tr>
      <td>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onRowChange(ticket.id, e.target.checked)}
        />
      </td>
      <td>{ticket.ticket_number}</td>
      <td>{ticket.formattedDate}</td>
      <td>{ticket.employeeName}</td>
      <td>{ticket.subject}</td>
      <td>{ticket.location_details.city}</td>

      {/* CHECK-IN / CHECK-OUT Column */}
      <td>
        {ticket.isCheckInOrOut && (
          <ActionButtons
            showCheckout={ticket.isCheckInOrOut === "Check-Out"}
            showCheckin={ticket.isCheckInOrOut === "Check-In"}
            onCheckoutClick={() => onCheckInOut(ticket)}
            onCheckinClick={() => onCheckInOut(ticket)}
          />
        )}
      </td>

      {/* ACTIONS Column */}
      <td>
        <ActionButtons
          showEdit={false}
          showDelete
          showView
          onDeleteClick={() => onDeleteClick(ticket.id)}
          onViewClick={() => onViewClick(ticket)}
        />
      </td>
    </tr>
  );
}

const Tickets = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toggleRef = useRef(null);
  const exportRef = useRef(null);

  const [ticketItems, setTicketItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [exportToggle, setExportToggle] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isLoading, setIsLoading] = useState(true);

  const [employees, setEmployees] = useState([]);

  // Filter modal state
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState({});
  const [filteredData, setFilteredData] = useState([]);

  // Selection state
  const [selectedIds, setSelectedIds] = useState([]);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  useEffect(() => {
    const loadTickets = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        // Fetch tickets from API
        const response = await fetchAllTickets();
        const ticketsData = response.results || response;

        // Fetch employees from API
        const employeesResponse = await fetchAllEmployees();

        const employeesList = Array.isArray(employeesResponse)
          ? employeesResponse
          : employeesResponse?.results || [];
        setEmployees(employeesList);

        // Map API response to component format
        const mappedTickets = ticketsData.map((ticket) => {
          // Determine if ticket needs check-in or check-out action
          // Logic: If checkin_date is null, it's a Check-Out ticket, otherwise Check-In
          const isCheckInOrOut = !ticket.is_resolved
            ? ticket.checkin_date === null || ticket.checkin_date === undefined
              ? "Check-Out"
              : "Check-In"
            : null;

          const formattedDate =
            isCheckInOrOut === "Check-In"
              ? ticket.checkin_date?.slice(0, 10)
              : ticket.checkout_date?.slice(0, 10);

          // Find employee name
          const employee = employeesList.find(
            (e) => Number(e.id) === Number(ticket.employee)
          );

          const employeeName = employee
            ? `${employee.firstname} ${employee.lastname}`
            : "Unknown";

          return {
            ...ticket,
            isCheckInOrOut,
            formattedDate,
            employeeName,
          };
        });

        setTicketItems(mappedTickets);
        setFilteredData(mappedTickets);
      } catch (error) {
        console.error("Error loading tickets:", error);
        setErrorMessage(
          "Failed to load tickets from server. Please try again later."
        );
        setTicketItems([]);
        setFilteredData([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadTickets();
  }, []);

  // Apply filters to data
  const applyFilters = (filters) => {
    let filtered = [...ticketItems];

    // Filter by Ticket Number
    if (filters.ticketNumber && filters.ticketNumber.trim() !== "") {
      filtered = filtered.filter((ticket) =>
        ticket.ticketNumber
          ?.toLowerCase()
          .includes(filters.ticketNumber.toLowerCase())
      );
    }

    // Filter by Asset
    if (filters.asset && filters.asset.trim() !== "") {
      filtered = filtered.filter((ticket) =>
        ticket.assetName?.toLowerCase().includes(filters.asset.toLowerCase())
      );
    }

    // Filter by Requestor
    if (filters.requestor && filters.requestor.trim() !== "") {
      filtered = filtered.filter((ticket) =>
        ticket.requestor
          ?.toLowerCase()
          .includes(filters.requestor.toLowerCase())
      );
    }

    // Filter by Subject
    if (filters.subject && filters.subject.trim() !== "") {
      filtered = filtered.filter((ticket) =>
        ticket.subject?.toLowerCase().includes(filters.subject.toLowerCase())
      );
    }

    // Filter by Location
    if (filters.location && filters.location.trim() !== "") {
      filtered = filtered.filter((ticket) =>
        ticket.requestorLocation
          ?.toLowerCase()
          .includes(filters.location.toLowerCase())
      );
    }

    // Filter by Check-In / Check-Out
    if (filters.checkInOut && filters.checkInOut.value !== "All") {
      filtered = filtered.filter(
        (ticket) => ticket.isCheckInOrOut === filters.checkInOut.value
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

  const handleViewClick = async (ticket) => {
    const asset = await fetchAssetById(ticket.asset);
    navigate(`/tickets/view/${ticket.id}`, {
      state: { ticket, asset },
    });
  };

  // outside click for export toggle
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        exportToggle &&
        exportRef.current &&
        !exportRef.current.contains(event.target) &&
        toggleRef.current &&
        !toggleRef.current.contains(event.target)
      ) {
        setExportToggle(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [exportToggle]);

  useEffect(() => {
    if (location.state?.successMessage) {
      setSuccessMessage(location.state.successMessage);
      setTimeout(() => {
        setSuccessMessage("");
        window.history.replaceState({}, document.title);
      }, 5000);
    }
  }, [location]);

  const handleCheckInOut = (ticket) => {
    if (ticket.isCheckInOrOut === "Check-In") {
      navigate(`/assets/check-in/${ticket.asset}`, {
        state: { ticketId: ticket.id, fromAsset: false },
      });
    } else {
      navigate(`/assets/check-out/${ticket.asset}`, {
        state: { ticketId: ticket.id, fromAsset: false },
      });
    }
  };

  // Filter tickets based on search query and applied filters
  let filteredTickets = filteredData.filter((ticket) => {
    const qWords = searchQuery.toLowerCase().trim().split(/\s+/); // split by space
    const fields = [
      ticket.ticketNumber?.toLowerCase() || "",
      ticket.formattedDate?.toLowerCase() || "",
      ticket.employeeName?.toLowerCase() || "",
      ticket.subject?.toLowerCase() || "",
      ticket.location_details?.city?.toLowerCase() || "",
    ];

    // Every word in search query must match at least one field
    return qWords.every((word) => fields.some((f) => f.includes(word)));
  });

  // Pagination logic
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedTickets = filteredTickets.slice(startIndex, endIndex);

  // Selection logic
  const allSelected =
    paginatedTickets.length > 0 &&
    paginatedTickets.every((ticket) => selectedIds.includes(ticket.id));

  const handleHeaderChange = (e) => {
    if (e.target.checked) {
      const newSelectedIds = [
        ...selectedIds,
        ...paginatedTickets.map((ticket) => ticket.id),
      ];
      setSelectedIds([...new Set(newSelectedIds)]);
    } else {
      const paginatedIds = paginatedTickets.map((ticket) => ticket.id);
      setSelectedIds(selectedIds.filter((id) => !paginatedIds.includes(id)));
    }
  };

  const handleRowChange = (id, checked) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id));
    }
  };

  const openDeleteModal = (id) => {
    setDeleteTargetId(id);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setDeleteTargetId(null);
  };

  const confirmDelete = () => {
    if (deleteTargetId) {
      // Delete single ticket
      const updatedTickets = ticketItems.filter(
        (ticket) => ticket.id !== deleteTargetId
      );
      setTicketItems(updatedTickets);
      setSuccessMessage("Ticket deleted successfully");
    } else {
      // Bulk delete
      const updatedTickets = ticketItems.filter(
        (ticket) => !selectedIds.includes(ticket.id)
      );
      setTicketItems(updatedTickets);
      setSelectedIds([]);
      setSuccessMessage(`${selectedIds.length} ticket(s) deleted successfully`);
    }
    closeDeleteModal();
  };

  return (
    <>
      {errorMessage && <Alert message={errorMessage} type="danger" />}
      {successMessage && <Alert message={successMessage} type="success" />}

      {isDeleteModalOpen && (
        <ConfirmationModal
          closeModal={closeDeleteModal}
          actionType="delete"
          onConfirm={confirmDelete}
        />
      )}

      {/* Ticket Filter Modal */}
      <TicketFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApplyFilter={handleApplyFilter}
        initialFilters={appliedFilters}
      />

      <section className="page-layout-with-table">
        <NavBar />

        <main className="main-with-table">
          <section className="table-layout">
            {/* Table Header */}
            <section className="table-header">
              <h2 className="h2">Tickets ({filteredTickets.length})</h2>
              <section className="table-actions">
                {/* Bulk delete button only when checkboxes selected */}
                {selectedIds.length > 0 && (
                  <MediumButtons
                    type="delete"
                    onClick={() => openDeleteModal(null)}
                  />
                )}
                <input
                  type="search"
                  placeholder="Search..."
                  className="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button
                  type="button"
                  className="medium-button-filter"
                  onClick={() => setIsFilterModalOpen(true)}
                >
                  Filter
                </button>
                {authService.getUserInfo().role === "Admin" && (
                  <div ref={toggleRef}>
                    <MediumButtons
                      type="export"
                      onClick={() => setExportToggle(!exportToggle)}
                    />
                  </div>
                )}
              </section>
            </section>

            {/* Table Structure */}
            <section className="tickets-table-section">
              {exportToggle && (
                <section className="export-button-section" ref={exportRef}>
                  <button>Download as Excel</button>
                  <button>Download as PDF</button>
                  <button>Download as CSV</button>
                </section>
              )}
              <table>
                <thead>
                  <TableHeader
                    allSelected={allSelected}
                    onHeaderChange={handleHeaderChange}
                  />
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="no-data-message">
                        Loading tickets...
                      </td>
                    </tr>
                  ) : paginatedTickets.length > 0 ? (
                    paginatedTickets.map((ticket) => (
                      <TableItem
                        key={ticket.id}
                        ticket={ticket}
                        isSelected={selectedIds.includes(ticket.id)}
                        onRowChange={handleRowChange}
                        onDeleteClick={openDeleteModal}
                        onViewClick={handleViewClick}
                        onCheckInOut={handleCheckInOut}
                      />
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="no-data-message">
                        No tickets found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>

            {/* Table pagination */}
            <section className="table-pagination">
              <Pagination
                currentPage={currentPage}
                pageSize={pageSize}
                totalItems={filteredTickets.length}
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
};

export default Tickets;
