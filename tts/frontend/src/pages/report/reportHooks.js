import useTicketsFetcher from "../../api/useTicketsFetcher";
import useFetchWorkflows from "../../api/useFetchWorkflows";
import useUsersApi from "../../api/useUsersApi";

// Tickets Tab
export function useTicketReportData() {
  const { tickets, loading, error } = useTicketsFetcher();
  // You may need to transform tickets to match expected reportData shape
  return { data: { tickets }, loading, error };
}

// Workflow Tab
export function useWorkflowReportData() {
  const { workflows, loading, error } = useFetchWorkflows();
  // You may need to transform workflows to match expected reportData shape
  return { data: { workflows }, loading, error };
}

// Agent Tab
export function useAgentReportData() {
  const { users, loading, error } = useUsersApi();
  // You may need to transform users to match expected reportData shape
  return { data: { agents: users }, loading, error };
}

// Integration Tab (stub, update with your real hook if available)
export function useIntegrationReportData() {
  // TODO: Replace with your real integration hook and endpoint
  // Example: const { integrations, loading, error } = useFetchIntegrations();
  // return { data: { integrations }, loading, error };
  return { data: null, loading: false, error: null };
}
