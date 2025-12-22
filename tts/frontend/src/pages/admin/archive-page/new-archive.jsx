import React, { useState } from 'react';
import { Search, Filter, ChevronDown, ChevronRight, Clock, User, AlertCircle, CheckCircle, XCircle, ChevronUp } from 'lucide-react';

const sampleData = [
  {
    task_item_id: 34,
    user_id: 8,
    user_full_name: "Jane Smith",
    role: "Asset Manager",
    status: "new",
    task_id: 5,
    ticket_id: 5,
    ticket_number: "TX20251118959767",
    ticket_subject: "Asset Checkout Request - Canon imageCLASS MF445dw",
    ticket_description: "Need to checkout Canon imageCLASS MF445dw for project work.",
    workflow_id: 2,
    workflow_name: "Asset Check Out Workflow",
    current_step_id: 5,
    current_step_name: "Asset Check Out Workflow - Resolve Ticket",
    current_step_role: "Asset Manager",
    task_status: "pending",
    assigned_on: "2025-11-18T23:22:01.700523Z",
    target_resolution: "2025-11-20T15:22:01.699288Z",
    priority: "medium",
    workflow_history: [
      {
        step_id: 1,
        step_name: "Initial Review",
        assignee: "System",
        role: "Auto-assign",
        status: "completed",
        started: "2025-11-18T23:20:00.000000Z",
        completed: "2025-11-18T23:20:30.000000Z"
      },
      {
        step_id: 2,
        step_name: "Manager Approval",
        assignee: "Robert Chen",
        role: "Manager",
        status: "completed",
        started: "2025-11-18T23:20:30.000000Z",
        completed: "2025-11-18T23:21:45.000000Z"
      },
      {
        step_id: 3,
        step_name: "Asset Availability Check",
        assignee: "Mike Wilson",
        role: "Asset Coordinator",
        status: "completed",
        started: "2025-11-18T23:21:45.000000Z",
        completed: "2025-11-18T23:22:01.000000Z"
      },
      {
        step_id: 5,
        step_name: "Resolve Ticket",
        assignee: "Jane Smith",
        role: "Asset Manager",
        status: "in_progress",
        started: "2025-11-18T23:22:01.000000Z",
        completed: null
      }
    ]
  },
  {
    task_item_id: 35,
    user_id: 12,
    user_full_name: "John Doe",
    role: "IT Support",
    status: "in_progress",
    task_id: 6,
    ticket_id: 6,
    ticket_number: "TX20251118959768",
    ticket_subject: "Network Connectivity Issue - Building A",
    ticket_description: "Multiple users reporting intermittent network drops in Building A.",
    workflow_id: 1,
    workflow_name: "IT Support Workflow",
    current_step_id: 3,
    current_step_name: "IT Support Workflow - Diagnose Issue",
    current_step_role: "IT Support",
    task_status: "in_progress",
    assigned_on: "2025-11-18T10:15:00.000000Z",
    target_resolution: "2025-11-19T18:00:00.000000Z",
    priority: "high",
    workflow_history: [
      {
        step_id: 1,
        step_name: "Ticket Received",
        assignee: "System",
        role: "Auto-assign",
        status: "completed",
        started: "2025-11-18T10:10:00.000000Z",
        completed: "2025-11-18T10:10:15.000000Z"
      },
      {
        step_id: 2,
        step_name: "Initial Triage",
        assignee: "Sarah Lee",
        role: "IT Support L1",
        status: "completed",
        started: "2025-11-18T10:10:15.000000Z",
        completed: "2025-11-18T10:15:00.000000Z"
      },
      {
        step_id: 3,
        step_name: "Diagnose Issue",
        assignee: "John Doe",
        role: "IT Support",
        status: "in_progress",
        started: "2025-11-18T10:15:00.000000Z",
        completed: null
      }
    ]
  },
  {
    task_item_id: 36,
    user_id: 8,
    user_full_name: "Jane Smith",
    role: "Asset Manager",
    status: "completed",
    task_id: 7,
    ticket_id: 7,
    ticket_number: "TX20251117959765",
    ticket_subject: "Laptop Return - MacBook Pro 16",
    ticket_description: "Returning company laptop after project completion.",
    workflow_id: 2,
    workflow_name: "Asset Return Workflow",
    current_step_id: 8,
    current_step_name: "Asset Return Workflow - Complete",
    current_step_role: "Asset Manager",
    task_status: "completed",
    assigned_on: "2025-11-17T14:30:00.000000Z",
    target_resolution: "2025-11-18T14:30:00.000000Z",
    priority: "low",
    workflow_history: [
      {
        step_id: 1,
        step_name: "Return Request",
        assignee: "System",
        role: "Auto-assign",
        status: "completed",
        started: "2025-11-17T14:25:00.000000Z",
        completed: "2025-11-17T14:25:30.000000Z"
      },
      {
        step_id: 2,
        step_name: "Schedule Inspection",
        assignee: "Mike Wilson",
        role: "Asset Coordinator",
        status: "completed",
        started: "2025-11-17T14:25:30.000000Z",
        completed: "2025-11-17T14:30:00.000000Z"
      },
      {
        step_id: 3,
        step_name: "Asset Inspection",
        assignee: "Jane Smith",
        role: "Asset Manager",
        status: "completed",
        started: "2025-11-17T14:30:00.000000Z",
        completed: "2025-11-18T09:15:00.000000Z"
      },
      {
        step_id: 4,
        step_name: "Complete Return",
        assignee: "Jane Smith",
        role: "Asset Manager",
        status: "completed",
        started: "2025-11-18T09:15:00.000000Z",
        completed: "2025-11-18T09:20:00.000000Z"
      }
    ]
  },
  {
    task_item_id: 37,
    user_id: 15,
    user_full_name: "Sarah Johnson",
    role: "HR Manager",
    status: "new",
    task_id: 8,
    ticket_id: 8,
    ticket_number: "TX20251119959770",
    ticket_subject: "Leave Request - Annual Leave",
    ticket_description: "Requesting 5 days annual leave from Dec 20-24, 2025.",
    workflow_id: 3,
    workflow_name: "Leave Approval Workflow",
    current_step_id: 10,
    current_step_name: "Leave Approval Workflow - Manager Review",
    current_step_role: "HR Manager",
    task_status: "pending",
    assigned_on: "2025-11-19T09:00:00.000000Z",
    target_resolution: "2025-11-21T17:00:00.000000Z",
    priority: "medium",
    workflow_history: [
      {
        step_id: 1,
        step_name: "Request Submitted",
        assignee: "System",
        role: "Auto-assign",
        status: "completed",
        started: "2025-11-19T08:58:00.000000Z",
        completed: "2025-11-19T08:58:15.000000Z"
      },
      {
        step_id: 2,
        step_name: "Eligibility Check",
        assignee: "HR System",
        role: "Automated",
        status: "completed",
        started: "2025-11-19T08:58:15.000000Z",
        completed: "2025-11-19T09:00:00.000000Z"
      },
      {
        step_id: 10,
        step_name: "Manager Review",
        assignee: "Sarah Johnson",
        role: "HR Manager",
        status: "pending",
        started: "2025-11-19T09:00:00.000000Z",
        completed: null
      }
    ]
  },
  {
    task_item_id: 38,
    user_id: 12,
    user_full_name: "John Doe",
    role: "IT Support",
    status: "blocked",
    task_id: 9,
    ticket_id: 9,
    ticket_number: "TX20251118959769",
    ticket_subject: "Software License Renewal",
    ticket_description: "Adobe Creative Suite licenses expiring in 2 days.",
    workflow_id: 1,
    workflow_name: "IT Support Workflow",
    current_step_id: 4,
    current_step_name: "IT Support Workflow - Awaiting Approval",
    current_step_role: "IT Support",
    task_status: "blocked",
    assigned_on: "2025-11-18T08:00:00.000000Z",
    target_resolution: "2025-11-20T17:00:00.000000Z",
    priority: "high",
    workflow_history: [
      {
        step_id: 1,
        step_name: "License Check",
        assignee: "System",
        role: "Automated",
        status: "completed",
        started: "2025-11-18T07:55:00.000000Z",
        completed: "2025-11-18T07:55:30.000000Z"
      },
      {
        step_id: 2,
        step_name: "Vendor Contact",
        assignee: "Lisa Park",
        role: "IT Procurement",
        status: "completed",
        started: "2025-11-18T07:55:30.000000Z",
        completed: "2025-11-18T08:00:00.000000Z"
      },
      {
        step_id: 3,
        step_name: "Budget Approval Request",
        assignee: "John Doe",
        role: "IT Support",
        status: "completed",
        started: "2025-11-18T08:00:00.000000Z",
        completed: "2025-11-18T09:30:00.000000Z"
      },
      {
        step_id: 4,
        step_name: "Awaiting Approval",
        assignee: "John Doe",
        role: "IT Support",
        status: "blocked",
        started: "2025-11-18T09:30:00.000000Z",
        completed: null,
        blocked_reason: "Waiting for Finance Manager approval"
      }
    ]
  }
];

// todo
// remove the profile picture on assignee, no icon
// remove the task items view/ticket view
// remove the navbar, it's irrelevant here
// remove lucide react dependency

export default function AllTicketsInterface() {
  const [viewMode, setViewMode] = useState('task_items');
  const [groupBy, setGroupBy] = useState('none');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [expandedGroups, setExpandedGroups] = useState({});
  const [expandedRows, setExpandedRows] = useState({});
  const [showFilters, setShowFilters] = useState(false);

  const getStatusColor = (status) => {
    const colors = {
      new: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      blocked: 'bg-red-100 text-red-800',
      pending: 'bg-purple-100 text-purple-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-orange-100 text-orange-800',
      low: 'bg-gray-100 text-gray-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'blocked': return <XCircle className="w-4 h-4" />;
      case 'in_progress': return <Clock className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return <span className="text-red-600">Overdue</span>;
    if (diffDays === 0) return <span className="text-orange-600">Due today</span>;
    if (diffDays === 1) return <span className="text-yellow-600">Due tomorrow</span>;
    return date.toLocaleDateString();
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const calculateDuration = (start, end) => {
    if (!start || !end) return '-';
    const diff = new Date(end) - new Date(start);
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const filteredData = sampleData.filter(item => {
    const matchesSearch = item.ticket_subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.user_full_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const groupedData = () => {
    if (groupBy === 'none') return { 'All Items': filteredData };
    
    return filteredData.reduce((acc, item) => {
      let key;
      switch(groupBy) {
        case 'workflow': key = item.workflow_name; break;
        case 'status': key = item.status.replace('_', ' ').toUpperCase(); break;
        case 'assignee': key = item.user_full_name; break;
        default: key = 'All Items';
      }
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  };

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const toggleRow = (taskItemId) => {
    setExpandedRows(prev => ({
      ...prev,
      [taskItemId]: !prev[taskItemId]
    }));
  };

  const grouped = groupedData();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">MAP</span>
              </div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">TicketFlow</h1>
                <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded">admin</span>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <nav className="flex gap-6">
                <a href="#" className="text-gray-600 hover:text-gray-900">Dashboard</a>
                <a href="#" className="text-gray-600 hover:text-gray-900">Tasks</a>
                <a href="#" className="text-gray-600 hover:text-gray-900">Workflow</a>
                <a href="#" className="text-gray-600 hover:text-gray-900">Agent</a>
                <a href="#" className="text-blue-600 font-medium border-b-2 border-blue-600 pb-1">Tickets</a>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Controls Bar */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">All Tickets</h2>
              <div className="flex items-center gap-3">
                {/* View Mode Toggle */}
                <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('task_items')}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      viewMode === 'task_items' 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Task Items View
                  </button>
                  <button
                    onClick={() => setViewMode('tickets')}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      viewMode === 'tickets' 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Ticket View
                  </button>
                </div>

                {/* Group By */}
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="none">No Grouping</option>
                  <option value="workflow">Group by Workflow</option>
                  <option value="status">Group by Status</option>
                  <option value="assignee">Group by Assignee</option>
                </select>

                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Filter className="w-4 h-4" />
                  <span className="text-sm">Filters</span>
                </button>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by ticket number, subject, or assignee..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {showFilters && (
                <div className="flex items-center gap-2">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="new">New</option>
                    <option value="in_progress">In Progress</option>
                    <option value="pending">Pending</option>
                    <option value="blocked">Blocked</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              )}
            </div>

            {/* Summary Stats */}
            <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Total:</span>
                <span className="font-semibold text-gray-900">{filteredData.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Active:</span>
                <span className="font-semibold text-blue-600">
                  {filteredData.filter(i => i.status === 'in_progress').length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Pending:</span>
                <span className="font-semibold text-yellow-600">
                  {filteredData.filter(i => i.status === 'pending' || i.status === 'new').length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Blocked:</span>
                <span className="font-semibold text-red-600">
                  {filteredData.filter(i => i.status === 'blocked').length}
                </span>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {Object.entries(grouped).map(([groupName, items]) => (
              <div key={groupName}>
                {groupBy !== 'none' && (
                  <div
                    onClick={() => toggleGroup(groupName)}
                    className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100"
                  >
                    {expandedGroups[groupName] ? (
                      <ChevronDown className="w-4 h-4 text-gray-600" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    )}
                    <span className="font-semibold text-gray-900">{groupName}</span>
                    <span className="text-sm text-gray-600">({items.length})</span>
                  </div>
                )}

                {(groupBy === 'none' || expandedGroups[groupName]) && (
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-8"></th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Ticket #</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Subject</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Workflow</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Current Step</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Assignee</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Priority</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Target Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan="10" className="px-4 py-8 text-center text-gray-500">
                            No tickets found
                          </td>
                        </tr>
                      ) : (
                        items.map((item) => (
                          <React.Fragment key={item.task_item_id}>
                            <tr className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => toggleRow(item.task_item_id)}
                                  className="text-gray-400 hover:text-gray-600"
                                >
                                  {expandedRows[item.task_item_id] ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </button>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-sm font-mono text-blue-600 hover:underline cursor-pointer">
                                  {item.ticket_number}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="max-w-xs">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {item.ticket_subject}
                                  </p>
                                  <p className="text-xs text-gray-500 truncate">
                                    {item.ticket_description}
                                  </p>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-sm text-gray-700">{item.workflow_name}</span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="max-w-xs">
                                  <p className="text-sm text-gray-900 truncate">{item.current_step_name}</p>
                                  <p className="text-xs text-gray-500">{item.current_step_role}</p>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <User className="w-4 h-4 text-blue-600" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">{item.user_full_name}</p>
                                    <p className="text-xs text-gray-500">{item.role}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                                  {getStatusIcon(item.status)}
                                  {item.status.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
                                  {item.priority}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm">
                                  {formatDate(item.target_resolution)}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                                  View
                                </button>
                              </td>
                            </tr>

                            {/* Expanded Row - Workflow History */}
                            {expandedRows[item.task_item_id] && (
                              <tr className="bg-gray-50">
                                <td colSpan="10" className="px-4 py-4">
                                  <div className="ml-12">
                                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                      <Clock className="w-4 h-4" />
                                      Workflow History & Progress
                                    </h4>
                                    
                                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                                      <div className="space-y-4">
                                        {item.workflow_history.map((step, index) => (
                                          <div key={step.step_id} className="flex items-start gap-4">
                                            {/* Timeline */}
                                            <div className="flex flex-col items-center">
                                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                                step.status === 'completed' 
                                                  ? 'bg-green-100' 
                                                  : step.status === 'in_progress' 
                                                  ? 'bg-blue-100' 
                                                  : step.status === 'blocked'
                                                  ? 'bg-red-100'
                                                  : 'bg-gray-100'
                                              }`}>
                                                {step.status === 'completed' && (
                                                  <CheckCircle className="w-5 h-5 text-green-600" />
                                                )}
                                                {step.status === 'in_progress' && (
                                                  <Clock className="w-5 h-5 text-blue-600" />
                                                )}
                                                {step.status === 'blocked' && (
                                                  <XCircle className="w-5 h-5 text-red-600" />
                                                )}
                                                {step.status === 'pending' && (
                                                  <AlertCircle className="w-5 h-5 text-gray-600" />
                                                )}
                                              </div>
                                              {index < item.workflow_history.length - 1 && (
                                                <div className={`w-0.5 h-16 ${
                                                  step.status === 'completed' 
                                                    ? 'bg-green-300' 
                                                    : 'bg-gray-300'
                                                }`} />
                                              )}
                                            </div>

                                            {/* Step Details */}
                                            <div className="flex-1 pb-4">
                                              <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                  <div className="flex items-center gap-2 mb-1">
                                                    <h5 className="text-sm font-semibold text-gray-900">
                                                      Step {step.step_id}: {step.step_name}
                                                    </h5>
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(step.status)}`}>
                                                      {step.status.replace('_', ' ')}
                                                    </span>
                                                  </div>
                                                  
                                                  <div className="flex items-center gap-4 text-xs text-gray-600 mb-2">
                                                    <div className="flex items-center gap-1">
                                                      <User className="w-3 h-3" />
                                                      <span className="font-medium">{step.assignee}</span>
                                                      <span className="text-gray-400">•</span>
                                                      <span>{step.role}</span>
                                                    </div>
                                                  </div>

                                                  <div className="flex items-center gap-4 text-xs text-gray-500">
                                                    <div>
                                                      <span className="font-medium">Started:</span> {formatDateTime(step.started)}
                                                    </div>
                                                    {step.completed && (
                                                      <>
                                                        <div>
                                                          <span className="font-medium">Completed:</span> {formatDateTime(step.completed)}
                                                        </div>
                                                        <div>
                                                          <span className="font-medium">Duration:</span> {calculateDuration(step.started, step.completed)}
                                                        </div>
                                                      </>
                                                    )}
                                                    {step.status === 'in_progress' && (
                                                      <div className="text-blue-600 font-medium">
                                                        Currently in progress...
                                                      </div>
                                                    )}
                                                  </div>

                                                  {step.blocked_reason && (
                                                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                                                      <span className="font-semibold">Blocked:</span> {step.blocked_reason}
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>

                                      {/* Summary */}
                                      <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
                                        <div className="flex items-center gap-4">
                                          <div>
                                            <span className="font-medium">Total Steps:</span> {item.workflow_history.length}
                                          </div>
                                          <div>
                                            <span className="font-medium">Completed:</span> {item.workflow_history.filter(s => s.status === 'completed').length}
                                          </div>
                                          <div>
                                            <span className="font-medium">Total Duration:</span>{' '}
                                            {(() => {
                                              const completedSteps = item.workflow_history.filter(s => s.completed);
                                              if (completedSteps.length === 0) return '-';
                                              const firstStart = new Date(item.workflow_history[0].started);
                                              const lastComplete = new Date(completedSteps[completedSteps.length - 1].completed);
                                              const diff = lastComplete - firstStart;
                                              const hours = Math.floor(diff / 3600000);
                                              const minutes = Math.floor((diff % 3600000) / 60000);
                                              return `${hours}h ${minutes}m`;
                                            })()}
                                          </div>
                                        </div>
                                        <div className="text-gray-500">
                                          Click row to collapse
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Show</span>
              <select className="px-2 py-1 border border-gray-300 rounded text-sm">
                <option>5</option>
                <option>10</option>
                <option>25</option>
                <option>50</option>
              </select>
              <span className="text-sm text-gray-600">items per page</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">
                Prev
              </button>
              <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm">
                1
              </button>
              <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}