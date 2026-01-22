import React from "react";
import { Pie } from "react-chartjs-2";
import { Download } from "lucide-react";
import "./DashboardCharts.css";

const DepartmentChart = ({ data, options, onExport }) => {
  return (
    <div className="card chart-card" style={{ flex: 1 }}>
      <div className="chart-header">
        <h3 className="chart-title">Department Distribution</h3>
        <div className="chart-actions">
          <button
            className="icon-btn"
            onClick={onExport}
            title="Export Summary"
          >
            <Download size={18} />
          </button>
        </div>
      </div>
      <div className="chart-container">
        <Pie data={data} options={options} />
      </div>
    </div>
  );
};

export default DepartmentChart;