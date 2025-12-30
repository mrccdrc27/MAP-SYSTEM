// components
import AdminNav from "../../../components/navigation/AdminNav";
import Pagination from "../../../components/component/Pagination";
import AssignWorkflow from "./modals/AssignWorkflow";

// style
import styles from "./admin-archive.module.css";
import general from "../../../style/general.module.css";

// react
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// skeleton
import TableSkeleton from "../../../components/skeleton/TableSkeleton";

// hook
import useUserTickets from "../../../api/useUserTickets";
import useTicketsFetcher from "../../../api/useTicketsFetcher";
import useDebounce from "../../../utils/useDebounce";

export default function AdminArchive() {
  const navigate = useNavigate();
  const {
    userTickets,
    loading: userTicketsLoading,
    error: userTicketsError,
  } = useUserTickets();
  const {
    tickets,
    fetchTickets,
    loading: ticketsLoading,
    error: ticketsError,
    pagination,
  } = useTicketsFetcher();

  // State Management
  const [activeTab, setActiveTab] = useState("Active");
  const [groupBy, setGroupBy] = useState("none");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedGroups, setExpandedGroups] = useState({});
  const [expandedRows, setExpandedRows] = useState({});
  const [expandedTickets, setExpandedTickets] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Modal state for assigning workflow to unassigned tickets
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTicketForAssign, setSelectedTicketForAssign] = useState(null);

  // Debounce search term to avoid too many API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 400);

  // Reset to page 1 when search term or tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, activeTab]);

  // Fetch data on mount and when pagination/filters change
  useEffect(() => {
    const tabParam = activeTab.toLowerCase();
    fetchTickets(currentPage, pageSize, tabParam, debouncedSearchTerm);
  }, [fetchTickets, currentPage, pageSize, activeTab, debouncedSearchTerm]);

  // Use tickets data directly - already filtered by backend
  const allTasks = tickets || [];

  // Get status color based on tab and status
  const getStatusColor = (status) => {
    const normalizedStatus = (status || "").toLowerCase().replace(/\s+/g, "-");
    return `status-${normalizedStatus}`;
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    return `priority-${priority?.toLowerCase() || "medium"}`;
  };

  // Get date color based on urgency
  const getDateColor = (dateString) => {
    if (!dateString) return "date-default";
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    if (targetDate < today) return "date-red";
    if (targetDate.getTime() === today.getTime()) return "date-red";
    if (targetDate.getTime() === today.getTime() + 24 * 60 * 60 * 1000)
      return "date-yellow";
    return "date-green";
  };

  // Format date with relative display
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  };

  // Format date and time
  const formatDateTime = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Filter data based on active tab and search
  // Note: Tab and search filtering is now done on the backend
  // This function just returns all tasks for client-side processing
  const getFilteredData = () => {
    return allTasks;
  };

  // Group tasks by ticket_id and get only the most recent one per ticket
  const getMostRecentTasksPerTicket = (tasks) => {
    const ticketMap = {};
    tasks.forEach((task) => {
      const ticketId = task.ticket_id;
      if (!ticketMap[ticketId]) {
        ticketMap[ticketId] = task;
      } else {
        // Keep the most recent task (by assigned_on date)
        const existingDate = new Date(ticketMap[ticketId].assigned_on || 0);
        const newDate = new Date(task.assigned_on || 0);
        if (newDate > existingDate) {
          ticketMap[ticketId] = task;
        }
      }
    });
    return Object.values(ticketMap);
  };

  // Get all tasks grouped by ticket for expanded view
  const getAllTasksByTicket = (tasks) => {
    const ticketMap = {};
    tasks.forEach((task) => {
      const ticketId = task.ticket_id;
      if (!ticketMap[ticketId]) {
        ticketMap[ticketId] = [];
      }
      ticketMap[ticketId].push(task);
    });
    // Sort each ticket's tasks by assigned_on date (newest first)
    Object.keys(ticketMap).forEach((ticketId) => {
      ticketMap[ticketId].sort(
        (a, b) => new Date(b.assigned_on) - new Date(a.assigned_on)
      );
    });
    return ticketMap;
  };

  // Group data based on groupBy selection
  const getGroupedData = () => {
    const filtered = getFilteredData();
    const mostRecent = getMostRecentTasksPerTicket(filtered);

    if (groupBy === "none") {
      const sorted = sortItems(mostRecent);
      return { "All Items": sorted };
    }

    // First group, then sort within each group
    const grouped = mostRecent.reduce((acc, item) => {
      let key;
      switch (groupBy) {
        case "workflow":
          key = item.workflow_name || "Unassigned Workflow";
          break;
        case "status":
          key = (item.status || "unknown").replace(/_/g, " ").toUpperCase();
          break;
        case "priority":
          key = item.ticket_priority || "Medium";
          break;
        case "assignee":
          key = item.user_full_name || "Unassigned";
          break;
        default:
          key = "All Items";
      }
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});

    // Sort items within each group
    Object.keys(grouped).forEach((key) => {
      grouped[key] = sortItems(grouped[key]);
    });

    return grouped;
  };

  // Toggle group expansion
  const toggleGroup = (groupName) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  // Toggle row expansion
  const toggleRow = (taskItemId) => {
    setExpandedRows((prev) => ({
      ...prev,
      [taskItemId]: !prev[taskItemId],
    }));
  };

  // Toggle ticket expansion to show all tasks for that ticket
  const toggleTicket = (ticketId) => {
    setExpandedTickets((prev) => ({
      ...prev,
      [ticketId]: !prev[ticketId],
    }));
  };

  // Get summary stats based on active tab
  const getSummaryStats = () => {
    const filtered = getFilteredData();
    
    if (activeTab === "Unassigned") {
      // For unassigned tickets, show different stats
      return {
        total: pagination.count || filtered.length,
        unassigned: filtered.length,
        pending: filtered.filter(
          (i) => (i.ticket_status || "").toLowerCase() === "pending" || (i.ticket_status || "").toLowerCase() === "new"
        ).length,
        high_priority: filtered.filter(
          (i) => (i.ticket_priority || "").toLowerCase() === "high" || (i.ticket_priority || "").toLowerCase() === "critical"
        ).length,
      };
    }
    
    return {
      total: pagination.count || filtered.length,
      active: filtered.filter(
        (i) =>
          i.task_status === "in progress" ||
          i.task_status === "pending" ||
          i.status === "in progress"
      ).length,
      pending: filtered.filter(
        (i) => i.task_status === "pending" || i.status === "new"
      ).length,
      blocked: filtered.filter(
        (i) => i.task_status === "blocked" || i.status === "blocked"
      ).length,
    };
  };

  // Handle column sorting
  const handleSort = (key, event) => {
    if (event) {
      event.stopPropagation();
    }
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Sort items based on current sort config
  const sortItems = (items) => {
    if (!sortConfig.key) return items;

    return [...items].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Handle null/undefined
      if (aValue == null) aValue = "";
      if (bValue == null) bValue = "";

      // Handle numeric values
      if (!isNaN(aValue) && !isNaN(bValue) && aValue !== "" && bValue !== "") {
        aValue = Number(aValue);
        bValue = Number(bValue);
      } else {
        // Convert to lowercase for string comparison
        aValue = String(aValue).toLowerCase();
        bValue = String(bValue).toLowerCase();
      }

      if (aValue < bValue) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  };

  const grouped = getGroupedData();
  const stats = getSummaryStats();
  const isLoading = userTicketsLoading || ticketsLoading;

  // Handle pagination
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when page size changes
  };

  return (
    <>
      <AdminNav />
      <main className={styles.ticketPage}>
        {/* Header */}
        <section className={styles.tpHeader}>
          <h1>Manage All Tickets</h1>
        </section>

        {/* Body */}
        <section className={styles.tpBody}>
          {/* Tab Navigation */}
          <div className={styles.tpTabs}>
            {["Active", "Inactive", "Unassigned"].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setExpandedGroups({});
                  setExpandedRows({});
                }}
                className={`${styles.tpTabLink} ${
                  activeTab === tab ? styles.active : ""
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Controls Bar */}
          <div className={styles.tpControlsBar}>
            <div className={styles.controlsTop}>
              <div className={styles.controlsLeft}>
                <h2 className={styles.tableTitle}>All Tickets</h2>
              </div>
              <div className={styles.controlsRight}>
                {/* Group By */}
                <select
                  value={groupBy}
                  onChange={(e) => {
                    setGroupBy(e.target.value);
                    setExpandedGroups({});
                  }}
                  className={styles.selectControl}
                >
                  <option value="none">No Grouping</option>
                  <option value="workflow">Group by Workflow</option>
                  <option value="status">Group by Status</option>
                  <option value="priority">Group by Priority</option>
                  <option value="assignee">Group by Assignee</option>
                </select>

                {/* Filters Toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={styles.filterButton}
                >
                  Filters
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className={styles.searchContainer}>
              <input
                type="text"
                placeholder="Search by ticket number, subject, or assignee..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
              {showFilters && (
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className={styles.statusFilter}
                >
                  <option value="all">All Status</option>
                  <option value="new">New</option>
                  <option value="in progress">In Progress</option>
                  <option value="pending">Pending</option>
                  <option value="blocked">Blocked</option>
                  <option value="completed">Completed</option>
                  <option value="closed">Closed</option>
                  <option value="resolved">Resolved</option>
                </select>
              )}
            </div>

            {/* Summary Stats */}
            <div className={styles.summaryStats}>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Total:</span>
                <span className={styles.statValue}>{stats.total}</span>
              </div>
              {activeTab === "Unassigned" ? (
                <>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Unassigned:</span>
                    <span className={`${styles.statValue} ${styles.blockedCount}`}>
                      {stats.unassigned}
                    </span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>High Priority:</span>
                    <span className={`${styles.statValue} ${styles.pendingCount}`}>
                      {stats.high_priority}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Active:</span>
                    <span className={`${styles.statValue} ${styles.activeCount}`}>
                      {stats.active}
                    </span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Pending:</span>
                    <span className={`${styles.statValue} ${styles.pendingCount}`}>
                      {stats.pending}
                    </span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Blocked:</span>
                    <span className={`${styles.statValue} ${styles.blockedCount}`}>
                      {stats.blocked}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Table Section */}
          <div className={styles.tpTableSection}>
            {isLoading && (
              <div className={styles.skeletonWrapper}>
                <TableSkeleton rows={5} columns={8} />
              </div>
            )}

            {/* Empty State */}
            {!isLoading && getFilteredData().length === 0 && (
              <div className={styles.emptyState}>
                <p>No tickets found</p>
              </div>
            )}

            {/* Table Content */}
            {!isLoading && getFilteredData().length > 0 && (
              <div className={styles.tableWrapper}>
                {Object.entries(grouped).map(([groupName, items]) => (
                  <div key={groupName} className={styles.groupContainer}>
                    {/* Group Header */}
                    {groupBy !== "none" && (
                      <div
                        onClick={() => toggleGroup(groupName)}
                        className={styles.groupHeader}
                      >
                        <span className={styles.groupToggle}>
                          {expandedGroups[groupName] ? "▼" : "▶"}
                        </span>
                        <span className={styles.groupName}>{groupName}</span>
                        <span className={styles.groupCount}>
                          ({items.length})
                        </span>
                      </div>
                    )}

                    {/* Table */}
                    {(groupBy === "none" || expandedGroups[groupName]) && (
                      <table className={styles.dataTable}>
                        <thead className={styles.tableHead}>
                          <tr>
                            <th className={styles.thExpand}></th>
                            <th
                              className={styles.sortableHeader}
                              onClick={(e) => handleSort("ticket_number", e)}
                            >
                              Ticket #{" "}
                              {sortConfig.key === "ticket_number" && (
                                <span className={styles.sortIndicator}>
                                  {sortConfig.direction === "asc" ? "▲" : "▼"}
                                </span>
                              )}
                            </th>
                            <th
                              className={styles.sortableHeader}
                              onClick={(e) => handleSort("ticket_subject", e)}
                            >
                              Subject{" "}
                              {sortConfig.key === "ticket_subject" && (
                                <span className={styles.sortIndicator}>
                                  {sortConfig.direction === "asc" ? "▲" : "▼"}
                                </span>
                              )}
                            </th>
                            <th
                              className={styles.sortableHeader}
                              onClick={(e) => handleSort("workflow_name", e)}
                            >
                              Workflow{" "}
                              {sortConfig.key === "workflow_name" && (
                                <span className={styles.sortIndicator}>
                                  {sortConfig.direction === "asc" ? "▲" : "▼"}
                                </span>
                              )}
                            </th>
                            <th
                              className={styles.sortableHeader}
                              onClick={(e) =>
                                handleSort("current_step_name", e)
                              }
                            >
                              Current Step{" "}
                              {sortConfig.key === "current_step_name" && (
                                <span className={styles.sortIndicator}>
                                  {sortConfig.direction === "asc" ? "▲" : "▼"}
                                </span>
                              )}
                            </th>
                            <th
                              className={styles.sortableHeader}
                              onClick={(e) => handleSort("user_full_name", e)}
                            >
                              Assignee{" "}
                              {sortConfig.key === "user_full_name" && (
                                <span className={styles.sortIndicator}>
                                  {sortConfig.direction === "asc" ? "▲" : "▼"}
                                </span>
                              )}
                            </th>
                            <th
                              className={styles.sortableHeader}
                              onClick={(e) => handleSort("ticket_priority", e)}
                            >
                              Priority{" "}
                              {sortConfig.key === "ticket_priority" && (
                                <span className={styles.sortIndicator}>
                                  {sortConfig.direction === "asc" ? "▲" : "▼"}
                                </span>
                              )}
                            </th>
                            <th
                              className={styles.sortableHeader}
                              onClick={(e) =>
                                handleSort("target_resolution", e)
                              }
                            >
                              Target Date{" "}
                              {sortConfig.key === "target_resolution" && (
                                <span className={styles.sortIndicator}>
                                  {sortConfig.direction === "asc" ? "▲" : "▼"}
                                </span>
                              )}
                            </th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.length === 0 ? (
                            <tr>
                              <td colSpan="9" className={styles.noData}>
                                No items in this group
                              </td>
                            </tr>
                          ) : (
                            items.map((mainTask) => {
                              // Get all tasks for this ticket
                              const allTasksMap = getAllTasksByTicket(
                                getFilteredData()
                              );
                              const allTasksForTicket = allTasksMap[
                                mainTask.ticket_id
                              ] || [mainTask];
                              const isTicketExpanded =
                                expandedTickets[mainTask.ticket_id];

                              return (
                                <React.Fragment
                                  key={
                                    mainTask.task_item_id || mainTask.ticket_id
                                  }
                                >
                                  {/* Main Task Row (Most Recent) */}
                                  <tr className={styles.tableRow}>
                                    <td className={styles.expandCell}>
                                      {allTasksForTicket.length > 1 && (
                                        <button
                                          onClick={() =>
                                            toggleTicket(mainTask.ticket_id)
                                          }
                                          className={styles.expandButton}
                                          title={`Show all ${allTasksForTicket.length} tasks`}
                                        >
                                          {isTicketExpanded ? "▼" : "▶"}
                                        </button>
                                      )}
                                    </td>
                                    <td className={styles.ticketNumber}>
                                      {mainTask.ticket_number || "-"}
                                    </td>
                                    <td className={styles.ticketSubject}>
                                      <p className={styles.subject}>
                                        {mainTask.ticket_subject}
                                      </p>
                                      <p className={styles.description}>
                                        {mainTask.ticket_description}
                                      </p>
                                    </td>
                                    <td className={styles.workflow}>
                                      {mainTask.workflow_name || "-"}
                                    </td>
                                    <td className={styles.currentStep}>
                                      <p className={styles.stepName}>
                                        {mainTask.current_step_name || "-"}
                                      </p>
                                      {mainTask.current_step_role && (
                                        <p className={styles.stepRole}>
                                          {mainTask.current_step_role}
                                        </p>
                                      )}
                                    </td>
                                    <td className={styles.assignee}>
                                      <p className={styles.assigneeName}>
                                        {mainTask.user_full_name}
                                      </p>
                                      {mainTask.role && (
                                        <p className={styles.assigneeRole}>
                                          {mainTask.role}
                                        </p>
                                      )}
                                    </td>
                                    {/* <td className={styles.status}>
                                      <span
                                        className={`${general.statusBadge || styles.statusBadge} ${general[getStatusColor(
                                          mainTask.ticket_status
                                        )]}`}
                                      >
                                        {(mainTask.ticket_status || "unknown")
                                          .replace(/_/g, " ")
                                          .toUpperCase()}
                                      </span>
                                    </td>
                                    <td className={styles.status}>
                                      <span
                                        className={`${general.statusBadge || styles.statusBadge} ${general[getStatusColor(
                                          mainTask.task_status
                                        )]}`}
                                      >
                                        {(mainTask.task_status || "unknown")
                                          .replace(/_/g, " ")
                                          .toUpperCase()}
                                      </span>
                                    </td> */}
                                    <td className={styles.priority}>
                                      <span
                                        className={`${
                                          general.priorityBadge ||
                                          styles.priorityBadge
                                        } ${
                                          general[
                                            getPriorityColor(
                                              mainTask.ticket_priority
                                            )
                                          ]
                                        }`}
                                      >
                                        {mainTask.ticket_priority || "Medium"}
                                      </span>
                                    </td>
                                    <td className={styles.targetDate}>
                                      <span
                                        className={`${
                                          general.statusBadge ||
                                          styles.statusBadge
                                        } ${
                                          general[
                                            getDateColor(
                                              mainTask.target_resolution
                                            )
                                          ]
                                        }`}
                                      >
                                        {formatDate(mainTask.target_resolution)}
                                      </span>
                                    </td>
                                    <td className={styles.action}>
                                      {/* For unassigned tickets, show Assign button; for others, show View button */}
                                      {activeTab === "Unassigned" ? (
                                        <button
                                          className={styles.btn}
                                          title="Assign ticket to workflow"
                                          onClick={() => {
                                            setSelectedTicketForAssign(mainTask);
                                            setShowAssignModal(true);
                                          }}
                                        >
                                          ➕
                                        </button>
                                      ) : (
                                        <button
                                          className={styles.btn}
                                          title="View ticket details"
                                          onClick={() =>
                                            navigate(
                                              `/admin/archive/${mainTask.ticket_number}`
                                            )
                                          }
                                        >
                                          👁
                                        </button>
                                      )}
                                    </td>
                                  </tr>

                                  {/* Additional Tasks Row (when expanded) */}
                                  {isTicketExpanded &&
                                    allTasksForTicket.length > 1 && (
                                      <tr className={styles.expandedRow}>
                                        <td colSpan="9">
                                          <div
                                            className={styles.expandedContent}
                                          >
                                            <h4 className={styles.detailsTitle}>
                                              All Tasks for This Ticket (
                                              {allTasksForTicket.length})
                                            </h4>
                                            <div
                                              className={
                                                styles.taskHistoryTable
                                              }
                                            >
                                              <table
                                                className={styles.nestedTable}
                                              >
                                                <thead>
                                                  <tr>
                                                    <th>Assigned To</th>
                                                    <th>Current Step</th>
                                                    {/* <th>Status</th> */}
                                                    <th>Assigned On</th>
                                                    <th>Notes</th>
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                  {allTasksForTicket.map(
                                                    (task, idx) => (
                                                      <tr
                                                        key={`${task.task_item_id}-${idx}`}
                                                        className={
                                                          styles.tableRow
                                                        }
                                                      >
                                                        <td
                                                          className={
                                                            styles.assignee
                                                          }
                                                        >
                                                          <div>
                                                            <p
                                                              className={
                                                                styles.cellName
                                                              }
                                                            >
                                                              {
                                                                task.user_full_name
                                                              }
                                                            </p>
                                                            <p
                                                              className={
                                                                styles.cellRole
                                                              }
                                                            >
                                                              {task.role || "-"}
                                                            </p>
                                                          </div>
                                                        </td>
                                                        <td
                                                          className={
                                                            styles.currentStep
                                                          }
                                                        >
                                                          <div>
                                                            <p
                                                              className={
                                                                styles.cellName
                                                              }
                                                            >
                                                              {task.current_step_name ||
                                                                "-"}
                                                            </p>
                                                          </div>
                                                        </td>
                                                        {/* <td className={styles.status}>
                                                      <span
                                                        className={`${general.statusBadge || styles.statusBadge} ${general[getStatusColor(
                                                          task.status || task.task_status
                                                        )]}`}
                                                      >
                                                        {((task.status || task.task_status) || "unknown")
                                                          .replace(/_/g, " ")
                                                          .toUpperCase()}
                                                      </span>
                                                    </td> */}
                                                        <td
                                                          className={
                                                            styles.targetDate
                                                          }
                                                        >
                                                          <span
                                                            className={`${
                                                              general.statusBadge ||
                                                              styles.statusBadge
                                                            } ${
                                                              general[
                                                                getDateColor(
                                                                  task.assigned_on
                                                                )
                                                              ]
                                                            }`}
                                                          >
                                                            {formatDateTime(
                                                              task.assigned_on
                                                            )}
                                                          </span>
                                                        </td>
                                                        <td
                                                          className={
                                                            styles.ticketSubject
                                                          }
                                                        >
                                                          {task.notes || "-"}
                                                        </td>
                                                      </tr>
                                                    )
                                                  )}
                                                </tbody>
                                              </table>
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                </React.Fragment>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {!isLoading && pagination.count > 0 && (
              <div className={styles.paginationContainer}>
                <Pagination
                  currentPage={currentPage}
                  pageSize={pageSize}
                  totalItems={pagination.count}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                  pageSizeOptions={[5, 10, 20, 50, 100]}
                />
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Assign Workflow Modal for Unassigned Tickets */}
      {showAssignModal && selectedTicketForAssign && (
        <AssignWorkflow
          ticket={selectedTicketForAssign}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedTicketForAssign(null);
          }}
          onSuccess={() => {
            // Refresh the tickets list after successful assignment
            fetchTickets(currentPage, pageSize, activeTab.toLowerCase(), debouncedSearchTerm);
          }}
        />
      )}
    </>
  );
}
