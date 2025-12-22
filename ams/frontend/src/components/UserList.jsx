import { useState } from 'react';
import { FiFilter } from 'react-icons/fi';
import FilterOverlay from './FilterOverlay';
import RegisterUserModal from './RegisterUserModal';
import '../styles/UserList.css';

export default function UserList() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  const handleFilterClick = () => {
    setIsFilterOpen(prevState => !prevState);
    console.log('Filter clicked, new state:', !isFilterOpen); // Debug log
  };

  return (
    <div className="user-list-container">
      <div className="user-list-header">
        <div className="search-filter-container">
          <input
            type="text"
            placeholder="Search..."
            className="search-input"
          />
          <div className="filter-container">
            <button
              className="filter-button"
              onClick={handleFilterClick}
            >
              <FiFilter />
              Filter
            </button>
            <FilterOverlay
              isOpen={isFilterOpen}
              onClose={() => setIsFilterOpen(false)}
            />
          </div>
        </div>
        <button
          className="add-user-button"
          onClick={() => setIsRegisterModalOpen(true)}
        >
          + Add User
        </button>
      </div>

      {/* User list table will go here */}
      <div className="user-list-table">
        {/* Table content */}
      </div>

      <RegisterUserModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
      />
    </div>
  );
} 