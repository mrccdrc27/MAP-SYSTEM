import { useState } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import Status from "../components/Status";
import MediumButtons from "../components/buttons/MediumButtons";
import ActionButtons from "../components/ActionButtons";
import Pagination from "../components/Pagination";
import Footer from "../components/Footer";
import DefaultImage from "../assets/img/default-image.jpg";
import macbook from "../assets/img/macbook.png";

import "../styles/UpcomingEndOfLife.css";

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
      <th>IMAGE</th>
      <th>ID</th>
      <th>PRODUCT</th>
      <th>STATUS</th>
      <th>ASSET NAME</th>
      <th>SERIAL</th>
      <th>WARRANTY</th>
      <th>END OF LIFE</th>
      <th>PURCHASE DATE</th>
      <th>PURCHASE COST</th>
      <th>CATEGORY</th>
      <th>LOCATION</th>
      <th>NOTES</th>
      <th>ACTION</th>
    </tr>
  );
}

// TableItem component to render each row
function TableItem({ item, isSelected, onRowChange, onDeleteClick, onViewClick }) {
  return (
    <tr>
      <td>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onRowChange(item.id, e.target.checked)}
        />
      </td>
      <td>
        <img src={item.image} alt={item.product} className="table-img" />
      </td>
      <td>{item.id}</td>
      <td>{item.product}</td>
      <td>
        <Status
          type={item.status.type}
          name={item.status.text}
          personName={item.status.personName}
          location={item.status.location}
        />
      </td>
      <td>{item.assetName}</td>
      <td>{item.serial}</td>
      <td>{item.warranty}</td>
      <td>{item.endOfLife}</td>
      <td>{item.purchaseDate}</td>
      <td>{item.purchaseCost}</td>
      <td>{item.category}</td>
      <td>{item.location}</td>
      <td>{item.notes}</td>
      <td>
        <ActionButtons
          showEdit
          showDelete
          editPath={`/eol/edit/${item.id}`}
          onDeleteClick={() => onDeleteClick(item.id)}
        />
      </td>
    </tr>
  );
}

export default function UpcomingEndOfLife() {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [selectedIds, setSelectedIds] = useState([]);

  const items = [
    {
      id: "105900",
      image: macbook,
      product: "Macbook Pro 14\"",
      status: { type: "deployed", text: "Deployed", personName: "Pia Platos-Lim" },
      assetName: "KWS/AALUM/19/VUW",
      serial: "A2345M",
      warranty: "About 1 month left",
      endOfLife: "11 days left",
      purchaseDate: "April 2, 2025",
      purchaseCost: "₱ 20,990",
      category: "Laptops",
      location: "Makati",
      notes: "-"
    },
    {
      id: "107800",
      image: macbook,
      product: "Surface Laptop 5",
      status: { type: "deployable", text: "Ready to Deploy", location: "Makati" },
      assetName: "KWS/AALUM/19/VUW",
      serial: "A2345M",
      warranty: "About 1 month left",
      endOfLife: "11 days left",
      purchaseDate: "April 2, 2025",
      purchaseCost: "₱ 20,990",
      category: "Laptops",
      location: "Makati",
      notes: "-"
    }
  ];

  // Paginate the data
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedItems = items.slice(startIndex, endIndex);

  // Selection logic
  const allSelected =
    paginatedItems.length > 0 &&
    paginatedItems.every((item) => selectedIds.includes(item.id));

  const handleHeaderChange = (e) => {
    if (e.target.checked) {
      setSelectedIds((prev) => [
        ...prev,
        ...paginatedItems.map((item) => item.id).filter((id) => !prev.includes(id)),
      ]);
    } else {
      setSelectedIds((prev) =>
        prev.filter((id) => !paginatedItems.map((item) => item.id).includes(id))
      );
    }
  };

  const handleRowChange = (id, checked) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const handleDeleteClick = (id) => {
    console.log("Delete item:", id);
  };

  const handleViewClick = (item) => {
    navigate(`/eol/view/${item.id}`, { state: { item } });
  };

  return (
    <>
      <section className="page-layout-with-table">
        <NavBar />

        <main className="main-with-table">
          {/* Title of the Page */}
          <section className="title-page-section">
            <h1>Upcoming End of Life</h1>
          </section>

          <section className="table-layout">
            {/* Table Header */}
            <section className="table-header">
              <h2 className="h2">Upcoming End of Life ({items.length})</h2>
              <section className="table-actions">
                {selectedIds.length > 0 && (
                  <MediumButtons
                    type="delete"
                    onClick={() => console.log("Delete selected")}
                  />
                )}
                <input type="search" placeholder="Search..." className="search" />
                <MediumButtons type="export" navigatePage="" />
              </section>
            </section>

            {/* Table Structure */}
            <section className="assets-table-section">
              <table>
                <thead>
                  <TableHeader
                    allSelected={allSelected}
                    onHeaderChange={handleHeaderChange}
                  />
                </thead>
                <tbody>
                  {paginatedItems.length > 0 ? (
                    paginatedItems.map((item) => (
                      <TableItem
                        key={item.id}
                        item={item}
                        isSelected={selectedIds.includes(item.id)}
                        onRowChange={handleRowChange}
                        onDeleteClick={handleDeleteClick}
                        onViewClick={handleViewClick}
                      />
                    ))
                  ) : (
                    <tr>
                      <td colSpan={15} className="no-data-message">
                        No Items Found.
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
                totalItems={items.length}
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