import { useEffect, useMemo, useState } from "react";
import { useAuth } from '../../../context/AuthContext';
import { useNavigate, useParams } from "react-router-dom";
import { FaCheck, FaTimes, FaEye } from "react-icons/fa";

import styles from "./CoordinatorAdminUserAccess.module.css";
import ViewCard from "../../../shared/components/ViewCard";
import Button from "../../../shared/components/Button";
import TablePagination from "../../../shared/table/TablePagination";
import FilterPanel from "../../../shared/table/FilterPanel";
import InputField from '../../../shared/components/InputField';
import Skeleton from '../../../shared/components/Skeleton/Skeleton';
import authService from "../../../utilities/service/authService";
import { getEmployeeUsers } from "../../../utilities/storages/employeeUserStorage";
import { authUserService } from '../../../services/auth/userService';

import CoordinatorAdminApproveUserModal from "../../components/modals/SysAdminApproveUserModal";
import CoordinatorAdminRejectUserModal from "../../components/modals/SysAdminRejectUserModal";
import ModalWrapper from "../../../shared/modals/ModalWrapper";

// 👇 Configuration for tab filtering
const userAccessConfig = [
  { key: "all-users", label: "All Users" },
  { key: "employees", label: "Employees", filter: (u) => u.role?.toLowerCase() === "employee" },
  { key: "ticket-coordinators", label: "Ticket Coordinators", filter: (u) => u.role?.toLowerCase() === "ticket coordinator" },
  { key: "system-admins", label: "System Admins", filter: (u) => {
    const role = u.role?.toLowerCase();
    return role === "system admin" || role === "admin";
  }},
  { key: "pending-users", label: "Pending Users", filter: (u) => u.status?.toLowerCase() === "pending" && u.role?.toLowerCase() === "employee" && !!u.hasHdts },
  { key: "rejected-users", label: "Rejected Users", filter: (u) => u.status?.toLowerCase() === "rejected" },
];

const CoordinatorAdminUserAccess = () => {
  const { status = "all-users" } = useParams();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();

  const [currentUser, setCurrentUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [showFilter, setShowFilter] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    category: null,
    status: null,
  });

  // 👇 Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(true);

  const normalizedStatus = status.toLowerCase();
  const statusConfig = userAccessConfig.find((cfg) => cfg.key === normalizedStatus);
  const title = statusConfig?.label || "User Access";

  // 👇 Fetch users and current user
  useEffect(() => {
    // Simulate loading delay
    let mounted = true;
    const timer = setTimeout(() => {
      (async () => {
    try {
    setIsLoading(true);
    // prefer AuthContext user when available; compute viewer locally so we can use it synchronously
    const parsedLocal = (() => { try { return JSON.parse(localStorage.getItem('user')||'null'); } catch(e){return null;} })();
    const viewer = authUser || parsedLocal;
    setCurrentUser(viewer);

          // Fetch real users from the AUTH service (HDTS user store)
          // This pulls user records from the `auth` app/database instead of
          // the main backend employees endpoint.
          const fetched = await authUserService.getAllHdtsUsers();
          // authUserService may return either an array or an object like
          // { count: X, users: [...] } — handle both shapes and also
          // { results: [...] } when applicable.
          const raw = Array.isArray(fetched)
            ? fetched
            : (Array.isArray(fetched?.users)
                ? fetched.users
                : (Array.isArray(fetched?.results) ? fetched.results : (fetched || [])));

          console.log('UserAccess - fetched raw users length:', Array.isArray(raw) ? raw.length : typeof raw, fetched);

          // Normalize to the UI shape expected by this page
          const normalized = raw.map(u => {
            // Derive role: prefer explicit `role`, but many auth users store
            // roles inside `system_roles` array (with system_slug and role_name)
            let derivedRole = u.role || u.role_name || null;
            if (!derivedRole && Array.isArray(u.system_roles)) {
              const hdts = u.system_roles.find(r => r.system_slug === 'hdts' || r.system === 'hdts');
              if (hdts) derivedRole = hdts.role_name || hdts.role || null;
            }

            // Derive status: many APIs use `status`, `account_status` or boolean `is_active`.
            let derivedStatus = u.status || u.account_status || null;
            if (!derivedStatus && typeof u.is_active === 'boolean') {
              derivedStatus = u.is_active ? 'Active' : 'Inactive';
            }
            // Normalize common variants
            if (derivedStatus && typeof derivedStatus === 'string') {
              derivedStatus = derivedStatus.trim();
            }

            // Company id fallback: try multiple fields, finally use id
            const companyId = u.company_id || u.companyId || u.employee_id || u.employeeId || u.id || '';

            const hasHdts = Array.isArray(u.system_roles) ? !!u.system_roles.find(r => (r.system_slug === 'hdts' || r.system === 'hdts' || r.system_slug === 'HDTS' || r.system === 'HDTS')) : false;

            return {
              companyId,
              lastName: u.last_name || u.lastName || u.surname || u.last || '',
              firstName: u.first_name || u.firstName || u.given_name || u.first || '',
              department: u.department || u.dept || '',
              role: derivedRole || '',
              status: derivedStatus || '',
              hasHdts,
              // keep original raw object for other actions if needed
              _raw: u,
            };
          });

          let usersToShow = normalized;
          if (viewer) {
            if (viewer.role === "Ticket Coordinator") {
              usersToShow = normalized.filter((u) => u.department === viewer.department);
            } else if (viewer.role === "System Admin") {
              usersToShow = normalized;
            }
          }

          if (mounted) setAllUsers(usersToShow);
        } catch (err) {
          console.error('Failed to load users for User Access page', err);
        } finally {
          if (mounted) setIsLoading(false);
        }
      })();
    }, 300);

    return () => { mounted = false; clearTimeout(timer); };
  }, []);

  // 👇 Combined filtering logic
  const filteredUsers = useMemo(() => {
    let users = [...allUsers];

    // Apply role/status filter from URL
    if (statusConfig?.filter) {
      users = users.filter(statusConfig.filter);
    }

    // Search
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      users = users.filter(({ firstName, lastName, companyId }) =>
        [firstName, lastName, companyId].some((val) => val?.toLowerCase().includes(term))
      );
    }

    // Advanced filters
    if (activeFilters.category) {
      users = users.filter(
        (user) => user.department?.toLowerCase() === activeFilters.category.label.toLowerCase()
      );
    }

    if (activeFilters.status) {
      const selected = (activeFilters.status.label || '').toString().toLowerCase();
      // Map UI-facing label 'Active' to backend 'Approved' (and accept 'Active')
      const accepted = selected === 'active' ? ['active', 'approved'] : [selected];
      users = users.filter((user) => accepted.includes((user.status || '').toLowerCase()));
    }

    return users;
  }, [allUsers, statusConfig, searchTerm, activeFilters]);

  // 👇 Paginate
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage, itemsPerPage]);

  // 👇 Reset pagination on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, normalizedStatus, activeFilters]);

  const openModal = (type, user) => {
    setSelectedUser(user);
    setModalType(type);
  };

  const closeModal = (shouldRefresh) => {
    setSelectedUser(null);
    setModalType(null);
  };

  return (
    <>
      <div className={styles.pageContainer}>
        {/* Header Section */}
        <div className={styles.topBar}>
          <button
            className={styles.showFilterButton}
            onClick={() => setShowFilter((prev) => !prev)}
          >
            {showFilter ? "Hide Filter" : "Show Filter"}
          </button>
        </div>

        {/* Filter Panel */}
        {showFilter && (
          <FilterPanel
            hideToggleButton
            showDateFilters={false}
            categoryLabel="Department"
            statusLabel="Status"
            onApply={setActiveFilters}
            onReset={() => {
              setActiveFilters({ category: null, status: null });
              setCurrentPage(1);
            }}
            categoryOptions={[
              { label: "IT Department" },
              { label: "Asset Department" },
              { label: "Budget Department" },
            ]}
            // No sub-categories for User Access filters
            subCategoryOptions={[]}
            statusOptions={[
              { label: "Active" },
              { label: "Pending" },
              { label: "Rejected" },
              { label: "Inactive" },
            ]}
            priorityOptions={[]}
            slaStatusOptions={[]}
            assignedAgentOptions={[]}
            initialFilters={activeFilters}
          />
        )}

        {/* Table Section */}
        <ViewCard>
          <div className={styles.tableSection}>
            <div className={styles.tableHeader}>
              <h2>{title}</h2>
              <div className={styles.tableActions}>
                <InputField
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  inputStyle={{ width: '260px' }}
                />
                <Button
                  variant="primary"
                  onClick={() => navigate("/admin/account-register")}
                  className={styles.registerButton}
                >
                  Register User
                </Button>
              </div>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Company ID</th>
                    <th>Last Name</th>
                    <th>First Name</th>
                    <th>Department</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td><Skeleton /></td>
                        <td><Skeleton /></td>
                        <td><Skeleton /></td>
                        <td><Skeleton /></td>
                        <td><Skeleton /></td>
                        <td><Skeleton width="80px" /></td>
                        <td><Skeleton width="80px" /></td>
                      </tr>
                    ))
                  ) : paginatedUsers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        style={{
                          textAlign: "center",
                          padding: 40,
                          color: "#6b7280",
                          fontStyle: "italic",
                        }}
                      >
                        No users found for this category or search.
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((user, idx) => (
                      <tr key={user.companyId || idx}>
                        <td>{user.companyId}</td>
                        <td>{user.lastName}</td>
                        <td>{user.firstName}</td>
                        <td>{user.department}</td>
                        <td>{user.role}</td>
                        <td>
                          <div
                            className={
                              styles[
                                `status-${(user.status || "active")
                                  .replace(/\s+/g, "-")
                                  .toLowerCase()}`
                              ]
                            }
                          >
                            {user.status}
                          </div>
                        </td>
                        <td>
                          <div className={styles.actionButtonCont}>
                            {user.status?.toLowerCase() === "pending" && (
                              <>
                                <button
                                  title="Approve"
                                  className={styles.actionButton}
                                  onClick={() => openModal("approve", user)}
                                >
                                  <FaCheck />
                                </button>
                                <button
                                  title="Reject"
                                  className={styles.actionButton}
                                  onClick={() => openModal("reject", user)}
                                >
                                  <FaTimes />
                                </button>
                              </>
                            )}
                            <button
                              title="View"
                              className={styles.actionButton}
                              onClick={() =>
                                navigate(`/admin/user-profile/${user.companyId}`)
                              }
                            >
                              <FaEye />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className={styles.tablePagination}>
              {!isLoading && (
                <TablePagination
                  currentPage={currentPage}
                  totalItems={filteredUsers.length}
                  initialItemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={setItemsPerPage}
                  alwaysShow
                />
              )}
            </div>
          </div>
        </ViewCard>
      </div>

      {/* Modals */}
      {modalType === "approve" && selectedUser && (
        <ModalWrapper onClose={closeModal}>
          <CoordinatorAdminApproveUserModal
            user={selectedUser}
            onClose={closeModal}
          />
        </ModalWrapper>
      )}

      {modalType === "reject" && selectedUser && (
        <ModalWrapper onClose={closeModal}>
          <CoordinatorAdminRejectUserModal
            user={selectedUser}
            onClose={closeModal}
          />
        </ModalWrapper>
      )}
    </>
  );
};

export default CoordinatorAdminUserAccess;
