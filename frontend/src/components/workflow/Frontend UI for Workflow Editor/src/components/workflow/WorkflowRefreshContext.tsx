import { createContext, useContext, useState, ReactNode } from 'react';

interface WorkflowRefreshContextType {
  refreshKey: number;
  triggerRefresh: () => void;
}

const WorkflowRefreshContext = createContext<WorkflowRefreshContextType | undefined>(undefined);

export function WorkflowRefreshProvider({ children }: { children: ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <WorkflowRefreshContext.Provider value={{ refreshKey, triggerRefresh }}>
      {children}
    </WorkflowRefreshContext.Provider>
  );
}

export function useWorkflowRefresh() {
  const context = useContext(WorkflowRefreshContext);
  if (context === undefined) {
    throw new Error('useWorkflowRefresh must be used within a WorkflowRefreshProvider');
  }
  return context;
}
