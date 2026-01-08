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
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function LineChart({
  labels = [],
  dataPoints = [],
  chartLabel = "Documents",
  chartTitle = "Monthly Document Uploads",
  fill = false,
  tension = 0.4,
}) {
  // Normalize dataPoints: if single array, wrap it in a dataset object
  const isMultiLine = Array.isArray(dataPoints) && Array.isArray(dataPoints[0]) === false && typeof dataPoints[0] === "object";
  
  const getBackgroundColor = (color, index) => {
    if (!color) return `hsla(${index * 60}, 70%, 50%, 0.2)`;
    
    // Handle rgba
    if (color.startsWith('rgba')) {
      return color.replace(/[\d\.]+\)$/, '0.2)');
    }
    
    // Handle rgb
    if (color.startsWith('rgb')) {
      return color.replace('rgb', 'rgba').replace(')', ', 0.2)');
    }
    
    // Handle hex
    if (color.startsWith('#')) {
      return `${color}33`; // 33 is approx 0.2 opacity in hex
    }
    
    return color;
  };

  const datasets = isMultiLine
    ? dataPoints.map((ds, index) => ({
        label: ds.label || `Line ${index + 1}`,
        data: ds.data || [],
        borderColor: ds.borderColor || `hsl(${index * 60}, 70%, 50%)`,
        backgroundColor: ds.backgroundColor || getBackgroundColor(ds.borderColor, index),
        fill: ds.fill !== undefined ? ds.fill : fill,
        tension: ds.tension !== undefined ? ds.tension : tension,
        pointRadius: 0,
        pointHoverRadius: 6,
        borderWidth: 3,
      }))
    : [
        {
          label: chartLabel,
          data: dataPoints,
          borderColor: "rgba(75,192,192,1)",
          backgroundColor: "rgba(75,192,192,0.2)",
          fill: fill,
          tension: tension,
          pointRadius: 0,
          pointHoverRadius: 6,
          borderWidth: 3,
        },
      ];

  const data = {
    labels,
    datasets,
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        position: "top",
        labels: {
          usePointStyle: true,
          padding: 20,
          font: { size: 12 }
        }
      },
      title: { display: true, text: chartTitle },
      tooltip: {
        mode: 'index',
        intersect: false,
        padding: 12,
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 10
        }
      },
      y: {
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false,
        },
        beginAtZero: true,
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
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
