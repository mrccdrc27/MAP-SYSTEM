// src/ChartComponent.jsx
import { Line } from 'react-chartjs-2'; // You can import different chart types (Line, Bar, etc.)
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Registering the required Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const ChartComponent = () => {
  // Defining chart data and options
  const data = {
    labels: ['January', 'February', 'March', 'April', 'May'], // Labels for x-axis
    datasets: [
      {
        label: 'Sales over Months', // Label for the dataset
        data: [65, 59, 80, 81, 56], // Data for the chart
        fill: false, // No filling under the line
        borderColor: 'rgba(75,192,192,1)', // Line color
        tension: 0.1, // Line smoothing
      },
    ],
  };

  const options = {
    responsive: true, // Makes chart responsive
    plugins: {
      legend: {
        position: 'top', // Position of the legend
      },
      tooltip: {
        enabled: true, // Enable tooltips on hover
      },
    },
  };

  return (
    <div>
      {/* <h2>My Line Chart</h2> */}
      <Line data={data} options={options} /> {/* Rendering the chart */}
    </div>
  );
};

export default ChartComponent;
