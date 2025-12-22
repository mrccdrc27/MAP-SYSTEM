import NavBar from "../../components/NavBar";
import "../../styles/AccessoriesCheckoutList.css";
import TopSecFormPage from "../../components/TopSecFormPage";
import { useLocation } from "react-router-dom";
import TableButtons from "../../components/buttons/TableButtons";

export default function AccessoriesCheckoutList() {
  const location = useLocation();

  const accessoryName = location.state?.data;

  return (
    <>
      <NavBar />
      <main className="checkout-history-page">
        <section className="top">
          <TopSecFormPage
            root="Accessories"
            currentPage="Check-In Accessories"
            rootNavigatePage="/accessories"
            title={accessoryName}
          />
        </section>
        <section className="container">
          <section className="container-top">
            <p>
              Please select which employee/location's{" "}
              {<span>{accessoryName}</span>} you would like to check-in.
            </p>
          </section>
          <section className="table">
            <table>
              <thead>
                <tr>
                  <th>
                    <input type="checkbox" />
                  </th>
                  <th>CHECK-OUT DATE</th>
                  <th>USER</th>
                  <th>CHECK-OUT TO</th>
                  <th>CHECKIN</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <input type="checkbox" />
                  </td>
                  <td>April 19, 2025</td>
                  <td>Chippy McDonald</td>
                  <td>Mary Grace Piatos</td>
                  <td>
                    <TableButtons
                      type="checkin"
                      navigatePage="/accessories/checkin"
                      data={accessoryName}
                      previousPage={location.pathname}
                    />
                  </td>
                </tr>
                <tr>
                  <td>
                    <input type="checkbox" />
                  </td>
                  <td>April 19, 2025</td>
                  <td>
                    Chippy
                    McDonaldfsdfsdfsdfsdffffffffffffffffffffffffdddddddddddddddddddddddddddddddddddddddddddddddddd
                  </td>
                  <td>
                    Mary Grace
                    Piatosddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd
                  </td>
                  <td>
                    <TableButtons
                      type="checkin"
                      navigatePage="/accessories/checkin"
                      data={accessoryName}
                      previousPage={location.pathname}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
        </section>
      </main>
    </>
  );
}
