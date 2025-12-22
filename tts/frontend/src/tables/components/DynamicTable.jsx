// style
// import styles from "../../style/styles.module.css";
import styles from "./dynamic-table.module.css";

// components
import Pagination from "../../components/component/Pagination";

// react
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { format } from "date-fns";

function TableHeader({ headers }) {
  return (
    <tr className={styles.header}>
      {headers.map((header, index) => (
        <th key={index}>{header}</th> // Using index as the key to avoid duplication
      ))}
    </tr>
  );
}

function TableItem({ item, columns }) {
  const navigate = useNavigate();
  return (
    <tr className={styles.dtItem}>
      {columns.map((col, index) => (
        <td key={`${col.key}-${index}`}> {/* Ensure unique key for columns */}
          {col.format ? col.format(item[col.key]) : item[col.key]}
        </td>
      ))}
      {columns.some((col) => col.key === "action") && (
        <td>
          <button
            className={styles.dtBtn}
            onClick={() => navigate(`/admin/archive/${item.id}`)}
          >
            👁
          </button>
        </td>
      )}
    </tr>
  );
}

export default function DynamicTable({
  data = [],
  headers = [],
  columns = [],
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = data.slice(startIndex, endIndex);

  return (
    <div className={styles.dtSection}>
      <div className={styles.dtHeader}></div>
      <div className={styles.dtWrapper}>
        <table className={styles.dtTable}>
          <thead>
            <TableHeader headers={headers} />
          </thead>
          <tbody>
            {data.length > 0 ? (
              paginatedData.map((item, index) => (
                <TableItem key={item.id || index} item={item} columns={columns} />
              ))
            ) : (
              <tr>
                <td colSpan={headers.length} className={styles.noData}>
                  No data found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className={styles.dtPagination}>
        <Pagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={data.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  );
}

