import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import styles from './EmployeeTicketTracker.module.css';
import { backendTicketService } from '../../../services/backend/ticketService';
import { toEmployeeStatus } from '../../../utilities/helpers/statusMapper';
import authService from '../../../utilities/service/authService';
import { useAuth } from '../../../context/AuthContext';
import Skeleton from '../../../shared/components/Skeleton/Skeleton';
import Loading from '../../../shared/components/Loading/Loading';
import EmployeeActiveTicketsWithdrawTicketModal from '../../components/modals/active-tickets/EmployeeActiveTicketsWithdrawTicketModal';
import EmployeeActiveTicketsCloseTicketModal from '../../components/modals/active-tickets/EmployeeActiveTicketsCloseTicketModal';
import TicketActivity from './EmployeeTicketLogs';
import TicketMessaging from './TicketMessaging';
import ErrorBoundary from '../../../shared/components/ErrorBoundary';
import Button from '../../../shared/components/Button';
import ViewCard from '../../../shared/components/ViewCard';
import Tabs from '../../../shared/components/Tabs';
import { 
  FaFileImage, 
  FaFilePdf, 
  FaFileWord, 
  FaFileExcel, 
  FaFileCsv, 
  FaFile,
  FaDownload 
} from 'react-icons/fa';
import { convertToSecureUrl, extractFilePathFromUrl, getAccessToken } from '../../../utilities/secureMedia';
import { getEmployeeTickets, getTicketByNumber } from '../../../utilities/storages/ticketStorage';

// Employee-side status progression (5 steps)
// Step 1: Pending (when admin sets New or Open)
// Step 2: In Progress
// Step 3: Resolved (employee can close from here)
// Step 4: Closed (or Rejected/Withdrawn as terminal states)
const STATUS_COMPLETION = {
  1: ['Pending', 'In Progress', 'Resolved', 'Closed', 'Rejected', 'Withdrawn'],
  2: ['In Progress', 'Resolved', 'Closed', 'Rejected', 'Withdrawn'],
  3: ['Resolved', 'Closed', 'Rejected', 'Withdrawn'],
  4: ['Closed', 'Rejected', 'Withdrawn'],
};

const getStatusSteps = (status) =>
  [1, 2, 3, 4].map((id) => ({
    id,
    completed: STATUS_COMPLETION[id]?.includes(status) || false,
  }));

// Convert a key or phrase to Title Case (capitalize each word)
const toTitleCase = (str) => {
  if (!str && str !== 0) return '';
  return String(str)
    .replace(/_/g, ' ')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

const DetailField = ({ label, value }) => (
  <fieldset>
    <label>{toTitleCase(label)}</label>
    <p>{value || 'None'}</p>
  </fieldset>
);

const formatDate = (date) => {
  if (!date) return 'None';
  const d = new Date(date);
  if (isNaN(d)) return 'None';
  const monthName = d.toLocaleString('en-US', { month: 'long' }); // October
  const day = d.getDate();
  const yearFull = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  const yy = String(yearFull).slice(-2);
  return `${monthName} ${day}, ${yearFull}`;
};

const formatTime = (date) => {
  if (!date) return '';
  try {
    const d = new Date(date);
    if (isNaN(d)) return String(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return String(date);
  }
};

// Format a date value to a user-friendly date-only string (reuses formatDate)
const formatDateOnly = (date) => {
  if (!date) return null;
  try {
    const v = formatDate(date);
    return v === 'None' ? null : v;
  } catch (e) {
    return String(date);
  }
};

// Format number with thousands separators and two decimal places
const formatMoney = (value) => {
  if (value === null || value === undefined || value === '') return 'N/A';
  const num = Number(value);
  if (!isFinite(num)) return value;
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
};

// Generate logs based on ticket data and return polished sentence text for each entry
const generateLogs = (ticket) => {

  const logs = [];
  // Prefer explicit created timestamps from the ticket payload. Do NOT default
  // to current time here — if the backend did not provide a creation date we
  // should leave it null so the UI does not display "now" incorrectly.
  const createdAt = ticket.dateCreated || ticket.date_created || ticket.submit_date || ticket.createdAt || ticket.created_at || null;

  // 1. Ticket Created — prefer actual creation timestamp and avoid
  // defaulting to "now" when the field is missing.
  logs.push({
    id: logs.length + 1,
    user: ticket.requesterName || ticket.requestedBy || 'Employee',
    action: 'Ticket Created',
    timestamp: createdAt ? formatDate(createdAt) : null,
    source: 'Web Form',
    details: `Category: ${ticket.category || 'None'}`,
    text: createdAt ? `Ticket was created on ${formatDate(createdAt)} via Web Form. Category: ${ticket.category || 'None'}.` : `Ticket was created via Web Form. Category: ${ticket.category || 'None'}.`,
    highlight: ticket.category || null,
  });

  // 2. Assigned to department / agent (if present)
  const assignedToName = typeof ticket.assignedTo === 'object' ? ticket.assignedTo?.name : ticket.assignedTo;
  if (ticket.department) {
    const at = ticket.dateAssigned || ticket.lastUpdated || createdAt || null;
    const agentText = assignedToName ? ` by ${assignedToName}` : '';
    const sentence = `Ticket was routed to the ${ticket.department} department${agentText} on ${formatDate(at)}.`;
    logs.push({
      id: logs.length + 1,
      user: 'Coordinator',
      action: `Assigned to ${ticket.department}`,
      timestamp: formatDate(at),
      source: 'System',
      text: sentence,
      highlight: ticket.department,
    });
  } else if (assignedToName) {
    const at = ticket.dateAssigned || ticket.lastUpdated || createdAt || null;
    logs.push({
      id: logs.length + 1,
      user: 'Coordinator',
      action: `Assigned to ${assignedToName}`,
      timestamp: formatDate(at),
      source: 'System',
      text: `Assigned to ${assignedToName} on ${formatDate(at)}.`,
      highlight: assignedToName,
    });
  }

  // 3. Status history: add all status changes if present
  if (Array.isArray(ticket.statusHistory) && ticket.statusHistory.length > 0) {
    const currentStatus = (ticket.status || ticket.currentStatus || '').toString();
    ticket.statusHistory.forEach((entry, idx) => {
      // Normalize status display for logs: treat 'New' as 'Open' so timeline reads clearly
      const raw = entry.status || '';
      const displayStatus = raw === 'New' ? 'Open' : raw;
      const statusTs = entry.timestamp || entry.date || entry.updatedAt || entry.createdAt || null;

      // Suppress misleading 'Withdrawn' entries when the ticket's current
      // status shows it was later reopened or approved. This avoids showing
      // an incorrect transient 'Withdrawn' event in the timeline when the
      // ticket is actually Open or Approved now.
      try {
        const cur = (currentStatus || '').toLowerCase();
        // If the ticket is not currently Withdrawn, suppress past Withdrawn
        // entries to avoid showing misleading transient withdrawn events.
        if (String(displayStatus).toLowerCase() === 'withdrawn' && cur !== 'withdrawn') {
          return; // skip this withdrawn log entry
        }
      } catch (e) {
        // ignore and continue if any normalization fails
      }

      logs.push({
        id: logs.length + 1,
        user: entry.user || 'System',
        action: `Status Updated: ${displayStatus}`,
        timestamp: formatDate(statusTs),
        source: entry.source || 'System',
        text: statusTs ? `Status was updated to ${displayStatus} on ${formatDate(statusTs)}.` : `Status was updated to ${displayStatus}.`,
        highlight: displayStatus,
      });
    });
  } else if (Array.isArray(ticket.logs) && ticket.logs.length > 0) {
    // Fallback: support for 'logs' array with status changes
    const currentStatusFallback = (ticket.status || ticket.currentStatus || '').toString();
    ticket.logs.forEach((entry, idx) => {
      if (entry.status) {
        const raw = entry.status || '';
        const displayStatus = raw === 'New' ? 'Open' : raw;

        try {
          const cur = (currentStatusFallback || '').toLowerCase();
          if (String(displayStatus).toLowerCase() === 'withdrawn' && cur !== 'withdrawn') {
            return; // skip misleading withdrawn log
          }
        } catch (e) {}

        logs.push({
          id: logs.length + 1,
          user: entry.user || 'System',
          action: `Status Updated: ${displayStatus}`,
          timestamp: formatDate(entry.timestamp || entry.date || entry.updatedAt || entry.createdAt),
          source: entry.source || 'System',
          text: `Status was updated to ${displayStatus} on ${formatDate(entry.timestamp || entry.date || entry.updatedAt || entry.createdAt)}.`,
          highlight: displayStatus,
        });
      }
    });
  } else {
    // Fallback: add current status if it's progressed beyond initial
    const status = ticket.status || ticket.currentStatus;
    if (status && status !== 'New' && status !== 'Pending') {
      const at = ticket.lastUpdated || createdAt;
      logs.push({
        id: logs.length + 1,
        user: 'System',
        action: `Status Updated: ${status}`,
        timestamp: formatDate(at),
        source: 'System',
        text: `Status was updated to ${status} on ${formatDate(at)}.`,
        highlight: status,
      });
    }
  }

  // 4. Resolved / Closed (explicit)
  const status = ticket.status || ticket.currentStatus;
  if (status === 'Resolved' || ticket.resolvedAt) {
    const resolvedAt = ticket.resolvedAt || ticket.lastUpdated || createdAt;
    logs.push({
      id: logs.length + 1,
      user: ticket.resolvedBy || 'Agent',
      action: 'Ticket Resolved',
      timestamp: formatDate(resolvedAt || null),
      source: 'Portal',
      text: resolvedAt ? `Ticket was marked as resolved on ${formatDate(resolvedAt)}.` : `Ticket was marked as resolved.`,
      highlight: 'resolved',
    });
  }

  if (status === 'Closed' || ticket.closedAt) {
    const closedAt = ticket.closedAt || ticket.lastUpdated || createdAt || null;
    logs.push({
      id: logs.length + 1,
      user: ticket.closedBy || 'System',
      action: 'Ticket Closed',
      timestamp: formatDate(closedAt || null),
      source: 'System',
      text: closedAt ? `Ticket was closed on ${formatDate(closedAt)}.` : `Ticket was closed.`,
      highlight: 'closed',
    });
  }

  // 5. Include any message/activity entries as action logs (if present)
  if (Array.isArray(ticket.activity) && ticket.activity.length > 0) {
    ticket.activity.forEach((a) => {
      const who = a.user || a.performedBy || a.actor || 'Agent';
      const when = formatDate(a.timestamp || a.date || a.createdAt);
      const details = a.details || a.note || a.message || a.action || '';
      // Build a natural sentence depending on available fields
      let sentence = '';
      if (a.type && a.type.toLowerCase().includes('comment')) {
        sentence = `${who} commented on ${when}: "${details || a.note || 'No details provided.'}"`;
      } else if (a.action && (a.action.toLowerCase().includes('status') || a.action.toLowerCase().includes('changed')) ) {
        sentence = `${who} updated the ticket: ${a.action} on ${when}.`;
      } else if (a.action && a.action.toLowerCase().includes('assign')) {
        sentence = `${who} assigned the ticket on ${when}${details ? ` — ${details}` : ''}.`;
      } else if (details) {
        sentence = `${who} added an activity on ${when}: "${details}."`;
      } else {
        sentence = `${who} performed an action (${a.action || a.type || 'Activity'}) on ${when}.`;
      }

      logs.push({
        id: logs.length + 1,
        user: who,
        action: a.action || a.type || 'Activity',
        timestamp: when,
        details: a.details || a.note || undefined,
        source: a.source || 'Portal',
        text: sentence,
      });
    });
  }

  // Reverse logs to show latest first (newest to oldest)
  return logs.reverse();
};

// Generate messages based on ticket data
const generateMessages = (ticket) => {
  return [
    { id: 1, sender: 'Support Team', message: `Your ticket regarding "${ticket.subject}" has been received and is being reviewed.`, timestamp: formatDate(ticket.dateCreated) },
    { id: 2, sender: 'You', message: 'Thank you for the update. When can I expect this to be resolved?', timestamp: formatDate(ticket.dateCreated) },
  ];
};

// Render attachments in a consistent card/list style
const renderAttachments = (files) => {
  if (!files) return <div className={styles.detailValue}>No attachments</div>;

  // Normalize to array
  const fileArray = Array.isArray(files) ? files : [files];

  const getFileIcon = (file) => {
    const mimeType = file?.type || file?.mimeType;
    const name = file?.name || file?.filename || file;
    
    if (mimeType) {
      if (mimeType.startsWith('image/')) return <FaFileImage />;
      if (mimeType === 'application/pdf') return <FaFilePdf />;
      if (mimeType.includes('word') || mimeType.includes('document')) return <FaFileWord />;
      if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return <FaFileExcel />;
      if (mimeType === 'text/csv') return <FaFileCsv />;
    }
    
    // Fallback based on file extension
    if (typeof name === 'string') {
      const extension = name.split('.').pop()?.toLowerCase();
      if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg'].includes(extension)) return <FaFileImage />;
      if (extension === 'pdf') return <FaFilePdf />;
      if (['doc', 'docx'].includes(extension)) return <FaFileWord />;
      if (['xls', 'xlsx'].includes(extension)) return <FaFileExcel />;
      if (extension === 'csv') return <FaFileCsv />;
    }
    
    return <FaFile />;
  };

  // We no longer fetch blobs client-side; filenames are linked to secure URLs

  const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || 'https://smartsupport-hdts-backend.up.railway.app/media/';

  const openAttachment = (rawUrl) => {
    const secure = convertToSecureUrl(rawUrl);
    if (secure) {
      window.open(secure, '_blank', 'noopener,noreferrer');
      return;
    }

    // Try to compute a backend media URL from the path
    const filePath = extractFilePathFromUrl(rawUrl) || (typeof rawUrl === 'string' ? rawUrl.split('?')[0] : null);
    if (filePath) {
      const clean = filePath.startsWith('/') ? filePath.slice(1) : filePath;
      let backendUrl = `${MEDIA_URL}${clean}`;
      const token = getAccessToken();
      if (token) {
        backendUrl = `${backendUrl}?token=${encodeURIComponent(token)}`;
      }
      window.open(backendUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    // Fallback to opening the original url
    window.open(rawUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={styles.attachmentList}>
      {fileArray.map((f, idx) => {
        // Support multiple shapes: backend returns { file: url, file_name }
        const name = f?.file_name || f?.name || f?.filename || (typeof f === 'string' ? f.split('/').pop() : f);
        const url = f?.file || f?.url || f?.downloadUrl || f?.download_url || (typeof f === 'string' ? f : '#');
        
        // Build the protected API URL - backend returns paths like /api/media/ticket_attachments/file.ext
        const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        let finalUrl = url;
        
        // If the URL is a relative path (starts with /api/media/), prepend the backend URL
        if (typeof url === 'string' && url.startsWith('/api/')) {
          finalUrl = `${BACKEND_URL}${url}`;
        } else if (typeof url === 'string' && !url.startsWith('http')) {
          // If it's a relative path without /api/, assume it's an old format
          finalUrl = `${BACKEND_URL}/api/media/${url}`;
        }
        
        // final fallback to original url
        if (!finalUrl) finalUrl = url;
        return (
          <div key={idx} className={styles.attachmentItem}>
            <div className={styles.attachmentIcon}>{getFileIcon(f)}</div>
            <div style={{ flex: 1 }}>
              <a href={finalUrl} target="_blank" rel="noreferrer" className={styles.attachmentName}>{name}</a>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <a href={finalUrl} target="_blank" rel="noreferrer" className={styles.attachmentDownload}>
                <FaDownload />
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default function EmployeeTicketTracker() {
  const { ticketNumber } = useParams();
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [activeTab, setActiveTab] = useState('messages'); // 'logs' or 'messages'
  const [isLoading, setIsLoading] = useState(true);
  // preview state removed - attachments now open in a new tab

  useEffect(() => {
    // Simulate loading delay
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [ticketNumber]);

  // Get current logged-in user from AuthContext
  const { user: currentUser } = useAuth();
  
  // Get only the current user's tickets
  const tickets = getEmployeeTickets(currentUser?.id);

  // Support both direct links (/ticket-tracker/:ticketNumber) and normal flow (latest ticket)
  const [ticket, setTicket] = useState(null);
  const [loadingTicket, setLoadingTicket] = useState(false);

  useEffect(() => {
    let mounted = true;

    const findLocal = () => {
      if (!ticketNumber) return tickets && tickets.length > 0 ? tickets[tickets.length - 1] : null;
      return getTicketByNumber(ticketNumber) || tickets.find((t) => String(t.ticketNumber) === String(ticketNumber));
    };

    const local = findLocal();
    if (local) {
      setTicket(local);
      return () => { mounted = false; };
    }

    // If not found locally and we have a ticketNumber, fetch from backend
    if (ticketNumber) {
      setLoadingTicket(true);
      (async () => {
        try {
          const fetched = await backendTicketService.getTicketByNumber(ticketNumber);
          if (mounted) setTicket(fetched || null);
        } catch (err) {
          console.error('Error fetching ticket by number:', err);
          if (mounted) setTicket(null);
        } finally {
          if (mounted) setLoadingTicket(false);
        }
      })();
    } else {
      setTicket(local);
    }

    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketNumber, JSON.stringify(tickets)]);

  // selected ticket ready for render
  // If we don't yet have a ticket, show the loading skeleton until the
  // backend returns the real ticket. This avoids flashing the "No Ticket Found"
  // message while a background fetch is in progress.
  if (!ticket) {
    return (
      <>
        <main className={styles.employeeTicketTrackerPage}>
          <ViewCard>
            <div className={styles.contentGrid}>
              <div className={styles.leftColumn}>
                <section className={styles.ticketCard}>
                  <div className={styles.ticketHeader}>
                    <div className={styles.headerLeft}>
                      <Skeleton width="100px" height="32px" />
                      <Skeleton width="300px" height="28px" style={{ marginLeft: '12px' }} />
                    </div>
                    <Skeleton width="100px" height="32px" />
                  </div>
                  <div className={styles.ticketMeta}>
                    <Skeleton width="200px" height="20px" />
                    <Skeleton width="200px" height="20px" style={{ marginTop: '8px' }} />
                  </div>
                  <div className={styles.detailsGrid}>
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <div key={i}>
                        <Skeleton width="100px" height="12px" />
                        <Skeleton width="100%" height="20px" style={{ marginTop: '8px' }} />
                      </div>
                    ))}
                  </div>
                </section>
              </div>
              <div className={styles.rightColumn}>
                <Skeleton width="100%" height="300px" />
              </div>
            </div>
          </ViewCard>
        </main>
      </>
    );
  }

  const {
    ticket_number: number,
    subject,
    category,
    sub_category: subCategory,
    status: originalStatus,
    submit_date: dateCreated,
    update_date: lastUpdated,
    description,
    file_uploaded: fileUploaded,
    priority: priorityLevel,
    department,
    assigned_to: assignedTo,
    scheduled_date: scheduledRequest,
  } = ticket;
  // Normalize created/updated timestamps from several possible payload keys
  const dateCreatedRaw = ticket.submit_date || ticket.dateCreated || ticket.createdAt || ticket.created_at || ticket.created || ticket.date_created || ticket.submitted_at || ticket.submitDate || null;
  const lastUpdatedRaw = ticket.update_date || ticket.lastUpdated || ticket.updatedAt || ticket.updated_at || ticket.time_closed || ticket.closedAt || ticket.last_update || null;
  // UI-friendly category: tickets stored as 'General Request' correspond to the form label 'Others'
  const uiCategory = (category === 'General Request') ? 'Others' : category;

  // Normalize attachments across different seed/property names
  const attachments = ticket.fileAttachments || ticket.attachments || ticket.files || fileUploaded;

  // Normalize IT Support dynamic fields (prefer explicit fields then dynamic_data keys in both camelCase and snake_case)
  const dyn = ticket.dynamic_data || {};
  const getDyn = (keys) => {
    for (const k of keys) {
      if (dyn && Object.prototype.hasOwnProperty.call(dyn, k) && (dyn[k] !== null && dyn[k] !== undefined && dyn[k] !== '')) return dyn[k];
    }
    return null;
  };

  const deviceType = ticket.device_type || ticket.deviceType || getDyn(['deviceType', 'device_type', 'customDeviceType', 'custom_device_type']) || null;
  const assetName = ticket.asset_name || ticket.assetName || getDyn(['assetName', 'asset_name']) || null;
  const serialNumber = ticket.serial_number || ticket.serialNumber || getDyn(['serialNumber', 'serial_number']) || null;
  const locationField = ticket.location || getDyn(['location']) || null;
  const issueTypeField = ticket.issue_type || ticket.issueType || getDyn(['issueType', 'issue_type']) || null;
  const softwareAffectedField = ticket.softwareAffected || getDyn(['softwareAffected', 'software_affected']) || null;
  const notesField = ticket.notes || getDyn(['notes', 'note']) || null;

  // Budget proposal fields (prefer values inside dynamic_data)
  const preparedByField = ticket.preparedBy || ticket.prepared_by || getDyn(['preparedBy', 'prepared_by', 'preparedByName', 'prepared_by_name']) || null;
  const performanceStartField = ticket.performanceStartDate || ticket.performance_start_date || ticket.performanceStart || getDyn(['performanceStartDate', 'performance_start_date', 'performanceStart']) || null;
  const performanceEndField = ticket.performanceEndDate || ticket.performance_end_date || ticket.performanceEnd || getDyn(['performanceEndDate', 'performance_end_date', 'performanceEnd']) || null;
  const totalBudgetField = (ticket.totalBudget ?? ticket.total_budget) ?? getDyn(['totalBudget', 'total_budget', 'requestedBudget', 'requested_budget', 'requested_budget_value']);
  // Support both old 'budgetItems' and new 'items' structure
  const budgetItemsField = ticket.budgetItems || ticket.budget_items || getDyn(['items', 'budgetItems', 'budget_items']) || [];

  // Normalize scheduled request: explicit scheduled_date, or dynamic_data scheduled keys or nested scheduleRequest
  // Broader fallback check for schedule fields stored in dynamic_data in various shapes
  let scheduledRaw = ticket.scheduled_date || getDyn(['scheduledDate', 'scheduled_date']) || null;

  if (!scheduledRaw) {
    // Try common dynamic_data shapes: scheduleRequest or schedule_request (objects or strings)
    const possible = getDyn(['schedule', 'schedule_request', 'scheduleRequest']);
    if (possible) {
      if (typeof possible === 'string') {
        scheduledRaw = possible;
      } else if (typeof possible === 'object') {
        scheduledRaw = possible.date || possible.datetime || possible.scheduledDate || possible.scheduled_date || null;
      }
    }

    // Also check explicit nested keys if present
    if (!scheduledRaw && dyn && dyn.scheduleRequest && typeof dyn.scheduleRequest === 'object') {
      scheduledRaw = dyn.scheduleRequest.date || dyn.scheduleRequest.datetime || null;
    }
    if (!scheduledRaw && dyn && dyn.schedule_request && typeof dyn.schedule_request === 'object') {
      scheduledRaw = dyn.schedule_request.date || dyn.schedule_request.datetime || null;
    }
  }

  const scheduledRequestDisplay = scheduledRaw ? formatDateOnly(scheduledRaw) : null;

  // Categories that come from the ticket submission form (keep only these)
  const formCategories = ['IT Support', 'Asset Check In', 'Asset Check Out', 'New Budget Proposal', 'Others', 'General Request'];

  // Convert status to employee view (New/Open -> Pending)
  const status = toEmployeeStatus(originalStatus);
  const statusSteps = getStatusSteps(status);
  const isClosable = status === 'Resolved';

  // Generate dynamic data based on ticket
  // (logs are computed later after merging status history)

  // Prepare Additional Details entries (filter out schedule-like entries for 'Others')
  const _dynamicEntries = ticket.dynamic_data && typeof ticket.dynamic_data === 'object' ? Object.entries(ticket.dynamic_data) : [];
  const additionalDetailsEntries = _dynamicEntries.filter(([key, val]) => {
    if (uiCategory === 'Others') {
      try {
        const k = (key || '').toString().toLowerCase();
        if (k.includes('schedule')) return false;
        if (val && typeof val === 'object') {
          const hasDate = Object.prototype.hasOwnProperty.call(val, 'date') || Object.prototype.hasOwnProperty.call(val, 'datetime') || Object.prototype.hasOwnProperty.call(val, 'scheduledDate') || Object.prototype.hasOwnProperty.call(val, 'scheduled_date');
          const hasTime = Object.prototype.hasOwnProperty.call(val, 'time');
          const hasNotes = Object.prototype.hasOwnProperty.call(val, 'notes') || Object.prototype.hasOwnProperty.call(val, 'note');
          if (hasDate || hasTime || hasNotes) return false;
        }
      } catch (e) {
        // include by default on error
      }
    }
    return true;
  });

  // Build messages from ticket.comments (persisted) and include a system "received" message.
  const buildMessagesFromTicket = (tkt) => {
    const msgs = [];

    // System message about receipt
    const sysTsRaw = tkt.submit_date || tkt.dateCreated || tkt.created_at || tkt.createdAt || null;
    msgs.push({
      id: 'system-received',
      sender: 'Support Team',
      message: `Your ticket regarding "${tkt.subject}" has been received and is being reviewed.`,
      timestamp: sysTsRaw ? formatDate(sysTsRaw) : '',
    });

    // Comments may be at ticket.comments or ticket.comment; normalize
    const comments = Array.isArray(tkt.comments) ? [...tkt.comments] : (Array.isArray(tkt.comment) ? [...tkt.comment] : []);

    // Also merge any locally persisted comments stored in localStorage via ticketStorage
    try {
      const lookupKey = tkt.ticketNumber || tkt.ticket_number || tkt.id || tkt.ticketId || null;
      if (lookupKey) {
        const local = getTicketByNumber(lookupKey);
        if (local && Array.isArray(local.comments)) {
          // Append any local comments that aren't already present (by id or identical text+created_at)
          for (const lc of local.comments) {
            const exists = comments.some(c => (c.id && lc.id && String(c.id) === String(lc.id)) || ((c.comment || c.message) === (lc.comment || lc.message) && (c.created_at || c.createdAt) === (lc.created_at || lc.createdAt)));
            if (!exists) comments.push(lc);
          }
        }
      }
    } catch (e) {
      // ignore local merge errors
    }

    // Filter out internal comments (employees shouldn't see internal notes)
    const visibleComments = comments.filter((c) => !c.is_internal && !c.isInternal);

    // Sort ascending by created time
    visibleComments.sort((a, b) => new Date(a.created_at || a.createdAt || a.timestamp || a.date || a.created) - new Date(b.created_at || b.createdAt || b.timestamp || b.date || b.created));

    visibleComments.forEach((c, idx) => {
      const createdAt = c.created_at || c.createdAt || c.timestamp || c.date || c.created || null;
      let sender = 'Support Team';
      // Determine if the comment was by the current user
      try {
        const commentUser = c.user || c.author || null;
        if (commentUser) {
          // If roles indicate staff, label Support Team
          const role = (commentUser.role || commentUser.user_role || '').toString().toLowerCase();
          if (role.includes('ticket') || role.includes('coordinator') || role.includes('admin') || role.includes('system')) {
            sender = 'Support Team';
          } else {
            // If user's id/email matches currentUser, label as You
            if ((currentUser && ((commentUser.id && currentUser.id && String(commentUser.id) === String(currentUser.id)) || (commentUser.email && currentUser.email && commentUser.email.toLowerCase() === currentUser.email.toLowerCase())))) {
              sender = 'You';
            } else {
              // Otherwise use display name if available
              const name = commentUser.first_name || commentUser.firstName || commentUser.name || commentUser.full_name || commentUser.fullName;
              sender = name ? name : 'Support Team';
            }
          }
        }
      } catch (e) {}

      const text = c.comment || c.message || c.body || '';
      // Use a time-only format for user-facing comments (HH:MM) so replies look like chat timestamps
      msgs.push({ id: c.id || `c-${idx}`, sender, message: text, timestamp: createdAt ? formatTime(createdAt) : '' });
    });

    return msgs;
  };

  const ticketMessages = buildMessagesFromTicket(ticket);

  // --- Local status history persistence (for additive log timeline) ---
  const storageKeyFor = (num) => `ticketStatusHistory:${num}`;
  const loadStatusHistory = (num) => {
    try {
      const raw = localStorage.getItem(storageKeyFor(num));
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  };
  const saveStatusHistory = (num, items) => {
    try { localStorage.setItem(storageKeyFor(num), JSON.stringify(items || [])); } catch (e) {}
  };
  const appendStatusHistory = (num, entry) => {
    const current = loadStatusHistory(num);
    const merged = [...current, entry].filter(Boolean);
    // de-duplicate by status + user + minute-precision timestamp to avoid true duplicates
    // but allow different statuses (Open vs Withdrawn) in the same minute
    const seen = new Set();
    const deduped = [];
    const keyFor = (it) => {
      const s = (it.status || '').toString().toLowerCase();
      const u = (it.user || '').toString().toLowerCase();
      const ts = it.timestamp || it.date || it.createdAt || it.created_at || '';
      let dkey = '';
      try {
        const d = new Date(ts);
        if (!isNaN(d)) dkey = d.toISOString().slice(0,16); // up to minutes
      } catch (e) {}
      return `${s}|${u}|${dkey}`;
    };
    for (const it of merged) {
      const k = keyFor(it);
      if (seen.has(k)) continue;
      seen.add(k);
      deduped.push(it);
    }
    // sort ascending by timestamp
    deduped.sort((a,b)=> new Date(a.timestamp||a.date||0) - new Date(b.timestamp||b.date||0));
    saveStatusHistory(num, deduped);
    return deduped;
  };

  const num = number || ticket.ticketNumber || ticket.ticket_number;
  const backendHistory = Array.isArray(ticket.statusHistory) ? ticket.statusHistory : [];
  const ticketLogsFromBackendLogs = Array.isArray(ticket.logs) ? ticket.logs.filter(l => l && (l.status || l.action || l.type)) : [];
  const localHistory = num ? loadStatusHistory(num) : [];

  // Merge backend statusHistory, any status-bearing entries from ticket.logs, then local history
  const mergedHistory = [...backendHistory, ...ticketLogsFromBackendLogs, ...localHistory];

  // Disable the localStorage-based initial status injection completely.
  // This was causing duplicate "Open" entries and unnecessary "Open" entries for new tickets.
  // The backend should provide complete statusHistory, or we'll rely on the "current status" fallback below.

  // de-duplicate merged history by status + minute-precision timestamp
  const histSeen = new Set();
  const mergedDeduped = [];
  const keyForHist = (it) => {
    const s = (it.status || it.action || '').toString().toLowerCase();
    const u = it.user || it.actor || 'system';
    const ts = it.timestamp || it.date || it.createdAt || it.created_at || '';
    let dkey = '';
    try {
      const d = new Date(ts);
      if (!isNaN(d)) dkey = d.toISOString().slice(0,16);
    } catch (e) {}
    return `${s}|${u}|${dkey}`;
  };
  for (const it of mergedHistory) {
    const k = keyForHist(it);
    if (histSeen.has(k)) continue;
    histSeen.add(k);
    mergedDeduped.push(it);
  }
  // Sort by timestamp, but for entries with the same status, prefer backend entries over local
  mergedDeduped.sort((a,b)=> {
    const aTime = new Date(a.timestamp||a.date||0).getTime();
    const bTime = new Date(b.timestamp||b.date||0).getTime();
    if (aTime !== bTime) return aTime - bTime;
    
    // If timestamps are very close (same minute), use source to break ties:
    // backend entries (System) should come before local entries (You/Portal)
    const aIsLocal = (a.user === 'You' || a.source === 'Portal');
    const bIsLocal = (b.user === 'You' || b.source === 'Portal');
    if (aIsLocal && !bIsLocal) return 1;  // a comes after b
    if (!aIsLocal && bIsLocal) return -1; // a comes before b
    return 0;
  });

  // Generate logs with merged status history so entries are additive
  const ticketLogs = generateLogs({ ...ticket, statusHistory: mergedDeduped });

  // Only append current status if it's actually changed from 'New' and not in history yet.
  // Skip for 'New' tickets to avoid unnecessary status entries when just created.
  try {
    const curStatus = originalStatus || ticket.status || '';
    const curStatusLower = curStatus.toLowerCase();
    const hasCur = mergedDeduped.some(it => ((it.status || it.action || '').toString().toLowerCase()) === curStatusLower);
    if (curStatus && !hasCur && !['new', 'submitted', 'pending'].includes(curStatusLower)) {
      // Only append a synthetic current-status entry if we have a reliable
      // timestamp from the backend (lastUpdatedRaw or dateCreatedRaw). Avoid
      // defaulting to the current time which results in logs showing "now"
      // for newly created tickets that haven't been backfilled by the API.
      const syntheticTs = lastUpdatedRaw || dateCreatedRaw || null;
      mergedDeduped.push({ status: curStatus, timestamp: syntheticTs, user: 'System', source: 'System' });
      // regenerate logs to include this appended status
      // Note: call generateLogs again to recompute ticketLogs with the appended status
      // (we shadow ticketLogs variable by reassigning)
      // eslint-disable-next-line no-unused-vars
      const _ticketLogs = generateLogs({ ...ticket, statusHistory: mergedDeduped });
      // replace ticketLogs variable by mutating referenced data in TicketActivity via props later
      // To avoid refactor, we'll reassign ticketLogs via a local variable name used by rendering below.
      ticketLogs.length = 0; // clear existing
      _ticketLogs.forEach(l => ticketLogs.push(l));
    }
  } catch (e) {
    // ignore
  }

  // Success handlers to add new log entries without reloading the page
  const handleWithdrawSuccess = (tNum, newStatus) => {
    try {
      const ts = new Date().toISOString();
      const keyNum = tNum || num;
      appendStatusHistory(keyNum, { status: newStatus, timestamp: ts, user: 'You', source: 'Portal' });
      // Update in-memory ticket so header/status badges refresh
      try {
        // mutate shallow copy in state if possible
        // eslint-disable-next-line no-unused-vars
        setShowWithdrawModal(false);
        setActiveTab('logs');
      } catch (_) {}
    } catch (e) {
      // ignore
    }
  };

  // Show loading indicator for ticket details
  if (isLoading) {
    return (
      <main className={styles.employeeTicketTrackerPage}>
        <ViewCard>
          <div style={{ padding: '48px 24px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Loading text="Loading ticket..." centered />
          </div>
        </ViewCard>
      </main>
    );
  }

  return (
    <>
      
      <main className={styles.employeeTicketTrackerPage}>
        <ViewCard>
        {/* Two Column Layout */}
        <div className={styles.contentGrid}>
          {/* Left Column - Ticket Information */}
          <div className={styles.leftColumn}>
            <section className={styles.ticketCard}>
              {/* Ticket Number with Priority and Status Badges */}
              <div className={styles.ticketHeader}>
                <div className={styles.headerLeft}>
                  <div className={`${styles.priorityBadge} ${styles[`priority${priorityLevel || 'NotSet'}`]}`}>
                    {priorityLevel || 'Not Set'}
                  </div>
                  <h2 className={styles.ticketSubject}>{subject || `Ticket No. ${number}`}</h2>
                </div>
                <div className={`${styles.statusBadge} ${styles[`status${status.replace(/\s+/g, '')}`]}`}>
                  {status}
                </div>
              </div>

              {/* Ticket meta: compact metadata shown under header */}
              <div className={styles.ticketMeta}>
                <div className={styles.ticketMetaItem}>
                  <span className={styles.ticketMetaLabel}>Date Created <span className={styles.ticketMetaValue}>{formatDate(dateCreatedRaw)}</span> </span> 
                </div>
                <div className={styles.ticketMetaItem}>
                  <span className={styles.ticketMetaLabel}>Date Updated <span className={styles.ticketMetaValue}>{formatDate(lastUpdatedRaw)}</span> </span>
                </div>
              </div>

              {/* Ticket Details - consolidated and always present */}
              <div className={styles.detailsGrid}>
                {formCategories.includes(uiCategory) && (
                  <div className={`${styles.detailItem}`}>
                    <div className={styles.detailLabel}>Category</div>
                    <div className={styles.detailValue}>{uiCategory || 'None'}</div>
                  </div>
                )}

                {formCategories.includes(uiCategory) && (
                  <div className={styles.detailItem}>
                    <div className={styles.detailLabel}>Sub-Category</div>
                    <div className={styles.detailValue}>
                      {uiCategory === 'Others' ? (
                        'None'
                      ) : (
                        subCategory || 'None'
                      )}
                    </div>
                  </div>
                )}

                <div className={styles.detailItem}>
                  <div className={styles.detailLabel}>Assigned Agent</div>
                  <div className={styles.detailValue}>{typeof assignedTo === 'object' ? assignedTo?.name || 'Unassigned' : assignedTo || 'Unassigned'}</div>
                </div>

                <div className={styles.detailItem}>
                  <div className={styles.detailLabel}>Department</div>
                  <div className={styles.detailValue}>{department || 'None'}</div>
                </div>

                <div className={styles.singleColumnGroup}>
                  <div className={styles.detailItem}>
                    <div className={styles.detailLabel}>Description</div>
                    <div className={styles.detailValue}>{description || 'No description provided.'}</div>
                  </div>

                  <div className={styles.detailItem}>
                    <div className={styles.detailLabel}>Schedule Request</div>
                    <div className={styles.detailValue}>{scheduledRequestDisplay || 'None'}</div>
                  </div>

                  <div className={`${styles.detailItem} ${styles.attachmentsRow}`}>
                    <div className={styles.detailLabel}>Attachments</div>
                    <div className={styles.detailValue}>
                        {attachments && attachments.length > 0
                          ? renderAttachments(attachments)
                          : 'None'}
                    </div>
                  </div>
                </div>

              {uiCategory !== 'Others' && (
                <div className={styles.categoryDivider}></div>
              )}

                {/* Category-specific dynamic details inserted inside detailsGrid as fullWidth */}
                <div className={styles.fullWidth}>
                  {/* IT Support */}
                  {category === 'IT Support' && (
                    <>
                      <div className={styles.categoryDetails}>IT Support Details</div>
                      <div className={styles.dynamicDetailsGrid}>
                        <div className={styles.detailItem}>
                          <div className={styles.detailLabel}>Device Type</div>
                          <div className={styles.detailValue}>{deviceType || 'None'}</div>
                        </div>
                        {issueTypeField ? (
                          <div className={styles.detailItem}>
                            <div className={styles.detailLabel}>Specify Issue</div>
                            <div className={styles.detailValue}>{issueTypeField}</div>
                          </div>
                        ) : null}
                        <div className={styles.detailItem}>
                          <div className={styles.detailLabel}>Software Affected</div>
                          <div className={styles.detailValue}>{softwareAffectedField || 'None'}</div>
                        </div>
                        {notesField ? (
                          <div className={styles.detailItem}>
                            <div className={styles.detailLabel}>Notes</div>
                            <div className={styles.detailValue}>{notesField}</div>
                          </div>
                        ) : null}
                      </div>
                    </>
                  )}
                  {/* Asset Check In/Out */}
                  {(category === 'Asset Check In' || category === 'Asset Check Out') && (
                    <>
                      <div className={styles.categoryDetails}>Asset Details</div>
                      <div className={styles.dynamicDetailsGrid}>
                        <div className={styles.detailItem}>
                          <div className={styles.detailLabel}>Asset Name</div>
                          <div className={styles.detailValue}>{ticket.asset_name || ticket.assetName || 'N/A'}</div>
                        </div>
                        <div className={styles.detailItem}>
                          <div className={styles.detailLabel}>Serial Number</div>
                          <div className={styles.detailValue}>{ticket.serial_number || ticket.serialNumber || 'N/A'}</div>
                        </div>
                        <div className={styles.detailItem}>
                          <div className={styles.detailLabel}>Location</div>
                          <div className={styles.detailValue}>{ticket.location || 'N/A'}</div>
                        </div>
                          {issueTypeField ? (
                            <div className={styles.detailItem}>
                              <div className={styles.detailLabel}>Specify Issue</div>
                              <div className={styles.detailValue}>{issueTypeField}</div>
                            </div>
                          ) : null}
                        {category === 'Asset Check Out' && (
                          <div className={styles.detailItem}>
                            <div className={styles.detailLabel}>Expected Return</div>
                            <div className={styles.detailValue}>{ticket.expectedReturnDate || ticket.expected_return_date || ticket.expectedReturn || 'N/A'}</div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                  {/* New Budget Proposal */}
                  {category === 'New Budget Proposal' && (
                    <>
                      <div className={styles.categoryDetails}>Budget Proposal Details</div>
                      <div className={styles.dynamicDetailsGrid}>
                        <div className={styles.detailItem}>
                          <div className={styles.detailLabel}>Prepared By</div>
                          <div className={styles.detailValue}>{preparedByField || 'N/A'}</div>
                        </div>
                        <div className={styles.detailItem}>
                          <div className={styles.detailLabel}>Performance Start</div>
                          <div className={styles.detailValue}>{performanceStartField || 'N/A'}</div>
                        </div>
                        <div className={styles.detailItem}>
                          <div className={styles.detailLabel}>Performance End</div>
                          <div className={styles.detailValue}>{performanceEndField || 'N/A'}</div>
                        </div>
                        <div className={styles.detailItem}>
                          <div className={styles.detailLabel}>Total Budget</div>
                          <div className={styles.detailValue}>{formatMoney(totalBudgetField)}</div>
                        </div>
                        <div className={styles.detailItem}>
                          <div className={styles.detailLabel}>Budget Items</div>
                          <div className={styles.detailValue}>
                            {(budgetItemsField || []).length > 0 ? (
                              (budgetItemsField || []).map((item, idx) => (
                                <div key={idx}>
                                  {`${item.costElement || item.cost_element || item.name || 'Item'} — ${item.estimatedCost || item.estimated_cost || item.estimated_cost_range || ''}`}
                                </div>
                              ))
                            ) : (
                              'No budget items provided'
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                  {/* Fallback: dynamic_data */}
                  {!(category === 'IT Support' || category === 'Asset Check In' || category === 'Asset Check Out' || category === 'New Budget Proposal') && uiCategory !== 'Others' && additionalDetailsEntries && additionalDetailsEntries.length > 0 && (
                    <div className={styles.dynamicDetailsGrid}>
                      <div className={styles.detailItem}>
                        <div className={styles.detailLabel}>Additional Details</div>
                        <div className={styles.detailValue}></div>
                      </div>
                      {additionalDetailsEntries.map(([key, val]) => (
                        <div className={styles.detailItem} key={key}>
                          <div className={styles.detailLabel}>{String(key).replace(/_/g, ' ')}</div>
                          <div className={styles.detailValue}>{renderDynamicValue(val)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

            </section>
          </div>

          {/* Right Column - Actions and Details */}
          <div className={styles.rightColumn}>
            <div className={styles.innerSticky}>
              {/* Action Button */}
              {!['Closed', 'Rejected', 'Withdrawn'].includes(status) && (
                <Button
                  variant="primary"
                  onClick={() =>
                    isClosable ? setShowCloseModal(true) : setShowWithdrawModal(true)
                  }
                  className={`${styles.ticketActionButton} ${isClosable ? styles.closeButton : styles.withdrawButton}`}
                >
                  {isClosable ? 'Close Ticket' : 'Withdraw Ticket'}
                </Button>
              )}

              <Tabs
                tabs={[
                  { label: 'Messages', value: 'messages' },
                  { label: 'Logs', value: 'logs' },
                ]}
                active={activeTab}
                onChange={setActiveTab}
                className={`${styles['messages-logs-wrapper']} ${activeTab === 'logs' ? styles.noBorder : ''}`}
              >
                {activeTab === 'logs' ? (
                  <TicketActivity ticketLogs={ticketLogs} />
                ) : (
                  <TicketMessaging
                    initialMessages={ticketMessages}
                    ticketId={ticket.id || ticket.ticketId || ticket.ticket_id}
                    ticketNumber={ticket.ticket_number || ticket.ticketNumber || number}
                  />
                )}
              </Tabs>
            </div>
          </div>
        </div>
  
        </ViewCard>
      </main>

      {/* Modals */}
      {showWithdrawModal && ticket && (ticket.id || ticket.ticket_number || ticket.ticketNumber) && (
        <ErrorBoundary>
          <EmployeeActiveTicketsWithdrawTicketModal
            ticket={ticket}
            onClose={() => setShowWithdrawModal(false)}
            onSuccess={handleWithdrawSuccess}
          />
        </ErrorBoundary>
      )}
      {showCloseModal && (
        <EmployeeActiveTicketsCloseTicketModal
          ticket={ticket}
          onClose={() => setShowCloseModal(false)}
        />
      )}
      {/* DocumentViewer removed; attachments open in a new tab instead */}
    </>
  );
}
