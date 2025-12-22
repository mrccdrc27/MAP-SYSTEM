import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import NavBar from "../components/NavBar";
import MediumButtons from "../components/buttons/MediumButtons";
import Status from "../components/Status";
import RegisterUserModal from "../components/RegisterUserModal";
import DeleteModal from "../components/Modals/DeleteModal";
import UserManagementFilterModal from "../components/Modals/UserManagementFilterModal";
import DefaultProfile from "../assets/img/default-profile.svg";
import Alert from "../components/Alert";
import Pagination from "../components/Pagination";
import Footer from "../components/Footer";
import { exportToExcel } from "../utils/exportToExcel";
import ActionButtons from "../components/ActionButtons";
import mockUsers from "../data/mockData/user-management/user-management-data.json";

import "../styles/UserManagement/UserManagement.css";

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
      <th>PROFILE PICTURE</th>
      <th>NAME</th>
      <th>EMAIL</th>
      <th>ROLE</th>
      <th>PHONE NUMBER</th>
      <th>COMPANY</th>
      <th>PHONE</th>
      <th>STATUS</th>
      <th>LAST LOGIN</th>
      <th>ACTIONS</th>
    </tr>
  );
}

// TableItem component to render each user row
function TableItem({ user, isSelected, onRowChange, onViewUser }) {
  const formattedLastLogin = user.lastLogin
    ? new Date(user.lastLogin).toLocaleString()
    : "—";

  return (
    <tr>
      <td>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onRowChange(user.id, e.target.checked)}
        />
      </td>
      <td>
        <img
          src={DefaultProfile}
          alt={user.name}
          className="table-img"
          onError={(e) => {
            e.target.src = DefaultProfile;
          }}
        />
      </td>
      <td>{user.name}</td>
      <td>{user.email}</td>
      <td>{user.role}</td>
      <td>{user.phoneNumber}</td>
      <td>{user.company}</td>
      <td>{user.phone}</td>
      <td>
        <Status type={user.status.type} name={user.status.name} />
      </td>
      <td>{formattedLastLogin}</td>
      <td>
        <ActionButtons
          showView
          showEdit
          onViewClick={() => onViewUser(user)}
          editPath={`/user-management/edit/${user.id}`}
          editState={{ user }}
        />
      </td>
    </tr>
  );
}

export default function UserManagement() {
  const location = useLocation();
  const navigate = useNavigate();

  // User data state
  const [users, setUsers] = useState([]);
  const [filteredData, setFilteredData] = useState([]);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [isActivateModalOpen, setActivateModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Selection state
  const [selectedIds, setSelectedIds] = useState([]);

  // Delete modal state
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Search and alert state
  const [searchQuery, setSearchQuery] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Filter modal state
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState({});

  const [successMessage, setSuccessMessage] = useState("");



  // Mock data for users - loaded from JSON file (replace with API later)

  // Paginate the data
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedUsers = filteredData.slice(startIndex, endIndex);

  // Selection logic
  const allSelected =
    paginatedUsers.length > 0 &&
    paginatedUsers.every((item) => selectedIds.includes(item.id));

  const handleHeaderChange = (e) => {
    if (e.target.checked) {
      setSelectedIds((prev) => [
        ...prev,
        ...paginatedUsers.map((item) => item.id).filter((id) => !prev.includes(id)),
      ]);
    } else {
      setSelectedIds((prev) =>
        prev.filter((id) => !paginatedUsers.map((item) => item.id).includes(id))
      );
    }
  };

  const handleRowChange = (id, checked) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((itemId) => itemId !== id));
    }
  };

  const handleViewUser = (user) => {
    navigate(`/user-management/view/${user.id}`, {
      state: { user },
    });
  };

  const openDeleteModal = (id = null) => {
    setDeleteTarget(id);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setDeleteTarget(null);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      console.log("Deleting single user id:", deleteTarget);
      // remove from mock data / API call
    } else {
      console.log("Deleting multiple user ids:", selectedIds);
      // remove multiple
      setSelectedIds([]); // clear selection
    }
    closeDeleteModal();
  };

  useEffect(() => {
    if (location.state?.successMessage) {
      setSuccessMessage(location.state.successMessage);
      setTimeout(() => {
        setSuccessMessage("");
        window.history.replaceState({}, document.title);
      }, 5000);
    }

    // Initialize with mock data
    setUsers(mockUsers);
    setFilteredData(mockUsers);
  }, [location]);

  // Filter users based on search query and applied filters
  useEffect(() => {
    const query = searchQuery.toLowerCase();

    const filtered = users.filter((user) => {
      const name = (user.name || "").toLowerCase();
      const email = (user.email || "").toLowerCase();
      const role = (user.role || "").toLowerCase();
      const phoneNumber = (user.phoneNumber || "").toLowerCase();
      const company = (user.company || "").toLowerCase();
      const phone = (user.phone || "").toLowerCase();

      const matchesSearch =
        !query ||
        name.includes(query) ||
        email.includes(query) ||
        role.includes(query) ||
        phoneNumber.includes(query) ||
        company.includes(query) ||
        phone.includes(query);

      const filterName = (appliedFilters.name || "").toLowerCase();
      const filterCompany = (appliedFilters.company || "").toLowerCase();
      const filterRole = appliedFilters.role || "";
      const filterStatus = appliedFilters.status || "";

      const matchesNameFilter = filterName ? name.includes(filterName) : true;
      const matchesCompanyFilter = filterCompany
        ? company.includes(filterCompany)
        : true;
      const matchesRoleFilter = filterRole ? user.role === filterRole : true;
      const matchesStatusFilter = filterStatus
        ? user.status?.name === filterStatus
        : true;

      return (
        matchesSearch &&
        matchesNameFilter &&
        matchesCompanyFilter &&
        matchesRoleFilter &&
        matchesStatusFilter
      );
    });

    setFilteredData(filtered);
    setCurrentPage(1); // Reset to first page when search or filters change
  }, [searchQuery, users, appliedFilters]);

  const handleDeactivate = (user) => {
    setSelectedUser(user);
    setDeactivateModalOpen(true);
  };

  const handleActivate = (user) => {
    setSelectedUser(user);
    setActivateModalOpen(true);
  };

  const confirmActivate = async (user) => {
    try {
      console.log("Activating user:", user.id);

      // Update the user's status in the local state
      setUsers(prevUsers =>
        prevUsers.map(u =>
          u.id === user.id
            ? { ...u, status: { type: "deployable", name: "Active" } }
            : u
        )
      );

      setSuccessMessage(`${user.name} has been activated successfully!`);
      setTimeout(() => setSuccessMessage(""), 5000);
      setActivateModalOpen(false);
    } catch (error) {
      console.error("Activation failed:", error);
      throw error;
    }
  };

  const confirmDeactivate = async (user) => {
    try {
      console.log("Deactivating user:", user.id);

      setUsers(prevUsers =>
        prevUsers.map(u =>
          u.id === user.id
            ? { ...u, status: { type: "archived", name: "Inactive" } }
            : u
        )
      );

      setSuccessMessage(`${user.name} has been deactivated successfully!`);
      setTimeout(() => setSuccessMessage(""), 5000);
      setDeactivateModalOpen(false);
    } catch (error) {
      console.error("Deactivation failed:", error);
      throw error;
    }
  };

  const handleApplyFilter = (filters) => {
    setAppliedFilters(filters);
  };

  const handleExport = () => {
    const dataToExport = filteredData.length > 0 ? filteredData : users;
    exportToExcel(dataToExport, "Users_Records.xlsx");
  };

  return (
    <>
      {errorMessage && <Alert message={errorMessage} type="danger" />}
      {successMessage && <Alert message={successMessage} type="success" />}

      {isDeactivateModalOpen && selectedUser && (
        <DeleteModal
          isOpen={isDeactivateModalOpen}
          onConfirm={async () => {
            try {
              await confirmDeactivate(selectedUser);
            } catch (error) {
              setErrorMessage("Deactivation failed. Please try again.");
              setTimeout(() => setErrorMessage(""), 5000);
            }
          }}
          onCancel={() => setDeactivateModalOpen(false)}
          title="Deactivate User"
          message={`Are you sure you want to deactivate ${selectedUser?.name}? This user will no longer be able to access the system until reactivated.`}
        />
      )}

      {isActivateModalOpen && selectedUser && (
        <DeleteModal
          isOpen={isActivateModalOpen}
          onConfirm={async () => {
            try {
              await confirmActivate(selectedUser);
            } catch (error) {
              setErrorMessage("Activation failed. Please try again.");
              setTimeout(() => setErrorMessage(""), 5000);
            }
          }}
          onCancel={() => setActivateModalOpen(false)}
          title="Activate User"
          message={`Are you sure you want to activate ${selectedUser?.name}? This user will be able to access the system again.`}
        />
      )}

      {isDeleteModalOpen && (
        <DeleteModal
          isOpen={isDeleteModalOpen}
          onConfirm={confirmDelete}
          onCancel={closeDeleteModal}
          title="Delete User"
          message={
            deleteTarget
              ? "Are you sure you want to delete this user?"
              : "Are you sure you want to delete the selected users?"
          }
        />
      )}

      {/* User Management Filter Modal */}
      <UserManagementFilterModal
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
              <h2 className="h2">System Agents ({filteredData.length})</h2>
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
                <MediumButtons
                  type="export"
                  onClick={handleExport}
                />
              </section>
            </section>

            {/* Table Structure */}
            <section className="users-table-section">
              <table>
                <thead>
                  <TableHeader
                    allSelected={allSelected}
                    onHeaderChange={handleHeaderChange}
                  />
                </thead>
                <tbody>
                  {paginatedUsers.length > 0 ? (
                    paginatedUsers.map((user) => (
                      <TableItem
                        key={user.id}
                        user={user}
                        isSelected={selectedIds.includes(user.id)}
                        onRowChange={handleRowChange}
                        onViewUser={handleViewUser}
                      />
                    ))
                  ) : (
                    <tr>
                      <td colSpan={11} className="no-data-message">
                        No Agents Found.
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
                totalItems={filteredData.length}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            </section>
          </section>
        </main>
        <Footer />
      </section>

      <RegisterUserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}