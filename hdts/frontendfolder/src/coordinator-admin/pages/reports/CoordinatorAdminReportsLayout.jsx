import React, { useState } from 'react';
export const ReportsTabContext = React.createContext('all');
import Tabs from '../../../shared/components/Tabs';
import styles from './CoordinatorAdminReportsLayout.module.css';
import ticketStyles from '../ticket-management/CoordinatorAdminTicketManagement.module.css';

const defaultTabs = [
  { label: 'All', value: 'all' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
];

const CoordinatorAdminReportsLayout = ({ title = 'Reports', tabs = defaultTabs, children, filter }) => {
  const [active, setActive] = useState(tabs[0]?.value || defaultTabs[0].value);
  const [showFilter, setShowFilter] = useState(true);

  return (
    <div className={ticketStyles.pageContainer}>
      {/* Tabs (first) */}
      <div style={{ marginTop: 12, marginBottom: 8 }}>
        <Tabs tabs={tabs} active={active} onChange={setActive} />
      </div>

      {/* Show Filter button (below tabs) */}
      <div className={ticketStyles.topBar}>
        <button
          type="button"
          className={ticketStyles.showFilterButton}
          onClick={() => setShowFilter((s) => !s)}
        >
          {showFilter ? 'Hide Filter' : 'Show Filter'}
        </button>
      </div>

      {/* Filter panel (render filter directly so it looks like Ticket Management) */}
      {showFilter && (filter || <div style={{ padding: 12, color: '#374151' }}>No filter configured for this report.</div>)}

      {/* Table/content (last) */}
      {['all', 'daily', 'weekly', 'monthly', 'yearly'].includes(active) && (
        <ReportsTabContext.Provider value={active}>
          <div className={ticketStyles.tableSection} style={{ marginTop: 12 }}>
            {typeof children === 'function' ? children(active) : children}
          </div>
        </ReportsTabContext.Provider>
      )}
    </div>
  );
};

export default CoordinatorAdminReportsLayout;
