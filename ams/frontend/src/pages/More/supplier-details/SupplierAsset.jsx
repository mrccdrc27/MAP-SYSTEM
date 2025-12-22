import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import NavBar from "../../../components/NavBar";
import TopSecFormPage from "../../../components/TopSecFormPage";
import SupplierTabNavBar from "../../../components/tab-nav-bar/SupplierTabNavBar";
import MediumButtons from "../../../components/buttons/MediumButtons";
import MockupData from "../../../data/mockData/assets/assets-mockup-data.json";
import Pagination from "../../../components/Pagination";
import DefaultImage from "../../../assets/img/default-image.jpg";
import Status from "../../../components/Status";
import DeleteModal from "../../../components/Modals/DeleteModal";
import Footer from "../../../components/Footer";

import "../../../styles/more/supplier/SupplierAsset.css";

// TableHeader component to render the table header
function TableHeader() {
  return (
    <tr>
      <th>
        <input type="checkbox" name="checkbox-asset" id="checkbox-asset" />
      </th>
      <th>IMAGE</th>
      <th>ID</th>
      <th>NAME</th>
      <th>CATEGORY</th>
      <th>CHECKIN/CHECKOUT</th>
      <th>STATUS</th>
      <th>ACTIONS</th>
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
        <div className="checkbox-asset">
          <input type="checkbox" name="" id="" />
        </div>
      </td>
      <td>
        <img src={asset.image ? asset.image : DefaultImage} alt={asset.name} />
      </td>
      <td>{asset.id}</td>
      <td>{asset.name}</td>
      <td>{asset.category}</td>

      {/* CHECK-IN / CHECK-OUT Column */}
      <td>
        {asset.hasCheckoutRecord && asset.isCheckInOrOut && (
          <button
            className={
              asset.isCheckInOrOut === "Check-In"
                ? "check-in-btn"
                : "check-out-btn"
            }
            onClick={() => onCheckInOut(asset)}
          >
            {asset.isCheckInOrOut}
          </button>
        )}
      </td>

      <td>
        <Status type={asset.assetType} name={asset.status} />
      </td>
      <td>
        <section className="action-button-section">
          <button
            title="Edit"
            className="action-button"
            onClick={() =>
              navigate(`/assets/registration/${asset.id}`, { state: { asset } })
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

export default function SupplierAsset() {
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
                <h2 className="h2">Asset ({MockupData.length})</h2>
                <section className="table-actions">
                  <input
                    type="search"
                    placeholder="Search..."
                    className="search"
                  />
                  <MediumButtons
                    type="new"
                    navigatePage="/assets/registration"
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
                      paginatedAssets.map((asset, index) => (
                        <TableItem
                          key={index}
                          asset={asset}
                          onDeleteClick={() => setDeleteModalOpen(true)}
                        />
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="no-data-message">
                          No assets found.
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
