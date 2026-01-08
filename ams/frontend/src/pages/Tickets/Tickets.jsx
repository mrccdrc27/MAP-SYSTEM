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
import ticketTrackingAxios from "../../api/integrationTicketTracking";
import { fetchAllEmployees } from "../../services/integration-auth-service";
import { useAuth } from "../../context/AuthContext";
import { fetchAssetById } from "../../services/assets-service";

import "../../styles/Tickets/Tickets.css";

// Tab Constants
const TABS = {
  ALL: "All",
  REGISTRATION: "Registration",
  CHECKOUT: "Checkout",
  CHECKIN: "Checkin",
  REPAIR: "Repair",
  INCIDENT: "Incident",
  DISPOSAL: "Disposal",
  REQUEST: "Asset Request"
};

const VIEW_MODES = {
  APPROVED: "Approved Tickets",
  RESOLVED: "Resolved Tickets"
};

// Column Definitions
const COLUMNS = {
  [TABS.ALL]: [
    { key: "ticket_number", label: "Ticket ID" },
    { key: "ticket_type", label: "Type" },
    { key: "category", label: "Category" },
    { key: "subject", label: "Subject" },
    { key: "employeeName", label: "Requestor" },
    { key: "actions", label: "Action" }
  ],
  [TABS.REGISTRATION]: [
    { key: "ticket_number", label: "Ticket ID" },
    { key: "category", label: "Category" },
    { key: "sub_category", label: "Sub-Category" },
    { key: "asset_model_name", label: "Asset Model Name" },
    { key: "asset_serial_number", label: "Asset Serial Number" },
    { key: "purchased_date", label: "Purchased Date" },
    { key: "actions", label: "Action" }
  ],
  [TABS.CHECKOUT]: [
    { key: "ticket_number", label: "Ticket ID" },
    { key: "category", label: "Category" },
    { key: "sub_category", label: "Sub-Category" },
    { key: "asset_id_number", label: "Asset ID Number" },
    { key: "location", label: "Location" },
    { key: "status", label: "Status" }, 
    { key: "request_date", label: "Request Date" },
    { key: "actions", label: "Action" }
  ],
  [TABS.CHECKIN]: [
    { key: "ticket_number", label: "Ticket ID" },
    { key: "category", label: "Category" },
    { key: "sub_category", label: "Sub-Category" },
    { key: "asset_id_number", label: "Asset ID Number" },
    { key: "location", label: "Location" },
    { key: "status", label: "Status" }, 
    { key: "checkin_date", label: "Checkin Date" },
    { key: "actions", label: "Action" }
  ],
  [TABS.REPAIR]: [
    { key: "ticket_number", label: "Ticket ID" },
    { key: "category", label: "Category" },
    { key: "sub_category", label: "Sub-Category" },
    { key: "repair_name", label: "Repair Name" },
    { key: "repair_type", label: "Repair Type" },
    { key: "start_date", label: "Start Date" },
    { key: "end_date", label: "End Date" },
    { key: "actions", label: "Action" }
  ],
  [TABS.INCIDENT]: [
    { key: "ticket_number", label: "Ticket ID" },
    { key: "category", label: "Category" },
    { key: "sub_category", label: "Sub-Category" },
    { key: "asset_id_number", label: "Asset ID Number" },
    { key: "incident_date", label: "Incident Date" },
    { key: "employeeName", label: "Employee Name" },
    { key: "schedule_audit", label: "Schedule Audit" },
    { key: "actions", label: "Action" }
  ],
  [TABS.DISPOSAL]: [
    { key: "ticket_number", label: "Ticket ID" },
    { key: "category", label: "Category" },
    { key: "sub_category", label: "Sub-Category" },
    { key: "subject", label: "Subject" },
    { key: "command_note", label: "Command Note" },
    { key: "actions", label: "Action" }
  ],
  [TABS.REQUEST]: [
    { key: "ticket_number", label: "Ticket ID" },
    { key: "category", label: "Category" },
    { key: "sub_category", label: "Sub-Category" },
    { key: "asset_model_number", label: "Asset Model Number" },
    { key: "order_number", label: "Order Number" },
    { key: "quantity", label: "Quantity" },
    { key: "actions", label: "Action" }
  ]
};

function TableHeader({ columns, allSelected, onHeaderChange }) {
  return (
    <tr>
      <th>
        <input
          type="checkbox"
          checked={allSelected}
          onChange={onHeaderChange}
        />
      </th>
      {columns.map((col) => (
        <th key={col.key}>{col.label.toUpperCase()}</th>
      ))}
    </tr>
  );
}

function TableItem({
  ticket,
  columns,
  isSelected,
  onRowChange,
  onDeleteClick,
  onViewClick,
  onActionClick // For custom actions like Register, Checkin, etc.
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
      {columns.map((col) => {
        if (col.key === "actions") {
          return (
            <td key={col.key}>
               <div className="action-buttons-container">
                <ActionButtons
                    showEdit={false}
                    showDelete
                    showView
                    onDeleteClick={() => onDeleteClick(ticket.id)}
                    onViewClick={() => onViewClick(ticket)}
                />
               </div>
            </td>
          );
        }
        if (col.key === "ticket_type") {
            return <td key={col.key}>{ticket.ticket_type ? ticket.ticket_type.replace('asset_', '').toUpperCase() : '-'}</td>
        }
        return <td key={col.key}>{ticket[col.key] || "-"}</td>;
      })}
    </tr>
  );
}

const Tickets = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const exportRef = useRef(null);
  const toggleRef = useRef(null);

  const [viewMode, setViewMode] = useState(VIEW_MODES.APPROVED);
  const [activeTab, setActiveTab] = useState(TABS.ALL);
  
  const [ticketItems, setTicketItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isLoading, setIsLoading] = useState(true);
  const [exportToggle, setExportToggle] = useState(false);

  const [employees, setEmployees] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  // Determine available tabs based on view mode
  const availableTabs = viewMode === VIEW_MODES.APPROVED 
    ? [TABS.ALL, TABS.REGISTRATION, TABS.CHECKOUT, TABS.CHECKIN, TABS.REPAIR, TABS.INCIDENT, TABS.DISPOSAL]
    : [TABS.ALL, TABS.REGISTRATION, TABS.CHECKOUT, TABS.CHECKIN, TABS.REPAIR, TABS.INCIDENT, TABS.DISPOSAL, TABS.REQUEST];

  useEffect(() => {
    // Reset tab if not available in new mode, defaulting to ALL
    if (!availableTabs.includes(activeTab)) {
        setActiveTab(TABS.ALL);
    }
  }, [viewMode]);

  useEffect(() => {
    const loadTickets = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const endpoint = viewMode === VIEW_MODES.APPROVED ? "tickets/unresolved/" : "tickets/resolved/";
        const response = await ticketTrackingAxios.get(endpoint);
        const ticketsData = response.data;

        let employeesList = [];
        try {
            const employeesResponse = await fetchAllEmployees();
            employeesList = Array.isArray(employeesResponse) ? employeesResponse : employeesResponse?.results || [];
        } catch (authError) {
            console.warn("Failed to fetch employees:", authError);
            // Continue without employees
        }
        setEmployees(employeesList);

        const mappedTickets = ticketsData.map(ticket => {
            const employee = employeesList.find(e => Number(e.id) === Number(ticket.employee));
            return {
                ...ticket,
                employeeName: employee ? `${employee.firstname} ${employee.lastname}` : "Unknown",
                request_date: ticket.created_at?.slice(0, 10), // Default mapping
                // Map other fields if necessary
            };
        });

        setTicketItems(mappedTickets);
      } catch (error) {
        console.error("Error loading tickets:", error);
        setErrorMessage("Failed to load tickets.");
        setTicketItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadTickets();
  }, [viewMode]); // Reload when view mode changes

  // Filter tickets by active tab (ticket_type)
  const getTicketTypeForTab = (tab) => {
      switch(tab) {
          case TABS.ALL: return 'ALL';
          case TABS.REGISTRATION: return 'asset_registration';
          case TABS.CHECKOUT: return 'asset_checkout';
          case TABS.CHECKIN: return 'asset_checkin';
          case TABS.REPAIR: return 'asset_repair';
          case TABS.INCIDENT: return 'asset_incident';
          case TABS.DISPOSAL: return 'asset_disposal';
          case TABS.REQUEST: return 'asset_request';
          default: return '';
      }
  };

  const filteredTickets = ticketItems.filter(ticket => {
      const type = getTicketTypeForTab(activeTab);
      
      let matchesType = false;
      if (type === 'ALL') {
          matchesType = true;
      } else {
          matchesType = ticket.ticket_type === type;
      }
      
      if (!matchesType) return false;

      // Search Query Logic
      if (!searchQuery) return true;
      const qWords = searchQuery.toLowerCase().trim().split(/\s+/);
      const fields = [
          ticket.ticket_number, 
          ticket.subject, 
          ticket.employeeName,
          ticket.asset_model_name,
          ticket.asset_serial_number
      ].map(f => (f || '').toLowerCase());
      
      return qWords.every(word => fields.some(f => f.includes(word)));
  });

  // Pagination
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedTickets = filteredTickets.slice(startIndex, endIndex);
  const allSelected = paginatedTickets.length > 0 && paginatedTickets.every(t => selectedIds.includes(t.id));

  // Handlers
  const handleHeaderChange = (e) => {
    if (e.target.checked) {
      const newIds = [...selectedIds, ...paginatedTickets.map(t => t.id)];
      setSelectedIds([...new Set(newIds)]);
    } else {
      const pIds = paginatedTickets.map(t => t.id);
      setSelectedIds(selectedIds.filter(id => !pIds.includes(id)));
    }
  };

  const handleRowChange = (id, checked) => {
    if (checked) setSelectedIds([...selectedIds, id]);
    else setSelectedIds(selectedIds.filter(sid => sid !== id));
  };

  const handleViewClick = async (ticket) => {
      // If asset field exists, fetch it, otherwise just pass ticket
      let asset = null;
      if (ticket.asset) {
          try {
             asset = await fetchAssetById(ticket.asset);
          } catch (e) { console.error("Asset fetch failed", e); }
      }
      navigate(`/tickets/view/${ticket.id}`, { state: { ticket, asset } });
  };

  const openDeleteModal = (id) => {
    setDeleteTargetId(id);
    setDeleteModalOpen(true);
  };
  
  const confirmDelete = () => {
      // Mock delete - just remove from UI for now as API might not support delete
      if (deleteTargetId) {
          setTicketItems(ticketItems.filter(t => t.id !== deleteTargetId));
          setSuccessMessage("Ticket deleted.");
      } else {
          setTicketItems(ticketItems.filter(t => !selectedIds.includes(t.id)));
          setSelectedIds([]);
          setSuccessMessage("Tickets deleted.");
      }
      setDeleteModalOpen(false);
  };

  // Close export dropdown
  useEffect(() => {
    function handleClickOutside(event) {
        if (exportToggle && exportRef.current && !exportRef.current.contains(event.target) &&
            toggleRef.current && !toggleRef.current.contains(event.target)) {
            setExportToggle(false);
        }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [exportToggle]);

  return (
    <>
      {errorMessage && <Alert message={errorMessage} type="danger" />}
      {successMessage && <Alert message={successMessage} type="success" />}
      
      {isDeleteModalOpen && (
        <ConfirmationModal
          closeModal={() => setDeleteModalOpen(false)}
          actionType="delete"
          onConfirm={confirmDelete}
        />
      )}

      <section className="page-layout-with-table">
        <NavBar />
        <main className="main-with-table">
            <section className="table-layout">
                {/* Header Section with Dropdown */}
                <section className="table-header" style={{flexDirection: 'column', alignItems: 'flex-start', gap: '1rem'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center'}}>
                         <div className="ticket-view-selector">
                            <select 
                                value={viewMode} 
                                onChange={(e) => setViewMode(e.target.value)}
                                style={{
                                    fontSize: '1.5rem', 
                                    fontWeight: 'bold', 
                                    padding: '0.5rem', 
                                    border: 'none', 
                                    background: 'transparent', 
                                    cursor: 'pointer',
                                    outline: 'none'
                                }}
                            >
                                <option value={VIEW_MODES.APPROVED}>Approved Tickets</option>
                                <option value={VIEW_MODES.RESOLVED}>Resolved Tickets</option>
                            </select>
                        </div>
                        
                        <div className="table-actions">
                             {selectedIds.length > 0 && <MediumButtons type="delete" onClick={() => openDeleteModal(null)} />}
                             <input 
                                type="search" 
                                placeholder="Search..." 
                                className="search" 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                             />
                              {isAdmin() && (
                                <div ref={toggleRef}>
                                    <MediumButtons type="export" onClick={() => setExportToggle(!exportToggle)} />
                                </div>
                             )}
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="ticket-tabs" style={{display: 'flex', gap: '1rem', borderBottom: '1px solid #ccc', width: '100%'}}>
                        {availableTabs.map(tab => (
                            <button
                                key={tab}
                                onClick={() => { setActiveTab(tab); setCurrentPage(1); }}
                                style={{
                                    padding: '0.5rem 1rem',
                                    border: 'none',
                                    background: 'transparent',
                                    borderBottom: activeTab === tab ? '3px solid #007bff' : '3px solid transparent',
                                    fontWeight: activeTab === tab ? 'bold' : 'normal',
                                    cursor: 'pointer',
                                    color: activeTab === tab ? '#007bff' : '#666'
                                }}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </section>

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
                                columns={COLUMNS[activeTab] || []} 
                                allSelected={allSelected} 
                                onHeaderChange={handleHeaderChange}
                            />
                         </thead>
                         <tbody>
                            {isLoading ? (
                                <tr><td colSpan={10} className="no-data-message">Loading...</td></tr>
                            ) : paginatedTickets.length > 0 ? (
                                paginatedTickets.map(ticket => (
                                    <TableItem
                                        key={ticket.id}
                                        ticket={ticket}
                                        columns={COLUMNS[activeTab] || []}
                                        isSelected={selectedIds.includes(ticket.id)}
                                        onRowChange={handleRowChange}
                                        onDeleteClick={openDeleteModal}
                                        onViewClick={handleViewClick}
                                    />
                                ))
                            ) : (
                                <tr><td colSpan={10} className="no-data-message">No tickets found for {activeTab}</td></tr>
                            )}
                         </tbody>
                     </table>
                </section>

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
