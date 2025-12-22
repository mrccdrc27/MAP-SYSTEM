import { useState, useEffect } from "react";
import useUserTickets from "../../api/useUserTickets";
import useTicketsFetcher from "../../api/useTicketsFetcher";

// components
import AdminNav from "../../components/navigation/AdminNav";
import PieChart from "../../components/charts/PieChart";
import BarChart from "../../components/charts/BarChart";
import LineChart from "../../components/charts/LineChart";
import DoughnutChart from "../../components/charts/DoughnutChart";

// table
import TicketTable from "../../tables/admin/TicketTable";

// styles
import styles from "./report.module.css";
import general from "../../style/general.module.css";

// lucide icons
import { Ticket, FolderOpen, CheckCircle, Clock } from "lucide-react";

export default function Report() {
  // Fetch user tickets
  const { fetchTickets, tickets, loading, error } = useTicketsFetcher();

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // logging allTickets for debugging
  // console.log(allTickets);

  const kpiCardData = [
    {
      title: "Total Tickets",
      value: 1200,
      icon: <Ticket size={28} color="#4a90e2" />,
    },
    {
      title: "Open Tickets",
      value: 300,
      icon: <FolderOpen size={28} color="#f5a623" />,
    },
    {
      title: "Closed Tickets",
      value: 900,
      icon: <CheckCircle size={28} color="#7ed321" />,
    },
    {
      title: "Avg. Resolution Time",
      value: "2 days",
      icon: <Clock size={28} color="#50e3c2" />,
    },
  ];

  return (
    <>
      <AdminNav />
      <main className={styles.reportPage}>
        <section className={styles.rpHeader}>
          <h1>Reporting and Analytics</h1>
          <p>View and analyze ticket data</p>
        </section>

        <section className={styles.rpBody}>
          <div className={styles.kpiGrid}>
            {kpiCardData.map((card, index) => (
              <div key={index} className={styles.kpiCard}>
                <div>
                  <p>{card.title}</p>
                  <h2>{card.value}</h2>
                </div>
                <div>
                  <span className={styles.kpiIcon}>{card.icon}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Charts*/}
          <div className={styles.chartsGrid}>
            {/* Ticket Analytics Section */}
            <div className={styles.chartSection}>
              <h2>Ticket Analytics</h2>
              <div className={styles.chartRow}>
                <div className={styles.chartContainer}>
                  <h3>Tickets by Status</h3>
                  <div className={styles.pieChart}>
                    <div className={styles.chartPlaceholder}>
                      <PieChart />
                    </div>
                  </div>
                </div>
                <div className={styles.chartContainer}>
                  <h3>Tickets by Priority</h3>
                  <div className={styles.pieChart}>
                    <div className={styles.chartPlaceholder}>
                      <PieChart />
                    </div>
                  </div>
                </div>
                <div className={styles.chartContainer}>
                  <h3>Tickets by Category</h3>
                  <div className={styles.barChart}>
                    <div className={styles.chartPlaceholder}>
                      <BarChart />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Time-Based Metrics */}
            <div className={styles.chartSection}>
              <h2>Time-Based Metrics</h2>
              <div className={styles.chartRow}>
                <div className={styles.chartContainer}>
                  <h3>Tickets Over Time</h3>
                  <div className={styles.lineChart}>
                    <div className={styles.chartPlaceholder}>
                      <LineChart />
                    </div>
                  </div>
                </div>
                <div className={styles.chartContainer}>
                  <h3>Resolution Time Trends</h3>
                  <div className={styles.lineChart}>
                    <div className={styles.chartPlaceholder}>
                      <LineChart />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Agent Performance */}
            <div className={styles.chartSection}>
              <h2>Agent Performance</h2>
              <div className={styles.chartRow}>
                <div className={styles.chartContainer}>
                  <h3>Tickets Handled per Agent</h3>
                  <div className={styles.barChart}>
                    <div className={styles.chartPlaceholder}>
                      <BarChart />
                    </div>
                  </div>
                </div>
                <div className={styles.chartContainer}>
                  <h3>Average Response Time by Agent</h3>
                  <div className={styles.barChart}>
                    <div className={styles.chartPlaceholder}>
                      <BarChart />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* User & Department Insights */}
            <div className={styles.chartSection}>
              <h2>User & Department Insights</h2>
              <div className={styles.chartRow}>
                <div className={styles.chartContainer}>
                  <h3>Tickets by Department</h3>
                  <div className={styles.barChart}>
                    <div className={styles.chartPlaceholder}>
                      <BarChart />
                    </div>
                  </div>
                </div>
                <div className={styles.chartContainer}>
                  <h3>Top Recurring Issues</h3>
                  <div className={styles.tableContainer}>
                    <table className={styles.dataTable}>
                      <thead>
                        <tr>
                          <th>Issue</th>
                          <th>Count</th>
                          <th>Trend</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Login Issues</td>
                          <td>45</td>
                          <td>↑</td>
                        </tr>
                        <tr>
                          <td>Password Reset</td>
                          <td>38</td>
                          <td>→</td>
                        </tr>
                        <tr>
                          <td>Software Installation</td>
                          <td>29</td>
                          <td>↓</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Workflow Analytics */}
            <div className={styles.chartSection}>
              <h2>Workflow Analytics</h2>
              <div className={styles.chartRow}>
                <div className={styles.chartContainer}>
                  <h3>Workflow Usage</h3>
                  <div className={styles.barChart}>
                    <div className={styles.chartPlaceholder}>
                      <BarChart />
                    </div>
                  </div>
                </div>
                <div className={styles.chartContainer}>
                  <h3>Workflow Completion Rates</h3>
                  <div className={styles.barChart}>
                    <div className={styles.chartPlaceholder}>
                      <BarChart />
                    </div>
                  </div>
                </div>
                <div className={styles.chartContainer}>
                  <h3>Average Time per Workflow Step</h3>
                  <div className={styles.heatmap}>
                    <div className={styles.chartPlaceholder}>Heatmap</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Archive & Trends */}
            <div className={styles.chartSection}>
              <h2>Archive & Trends</h2>
              <div className={styles.chartRow}>
                <div className={styles.chartContainer}>
                  <h3>Archived Tickets Overview</h3>
                  <div className={styles.pieChart}>
                    <div className={styles.chartPlaceholder}>
                      <PieChart />
                    </div>
                  </div>
                </div>
                <div className={styles.chartContainer}>
                  <h3>Volume Trends</h3>
                  <div className={styles.lineChart}>
                    <div className={styles.chartPlaceholder}>
                      <LineChart />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Table Section */}
          <div className={styles.rpSection}>
            <div className={styles.rpTableSection}>
              <div className={general.tpTable}>
                {loading && (
                  <div className={styles.loaderOverlay}>
                    <div className={styles.loader}></div>
                  </div>
                )}
                <TicketTable tickets={tickets} error={error} />
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
