// style
import styles from "./chart.module.css";

import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function LineChart({
  labels = [],
  dataPoints = [],
  chartLabel = "Documents",
  chartTitle = "Monthly Document Uploads",
}) {
  // Normalize dataPoints: if single array, wrap it in a dataset object
  const isMultiLine = Array.isArray(dataPoints) && Array.isArray(dataPoints[0]) === false && typeof dataPoints[0] === "object";
  
  const datasets = isMultiLine
    ? dataPoints.map((ds, index) => ({
        label: ds.label || `Line ${index + 1}`,
        data: ds.data || [],
        borderColor: ds.borderColor || `hsl(${index * 60}, 70%, 50%)`,
        fill: false,
        tension: 0.1,
      }))
    : [
        {
          label: chartLabel,
          data: dataPoints,
          borderColor: "rgba(75,192,192,1)",
          fill: false,
          tension: 0.1,
        },
      ];

  const data = {
    labels,
    datasets,
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: { display: true, text: chartTitle },
    },
  };

  return (
    <div className={styles.chartCardCont}>
      {labels.length && datasets.length ? (
        <Line data={data} options={options} />
      ) : (
        <div className={styles.noDataText}>No data available for document growth.</div>
      )}
    </div>
  );
}
