// component
import AdminNav from "../../components/navigation/AdminNav";

// styles
import styles from "./report.module.css";

export default function Report() {
  return (
    <>
      <AdminNav />
      <main className={styles.reportPage}>
        <section className={styles.rpHeader}>
          <h1>Reporting and Analytics</h1>
          <p>View and analyze ticket data</p>
        </section>

        <section className={styles.rpBody}>
          {/* Quick Stats KPI Cards */}
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <h3>Total Tickets</h3>
              <div className={styles.kpiNumber}>1,247</div>
              <span className={styles.kpiTrend}>+12% vs last month</span>
            </div>
            <div className={styles.kpiCard}>
              <h3>Avg Resolution Time</h3>
              <div className={styles.kpiNumber}>2.4h</div>
              <span className={styles.kpiTrend}>-8% vs last month</span>
            </div>
            <div className={styles.kpiCard}>
              <h3>SLA Compliance</h3>
              <div className={styles.kpiNumber}>92%</div>
              <span className={styles.kpiTrend}>+3% vs last month</span>
            </div>
            <div className={styles.kpiCard}>
              <h3>Active Workflows</h3>
              <div className={styles.kpiNumber}>18</div>
              <span className={styles.kpiTrend}>No change</span>
            </div>
          </div>

          {/* Custom Reporting Tools */}
          <div className={styles.reportControls}>
            <h2>Custom Report Generator</h2>
            <div className={styles.filterControls}>
              <div className={styles.filterGroup}>
                <label>Date Range</label>
                <input type="date" className={styles.filterInput} />
                <span>to</span>
                <input type="date" className={styles.filterInput} />
              </div>
              <div className={styles.filterGroup}>
                <label>Status</label>
                <select className={styles.filterSelect}>
                  <option value="">All Status</option>
                  <option value="new">New</option>
                  <option value="open">Open</option>
                  <option value="in-progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="rejected">Rejected</option>
                  <option value="on-hold">On Hold</option>
                </select>
              </div>
              <div className={styles.filterGroup}>
                <label>Priority</label>
                <select className={styles.filterSelect}>
                  <option value="">All Priorities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div className={styles.filterGroup}>
                <label>Category</label>
                <select className={styles.filterSelect}>
                  <option value="">All Categories</option>
                  <option value="it">IT</option>
                  <option value="hr">HR</option>
                  <option value="facilities">Facilities</option>
                </select>
              </div>
              <div className={styles.filterGroup}>
                <label>Agent</label>
                <select className={styles.filterSelect}>
                  <option value="">All Agents</option>
                  <option value="agent1">John Smith</option>
                  <option value="agent2">Sarah Johnson</option>
                  <option value="agent3">Mike Davis</option>
                </select>
              </div>
              <div className={styles.filterActions}>
                <button className={styles.generateBtn}>Generate Report</button>
                <button className={styles.exportBtn}>Export CSV</button>
                <button className={styles.exportBtn}>Export PDF</button>
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className={styles.chartsGrid}>
            {/* Ticket Analytics Section */}
            <div className={styles.chartSection}>
              <h2>📊 Ticket Analytics</h2>
              <div className={styles.chartRow}>
                <div className={styles.chartContainer}>
                  <h3>Tickets by Status</h3>
                  <div className={styles.pieChart}>
                    <div className={styles.chartPlaceholder}>Pie Chart</div>
                  </div>
                </div>
                <div className={styles.chartContainer}>
                  <h3>Tickets by Priority</h3>
                  <div className={styles.pieChart}>
                    <div className={styles.chartPlaceholder}>Pie Chart</div>
                  </div>
                </div>
                <div className={styles.chartContainer}>
                  <h3>Tickets by Category</h3>
                  <div className={styles.barChart}>
                    <div className={styles.chartPlaceholder}>Bar Chart</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Time-Based Metrics */}
            <div className={styles.chartSection}>
              <h2>📅 Time-Based Metrics</h2>
              <div className={styles.chartRow}>
                <div className={styles.chartContainer}>
                  <h3>Tickets Over Time</h3>
                  <div className={styles.lineChart}>
                    <div className={styles.chartPlaceholder}>Line Chart</div>
                  </div>
                </div>
                <div className={styles.chartContainer}>
                  <h3>Resolution Time Trends</h3>
                  <div className={styles.lineChart}>
                    <div className={styles.chartPlaceholder}>Line Chart</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Agent Performance */}
            <div className={styles.chartSection}>
              <h2>👥 Agent Performance</h2>
              <div className={styles.chartRow}>
                <div className={styles.chartContainer}>
                  <h3>Tickets Handled per Agent</h3>
                  <div className={styles.barChart}>
                    <div className={styles.chartPlaceholder}>Bar Chart</div>
                  </div>
                </div>
                <div className={styles.chartContainer}>
                  <h3>Average Response Time by Agent</h3>
                  <div className={styles.barChart}>
                    <div className={styles.chartPlaceholder}>Bar Chart</div>
                  </div>
                </div>
              </div>
            </div>

            {/* User & Department Insights */}
            <div className={styles.chartSection}>
              <h2>🏢 User & Department Insights</h2>
              <div className={styles.chartRow}>
                <div className={styles.chartContainer}>
                  <h3>Tickets by Department</h3>
                  <div className={styles.barChart}>
                    <div className={styles.chartPlaceholder}>Bar Chart</div>
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
              <h2>🔄 Workflow Analytics</h2>
              <div className={styles.chartRow}>
                <div className={styles.chartContainer}>
                  <h3>Workflow Usage</h3>
                  <div className={styles.barChart}>
                    <div className={styles.chartPlaceholder}>Bar Chart</div>
                  </div>
                </div>
                <div className={styles.chartContainer}>
                  <h3>Workflow Completion Rates</h3>
                  <div className={styles.barChart}>
                    <div className={styles.chartPlaceholder}>Bar Chart</div>
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
              <h2>📁 Archive & Trends</h2>
              <div className={styles.chartRow}>
                <div className={styles.chartContainer}>
                  <h3>Archived Tickets Overview</h3>
                  <div className={styles.pieChart}>
                    <div className={styles.chartPlaceholder}>Pie Chart</div>
                  </div>
                </div>
                <div className={styles.chartContainer}>
                  <h3>Volume Trends</h3>
                  <div className={styles.lineChart}>
                    <div className={styles.chartPlaceholder}>Line Chart</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Data Tables */}
          <div className={styles.tablesSection}>
            <h2>Detailed Reports</h2>
            <div className={styles.tableContainer}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Ticket ID</th>
                    <th>Subject</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Category</th>
                    <th>Assigned Agent</th>
                    <th>Created</th>
                    <th>Resolved</th>
                    <th>Resolution Time</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>#T-001247</td>
                    <td>Login issues with company portal</td>
                    <td><span className={styles.statusBadge}>Resolved</span></td>
                    <td><span className={styles.priorityHigh}>High</span></td>
                    <td>IT</td>
                    <td>John Smith</td>
                    <td>2024-03-15 09:30</td>
                    <td>2024-03-15 11:45</td>
                    <td>2h 15m</td>
                  </tr>
                  <tr>
                    <td>#T-001246</td>
                    <td>Office temperature complaint</td>
                    <td><span className={styles.statusBadge}>In Progress</span></td>
                    <td><span className={styles.priorityMedium}>Medium</span></td>
                    <td>Facilities</td>
                    <td>Sarah Johnson</td>
                    <td>2024-03-15 08:15</td>
                    <td>-</td>
                    <td>-</td>
                  </tr>
                  <tr>
                    <td>#T-001245</td>
                    <td>New employee onboarding</td>
                    <td><span className={styles.statusBadge}>Open</span></td>
                    <td><span className={styles.priorityLow}>Low</span></td>
                    <td>HR</td>
                    <td>Mike Davis</td>
                    <td>2024-03-14 16:20</td>
                    <td>-</td>
                    <td>-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}