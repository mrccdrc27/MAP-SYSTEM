// PieChart.jsx

import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

// style
import styles from "./chart.module.css";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function PieChart({
  labels,
  dataPoints,
  chartTitle = "Active Users Document Count",
  chartLabel = "Active User Documents",
}) {
  const data = {
    labels,
    datasets: [
      {
        label: chartLabel,
        data: dataPoints,
        backgroundColor: [
          "#FF6384",
          "#36A2EB",
          "#FFCE56",
          "#9966FF",
          "#4BC0C0",
        ],
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: "bottom" },
      title: {
        display: true,
        text: chartTitle,
      },
    },
  };

  return (
    <div className={styles.chartCardCont}>
      <Pie data={data} options={options} />
    </div>
  );
}
