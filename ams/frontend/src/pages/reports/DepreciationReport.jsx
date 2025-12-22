import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../../components/NavBar";
import Status from "../../components/Status";
import MediumButtons from "../../components/buttons/MediumButtons";
import Pagination from "../../components/Pagination";
import DeleteModal from "../../components/Modals/DeleteModal";
import DepreciationFilter from "../../components/FilterPanel";
import Footer from "../../components/Footer";
import MockupData from "../../data/mockData/reports/depreciation-mockup-data.json";

import "../../styles/reports/DepreciationReport.css";

const filterConfig = [
  {
    type: "select",
    name: "status",
    label: "Status",
    options: [
      { value: "beingrepaired", label: "Being Repaired" },
      { value: "broken", label: "Broken" },
      { value: "deployed", label: "Deployed" },
      { value: "lostorstolen", label: "Lost or Stolen" },
      { value: "pending", label: "Pending" },
      { value: "readytodeploy", label: "Ready to Deploy" },
    ],
  },
  {
    type: "select",
    name: "depreciation",
    label: "Depreciation",
    options: [
      { value: "iphonedepreciation", label: "iPhone Depreciation" },
      { value: "laptopdepreciation", label: "Laptop Depreciation" },
      { value: "tabletdepreciation", label: "Tablet Depreciaton" },
    ],
  },
  {
    type: "number",
    name: "duration",
    label: "Duration Months",
  },
  {
    type: "number",
    name: "monthsleft",
    label: "Months Left",
  },
];

// TableHeader component to render the table header
function TableHeader() {
  return (
    <tr>
      <th>ASSET</th>
      <th>STATUS</th>
      <th>DEPRECIATION</th>
      <th>DURATION</th>
      <th>MINIMUM VALUE</th>
      <th>PURCHASE COST</th>
      <th>CURRENT VALUE</th>
      <th>DEPRECIATED</th>
      <th>MONTHLY DEPRECIATION</th>
      <th>MONTHS LEFT</th>
    </tr>
  );
}

// TableItem component to render each ticket row
function TableItem({ asset, onDeleteClick }) {
  const navigate = useNavigate();
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);

  return (
    <tr>
      <td>
        {asset.assetId} - {asset.product}
      </td>
      <td>
        <Status
          type={asset.statusType}
          name={asset.statusName}
          {...(asset.deployedTo && { personName: asset.deployedTo })}
        />
      </td>
      <td>{asset.depreciationName}</td>
      <td>
        {asset.duration} {asset.duration > 1 ? "months" : "month"}
      </td>
      <td>
        {asset.currency} {asset.minimumValue.toFixed(2)}
      </td>
      <td>
        {asset.currency} {asset.purchaseCost.toFixed(2)}
      </td>
      <td>
        {asset.currency} {asset.currentValue.toFixed(2)}
      </td>
      <td>
        {asset.currency} {asset.depreciated.toFixed(2)}
      </td>
      <td>
        {asset.currency} {asset.monthlyDepreciation.toFixed(2)}
      </td>
      <td>{asset.monthsLeft}</td>
    </tr>
  );
}

export default function DepreciationReport() {
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [exportToggle, setExportToggle] = useState(false);
  const exportRef = useRef(null);
  const toggleRef = useRef(null);

  // pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5); // default page size or number of items per page

  // paginate the data
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedDepreciation = MockupData.slice(startIndex, endIndex);

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

  return (
    <>
      {isDeleteModalOpen && (
        <DeleteModal
          closeModal={() => setDeleteModalOpen(false)}
          actionType="delete"
        />
      )}

      <section className="page-layout-with-table">
        <NavBar />

        <main className="main-with-table">
          {/* Title of the Page */}
          <section className="title-page-section">
            <h1>Depreciation Report</h1>
          </section>

          {/* Table Filter */}
          <DepreciationFilter filters={filterConfig} />

          <section className="table-layout">
            {/* Table Header */}
            <section className="table-header">
              <h2 className="h2">Asset Depreciation ({MockupData.length})</h2>
              <section className="table-actions">
                <input
                  type="search"
                  placeholder="Search..."
                  className="search"
                />
                <div ref={toggleRef}>
                  <MediumButtons
                    type="export"
                    onClick={() => setExportToggle(!exportToggle)}
                  />
                </div>
              </section>
            </section>

            {/* Table Structure */}
            <section className="depreciation-table-section">
              {exportToggle && (
                <section className="export-button-section" ref={exportRef}>
                  <button>Download as Excel</button>
                  <button>Download as PDF</button>
                  <button>Download as CSV</button>
                </section>
              )}
              <table>
                <thead>
                  <TableHeader />
                </thead>
                <tbody>
                  {paginatedDepreciation.length > 0 ? (
                    paginatedDepreciation.map((asset, index) => (
                      <TableItem
                        key={index}
                        asset={asset}
                        onDeleteClick={() => setDeleteModalOpen(true)}
                      />
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="no-data-message">
                        No depreciation found.
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
                totalItems={MockupData.length}
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
