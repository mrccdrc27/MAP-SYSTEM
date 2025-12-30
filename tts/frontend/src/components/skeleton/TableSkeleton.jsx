import React from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { useTheme } from "../../context/ThemeContext";

export default function TableSkeleton({ rows = 5, columns = 5 }) {
  const { theme } = useTheme();
  const baseColor = theme === 'dark' ? '#2d2d2d' : '#ebebeb';
  const highlightColor = theme === 'dark' ? '#3d3d3d' : '#f5f5f5';

  const rowArray = Array.from({ length: rows });
  const colArray = Array.from({ length: columns });

  return (
    <table style={{ width: "100%" }}>
      <thead>
        <tr>
          {colArray.map((_, i) => (
            <th key={i}>
              <Skeleton height={40} baseColor={baseColor} highlightColor={highlightColor} />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rowArray.map((_, rowIndex) => (
          <tr key={rowIndex}>
            {colArray.map((_, colIndex) => (
              <td key={colIndex}>
                <Skeleton height={40} baseColor={baseColor} highlightColor={highlightColor} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
