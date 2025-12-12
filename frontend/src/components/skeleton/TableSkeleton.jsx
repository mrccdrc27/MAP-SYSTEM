import React from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

export default function TableSkeleton({ rows = 5, columns = 5 }) {
  const rowArray = Array.from({ length: rows });
  const colArray = Array.from({ length: columns });

  return (
    <table style={{ width: "100%" }}>
      <thead>
        <tr>
          {colArray.map((_, i) => (
            <th key={i}>
              <Skeleton height={20} />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rowArray.map((_, rowIndex) => (
          <tr key={rowIndex}>
            {colArray.map((_, colIndex) => (
              <td key={colIndex}>
                <Skeleton height={20} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
