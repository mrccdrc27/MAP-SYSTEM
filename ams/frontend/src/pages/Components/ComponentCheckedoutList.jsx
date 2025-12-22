import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import NavBar from "../../components/NavBar";
import MediumButtons from "../../components/buttons/MediumButtons";
import MockupData from "../../data/mockData/components/active-checkout-mockup-data.json";
import Pagination from "../../components/Pagination";
import "../../styles/Table.css";
import ActionButtons from "../../components/ActionButtons";
import DefaultImage from "../../assets/img/default-image.jpg";
import TopSecFormPage from "../../components/TopSecFormPage";

// TableHeader
function TableHeader() {
  return (
    <tr>
      <th>IMAGE</th>
      <th>CHECKED-OUT TO</th>
      <th>CHECK-OUT DATE</th>
      <th>QUANTITY</th>
      <th>CHECKED-IN</th>
      <th>REMAINING</th>
      <th>ACTION</th>
    </tr>
  );
}

// TableItem
function TableItem({ item, component, navigate }) {
  return (
    <tr>
      <td>
        <img
          src={item.to_asset.image || DefaultImage}
          alt={item.name || "No Image"}
          onError={(e) => (e.currentTarget.src = DefaultImage)}
          style={{
            width: "50px",
            height: "50px",
            objectFit: "cover",
            borderRadius: "4px",
          }}
        />
      </td>
      <td>{item.to_asset.displayed_id}</td>
      <td>{item.checkout_date}</td>
      <td>{item.quantity}</td>
      <td>{item.total_checked_in}</td>
      <td>{item.remaining_quantity}</td>
      <td>
        <ActionButtons
          showCheckin
          onCheckinClick={() =>
            navigate(`/components/check-in/${item.id}`, { state: { item, componentName: component.name } })
          }
        />
      </td>
    </tr>
  );
}

export default function ComponentCheckedoutList() {
  const navigate = useNavigate();
  const location = useLocation();

  console.log("Location state:", location.state);
  const component = location.state?.item || {};

  const componentId = component.id;
  const componentCheckouts = MockupData.filter(
    (c) => c.component === componentId
  );
  const totalCheckedOut = componentCheckouts.reduce(
    (sum, c) => sum + c.quantity,
    0
  );

  // pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedActivity = componentCheckouts.slice(startIndex, endIndex);

  return (
    <>
        <nav>
          <NavBar />
        </nav>

        <main className="page-layout">
          <section
            className="top"
            style={{ marginBottom: "2rem" }}
          >
            <TopSecFormPage
              root="Components"
              currentPage={`Checked Out ${component.name}`}
              rootNavigatePage="/components"
              title={component.name}
            />
          </section>

          <section className="table-layout">
            <section className="table-header">
              <h2 className="h2">{component.name} ({totalCheckedOut})</h2>
              <section className="table-actions">
                <MediumButtons
                  type="bulk"
                />
                <input type="search" placeholder="Search..." className="search" />
              </section>
            </section>

            <section className="table-section">
              <table>
                <thead>
                  <TableHeader />
                </thead>
                <tbody>
                  {paginatedActivity.length > 0 ? (
                    paginatedActivity.map((item) => (
                      <TableItem
                        key={item.id}
                        item={item}
                        component={component}
                        navigate={navigate}
                      />
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="no-data-message">
                        No Checkouts Found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>

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
    </>
  );
}
