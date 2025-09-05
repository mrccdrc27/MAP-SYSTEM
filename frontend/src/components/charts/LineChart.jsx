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
  const data = {
    labels,
    datasets: [
      {
        label: chartLabel,
        data: dataPoints,
        fill: false,
        borderColor: "rgba(75,192,192,1)",
        tension: 0.1,
      },
    ],
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
      {labels.length && dataPoints.length ? (
        <Line data={data} options={options} />
      ) : (
        <div className={styles.noDataText}>No data available for document growth.</div>
      )}
    </div>
  );
}
