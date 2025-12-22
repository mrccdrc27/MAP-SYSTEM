import React, { useState } from 'react';
import NavBar from '../../components/NavBar';
import '../../styles/Consumables.css';

export default function ViewConsumables() {
  const [consumables, setConsumables] = useState([
    { 
      id: 1, 
      image: "/images/a3paper.png", 
      name: "A3 Paper", 
      available: 142, 
      category: "Printer Paper", 
      location: "Sydney",
      manufacturer: "Canon",
      supplier: "WalMart",
      color: "White",
      paperSize: "A3" 
    },
    { 
      id: 2, 
      image: "/images/a4paper.png", 
      name: "A4 Paper", 
      available: 120, 
      category: "Printer Paper", 
      location: "Palo Alto",
      manufacturer: "Canon",
      supplier: "WalMart",
      color: "White",
      paperSize: "A4" 
    },
    { 
      id: 3, 
      image: "/images/canon-580.png", 
      name: "Canon 580 PGBK Ink", 
      available: 30, 
      category: "Printer Ink", 
      location: "New York",
      manufacturer: "Canon",
      supplier: "Staples",
      color: "Multicolor",
      model: "580 PGBK"
    },
    { 
      id: 4, 
      image: "/images/canon-581.png", 
      name: "Canon 581 CLI Ink", 
      available: 31, 
      category: "Printer Ink", 
      location: "New York",
      manufacturer: "Canon",
      supplier: "Staples",
      color: "Black",
      model: "581 CLI"
    },
    { 
      id: 5, 
      image: "/images/canon-581-xl.png", 
      name: "Canon 581 XL Ink", 
      available: 28, 
      category: "Printer Ink", 
      location: "New York",
      manufacturer: "Canon",
      supplier: "Staples",
      color: "Yellow",
      model: "581 XL"
    },
    { 
      id: 6, 
      image: "/images/lexmark-ink.png", 
      name: "Lexmark CX 317 Ink", 
      available: 6, 
      category: "Printer Ink", 
      location: "Berlin",
      manufacturer: "Lexmark",
      supplier: "Staples",
      color: "Cyan",
      model: "CX 317"
    }
  ]);

  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  return (
    <div className="consumables-page">
      <NavBar />
      <div className="content-container">
        <div className="page-header">
          <h1>Consumables (6)</h1>
          <div className="action-buttons">
            <button className="bulk-edit-btn">Bulk Edit</button>
            <button className="columns-btn">Columns</button>
            <button className="sort-btn">Sort</button>
            <button className="filter-btn">Filter</button>
            <button className="export-btn">Export</button>
            <button className="add-btn">Add</button>
          </div>
        </div>

        <div className="consumables-table">
          <table>
            <thead>
              <tr>
                <th className="checkbox-col"><input type="checkbox" /></th>
                <th className="image-col">IMAGE</th>
                <th className="name-col">NAME</th>
                <th className="available-col">AVAILABLE</th>
                <th className="category-col">CATEGORY</th>
                <th className="location-col">LOCATION</th>
                <th className="actions-col">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {consumables.map((item) => (
                <tr key={item.id}>
                  <td><input type="checkbox" /></td>
                  <td>
                    <div className="item-image">
                      <img src={item.image} alt={item.name} />
                    </div>
                  </td>
                  <td>{item.name}</td>
                  <td>{item.available}</td>
                  <td>{item.category}</td>
                  <td>{item.location}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="edit-btn"><i className="edit-icon"></i></button>
                      <button className="view-btn"><i className="view-icon"></i></button>
                      <button className="delete-btn"><i className="delete-icon"></i></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="pagination">
          <div className="items-per-page">
            <span>Show</span>
            <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))}>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>items per page</span>
          </div>
          <div className="page-navigation">
            <button className="prev-btn">Prev</button>
            <span className="page-number">1</span>
            <button className="next-btn">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}