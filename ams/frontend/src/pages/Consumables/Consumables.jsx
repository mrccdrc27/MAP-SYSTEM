import React, { useState } from "react";
import NavBar from "../../components/NavBar";
import "../../styles/PageTable.css";
import "../../styles/Consumables.css";
import "../../styles/ConsumablesButtons.css";
import TableBtn from "../../components/buttons/TableButtons";
import ConsumablesTableBtn from "../../components/buttons/ConsumablesTableButtons";
import MediumButtons from "../../components/buttons/MediumButtons";
import ConsumablesViewModal from "../../components/Modals/ConsumablesViewModal";
import SampleImage from "../../assets/img/dvi.jpeg";

export default function Consumables() {
  const [consumables, setConsumables] = useState([
    {
      id: 1,
      image: SampleImage,
      name: "A3 Paper",
      available: 142,
      category: "Printer Paper",
      location: "Sydney",
      manufacturer: "Canon",
      supplier: "WalMart",
      color: "White",
      paperSize: "A3",
    },
    {
      id: 2,
      image: SampleImage,
      name: "A4 Paper",
      available: 120,
      category: "Printer Paper",
      location: "Palo Alto",
      manufacturer: "Canon",
      supplier: "WalMart",
      color: "White",
      paperSize: "A4",
    },
    {
      id: 3,
      image: SampleImage,
      name: "Canon 580 PGBK Ink",
      available: 30,
      category: "Printer Ink",
      location: "New York",
      manufacturer: "Canon",
      supplier: "Staples",
      color: "Multicolor",
      model: "580 PGBK",
    },
    {
      id: 4,
      image: SampleImage,
      name: "Canon 581 CLI Ink",
      available: 31,
      category: "Printer Ink",
      location: "New York",
      manufacturer: "Canon",
      supplier: "Staples",
      color: "Black",
      model: "581 CLI",
    },
    {
      id: 5,
      image: SampleImage,
      name: "Canon 581 XL Ink",
      available: 28,
      category: "Printer Ink",
      location: "New York",
      manufacturer: "Canon",
      supplier: "Staples",
      color: "Yellow",
      model: "581 XL",
    },
    {
      id: 6,
      image: SampleImage,
      name: "Lexmark CX 317 Ink",
      available: 6,
      category: "Printer Ink",
      location: "Berlin",
      manufacturer: "Lexmark",
      supplier: "Staples",
      color: "Cyan",
      model: "CX 317",
    },
  ]);

  const [checkedItems, setCheckedItems] = useState([]);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedConsumableId, setSelectedConsumableId] = useState(null);
  const allChecked = checkedItems.length === consumables.length;

  const toggleSelectAll = () => {
    if (allChecked) {
      setCheckedItems([]);
    } else {
      setCheckedItems(consumables.map((item) => item.id));
    }
  };

  const toggleItem = (id) => {
    setCheckedItems((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  const handleDelete = (id) => {
    console.log(`Delete item with id: ${id}`);
  };

  const handleView = (id) => {
    setSelectedConsumableId(id);
    setShowViewModal(true);
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setSelectedConsumableId(null);
  };

  return (
    <>
      <nav>
        <NavBar />
      </nav>
      <main className="page consumables-page">
        <div className="container">
          <section className="top">
            <h1>Consumables</h1>
            <div>
              <form action="" method="post">
                <input type="text" placeholder="Search..." />
              </form>
              <MediumButtons type="export" />
              <MediumButtons
                type="new"
                navigatePage="/consumables/registration"
              />
            </div>
          </section>
          <section className="middle">
            <table className="consumables-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th>IMAGE</th>
                  <th>NAME</th>
                  <th>AVAILABLE</th>
                  <th>CATEGORY</th>
                  <th>LOCATION</th>
                  <th>EDIT</th>
                  <th>DELETE</th>
                  <th>VIEW</th>
                </tr>
              </thead>
              <tbody>
                {consumables.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={checkedItems.includes(item.id)}
                        onChange={() => toggleItem(item.id)}
                      />
                    </td>
                    <td>
                      <img src={item.image} alt={item.name} />
                    </td>
                    <td>{item.name}</td>
                    <td>{item.available}</td>
                    <td>{item.category}</td>
                    <td>{item.location}</td>
                    <td>
                      <ConsumablesTableBtn
                        type="edit"
                        navigatePage={`/consumables/edit/${item.id}`}
                      />
                    </td>
                    <td>
                      <ConsumablesTableBtn
                        type="delete"
                        showModal={() => handleDelete(item.id)}
                      />
                    </td>
                    <td>
                      <ConsumablesTableBtn
                        type="view"
                        showModal={() => handleView(item.id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="bottom"></section>
        </div>
      </main>

      <ConsumablesViewModal
        isOpen={showViewModal}
        onClose={closeViewModal}
        consumableId={selectedConsumableId}
      />
    </>
  );
}
