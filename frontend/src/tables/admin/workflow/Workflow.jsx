// dependencies import
import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// styles import
import table from "../../styles/general-table.module.css";
import layout from "./WorkflowTable.module.css";

// Api Import
const ticketURL = import.meta.env.VITE_WORKFLOW_API;

// component import
import { Pagination } from "../../components/tableforms";
import { AgentStatus } from "../../components/tableforms";
import useFetchWorkflows from "../../../api/useFetchWorkflows";

function TableHeader() {
  // Inline styles for the width of each rows
  return(
    <tr className={table.tr}>
      <th className={table.th} style={{ width: '25%' }}>Workflow</th>
      <th className={table.th} style={{ width: '15%' }}>Main Category</th>
      <th className={table.th} style={{ width: '15%' }}>Sub Category</th>
      <th className={table.th} style={{ width: '25%' }}>Description</th>
      
      <th className={table.th} style={{ 
        width: '10%',
        // display: 'table-cell',
        // textAlign: 'center'
      }}>Status</th>

      {/* <th className={table.th} style={{ width: '10%',
      display: 'table-cell',
      textAlign: 'center'
      }}>Tickets</th> */}

      <th className={table.th} style={{ 
        width: '10%',
        display: 'table-cell', 
        textAlign: 'center', 
        verticalAlign: 'middle'  
      }}>Action</th>
    </tr>
  )
}

function TableRow(props) {
  return(
    <tr className={table.tr}>
      <td className={table.td}>{props.Name}</td>
      <td className={table.td}>{props.Category}</td>
      <td className={table.td}>{props.SubCategory}</td>
      <td className={table.td}>{props.Description}</td>
      <td className={table.td}
        style={{
          display: 'table-cell',
          textAlign: 'center'
        }}
      >
        <AgentStatus status={props.Status}/>
      </td>
      
      {/* <td className={table.td}
        style={{
          display: 'table-cell',
          textAlign: 'center'
        }}>{props.Ticket}</td> */}

      <td className={table.td}
        style={{
          display: 'table-cell',
          textAlign: 'center'
        }}>
        <i 
          className="fa-solid fa-pen" 
          onClick={() => props.onManage(props.WorkflowID)}
          style={{ cursor: 'pointer', color: '#3b82f6' }}
        ></i>

      </td>
    </tr>
  )
}

function SearchBar({ searchTerm, onSearchChange }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '16px',
      padding: '16px 0'
    }}>
      <div style={{
        position: 'relative',
        maxWidth: 'auto',
        width: '100%'
      }}>
        <div style={{
          position: 'absolute',
          left: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: '#9ca3af',
          fontSize: '16px'
        }}>
          🔍
        </div>
        <input
          type="text"
          placeholder="Search workflows..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px 10px 40px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '14px',
            outline: 'none',
            transition: 'all 0.2s ease',
            backgroundColor: 'white',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#3b82f6';
            e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#d1d5db';
            e.target.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
          }}
        />
      </div>
    </div>
  );
}

function StatusFilter({ statuses, selectedStatuses, onStatusChange }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      minWidth: '180px'
    }}>
      <label style={{
        fontSize: '14px',
        fontWeight: '500',
        color: '#374151',
        marginBottom: '4px'
      }}>
        Status:
      </label>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        padding: '8px',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        backgroundColor: 'white',
        maxHeight: '120px',
        overflowY: 'auto',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
      }}>
        {statuses.map((status) => (
          <label 
            key={status}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              color: '#374151',
              padding: '2px 0'
            }}
          >
            <input
              type="checkbox"
              checked={selectedStatuses.includes(status)}
              onChange={(e) => {
                if (e.target.checked) {
                  onStatusChange([...selectedStatuses, status]);
                } else {
                  onStatusChange(selectedStatuses.filter(s => s !== status));
                }
              }}
              style={{
                width: '14px',
                height: '14px',
                accentColor: '#3b82f6',
                cursor: 'pointer'
              }}
            />
            <span>{status}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function CategoryFilter({ categories, selectedCategory, onCategoryChange }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      minWidth: '160px'
    }}>
      <label 
        htmlFor="category-filter"
        style={{
          fontSize: '14px',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '2px'
        }}
      >
        Category:
      </label>
      <select
        id="category-filter"
        value={selectedCategory}
        onChange={(e) => onCategoryChange(e.target.value)}
        style={{
          padding: '8px 12px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          backgroundColor: 'white',
          fontSize: '14px',
          color: '#374151',
          cursor: 'pointer',
          outline: 'none',
          transition: 'all 0.2s ease',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
        }}
        onFocus={(e) => {
          e.target.style.borderColor = '#3b82f6';
          e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = '#d1d5db';
          e.target.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
        }}
      >
        <option value="">All Categories</option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
    </div>
  );
}

function SubCategoryFilter({ subCategories, selectedSubCategory, onSubCategoryChange }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      minWidth: '160px'
    }}>
      <label 
        htmlFor="subcategory-filter"
        style={{
          fontSize: '14px',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '2px'
        }}
      >
        Sub Category:
      </label>
      <select
        id="subcategory-filter"
        value={selectedSubCategory}
        onChange={(e) => onSubCategoryChange(e.target.value)}
        style={{
          padding: '8px 12px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          backgroundColor: 'white',
          fontSize: '14px',
          color: '#374151',
          cursor: 'pointer',
          outline: 'none',
          transition: 'all 0.2s ease',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
        }}
        onFocus={(e) => {
          e.target.style.borderColor = '#3b82f6';
          e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = '#d1d5db';
          e.target.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
        }}
      >
        <option value="">All Sub Categories</option>
        {subCategories.map((subCategory) => (
          <option key={subCategory} value={subCategory}>
            {subCategory}
          </option>
        ))}
      </select>
    </div>
  );
}

function Filters({ 
  categories, 
  subCategories, 
  statuses,
  selectedCategory, 
  selectedSubCategory, 
  selectedStatuses,
  onCategoryChange, 
  onSubCategoryChange, 
  onStatusChange,
  onResetFilters,
  isVisible,
  onToggleVisibility
}) {
  return(
    <div>
      {/* Filter Toggle Button */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        marginBottom: '12px'
      }}>
        <button
          onClick={onToggleVisibility}
          style={{
            padding: '8px 16px',
            backgroundColor: isVisible ? '#3b82f6' : '#f8fafc',
            color: isVisible ? 'white' : '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
          }}
          onMouseEnter={(e) => {
            if (!isVisible) {
              e.target.style.backgroundColor = '#f1f5f9';
              e.target.style.borderColor = '#94a3b8';
            }
          }}
          onMouseLeave={(e) => {
            if (!isVisible) {
              e.target.style.backgroundColor = '#f8fafc';
              e.target.style.borderColor = '#d1d5db';
            }
          }}
        >
          <span>{isVisible ? '🔼' : '🔽'}</span>
          {isVisible ? 'Hide Filters' : 'Show Filters'}
        </button>
      </div>

      {/* Filters Container */}
      {isVisible && (
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: '16px',
          padding: '16px',
          backgroundColor: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          <CategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={onCategoryChange}
          />
          <SubCategoryFilter
            subCategories={subCategories}
            selectedSubCategory={selectedSubCategory}
            onSubCategoryChange={onSubCategoryChange}
          />
          <StatusFilter
            statuses={statuses}
            selectedStatuses={selectedStatuses}
            onStatusChange={onStatusChange}
          />
          <button 
            onClick={onResetFilters}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f8fafc',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              cursor: 'pointer',
              height: '36px',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#f1f5f9';
              e.target.style.borderColor = '#94a3b8';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#f8fafc';
              e.target.style.borderColor = '#d1d5db';
            }}
            onMouseDown={(e) => {
              e.target.style.transform = 'translateY(1px)';
            }}
            onMouseUp={(e) => {
              e.target.style.transform = 'translateY(0px)';
            }}
          >
            <span>🔄</span>
            Reset Filters
          </button>
        </div>
      )}
    </div>
  )
}

function WorkflowTable() {

  const navigate = useNavigate();

  const [tableData, setTableData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtersVisible, setFiltersVisible] = useState(false);
  const itemsPerPage = 7; // rows per page

  const { workflows, loading, error } = useFetchWorkflows();
  console.log("Workflows fetched:", workflows);
  useEffect(() => {
    if (workflows) {
      setTableData(workflows);
      setFilteredData(workflows);
    }
  }, [workflows]);
  
  // Get unique categories, subcategories, and statuses
  const categories = [...new Set(tableData.map(item => item.category).filter(Boolean))];
  const subCategories = [...new Set(tableData.map(item => item.sub_category).filter(Boolean))];
  const statuses = [...new Set(tableData.map(item => item.status).filter(Boolean))];

  // Filter data based on selected filters and search term
  useEffect(() => {
    let filtered = tableData;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sub_category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    // Sub-category filter
    if (selectedSubCategory) {
      filtered = filtered.filter(item => item.sub_category === selectedSubCategory);
    }

    // Status filter
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter(item => selectedStatuses.includes(item.status));
    }

    setFilteredData(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [tableData, selectedCategory, selectedSubCategory, selectedStatuses, searchTerm]);

  // pagination calculations
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const start = (currentPage - 1) * itemsPerPage;
  const pagedAgents = filteredData.slice(start, start + itemsPerPage);

  const handleManage = (uuid) => {
    navigate(`/admin/workflow/${uuid}`);
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
  };

  const handleSubCategoryChange = (subCategory) => {
    setSelectedSubCategory(subCategory);
  };

  const handleStatusChange = (statuses) => {
    setSelectedStatuses(statuses);
  };

  const handleSearchChange = (term) => {
    setSearchTerm(term);
  };

  const handleResetFilters = () => {
    setSelectedCategory('');
    setSelectedSubCategory('');
    setSelectedStatuses([]);
    setSearchTerm('');
  };

  const toggleFiltersVisibility = () => {
    setFiltersVisible(!filtersVisible);
  };

  return (
    <div className={table.whole}>
      <SearchBar 
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
      />
      <Filters
        categories={categories}
        subCategories={subCategories}
        statuses={statuses}
        selectedCategory={selectedCategory}
        selectedSubCategory={selectedSubCategory}
        selectedStatuses={selectedStatuses}
        onCategoryChange={handleCategoryChange}
        onSubCategoryChange={handleSubCategoryChange}
        onStatusChange={handleStatusChange}
        onResetFilters={handleResetFilters}
        isVisible={filtersVisible}
        onToggleVisibility={toggleFiltersVisibility}
      />
      <div className={table.tableborder}>
        <div className={table.tablewrapper}>
          <table className={table.tablecontainer}>
            <thead>
              <TableHeader />
            </thead>
            <tbody>
              {pagedAgents.map((tableData) => (
                <TableRow
                  key={tableData.ID}
                  WorkflowID={tableData.workflow_id}
                  Name={tableData.name}
                  Category={tableData.category}
                  SubCategory={tableData.sub_category}
                  Description={tableData.description}
                  Status={tableData.status}
                  Ticket={tableData.ticket}
                  onManage={handleManage}
                />
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          setCurrentPage={setCurrentPage}
        />
      </div>
    </div>
  );
}

export default WorkflowTable;