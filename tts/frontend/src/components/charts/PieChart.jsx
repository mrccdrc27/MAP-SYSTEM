// PieChart.jsx

import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { useRef } from "react";
import { getElementAtEvent } from "react-chartjs-2";

// style
import styles from "./chart.module.css";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function PieChart({
  labels,
  dataPoints,
  chartTitle = "Active Users Document Count",
  chartLabel = "Active User Documents",
  onClick,
}) {
  const chartRef = useRef(null);

  const data = {
    labels,
    datasets: [
      {
        label: chartLabel,
        data: dataPoints,
        backgroundColor: [
          "#00afb9", // Soft blue-gray for a gentle contrast
          "#f07167", // Light, muted green for a natural vibe
          "#0081a7", // Pale cream for balance and soft lightness
          "#f2cc8f", // Soft coral for a warm, inviting touch
          "#fed9b7", // Light lavender for a calm, soothing effect
          "#c4f0f2", // Soft mint for freshness and clarity
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
