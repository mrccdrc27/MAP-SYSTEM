---
title: Workflow Engine Guide
sidebar_label: Workflow Engine
sidebar_position: 4
---

# Workflow Engine Guide

This is a quick reference guide for the workflow engine. For comprehensive documentation, see [Service Documentation → Workflow Engine](./service-documentation/workflow-engine).

## Overview

The Workflow Engine enables you to create configurable multi-step processes for ticket handling. Workflows define:

- **Steps** - Discrete stages in the process (nodes)
- **Transitions** - Valid paths between steps (edges)
- **Roles** - Who is responsible for each step
- **SLAs** - Time limits based on ticket priority

## Workflow States

| Status | Description | Can Accept Tickets? |
|--------|-------------|---------------------|
| `draft` | Being designed | ❌ No |
| `deployed` | Ready but not active | ❌ No |
| `initialized` | Active and accepting tickets | ✅ Yes |
| `paused` | Temporarily stopped | ❌ No (existing only) |

## Creating a Workflow

### Using the Visual Designer

1. Navigate to **Admin → Workflows → Create New**
2. Fill in workflow details (name, category, department)
3. Set SLAs for each priority level
4. Drag steps onto the canvas
5. Connect steps with transitions
6. Mark start and end steps
7. Save and initialize

### Using the API

```http
POST /workflows/
{
  "workflow": {
    "name": "IT Support",
    "category": "Technology",
    "department": "IT",
    "low_sla": "72:00:00",
    "medium_sla": "48:00:00",
    "high_sla": "24:00:00",
    "urgent_sla": "04:00:00"
  },
  "graph": {
    "nodes": [...],
    "edges": [...]
  }
}
```

## SLA Configuration

SLAs are defined per priority level:

```
Urgent: 4 hours  (critical issues)
High:   24 hours (important issues)
Medium: 48 hours (standard requests)
Low:    72 hours (non-urgent requests)
```

**Rule:** `urgent < high < medium < low`

## Step Weights

Each step gets a portion of the total SLA time based on its weight:

```
Total SLA: 24 hours
├── Triage (0.2)      → 4.8 hours
├── Resolution (0.6)  → 14.4 hours
└── Verification (0.2) → 4.8 hours
```

Weights should sum to 1.0 across all steps.

## Best Practices

1. **Keep workflows simple** - 3-5 steps is ideal
2. **Clear step names** - Use action-oriented names
3. **Appropriate weights** - Allocate more time to complex steps
4. **Test before deploying** - Use draft status for testing
5. **Version carefully** - Active tasks use the version they started with

## Related Documentation

- [Service Documentation → Workflow Engine](./service-documentation/workflow-engine) - Complete workflow documentation
- [Task Management](./service-documentation/task-management) - How tasks execute workflows
- [API Reference](./service-documentation/api-reference) - Workflow API endpoints
