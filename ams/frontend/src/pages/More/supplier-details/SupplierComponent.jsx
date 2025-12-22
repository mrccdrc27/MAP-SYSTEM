import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import NavBar from "../../../components/NavBar";
import TopSecFormPage from "../../../components/TopSecFormPage";
import SupplierTabNavBar from "../../../components/tab-nav-bar/SupplierTabNavBar";
import MediumButtons from "../../../components/buttons/MediumButtons";
import MockupData from "../../../data/mockData/components/components-mockup-data.json";
import Pagination from "../../../components/Pagination";
import DefaultImage from "../../../assets/img/default-image.jpg";
import DeleteModal from "../../../components/Modals/DeleteModal";
import Footer from "../../../components/Footer";

import "../../../styles/more/supplier/SupplierComponent.css";

// TableHeader component to render the table header
function TableHeader() {
  return (
    <tr>
      <th>
        <input type="checkbox" name="checkbox-asset" id="checkbox-asset" />
      </th>
      <th>IMAGE</th>
      <th>NAME</th>
      <th>CATEGORY</th>
      <th>MANUFACTURER</th>
      <th>DEPRECIATION</th>
      <th>ACTIONS</th>
    </tr>
  );
}

// TableItem component to render each ticket row
function TableItem({ component, onDeleteClick }) {
  const navigate = useNavigate();
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);

  return (
    <tr>
      <td>
        <div className="checkbox-component">
          <input type="checkbox" name="" id="" />
        </div>
      </td>
      <td>
        <img
          src={component.image ? component.image : DefaultImage}
          alt={component.name}
        />
      </td>
      <td>{component.name}</td>
      <td>{component.category}</td>
      <td>{component.manufacturer}</td>
      <td>{component.depreciation}</td>
      <td>
        <section className="action-button-section">
          <button
            title="Edit"
            className="action-button"
            onClick={() =>
              navigate(`/components/edit/${component.id}`, {
                state: { component },
              })
            }
          >
            <i className="fas fa-edit"></i>
          </button>
          <button
            title="Delete"
            className="action-button"
            onClick={onDeleteClick}
          >
            <i className="fas fa-trash-alt"></i>
          </button>
        </section>
      </td>
    </tr>
  );
}

export default function SupplierComponent() {
  const location = useLocation();

  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);

  const supplierDetails = location.state?.supplier;

  // pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5); // default page size or number of items per page

  // paginate the data
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedAssets = MockupData.slice(startIndex, endIndex);

  return (
    <>
      {isDeleteModalOpen && (
        <DeleteModal
          closeModal={() => setDeleteModalOpen(false)}
          actionType="delete"
        />
      )}

      <section className="page-with-tab-layout">
        <NavBar />
        <main className="main-page-with-tab">
          <section className="main-top">
            <TopSecFormPage
              root="Suppliers"
              currentPage="Show Supplier"
              rootNavigatePage="/More/ViewSupplier"
              title={supplierDetails.name}
              borderBottom={false}
            />
            <SupplierTabNavBar supplier={supplierDetails} />
          </section>

          <section className="page-with-tab-table-section">
            <section className="table-layout">
              {/* Table Header */}
              <section className="table-header">
                <h2 className="h2">Components ({MockupData.length})</h2>
                <section className="table-actions">
                  <input
                    type="search"
                    placeholder="Search..."
                    className="search"
                  />
                  <MediumButtons
                    type="new"
                    navigatePage="/components/registration"
                  />
                </section>
              </section>

              {/* Table Structure */}
              <section className="page-with-tab-table">
                <table>
                  <thead>
                    <TableHeader />
                  </thead>
                  <tbody>
                    {paginatedAssets.length > 0 ? (
                      paginatedAssets.map((component, index) => (
                        <TableItem
                          key={index}
                          component={component}
                          onDeleteClick={() => setDeleteModalOpen(true)}
                        />
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="no-data-message">
                          No components found.
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
          </section>
        </main>
        <Footer />
      </section>
    </>
  );
}
