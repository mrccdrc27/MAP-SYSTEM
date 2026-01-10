import { Bar, getElementAtEvent } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { useRef } from "react";

// style
import styles from "./chart.module.css";

// Registering Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function BarChart({
  labels = [],
  dataPoints = [],
  chartLabel = "Data",
  chartTitle = "Bar Chart",
  onClick,
  horizontal = false,
}) {
  const chartRef = useRef(null);

  const data = {
    labels,
    datasets: [
      {
        label: chartLabel,
        data: dataPoints,
        backgroundColor: "rgba(255, 99, 132, 0.2)",
        borderColor: "rgba(255, 99, 132, 1)",
        borderWidth: 1,
      },
    ],
  };

  const options = {
    indexAxis: horizontal ? "y" : "x",
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: { display: true, text: chartTitle },
    },
    scales: { 
      x: { 
        beginAtZero: true,
        ticks: {
          autoSkip: false
        }
      },
      y: { 
        beginAtZero: true 
      } 
    },
  };

  const handleClick = (event) => {
    if (!onClick || !chartRef.current) return;
    
    const elements = getElementAtEvent(chartRef.current, event);
    if (elements.length > 0) {
      const { index } = elements[0];
      const label = labels[index];
      const value = dataPoints[index];
      onClick({ label, value, index });
    }
  };

  return (
    <div className={`${styles.chartCardCont} ${onClick ? styles.clickable : ''}`}>
      {labels.length && dataPoints.length ? (
        <Bar 
          ref={chartRef}
          data={data} 
          options={options} 
          onClick={handleClick}
        />
      ) : (
        <div className={styles.noDataText}>No data available for this chart.</div>
      )}
    </div>
  );
}
