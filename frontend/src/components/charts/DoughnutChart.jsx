// style
import styles from "./chart.module.css";

// chart.js components
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function DoughnutChart({
  labels,
  values,
  chartLabel = "Data Distribution",
  chartTitle = "Chart Title",
}) {
  const data = {
    labels,
    datasets: [
      {
        label: chartLabel,
        data: values,
        backgroundColor: [
          "#4BC0C0",
          "#FF9F40",
          "#9966FF",
          "#FF6384",
          "#36A2EB",
          "#FFCD56",
        ],
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: "right" },
      title: {
        display: true,
        text: chartTitle,
      },
    },
  };

  return (
    <div className={styles.chartCardCont}>
      <Doughnut data={data} options={options} />
    </div>
  );
}
