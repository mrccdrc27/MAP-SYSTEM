import { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

import styles from './CoordinatorAdminDashboard.module.css';
import { useAuth } from '../../../context/AuthContext';
import Tabs from '../../../shared/components/Tabs';
import Skeleton from '../../../shared/components/Skeleton/Skeleton';
import authService from '../../../utilities/service/authService';

// Tab components
import TicketsTab from './TicketsTab';
import UsersTab from './UsersTab';
import KnowledgeBaseTab from './KnowledgeBaseTab';
import CSATTab from './CSATTab';

// === Main Component ===
const CoordinatorAdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('tickets');
  const [chartRange, setChartRange] = useState('month');
  const [pieRange, setPieRange] = useState('month');
  const [isLoading, setIsLoading] = useState(true);
  const currentUser = authService.getCurrentUser();

  // Ticket Coordinators should NOT see the CSAT tab; other roles see full set
  const isTicketCoordinator = currentUser?.role === 'Ticket Coordinator';
  const dashboardTabs = isTicketCoordinator
    ? [
      { label: 'Tickets', value: 'tickets' }
    ]
    : [
      { label: 'Tickets', value: 'tickets' },
      { label: 'Users', value: 'users' },
      { label: 'Knowledge Base', value: 'kb' },
      { label: 'CSAT', value: 'csat' },
    ];

  // Simulate loading completion
  useEffect(() => {
    let mounted = true;
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.dashboardContent}>
        <h1 className={styles.title}>Dashboard</h1>

        {isLoading ? (
          <div style={{ padding: '24px' }}>
            {/* Skeleton tabs */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              {[1, 2, 3].map(i => (
                <Skeleton key={i} width="120px" height="36px" borderRadius="6px" />
              ))}
            </div>

            {/* Skeleton stat cards */}
            <div className={styles.statusCardsGrid} style={{ marginTop: 12, marginBottom: 24 }}>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} style={{ padding: '12px', borderRadius: '8px', background: '#f9fafb' }}>
                  <Skeleton width="80px" height="32px" borderRadius="4px" />
                  <Skeleton width="100%" height="20px" style={{ marginTop: '12px' }} />
                </div>
              ))}
            </div>

            {/* Skeleton table */}
            <div style={{ marginBottom: 24 }}>
              <Skeleton width="200px" height="24px" style={{ marginBottom: '12px' }} />
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                  {[1, 2, 3, 4, 5, 6].map(j => (
                    <Skeleton key={j} width={`${100/6}%`} height="40px" borderRadius="4px" />
                  ))}
                </div>
              ))}
            </div>

            {/* Skeleton charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[1, 2].map(i => (
                <Skeleton key={i} width="100%" height="300px" borderRadius="8px" />
              ))}
            </div>
          </div>
        ) : (
          <>
            <Tabs
              tabs={dashboardTabs}
              active={activeTab}
              onChange={setActiveTab}
            />
            <div className={styles.tabContent}>
              {activeTab === 'tickets' && (
                <TicketsTab
                  chartRange={chartRange}
                  setChartRange={setChartRange}
                  pieRange={pieRange}
                  setPieRange={setPieRange}
                />
              )}
              {activeTab === 'users' && (
                <UsersTab
                  chartRange={chartRange}
                  setChartRange={setChartRange}
                  pieRange={pieRange}
                  setPieRange={setPieRange}
                />
              )}
              {activeTab === 'kb' && (
                <KnowledgeBaseTab />
              )}
              {activeTab === 'csat' && (
                <CSATTab
                  chartRange={chartRange}
                  setChartRange={setChartRange}
                  pieRange={pieRange}
                  setPieRange={setPieRange}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

  export default CoordinatorAdminDashboard;

