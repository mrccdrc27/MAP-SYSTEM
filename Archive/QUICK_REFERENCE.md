# Quick Reference: Frontend Reporting & Analytics

## What Was Fixed

| Component | Issue | Fix |
|-----------|-------|-----|
| **AgentTab.jsx** | Undefined variables: `teamAvgTime`, `assignmentLabels`, `assignmentCounts` | Updated to use correct data from `analyticsData.sla_compliance` and `analyticsData.user_performance` |
| **TaskItemTab.jsx** | Wrong SLA path + incorrect field names | Fixed to `perf.sla_compliance?.summary?.current_compliance_rate_percent` and direct field access |
| **WorkflowTab.jsx** | Non-existent `avg_time_hours` field | Replaced with `total_tasks` field from aggregated response |
| **useReportingAnalytics.jsx** | Inefficient query string construction | Streamlined to `?${queryString}` format |

## API Endpoints

```bash
# Fetch all three reports in parallel
GET /analytics/reports/tickets/
GET /analytics/reports/workflows/
GET /analytics/reports/tasks/

# With time filtering
GET /analytics/reports/tickets/?start_date=2025-01-01&end_date=2025-12-31
GET /analytics/reports/workflows/?start_date=2025-01-01&end_date=2025-12-31
GET /analytics/reports/tasks/?start_date=2025-01-01&end_date=2025-12-31
```

## Data Structures Quick Reference

### Tickets Report Response
```javascript
{
  dashboard: {
    total_tickets: number,
    completed_tickets: number,
    pending_tickets: number,
    in_progress_tickets: number,
    sla_compliance_rate: number,
    total_users: number,
    total_workflows: number,
    escalation_rate: number
  },
  sla_compliance: [
    { priority, total_tasks, sla_met, sla_breached, compliance_rate }
  ],
  status_summary: [
    { status, count }
  ],
  priority_distribution: [
    { priority, count, percentage }
  ],
  ticket_age: [
    { age_bucket, count, percentage }
  ]
}
```

### Workflows Report Response
```javascript
{
  workflow_metrics: [
    { 
      workflow_id, 
      workflow_name, 
      total_tasks, 
      completed_tasks, 
      pending_tasks, 
      in_progress_tasks, 
      completion_rate 
    }
  ],
  department_analytics: [
    { 
      department, 
      total_tickets, 
      completed_tickets, 
      completion_rate 
    }
  ],
  step_performance: [
    { 
      step_id, 
      step_name, 
      workflow_id, 
      total_tasks, 
      completed_tasks 
    }
  ]
}
```

### Tasks Report Response
```javascript
{
  summary: { total_task_items: number },
  status_distribution: [
    { status, count, percentage }
  ],
  origin_distribution: [
    { origin, count, percentage }
  ],
  performance: {
    time_to_action_hours: { average, minimum, maximum },
    sla_compliance: {
      summary: { 
        total_tasks_with_sla, 
        tasks_on_track, 
        tasks_breached, 
        current_compliance_rate_percent 
      },
      by_current_status: { /* status breakdown */ }
    },
    active_items: number,
    overdue_items: number
  },
  user_performance: [
    {
      user_id,
      user_name,
      total_items,
      new,
      in_progress,
      resolved,
      reassigned,
      escalated,
      breached,
      resolution_rate,
      escalation_rate,
      breach_rate
    }
  ],
  transfer_analytics: {
    total_transfers: number,
    top_transferrers: [{ user_full_name, user_id, transfer_count }],
    top_transfer_recipients: [{ user_full_name, user_id, received_count }],
    total_escalations: number,
    escalations_by_step: [{ assigned_on_step__name, escalation_count }]
  }
}
```

## Tab Components & Data Usage

### TicketTab
- **Data Source**: `ticketsReport`
- **Fields Used**: `dashboard`, `status_summary`, `priority_distribution`, `ticket_age`
- **Charts**: Status Pie, Priority Pie, Age Bar

### WorkflowTab
- **Data Source**: `workflowsReport`
- **Fields Used**: `workflow_metrics`, `department_analytics`, `step_performance`
- **Charts**: Execution Count Bar, Department Distribution Pie, Completion Rates Bar

### AgentTab ⭐ Fixed
- **Data Source**: `ticketsReport`
- **Fields Used**: `sla_compliance`, `dashboard`, `user_performance`
- **Charts**: SLA by Priority Doughnut, SLA Met Bar, User Resolution Rates Pie

### TaskItemTab ⭐ Fixed
- **Data Source**: `tasksReport`
- **Fields Used**: `status_distribution`, `origin_distribution`, `performance`, `user_performance`, `transfer_analytics`
- **Charts**: Status Pie, Origin Doughnut, User Performance Bar (x3), Transferrers Bar, Escalations Bar

## Common Patterns

### Extracting Array Data for Charts
```jsx
const labels = dataArray?.map(item => item.labelField) || [];
const values = dataArray?.map(item => item.valueField) || [];
```

### Safe Nested Field Access
```jsx
const slaRate = data?.performance?.sla_compliance?.summary?.current_compliance_rate_percent || 0;
```

### Calculating Percentages
```jsx
const percentage = (count / total * 100).toFixed(1);
```

### Handling Null Values
```jsx
const value = data.field || 0;
const value = data?.nested?.field ?? 'N/A';
```

## Testing Checklist

- [ ] All tabs load without errors
- [ ] Ticket tab displays KPI cards
- [ ] Workflow tab shows all three charts
- [ ] Agent tab shows SLA and user performance charts
- [ ] TaskItem tab displays all analytics
- [ ] Time filter works on all tabs
- [ ] Console shows no JavaScript errors
- [ ] All charts display data correctly

## Debugging Tips

### View Raw API Response
```javascript
// In browser console
const data = await fetch('/analytics/reports/tickets/').then(r => r.json());
console.log(data);
```

### Check Component State
```jsx
// Add to component for debugging
useEffect(() => {
  console.log('ticketsReport:', ticketsReport);
  console.log('workflowsReport:', workflowsReport);
  console.log('tasksReport:', tasksReport);
}, [ticketsReport, workflowsReport, tasksReport]);
```

### Validate Data Structure
```javascript
// Check if expected fields exist
console.log('Has dashboard:', !!data.dashboard);
console.log('Dashboard fields:', Object.keys(data.dashboard || {}));
```

## Performance Notes

- ✅ All 3 reports fetched in parallel (not sequential)
- ✅ Minimal re-renders with proper dependency arrays
- ✅ Data cached in component state until refresh
- ⚠️ Consider implementing request caching for repeated filters
- ⚠️ Large datasets may impact chart rendering performance

---

**For Issues or Questions**: Check REPORTING_FIXES_SUMMARY.md or IMPLEMENTATION_COMPLETE.md
