import styles from "./workflow.module.css";
import general from "../../../style/general.module.css";

// components
import AdminNav from "../../../components/navigation/AdminNav";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import FilterPanel from "../../../components/component/FilterPanel";

// react
import { useEffect, useState } from "react";

// table
import WorkflowTable from "../../../tables/admin/WorkflowTable";

// api
import useFetchWorkflows from "../../../api/useFetchWorkflows";

export default function Workflow() {
  // const { workflows, refetch } = useFetchWorkflows();
  const { workflows } = useFetchWorkflows();
  const isLoading = workflows.length === 0;
  const [allWorkflow, setAllWorkflow] = useState([]);

  // Status & Category options
  const [statusOptions, setStatusOptions] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);

  // Filters
  const [filters, setFilters] = useState({
    category: "",
    status: "",
    startDate: "",
    endDate: "",
    search: "",
  });

  // Update workflow state on data fetch
  useEffect(() => {
    if (workflows.length > 0) {
      setAllWorkflow(workflows);

      // Extract filter options from data
      const statusSet = new Set();
      const categorySet = new Set();

      workflows.forEach((w) => {
        if (w.status) statusSet.add(w.status);
        if (w.category) categorySet.add(w.category);
      });

      setStatusOptions([...Array.from(statusSet)]);
      setCategoryOptions([...Array.from(categorySet)]);
    }
  }, [workflows]);

  // Handle filter input
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Reset all filters
  const resetFilters = () => {
    setFilters({
      category: "",
      status: "",
      startDate: "",
      endDate: "",
      search: "",
    });
  };

  // Apply filters to workflows
  const filteredWorkflows = allWorkflow.filter((workflow) => {
    if (filters.category && workflow.category !== filters.category)
      return false;
    if (filters.status && workflow.status !== filters.status) return false;

    const createdDate = new Date(workflow.created_at);
    const start = filters.startDate ? new Date(filters.startDate) : null;
    const end = filters.endDate ? new Date(filters.endDate) : null;

    if (start && createdDate < start) return false;
    if (end && createdDate > end) return false;

    const search = filters.search.toLowerCase();
    if (
      search &&
      !(
        workflow.name.toLowerCase().includes(search) ||
        workflow.category.toLowerCase().includes(search) ||
        workflow.sub_category.toLowerCase().includes(search) ||
        workflow.description.toLowerCase().includes(search)
      )
    ) {
      return false;
    }

    return true;
  });

  return (
    <>
      <AdminNav />
      <main className={styles.workflowPage}>
        <section className={styles.wpHeader}>
          <h1>Workflow</h1>
        </section>

        <section className={styles.wpBody}>
          {/* Filters */}
          <div className={styles.wpFilterSection}>
            <FilterPanel
              filters={filters}
              onFilterChange={handleFilterChange}
              categoryOptions={categoryOptions}
              statusOptions={statusOptions}
              onResetFilters={resetFilters}
            />
          </div>

          <br />

          {/* Table */}
          <div className={general.tpTable}>
            {isLoading ? (
              <LoadingSpinner height="200px" />
            ) : (
              <WorkflowTable
                searchValue={filters.search}
                onSearchChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    search: e.target.value,
                  }))
                }
                workflows={filteredWorkflows}
              />
            )}
          </div>
        </section>
      </main>
    </>
  );
}
