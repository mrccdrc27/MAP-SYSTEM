// PieChart.jsx

import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { useRef } from "react";
import { getElementAtEvent } from "react-chartjs-2";

// style
// import styles from "./chart.module.css";
import styles from "../../../../components/charts/chart.module.css";
// import styles from '../../../components/charts/chart.module.css';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function PriorityPieChart({
  labels,
  dataPoints,
  chartTitle = "Ticket Priority Distribution",
  chartLabel = "Tickets",
  onClick,
}) {
  const chartRef = useRef(null);

  // Priority color mapping
  const priorityColors = {
    critical: "#a00000",
    high: "#b35000",
    medium: "#b38f00",
    low: "#2e7d32",
  };

  // Map colors based on priority labels
  const backgroundColor = labels.map(label => {
    const normalizedLabel = label.toLowerCase();
    return priorityColors[normalizedLabel] || "#6c757d"; // fallback color for unknown priorities
  });

  const data = {
    labels,
    datasets: [
      {
        label: chartLabel,
        data: dataPoints,
        backgroundColor,
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
      <Pie 
        ref={chartRef}
        data={data} 
        options={options} 
        onClick={handleClick}
      />
    </div>
  );
}
