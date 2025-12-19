import { useParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import styles from '../../../employee/pages/ticket-tracker/EmployeeTicketTracker.module.css';
import { backendTicketService } from '../../../services/backend/ticketService';
import authService from '../../../utilities/service/authService';
import { useAuth } from '../../../context/AuthContext';
import Skeleton from '../../../shared/components/Skeleton/Skeleton';
import CoordinatorAdminOpenTicketModal from '../../components/modals/CoordinatorOpenTicketModal';
import CoordinatorAdminRejectTicketModal from '../../components/modals/CoordinatorRejectTicketModal';
import ViewCard from '../../../shared/components/ViewCard';
import Breadcrumb from '../../../shared/components/Breadcrumb';
import Tabs from '../../../shared/components/Tabs';
import Button from '../../../shared/components/Button';
import CoordinatorAdminTicketDetails from './CoordinatorAdminTicketDetails';
import CoordinatorAdminTicketLogs from './CoordinatorAdminTicketLogs';
import detailStyles from './CoordinatorAdminTicketDetails.module.css';
import { FaFileImage, FaFilePdf, FaFileWord, FaFileExcel, FaFileCsv, FaFile, FaDownload } from 'react-icons/fa';
import { convertToSecureUrl, extractFilePathFromUrl, getAccessToken } from '../../../utilities/secureMedia';


// Status progression for coordinator/admin
const STATUS_COMPLETION = {
  1: ['New', 'Open', 'In Progress', 'Closed', 'Rejected', 'Withdrawn'],
  2: ['Open', 'In Progress', 'Closed', 'Rejected', 'Withdrawn'],
  3: ['In Progress', 'Closed', 'Rejected', 'Withdrawn'],
  4: ['Closed', 'Rejected', 'Withdrawn'],
};
const getStatusSteps = (status) =>
  [1, 2, 3, 4].map((id) => ({
    id,
    completed: STATUS_COMPLETION[id]?.includes(status) || false,
  }));

// Simple date formatter used throughout the ticket tracker.
const formatDate = (date) => {
  if (!date) return 'None';
  try {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return String(date);
    return d.toLocaleString();
  } catch (e) {
    return String(date);
  }
};

const formatDateOnly = (date) => {
  if (!date) return null;
  try {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return String(date);
    return d.toLocaleDateString();
  } catch (e) {
    return String(date);
  }
};

const formatMoney = (amount) => {
  if (amount === null || amount === undefined || amount === '') return 'N/A';
  const n = Number(amount);
  if (Number.isNaN(n)) return String(amount);
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(n);
  } catch (e) {
    return n.toFixed(2);
  }
};

// Build a simple activity log list from multiple possible payload shapes.
const generateLogs = (ticket) => {
  const logs = [];
  if (!ticket) return logs;

  // Status history (common shapes)
  const statusHistory = ticket.status_history || ticket.statusChanges || ticket.status_changes || ticket.history || [];
  if (Array.isArray(statusHistory) && statusHistory.length > 0) {
    statusHistory.forEach((s) => {
      const at = s.at || s.timestamp || s.date || s.createdAt || s.created_at || null;
      logs.push({
          id: logs.length + 1,
          user: s.by || s.user || s.performedBy || s.performed_by || 'System',
          action: 'Status Change',
          timestamp: at ? formatDate(at) : null,
          text: at ? `Status changed to ${s.status || s.to || s.newStatus || 'Unknown'} on ${formatDate(at)}.` : `Status changed to ${s.status || s.to || s.newStatus || 'Unknown'}.`,
        });
    });
  }

  // Activity entries / logs / comments
  const activity = ticket.activity || ticket.logs || ticket.comments || [];
  if (Array.isArray(activity) && activity.length > 0) {
    activity.forEach((a) => {
      const whoRaw = a.user || a.performedBy || a.performed_by || a.requester || a.by || 'User';
      let who = 'User';
      if (typeof whoRaw === 'string') who = whoRaw;
      else if (whoRaw && typeof whoRaw === 'object') {
        const first = whoRaw.first_name || whoRaw.firstName || whoRaw.first || '';
        const last = whoRaw.last_name || whoRaw.lastName || whoRaw.last || '';
        const full = `${first} ${last}`.trim();
        if (full) who = full;
        else if (whoRaw.name) who = whoRaw.name;
        else if (whoRaw.role) who = whoRaw.role;
        else if (whoRaw.id) who = `User ${whoRaw.id}`;
      }

      const whenRaw = a.timestamp || a.date || a.createdAt || a.created_at || null;
      const when = whenRaw ? formatDate(whenRaw) : null;
      const details = a.details || a.note || a.action || a.comment || '';
      let text = '';
      if (a.type && typeof a.type === 'string' && a.type.toLowerCase().includes('comment')) {
        text = `${who} commented${when ? ` on ${when}` : ''}: "${details || 'No details provided.'}"`;
      } else if (details) {
        text = `${who} performed an action${when ? ` on ${when}` : ''}: ${details}.`;
      } else {
        text = `${who} performed an activity${when ? ` on ${when}` : ''}.`;
      }
      logs.push({ id: logs.length + 1, user: who, action: a.action || a.type || 'Activity', timestamp: when, text });
    });
  }

  // Fallback: add a created entry if we have a creation timestamp and no logs
  if (logs.length === 0) {
    const created = ticket.createdAt || ticket.dateCreated || ticket.created_at || ticket.submit_date || null;
    if (created) {
      logs.push({
        id: 1,
        user: ticket.employeeName || ticket.employee || 'System',
        action: 'Created',
        timestamp: created ? formatDate(created) : null,
        text: created ? `Ticket created on ${formatDate(created)}.` : `Ticket created.`,
      });
    }
  }

  return logs;
};
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
        // Support multiple shapes: backend returns { file: url, file_name },
        // older local mocks may use { name, url }, or sometimes just a URL string.
        const name = f?.file_name || f?.name || f?.filename || (typeof f === 'string' ? f.split('/').pop() : f);
        const url = f?.file || f?.url || f?.downloadUrl || f?.download_url || (typeof f === 'string' ? f : '#');
        // compute secure/backend URL to avoid opening local dev server paths
        let secureOrBackend = convertToSecureUrl(url) || null;
        if (!secureOrBackend) {
          // try to extract a file path
          let filePath = extractFilePathFromUrl(url);
          if (!filePath && typeof url === 'string' && url.startsWith('http')) {
            try {
              const parsed = new URL(url);
              filePath = parsed.pathname || null;
            } catch (e) {
              filePath = null;
            }
          }
          if (filePath) {
            const clean = filePath.startsWith('/') ? filePath.slice(1) : filePath;
            const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || 'https://smartsupport-hdts-backend.up.railway.app/media/';
            secureOrBackend = `${MEDIA_URL}${clean}`;
            const token = getAccessToken();
            if (token) secureOrBackend = `${secureOrBackend}?token=${encodeURIComponent(token)}`;
          }
        }
        // final fallback to original url
        if (!secureOrBackend) secureOrBackend = url;
        return (
          <div key={idx} className={styles.attachmentItem}>
            <div className={styles.attachmentIcon}>{getFileIcon(f)}</div>
            <div style={{ flex: 1 }}>
              <a href={secureOrBackend} target="_blank" rel="noreferrer" className={styles.attachmentName}>{name}</a>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <a href={secureOrBackend} target="_blank" rel="noreferrer" className={styles.attachmentDownload}>
                <FaDownload />
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Helper to render dynamic values safely (objects/arrays -> JSON string inside <pre>)
const renderDynamicValue = (val) => {
  if (val === null || val === undefined || val === '') return 'None';
  if (typeof val === 'object') {
    try {
      return <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{JSON.stringify(val, null, 2)}</pre>;
    } catch (e) {
      return String(val);
    }
  }
  return String(val);
};

// If a ticket is New/Submitted/Pending and older than 24 hours, treat as 'Pending' for coordinators/admins
const computeEffectiveStatus = (ticket) => {
  const rawStatus = (ticket.status || '').toString();
  const lower = rawStatus.toLowerCase();
  const baseIsNew = lower === 'new' || lower === 'submitted' || lower === 'pending';
  try {
    const created = new Date(ticket.createdAt || ticket.dateCreated || ticket.created_at || ticket.submit_date || ticket.submitDate);
    if (baseIsNew && created instanceof Date && !isNaN(created)) {
      const hours = (new Date() - created) / (1000 * 60 * 60);
      if (hours >= 24) return 'Pending';
      return 'New';
    }
  } catch (e) {
    // ignore parse errors
  }
  return rawStatus || '';
};


export default function CoordinatorAdminTicketTracker() {
  const { ticketNumber } = useParams();
  const [ticket, setTicket] = useState(null);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  // Loading by default while we fetch from backend
  const [isLoading, setIsLoading] = useState(true);
  const leftColRef = useRef(null);
  const rightColRef = useRef(null);

  // Move auth hook to top-level so hooks order is stable across renders
  const { user: authUser, isTicketCoordinator, isAdmin } = useAuth();

  // Helper: normalize backend ticket shapes into the UI shape used by this component
  const normalizeTicket = (t) => {
    if (!t) return null;
    const normalized = {
      id: t.id || t.ticket_number || t.ticketNumber || null,
      ticketNumber: t.ticket_number || t.ticketNumber || t.ticket_id || String(t.id || ''),
      subject: t.subject || t.title || '',
      category: t.category || t.category_name || '',
      subCategory: t.sub_category || t.subCategory || t.subcategory || null,
      // preserve dynamic_data and common asset/issue fields so admin view can render them
      dynamic_data: t.dynamic_data || t.dynamicData || {},
      asset_name: t.asset_name || t.assetName || t.dynamic_data?.assetName || t.dynamicData?.assetName || null,
      serial_number: t.serial_number || t.serialNumber || t.dynamic_data?.serialNumber || t.dynamicData?.serialNumber || null,
      location: t.location || t.dynamic_data?.location || t.dynamicData?.location || null,
      issue_type: t.issue_type || t.issueType || t.dynamic_data?.issueType || t.dynamicData?.issueType || null,
      // Expected return fields for Asset Check Out (align with employee view keys)
      expectedReturnDate: t.expectedReturnDate || t.expected_return_date || t.expectedReturn || t.dynamic_data?.expectedReturnDate || t.dynamic_data?.expected_return_date || null,
      expected_return_date: t.expectedReturnDate || t.expected_return_date || t.expectedReturn || t.dynamic_data?.expectedReturnDate || t.dynamic_data?.expected_return_date || null,
      expectedReturn: t.expectedReturn || t.expectedReturnDate || t.expected_return_date || (t.dynamic_data && (t.dynamic_data.expectedReturn || t.dynamic_data.expected_return_date)) || null,
      status: t.status || '',
      // Normalize priority across different backend shapes so admin UI can read it
      priorityLevel: t.priority || t.priorityLevel || t.priority_level || (t.coordinatorReview && (t.coordinatorReview.priority || t.coordinatorReview.priorityLevel)) || null,
      // Completion and CSAT fields (support multiple backend naming conventions)
      date_completed: t.date_completed || t.dateCompleted || t.dateResolved || t.dateClosed || t.time_closed || t.timeClosed || null,
      dateCompleted: t.date_completed || t.dateCompleted || t.dateResolved || t.dateClosed || t.time_closed || t.timeClosed || null,
      csat_rating: (typeof t.csat_rating !== 'undefined' ? t.csat_rating : (typeof t.csatRating !== 'undefined' ? t.csatRating : null)),
      csatRating: (typeof t.csat_rating !== 'undefined' ? t.csat_rating : (typeof t.csatRating !== 'undefined' ? t.csatRating : null)),
          // feedback intentionally omitted from normalized ticket for admin tracker UI
          feedback: null,
      createdAt: t.submit_date || t.submitDate || t.created_at || t.createdAt || t.submit_date || null,
      dateCreated: t.submit_date || t.createdAt || t.dateCreated || null,
      lastUpdated: t.update_date || t.updatedAt || t.update_date || null,
      assignedTo: (t.assigned_to && (t.assigned_to.id || t.assigned_to)) || t.assignedTo || t.assigned_to || null,
      assignedToName: (t.assigned_to && (t.assigned_to_name || t.assigned_to_name)) || t.assignedToName || (t.assigned_to && t.assigned_to_name) || t.assignedTo || null,
      department: t.department || t.assignedDepartment || null,
      activity: t.activity || t.logs || t.comments || [],
      attachments: t.attachments || t.ticket_attachments || t.attachments_list || [],
      description: t.description || t.details || '',
      employee: t.employee || t.requester || t.requested_by || t.created_by || null,
      employeeId: (t.employee && (typeof t.employee === 'object' ? (t.employee.id || t.employee.pk || t.employee.employee_id) : t.employee))
        || t.employee_id || t.requester_id || t.requested_by_id || t.created_by?.id || t.employeeId || null,
      employeeName: t.employee_name || (t.employee && ((t.employee.first_name || t.employee.firstName ? `${t.employee.first_name || t.employee.firstName}` : '') + (t.employee.last_name || t.employee.lastName ? ` ${t.employee.last_name || t.employee.lastName}` : '')).trim())
        || (t.requester && ((t.requester.first_name || t.requester.firstName ? `${t.requester.first_name || t.requester.firstName}` : '') + (t.requester.last_name || t.requester.lastName ? ` ${t.requester.last_name || t.requester.lastName}` : '')).trim())
        || t.employeeName || null,
      employeeDepartment: t.employee_department || (t.employee && (t.employee.department || t.employee.dept)) || t.requester?.department || t.department || null,
      employeeProfileImage: t.employee_image || (t.employee && (t.employee.image || t.employee.profile_image || t.employee.photo)) || t.requester?.image || t.requester?.profile_image || t.employeeProfileImage || null,
      employeeCompanyId: (t.employee && (t.employee.company_id || t.employee.companyId)) || t.company_id || t.requester?.company_id || t.employee_company_id || t.companyId || null,
      raw: t,
    };
    // Debug logging removed for production
    return normalized;
  };

  // Background load: try to refresh from backend but don't block the immediate render
  useEffect(() => {
    let mounted = true;
    const loadTicket = async () => {
      if (!ticketNumber) return;
      try {
        const fetched = await backendTicketService.getTicketByNumber(ticketNumber);
        if (!fetched) return;
        // debug logs removed
        if (mounted) setTicket(normalizeTicket(fetched));
      } catch (err) {
        // backend may be slow or unavailable; don't overwrite the local ticket
        console.warn('Backend ticket fetch failed (background)', err);
      }
    };

    // Kick off background fetch when viewing a specific ticketNumber
    loadTicket();

    return () => { mounted = false; };
  }, [ticketNumber]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [ticketNumber, ticket]);

  // Sync heights between left and right columns so both match the taller one.
  // This effect must be declared unconditionally (above any early returns)
  useEffect(() => {
    let rAF = null;
    let resizeTimer = null;
    let imgs = [];
    let imgLoadHandlers = [];
    let observer = null;

    const sync = () => {
      if (rAF) cancelAnimationFrame(rAF);
      rAF = requestAnimationFrame(() => {
        const left = leftColRef.current;
        const right = rightColRef.current;
        if (!left || !right) return;
        left.style.minHeight = '';
        right.style.minHeight = '';
        const leftH = left.getBoundingClientRect().height;
        const rightH = right.getBoundingClientRect().height;
        const maxH = Math.max(leftH, rightH);
        left.style.minHeight = `${maxH}px`;
        right.style.minHeight = `${maxH}px`;
      });
    };

    // Initial sync and on ticket/tab changes
    sync();
    const lateTimer = setTimeout(sync, 220);

    // watch images inside columns so when they load we re-sync
    const watchImages = () => {
      imgs = [];
      imgLoadHandlers = [];
      const left = leftColRef.current;
      const right = rightColRef.current;
      if (!left || !right) return;
      const nodeImgs = [...left.querySelectorAll('img'), ...right.querySelectorAll('img')];
      nodeImgs.forEach((img) => {
        if (img.complete) return;
        const h = () => sync();
        img.addEventListener('load', h);
        img.addEventListener('error', h);
        imgs.push(img);
        imgLoadHandlers.push({ img, h });
      });
    };

    watchImages();

    // MutationObserver to detect dynamic content changes (attachments, tabs, etc.)
    try {
      const target = leftColRef.current?.parentElement || document.body;
      observer = new MutationObserver(() => {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(sync, 120);
      });
      if (observer && (leftColRef.current || rightColRef.current)) {
        observer.observe(leftColRef.current, { childList: true, subtree: true });
        observer.observe(rightColRef.current, { childList: true, subtree: true });
      }
    } catch (err) {
      // ignore if MutationObserver not available
    }

    const onResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(sync, 120);
    };

    window.addEventListener('resize', onResize);

    return () => {
      if (rAF) cancelAnimationFrame(rAF);
      if (resizeTimer) clearTimeout(resizeTimer);
      clearTimeout(lateTimer);
      // remove image listeners
      imgLoadHandlers.forEach(({ img, h }) => {
        try { img.removeEventListener('load', h); img.removeEventListener('error', h); } catch(e) {}
      });
      if (observer) {
        try { observer.disconnect(); } catch (e) {}
      }
      window.removeEventListener('resize', onResize);
      // cleanup styles
      if (leftColRef.current) leftColRef.current.style.minHeight = '';
      if (rightColRef.current) rightColRef.current.style.minHeight = '';
    };
  }, [ticketNumber, ticket, activeTab]);

  // If we don't yet have a ticket, always show the loading skeleton.
  // The app should wait for the backend to return the real ticket for the
  // ticket number in the URL. We intentionally do not render a "No Ticket"
  // message here to avoid flashing empty states while the backend resolves.
  if (!ticket) {
    return (
      <ViewCard>
        <div className={styles.contentGrid}>
          <div className={styles.leftColumn}>
            <Skeleton width="100px" height="32px" />
            <Skeleton width="100%" height="200px" style={{ marginTop: '16px' }} />
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ marginTop: '16px' }}>
                <Skeleton width="150px" height="20px" />
                <Skeleton width="100%" height="24px" style={{ marginTop: '8px' }} />
              </div>
            ))}
          </div>
          <div className={styles.rightColumn}>
            <Skeleton width="100%" height="300px" />
          </div>
        </div>
      </ViewCard>
    );
  }
  


  // At this point `ticket` is guaranteed to be non-null, so render details below.
  const {
    ticketNumber: ticketNumberFromTicket,
    subject,
    category,
    subCategory,
    status: originalStatus,
    dateCreated,
    lastUpdated,
    description,
    fileUploaded,
    priorityLevel,
    department,
    assignedTo,
    scheduledRequest,
  } = ticket;
  // Compute effective status: treat New older than 24 hours as Pending for coordinator/admin view
  const effectiveStatus = computeEffectiveStatus(ticket) || originalStatus;
  const effectiveStatusSteps = getStatusSteps(effectiveStatus);
  const effectiveAttachments = ticket.fileAttachments || ticket.attachments || ticket.files || fileUploaded;
  const effectiveFormCategories = ['IT Support', 'Asset Check In', 'Asset Check Out', 'New Budget Proposal', 'Others', 'General Request'];
  const effectiveTicketLogs = generateLogs(ticket);
  const effectiveUserRole = authService.getUserRole();
  const canSeeEffectiveCoordinatorReview = effectiveUserRole === 'Ticket Coordinator' || effectiveUserRole === 'System Admin';
  const canPerformEffectiveActions = effectiveUserRole === 'Ticket Coordinator';


  

  // Normalize created/updated timestamps from various payload shapes
  const dateCreatedRaw = ticket.dateCreated || ticket.dateCreated || ticket.submit_date || ticket.createdAt || ticket.created_at || ticket.created || ticket.date_created || ticket.submitted_at || ticket.submitDate || null;
  const lastUpdatedRaw = ticket.lastUpdated || ticket.update_date || ticket.updatedAt || ticket.updated_at || ticket.last_update || ticket.time_closed || ticket.closedAt || null;

  // Normalize ticket number from various backend/local shapes
  const number = ticket.ticketNumber || ticket.ticket_number || ticket.ticket_no || ticket.number || ticket.id || 'Unknown';

  // Dynamic data helper
  const dyn = ticket.dynamic_data || {};

  // Prepare additionalDetailsEntries similar to Employee view: when category is 'Others'
  // we want to hide schedule-like keys (schedule, scheduleRequest, scheduled_date, etc.)
  const _dynamicEntries = dyn && typeof dyn === 'object' ? Object.entries(dyn) : [];
  const additionalDetailsEntries = _dynamicEntries.filter(([key, val]) => {
    try {
      const k = (key || '').toString().toLowerCase();
      // Hide schedule-like keys for 'Others' category
      if (uiCategory === 'Others' && k.includes('schedule')) return false;
      // If value is an object that appears to be a schedule (has date/datetime/time/notes), exclude it
      if (val && typeof val === 'object') {
        const hasDate = Object.prototype.hasOwnProperty.call(val, 'date') || Object.prototype.hasOwnProperty.call(val, 'datetime') || Object.prototype.hasOwnProperty.call(val, 'scheduledDate') || Object.prototype.hasOwnProperty.call(val, 'scheduled_date');
        const hasTime = Object.prototype.hasOwnProperty.call(val, 'time');
        const hasNotes = Object.prototype.hasOwnProperty.call(val, 'notes') || Object.prototype.hasOwnProperty.call(val, 'note');
        if (hasDate || hasTime || hasNotes) {
          if (uiCategory === 'Others') return false;
        }
      }
    } catch (e) {
      // on error, keep the entry
    }
    return true;
  });

  // Normalize scheduled request: support scheduled_date, scheduledDate, nested scheduleRequest objects,
  // or dynamic_data keys used by older payloads.
  let scheduledRaw = ticket.scheduledRequest || ticket.scheduled_request || ticket.scheduled_date || ticket.scheduledDate || null;
  if (!scheduledRaw) {
    const possible = dyn.schedule || dyn.schedule_request || dyn.scheduleRequest || dyn.scheduled || dyn.scheduled_request || dyn.scheduledRequest || null;
    if (possible) {
      if (typeof possible === 'string') scheduledRaw = possible;
      else if (typeof possible === 'object') scheduledRaw = possible.date || possible.datetime || possible.scheduledDate || possible.scheduled_date || null;
    }
    if (!scheduledRaw && dyn && dyn.scheduleRequest && typeof dyn.scheduleRequest === 'object') {
      scheduledRaw = dyn.scheduleRequest.date || dyn.scheduleRequest.datetime || null;
    }
    if (!scheduledRaw && dyn && dyn.schedule_request && typeof dyn.schedule_request === 'object') {
      scheduledRaw = dyn.schedule_request.date || dyn.schedule_request.datetime || null;
    }

    // (scheduledRaw computed above)

  }

  // Budget proposal normalization
  const preparedByField = ticket.preparedBy || ticket.prepared_by || ticket.preparedByName || dyn.preparedBy || dyn.prepared_by || null;
  const totalBudgetField = (ticket.totalBudget ?? ticket.total_budget) ?? (dyn.totalBudget ?? dyn.total_budget ?? null);
  // UI-friendly category: backend/storage may use 'General Request' while the form shows 'Others'
  const uiCategory = (category === 'General Request') ? 'Others' : category;
  // Compute effective status: treat New older than 24 hours as Pending for coordinator/admin view
  const status = computeEffectiveStatus(ticket) || originalStatus;
  // Safely build a CSS class key from the status string (guard against undefined)
  const safeStatusClass = `status${String(status || '').replace(/\s+/g, '')}`;
  const statusSteps = getStatusSteps(status);
  const attachments = ticket.fileAttachments || ticket.attachments || ticket.files || fileUploaded;
  const formCategories = ['IT Support', 'Asset Check In', 'Asset Check Out', 'New Budget Proposal', 'Others', 'General Request'];
  const ticketLogs = generateLogs(ticket);
  
  // Use external auth service to determine role
  // (hook already called earlier near the top to keep hook order stable)
  const userRole = authService.getUserRole(); // fallback for old authService if needed
  
  // Only Ticket Coordinator can see coordinator review and perform actions (Open/Reject)
  // Admin (System Admin) should NOT see these buttons
  const canSeeCoordinatorReview = isTicketCoordinator || userRole === 'Ticket Coordinator';
  const canPerformActions = isTicketCoordinator; // ONLY Ticket Coordinator, not Admin

  // Handler used by modal children to indicate success (open/re
  // Accepts an optional updatedTicket object. If not provided we attempt to re-fetch
  // the ticket by number so the UI reflects the latest backend state.
  const handleModalSuccess = async (updatedTicket) => {
    try {
      setShowOpenModal(false);
      setShowRejectModal(false);
      if (updatedTicket) {
        // Ensure we normalize any backend-shaped or partial ticket before setting state
        setTicket(normalizeTicket(updatedTicket));
        return;
      }
      if (ticketNumber) {
        try {
          const fresh = await backendTicketService.getTicketByNumber(ticketNumber);
          if (fresh) setTicket(normalizeTicket(fresh));
        } catch (err) {
          console.error('Failed to refresh ticket after modal success', err);
        }
      }
    } catch (e) {
      console.error('handleModalSuccess error', e);
    }
  };
 

  // Normalize scheduled request for rendering: it may be a string, date, or an object {date, time, notes}
  const computeScheduledDisplay = (raw) => {
    if (!raw) return null;
    // If it's an object with date/datetime fields, prefer those
    if (typeof raw === 'object') {
      if (raw.date) return formatDateOnly(raw.date) || raw.date;
      if (raw.datetime) return formatDateOnly(raw.datetime) || raw.datetime;
      if (raw.scheduledDate) return formatDateOnly(raw.scheduledDate) || raw.scheduledDate;
      if (raw.scheduled_date) return formatDateOnly(raw.scheduled_date) || raw.scheduled_date;
      // If object has time + date, combine
      if (raw.date && raw.time) return `${formatDateOnly(raw.date)} ${raw.time}`;
      // Fallback to stringifying notes if no date
      try { return JSON.stringify(raw); } catch (e) { return String(raw); }
    }
    // If it's a string or number, try to format as date-only
    return formatDateOnly(raw) || raw;
  };
  const scheduledRequestDisplay = computeScheduledDisplay(scheduledRaw);
  
  return (
    <>
      <main className={styles.employeeTicketTrackerPage}>
        <Breadcrumb
          root="Ticket Management"
          currentPage="Ticket Tracker"
          rootNavigatePage="/admin/ticket-management/all"
          title={`Ticket No. ${number}`}
        />
        <ViewCard>
          <div className={styles.contentGrid}>
            {/* Left Column - Ticket Information */}
            <div ref={leftColRef} className={styles.leftColumn}>
              <section className={styles.ticketCard}>
                {/* Ticket Number with Priority and Status Badges */}
                <div className={styles.ticketHeader}>
                  <div className={styles.headerLeft}>
                    <div className={`${styles.priorityBadge} ${styles[`priority${priorityLevel || 'NotSet'}`]}`}>
                      {priorityLevel || 'Not Set'}
                    </div>
                    <h2 className={styles.ticketSubject}>{subject || `Ticket No. ${number}`}</h2>
                  </div>
                    <div className={`${styles.statusBadge} ${styles[safeStatusClass]}`}>
                    {status || 'Unknown'}
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
                  {/* CSAT Rating moved to Resolution Details in Details tab */}
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
                  {/* CSAT Rating moved to Resolution Details in Details tab */}
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
                            <div className={styles.detailValue}>{ticket.dynamic_data?.device_type || ticket.deviceType || 'None'}</div>
                          </div>
                            {(ticket.issue_type || ticket.issueType || ticket.dynamic_data?.issueType || ticket.dynamic_data?.issue_type) ? (
                              <div className={styles.detailItem}>
                                <div className={styles.detailLabel}>Specify Issue</div>
                                <div className={styles.detailValue}>{ticket.issue_type || ticket.issueType || ticket.dynamic_data?.issueType || ticket.dynamic_data?.issue_type}</div>
                              </div>
                            ) : null}
                            <div className={styles.detailItem}>
                              <div className={styles.detailLabel}>Software Affected</div>
                              <div className={styles.detailValue}>{ticket.dynamic_data?.softwareAffected || ticket.softwareAffected || 'None'}</div>
                            </div>
                            {(ticket.dynamic_data?.notes || ticket.notes || ticket.note) ? (
                              <div className={styles.detailItem}>
                                <div className={styles.detailLabel}>Notes</div>
                                <div className={styles.detailValue}>{ticket.dynamic_data?.notes || ticket.notes || ticket.note}</div>
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
                          {(ticket.issue_type || ticket.issueType || ticket.dynamic_data?.issueType || ticket.dynamic_data?.issue_type) ? (
                            <div className={styles.detailItem}>
                              <div className={styles.detailLabel}>Specify Issue</div>
                              <div className={styles.detailValue}>{ticket.issue_type || ticket.issueType || ticket.dynamic_data?.issueType || ticket.dynamic_data?.issue_type}</div>
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
                            <div className={styles.detailLabel}>Performance Start</div>
                            <div className={styles.detailValue}>{ticket.performanceStartDate || ticket.performance_start_date || ticket.performanceStart || 'N/A'}</div>
                          </div>
                          <div className={styles.detailItem}>
                            <div className={styles.detailLabel}>Performance End</div>
                            <div className={styles.detailValue}>{ticket.performanceEndDate || ticket.performance_end_date || ticket.performanceEnd || 'N/A'}</div>
                          </div>
                          <div className={styles.detailItem}>
                            <div className={styles.detailLabel}>Prepared By</div>
                            <div className={styles.detailValue}>{preparedByField || 'N/A'}</div>
                          </div>
                          <div className={styles.detailItem}>
                            <div className={styles.detailLabel}>Total Budget</div>
                            <div className={styles.detailValue}>{formatMoney(totalBudgetField)}</div>
                          </div>
                          <div className={styles.detailItem}>
                            <div className={styles.detailLabel}>Budget Items</div>
                            <div className={styles.detailValue}>
                              {(ticket.budgetItems || ticket.budget_items || []).length > 0 ? (
                                (ticket.budgetItems || ticket.budget_items || []).map((item, idx) => (
                                  <div key={idx}>
                                    {`${item.costElement || item.cost_element || item.name || 'Item'} — ${item.estimatedCost || item.estimated_cost || ''}`}
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
                    {!(category === 'IT Support' || category === 'Asset Check In' || category === 'Asset Check Out' || category === 'New Budget Proposal') && uiCategory !== 'Others' && ticket.dynamic_data && additionalDetailsEntries && additionalDetailsEntries.length > 0 && (
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
            <div ref={rightColRef} className={`${styles.rightColumn} ${detailStyles.rightColumnFill}`}>
              {/* Action Buttons */}
              {canPerformActions && ['New', 'Pending'].includes(status) && (
                <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
                  <Button
                    variant="primary"
                    className={`${styles.ticketActionButtonRow} ${styles.closeButton}`}
                    onClick={() => setShowOpenModal(true)}
                  >
                    Open Ticket
                  </Button>
                  <Button
                    variant="primary"
                    className={`${styles.ticketActionButtonRow} ${styles.rejectButton}`}
                    onClick={() => setShowRejectModal(true)}
                  >
                    Reject Ticket
                  </Button>
                </div>
              )}
              <Tabs
                tabs={[
                  { label: 'Details', value: 'details' }, 
                  { label: 'Logs', value: 'logs' }
                ]}
                active={activeTab}
                onChange={setActiveTab}
                fullHeight={true}
                className={detailStyles.tabsFill}
              >
                {activeTab === 'details' ? (
                  <CoordinatorAdminTicketDetails ticket={ticket} ticketLogs={ticketLogs} canSeeCoordinatorReview={canSeeCoordinatorReview} formatDate={formatDate} />
                ) : (
                  <CoordinatorAdminTicketLogs ticketLogs={ticketLogs} />
                )}
              </Tabs>
            </div>
          </div>
        </ViewCard>
      </main>
      {showOpenModal && (
        <CoordinatorAdminOpenTicketModal
          ticket={ticket}
          onClose={() => setShowOpenModal(false)}
          onSuccess={handleModalSuccess}
        />
      )}
      {showRejectModal && (
        <CoordinatorAdminRejectTicketModal
          ticket={ticket}
          onClose={() => setShowRejectModal(false)}
          onSuccess={handleModalSuccess}
        />
      )}
    </>
  );
}
