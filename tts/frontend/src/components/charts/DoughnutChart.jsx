// style
import styles from "./chart.module.css";

// chart.js components
import { Doughnut, getElementAtEvent } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { useRef } from "react";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function DoughnutChart({
  labels,
  values,
  chartLabel = "Data Distribution",
  chartTitle = "Chart Title",
  onClick,
}) {
  const chartRef = useRef(null);

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

  const handleClick = (event) => {
    if (!onClick || !chartRef.current) return;
    
    const elements = getElementAtEvent(chartRef.current, event);
    if (elements.length > 0) {
      const { index } = elements[0];
      const label = labels[index];
      const value = values[index];
      onClick({ label, value, index });
    }
  };

  return (
    <div className={`${styles.chartCardCont} ${onClick ? styles.clickable : ''}`}>
      <Doughnut 
        ref={chartRef}
        data={data} 
        options={options} 
        onClick={handleClick}
      />
    </div>
  );
}
