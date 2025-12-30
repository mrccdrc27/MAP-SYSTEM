import React, { createContext, useContext, useState, useCallback } from 'react';

const WorkflowRefreshContext = createContext();

export function WorkflowRefreshProvider({ children }) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  return (
    <WorkflowRefreshContext.Provider value={{ refreshTrigger, triggerRefresh }}>
      {children}
    </WorkflowRefreshContext.Provider>
  );
}

export function useWorkflowRefresh() {
  const context = useContext(WorkflowRefreshContext);
  if (!context) {
    throw new Error('useWorkflowRefresh must be used within a WorkflowRefreshProvider');
  }
  return context;
}
