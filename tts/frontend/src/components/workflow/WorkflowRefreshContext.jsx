import React, { createContext, useContext, useState } from 'react';

const WorkflowRefreshContext = createContext();

export function WorkflowRefreshProvider({ children }) {
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = () => setRefreshKey(prev => prev + 1);

  return (
    <WorkflowRefreshContext.Provider value={{ refreshKey, triggerRefresh }}>
      {children}
    </WorkflowRefreshContext.Provider>
  );
}

export function useWorkflowRefresh() {
  return useContext(WorkflowRefreshContext);
}
