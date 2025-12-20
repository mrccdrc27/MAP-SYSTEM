# Frontend API Endpoint Map

This document maps frontend components and hooks to their respective backend services and API endpoints.

## 1. Authentication Service
**Base URL**: `VITE_AUTH_URL` or `VITE_USER_SERVER_API` (typically `http://localhost:8003`) or `VITE_LOGIN_API`

| Component / Hook | Variable / Env | Endpoint | Method | Description |
| :--- | :--- | :--- | :--- | :--- |
| `useLogin` | `VITE_LOGIN_API` | `/auth/login/` | POST | User login (returns tokens or temp token for OTP) |
| `useLogin` | `VITE_VERIFY_OTP_API` | `/auth/login/verify-otp/` | POST | Verify OTP for 2FA |
| `useLogout` | `VITE_AUTH_URL` | `/logout/` | POST | User logout |
| `AuthContext` | `VITE_AUTH_URL` | `/api/v1/token/obtain/` | POST | Obtain JWT token (login) |
| `AuthContext` | `VITE_AUTH_URL` | `/api/v1/token/refresh/` | POST | Refresh JWT token |
| `AuthContext` | `VITE_AUTH_URL` | `/api/v1/token/verify/` | POST | Verify if token is valid |
| `AuthContext` | `VITE_AUTH_URL` | `/api/v1/users/profile/` | GET | Fetch authenticated user profile |
| `useInviteManager` | `VITE_USER_SERVER_API` | `registration/invite/` | POST | Invite a new user (Agent/Admin) |
| `useInviteManager` | `VITE_USER_SERVER_API` | `registration/pending-invites/` | GET | List pending invitations |
| `useInviteManager` | `VITE_USER_SERVER_API` | `registration/pending-invites/${id}/` | DELETE | Cancel a pending invitation |
| `ProtectedRegister`| `VITE_USER_SERVER_API` | `registration/validate-token/?token=${token}` | GET | Validate registration token |
| `UserRegistration` | Hardcoded/Proxy | `/api/register/${token}/` | POST | Register new user account |
| `PasswordReset` | `VITE_USER_SERVER_API` | `password/validate-reset-token/${uid}/${token}/` | GET | Validate password reset link |
| `PasswordReset` | `VITE_USER_SERVER_API` | `password/reset/confirm/${uid}/${token}/` | POST | Confirm password reset |
| `useUsersApi` | `VITE_USER_SERVER_API` | `/api/v1/system-roles/user-system-roles/` | GET | List users with their roles |
| `useUsersApi` | `VITE_USER_SERVER_API` | `users/${userId}/activate/` | POST | Activate/Deactivate a user |

## 2. Workflow Service (Backend API)
**Base URL**: `VITE_BACKEND_API` or `VITE_WORKFLOW_API` (typically `http://localhost:8002/workflow` or `http://localhost:8002`)

| Component / Hook | Endpoint | Method | Description |
| :--- | :--- | :--- | :--- |
| `useCreateWorkflow` | `/workflows/` | POST | Create a new workflow definition |
| `useFetchWorkflows` | `/workflows/` | GET | List all workflows |
| `useWorkflowAPI` | `/workflows/${id}/detail/` | GET | Get workflow details with graph |
| `useWorkflowAPI` | `/workflows/${id}/graph/` | GET | Get workflow graph nodes/edges |
| `useWorkflowAPI` | `/workflows/${id}/update-graph/` | PUT | Update workflow visual graph |
| `useWorkflowAPI` | `/workflows/${id}/update-details/` | PUT | Update workflow metadata |
| `useWorkflowAPI` | `/workflows/steps/${id}/update-details/` | PUT | Update a specific step |
| `useWorkflowAPI` | `/workflows/transitions/${id}/update-details/` | PUT | Update a specific transition |
| `useWorkflowAPI` | `/steps/weights/workflow/${id}/` | GET/PUT | Manage SLA weights for steps |
| `useWorkflowRoles` | `/roles/` | GET | List available roles for steps |
| `NewWorkflowVisualizer` | `/api/graph/${id}/` | GET | Get graph data for visualization |
| `useTicketsFetcher` | `tasks/all-tasks/` | GET | List all tickets/tasks (paginated, filtered) |
| `TicketsContext` | `tasks/my-tasks/` | GET | List tasks assigned to current user |
| `useTicketDetail` | `tasks/detail/${id}/` | GET | Get details of a specific task instance |
| `useTasksFetcher` | `/tasks/` | GET | Fetch tasks (generic) |
| `useTaskAssigner` | `tickets/assign-task/` | POST | Assign a ticket to a workflow |
| `useTransferTask` | `tasks/transfer/` | POST | Transfer a task to another user |
| `useEscalateTask` | `tasks/escalate/` | POST | Escalate a task |
| `useTriggerAction` | `/transitions/` | POST | Trigger a workflow transition (move to next step) |
| `useActionLogs` | `/tasks/logs/` | GET | Get history/logs for a ticket |
| `useWorkflowProgress`| `/tasks/workflow-visualization/` | GET | Get visual progress status of a ticket |

### Analytics & Reporting (Workflow Service)

| Component / Hook | Endpoint | Method | Description |
| :--- | :--- | :--- | :--- |
| `useReportingAnalytics` | `analytics/tickets/dashboard/` | GET | Ticket dashboard KPIs |
| `useReportingAnalytics` | `analytics/tickets/status/` | GET | Status distribution |
| `useReportingAnalytics` | `analytics/tickets/priority/` | GET | Priority distribution |
| `useReportingAnalytics` | `analytics/tickets/age/` | GET | Age bucket analysis |
| `useReportingAnalytics` | `analytics/tickets/sla/` | GET | SLA compliance stats |
| `useReportingAnalytics` | `analytics/workflows/metrics/` | GET | Workflow performance metrics |
| `useReportingAnalytics` | `analytics/workflows/departments/` | GET | Department workflow usage |
| `useReportingAnalytics` | `analytics/workflows/steps/` | GET | Step-level performance |
| `useReportingAnalytics` | `analytics/tasks/status/` | GET | Task status distribution |
| `useReportingAnalytics` | `analytics/tasks/origin/` | GET | Task origin analysis |
| `useReportingAnalytics` | `analytics/tasks/performance/` | GET | Task resolution performance |
| `useReportingAnalytics` | `analytics/tasks/users/` | GET | User performance metrics |
| `useReportingAnalytics` | `analytics/tasks/transfers/` | GET | Transfer/Escalation stats |
| `useReportingAnalytics` | `analytics/ticket-trends/` | GET | Ticket volume trends over time |
| `useReportingAnalytics` | `analytics/task-item-trends/` | GET | Task item trends over time |
| `useReportingAnalytics` | `analytics/insights/` | GET | Operational insights overview |
| `useReportingAnalytics` | `analytics/insights/workload/` | GET | Agent workload analysis |
| `useReportingAnalytics` | `analytics/insights/sla-risk/` | GET | SLA risk predictions |
| `useReportingAnalytics` | `analytics/insights/anomalies/` | GET | Anomaly detection |
| `useDrilldownAnalytics` | `analytics/drilldown/...` | GET | Detailed data for specific analytic segments |
| `useForecastingAnalytics`| `analytics/forecast/...` | GET | ML-based forecasting endpoints |

## 3. Messaging Service
**Base URL**: `VITE_MESSAGING_API` (typically `http://localhost:8005`)
**WebSocket URL**: `VITE_MESSAGING_WS` (typically `ws://localhost:8005`)

| Component / Hook | Endpoint | Method | Description |
| :--- | :--- | :--- | :--- |
| `useCommentsHttp` | `/comments/?ticket_id=${id}` | GET | Fetch comments for a ticket |
| `useCommentsHttp` | `/comments/` | POST | Add a new comment |
| `useCommentsHttp` | `/comments/${id}/reply/` | POST | Reply to a comment |
| `useCommentsHttp` | `/comments/${id}/rate/` | POST | Like/Dislike a comment |
| `useCommentsHttp` | `/comments/${id}/` | DELETE | Delete a comment |
| `useCommentsHttp` | `/comments/${id}/attach_document/` | POST | Attach file to comment |
| `useCommentsHttp` | `/comments/download-document/${id}/` | GET | Download attachment |
| `useMessagingAPI` | `/messages/by-ticket/` | GET | Fetch chat messages |
| `useMessagingAPI` | `/messages/` | POST | Send chat message |
| `useMessagingAPI` | `/messages/${id}/` | PUT/DELETE | Edit/Delete chat message |
| `useWebSocketMessaging`| `/ws/tickets/${id}/` | WS | Real-time chat connection |
| `useCommentsWebSocket` | `/ws/comments/${id}/` | WS | Real-time comments connection |

## 4. Notification Service
**Base URL**: `VITE_NOTIFICATION_API` (typically `http://localhost:8006`)

| Component / Hook | Endpoint | Method | Description |
| :--- | :--- | :--- | :--- |
| `useNotifications` | `/api/v1/app/my/notifications/` | GET | Get all notifications |
| `useNotifications` | `/api/v1/app/my/notifications/unread/` | GET | Get unread notifications |
| `useNotifications` | `/api/v1/app/my/notifications/read/` | GET | Get read notifications |
| `useNotifications` | `/api/v1/app/my/notifications/mark-all-read/` | POST | Mark all as read |
| `useNotifications` | `/api/v1/app/my/notification/mark-read/` | POST | Mark single notification as read |
