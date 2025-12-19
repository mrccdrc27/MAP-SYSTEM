import React, { useState, useEffect } from 'react';
import { FiInbox, FiCheckCircle, FiClock, FiXCircle, FiAlertCircle } from 'react-icons/fi';
import baseStyles from '../../../employee/pages/ticket-tracker/EmployeeTicketTracker.module.css';
import Loading from '../../../shared/components/Loading/Loading';
import styles from './CoordinatorAdminTicketDetails.module.css';
import { getEmployeeUserById } from '../../../utilities/storages/employeeUserStorage';
import { backendEmployeeService } from '../../../services/backend/employeeService';
import authService from '../../../utilities/service/authService';
import { convertToSecureUrl, getAccessToken, isSecureUrl } from '../../../utilities/secureMedia';

const DEFAULT_AVATAR = '/MapLogo.png';

function PersonCard({ name, metaLines = [], image }) {
  return (
    <div className={styles.personCard}>
      <div className={styles.avatarWrap}>
        <img src={image || DEFAULT_AVATAR} alt={name || 'Profile'} className={styles.avatarImage} onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }} />
      </div>
      <div className={styles.personInfo}>
        <div className={styles.personName}>{name || 'None'}</div>
        {metaLines.map((m, i) => (
          <div className={styles.personMeta} key={i}>{m}</div>
        ))}
      </div>
    </div>
  );
}

// Helper to determine ticket lifecycle stage
function getTicketStage(status) {
  const s = (status || '').toLowerCase();
  if (['new', 'pending'].includes(s)) return 'new';
  if (['in progress', 'on hold', 'open'].includes(s)) return 'in-progress';
  if (['resolved', 'closed', 'rejected', 'withdrawn'].includes(s)) return 'completed';
  return 'new';
}

// Timeline steps configuration with icons and status mapping
const TIMELINE_STEPS = [
  { 
    id: 1, 
    label: 'Submitted', 
    icon: FiInbox,
    statuses: ['new', 'pending', 'open', 'in progress', 'on hold', 'resolved', 'closed', 'rejected', 'withdrawn']
  },
  { 
    id: 2, 
    label: 'In Progress', 
    icon: FiClock,
    statuses: ['in progress', 'on hold', 'resolved', 'closed']
  },
  { 
    id: 3, 
    label: 'Resolved', 
    icon: FiCheckCircle,
    statuses: ['resolved', 'closed']
  },
  { 
    id: 4, 
    label: 'Closed', 
    icon: FiCheckCircle,
    statuses: ['closed']
  },
];

// Determine which step is active based on ticket status
function getActiveStep(status) {
  if (!status) return 0;
  const s = status.toLowerCase();
  
  // Rejected/Withdrawn are terminal states that don't follow normal progression
  if (['rejected', 'withdrawn'].includes(s)) return 1;
  
  if (['closed'].includes(s)) return 4;
  if (['resolved'].includes(s)) return 3;
  if (['in progress', 'on hold'].includes(s)) return 2;
  if (['open', 'pending', 'new'].includes(s)) return 1;
  
  return 0;
}

export default function CoordinatorAdminTicketDetails({ ticket, ticketLogs = [], canSeeCoordinatorReview, formatDate, isLoading = false }) {
  // Get current user role
  const userRole = authService.getUserRole();
  const isTicketCoordinator = userRole === 'Ticket Coordinator';
  const isSystemAdmin = userRole === 'System Admin';

  // Resolve user profile images using the stored users fixture
  const employeeUser = ticket?.employeeId ? getEmployeeUserById(Number(ticket.employeeId)) : null;
  const [remoteEmployee, setRemoteEmployee] = useState(null);
  const rawEmployeeImage = (remoteEmployee && (remoteEmployee.image || remoteEmployee.profile_image)) || employeeUser?.profileImage || ticket?.employeeProfileImage || DEFAULT_AVATAR;
  const absoluteFallback = (img) => {
    if (!img) return null;
    if (img.startsWith('http')) return img;
    const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || 'http://localhost:8000/media/';
    const clean = img.startsWith('/') ? img.slice(1) : img;
    return `${MEDIA_URL}${clean}`;
  };
  // Resolve image while avoiding converting the frontend default avatar into a backend URL
  const resolveImage = (raw) => {
    if (!raw) return DEFAULT_AVATAR;
    // If it's the local frontend default asset, return it as-is
    if (raw === DEFAULT_AVATAR) return DEFAULT_AVATAR;
    try {
      const secure = convertToSecureUrl(raw);
      const abs = absoluteFallback(raw);
      const final = secure || abs || raw || DEFAULT_AVATAR;
      return final;
    } catch (e) {
      console.warn('CoordinatorAdminTicketDetails.resolveImage error', e, 'raw=', raw);
      return raw || DEFAULT_AVATAR;
    }
  };

  const employeeImage = resolveImage(rawEmployeeImage);

  // Try to fetch authoritative employee data from backend when available
  useEffect(() => {
    let mounted = true;
    // debug logs removed from mount effect
    const loadEmployee = () => {
      try {
        if (!ticket) return;

        // Prefer embedded employee data from the ticket payload. Do not attempt
        // to enrich by fetching backend employee records — this can introduce
        // mismatches across systems and cause the UI to show unrelated users.
        const embedded = ticket.employee || ticket.requester || ticket.requested_by || ticket.createdBy || ticket.created_by;
        if (embedded && Object.keys(embedded).length > 0) {
          if (mounted) setRemoteEmployee(embedded);
          return;
        }

        // No embedded employee available — fall back to using ticket fields only.
        // Avoid network calls here to keep rendering deterministic.
        if (mounted) setRemoteEmployee(null);
      } catch (e) {
        console.warn('CoordinatorAdminTicketDetails: loadEmployee error', e);
      }
    };
    loadEmployee();
    return () => { mounted = false; };
  }, [ticket]);

  const coordinatorId = ticket?.coordinatorReview?.coordinatorId || ticket?.assignedTo || null;
  const coordinatorUser = coordinatorId ? getEmployeeUserById(Number(coordinatorId)) : null;
  const rawCoordinatorImage = coordinatorUser?.profileImage || ticket?.coordinatorReview?.coordinatorProfileImage || DEFAULT_AVATAR;
  const coordinatorImage = resolveImage(rawCoordinatorImage);

  // Get the agent/assignee info if ticket is assigned
  const agentId = ticket?.assignedTo;
  const agentUser = agentId ? getEmployeeUserById(Number(agentId)) : null;
  const rawAgentImage = agentUser?.profileImage || DEFAULT_AVATAR;
  const agentImage = resolveImage(rawAgentImage);
  const agentName = agentUser ? `${agentUser.firstName} ${agentUser.lastName}` : ticket?.assignedAgent || 'None';

  // Determine ticket stage
  const ticketStage = getTicketStage(ticket?.status);
  // Prefer backend-provided fields when available (accept multiple naming styles)
  const dateCompletedRaw = ticket?.date_completed || ticket?.dateCompleted || ticket?.dateResolved || ticket?.dateClosed || ticket?.time_closed || ticket?.timeClosed || ticket?.raw?.date_completed || ticket?.raw?.dateCompleted || null;
  const csatRaw = (typeof ticket?.csat_rating !== 'undefined' && ticket?.csat_rating !== null) ? ticket.csat_rating : (typeof ticket?.csatRating !== 'undefined' ? ticket.csatRating : (typeof ticket?.raw?.csat_rating !== 'undefined' ? ticket.raw.csat_rating : (typeof ticket?.raw?.csatRating !== 'undefined' ? ticket.raw.csatRating : null)));
  const csatVal = csatRaw !== null && typeof csatRaw !== 'undefined' ? Number(csatRaw) : null;
  // feedback intentionally not displayed in admin Details UI
  const renderStars = (n) => {
    const num = Number(n);
    if (!num || isNaN(num) || num <= 0) return '';
    return Array.from({ length: Math.min(5, Math.max(0, Math.floor(num))) }).map(() => '⭐').join('');
  };
  // Raw ticket viewer removed — prefer embedded UI and avoid exposing raw JSON here

  // Helper: detect whether ticket ever passed through one of the progressive stages
  const passedThroughProgressiveStages = (t) => {
    if (!t) return false;
    const targets = ['in progress', 'on hold', 'resolved', 'closed'];
    const checkStringForTargets = (s) => {
      if (!s) return false;
      const low = String(s).toLowerCase();
      return targets.some(ts => low.includes(ts));
    };

    try {
      // 1) activity/logs array entries
      const arraysToCheck = [t.activity, t.activity_logs, t.logs, t.history, t.status_history, t.status_changes];
      for (const arr of arraysToCheck) {
        if (Array.isArray(arr) && arr.length > 0) {
          for (const it of arr) {
            if (!it) continue;
            // check common fields
            if (checkStringForTargets(it.type || it.action || it.detail || it.details || it.note || it.status || it.new_status || it.text || it.message)) return true;
            // check serialized message content
            if (checkStringForTargets(JSON.stringify(it))) return true;
          }
        }
      }

      // 2) raw object fields
      const raw = t.raw || t;
      if (raw) {
        if (checkStringForTargets(raw.status) || checkStringForTargets(raw.current_status) || checkStringForTargets(raw.previous_statuses) || checkStringForTargets(raw.status_history)) return true;
        // deep scan for any nested status strings
        const rawStr = JSON.stringify(raw);
        if (checkStringForTargets(rawStr)) return true;
      }
    } catch (e) {
      // ignore parse errors
      console.warn('passedThroughProgressiveStages error', e);
    }

    return false;
  };

  // Don't show Assigned Agent for terminal Rejected tickets. For Withdrawn, hide only if it never passed through progressive stages.
  const statusLower = (ticket?.status || '').toLowerCase();
  const isRejected = statusLower === 'rejected';
  const isWithdrawn = statusLower === 'withdrawn';
  const withdrewWithoutProgress = isWithdrawn && !passedThroughProgressiveStages(ticket);
  const hideAssignedAgent = isRejected || withdrewWithoutProgress;
  console.debug('Assigned agent visibility:', { status: ticket?.status, isRejected, isWithdrawn, withdrewWithoutProgress, hideAssignedAgent });

  // If parent is still loading the ticket data or ticket is undefined, show shared Loading
  if (isLoading || typeof ticket === 'undefined') {
    return (
      <div className={baseStyles.detailsGrid + ' ' + styles.detailsPanel + ' ' + styles.panelRoot}>
        <div className={styles.panelContent} style={{ padding: 48, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Loading text="Loading details..." centered />
        </div>
      </div>
    );
  }

  // Calculate SLA status (simplified: based on priority and time elapsed)
  const calculateSLAStatus = () => {
    if (!ticket?.dateCreated) return 'Unknown';
    const created = new Date(ticket.dateCreated);
    const now = new Date();
    const hoursDiff = (now - created) / (1000 * 60 * 60);
    const slaHours = {
      'Critical': 4,
      'High': 8,
      'Medium': 24,
      'Low': 48
    };
    const slaLimit = slaHours[ticket?.priorityLevel] || 24;
    if (hoursDiff > slaLimit) return 'Overdue';
    if (hoursDiff > slaLimit * 0.8) return 'Due Soon';
    return 'On Time';
  };

  return (
    <div className={baseStyles.detailsGrid + ' ' + styles.detailsPanel + ' ' + styles.panelRoot}>
      <div className={styles.panelContent}>
        {/* Status-based timeline */}
        <div className={styles.horizontalTimelineWrap}>
          <div className={styles.timelineSteps}>
            {TIMELINE_STEPS.map((step) => {
              const Icon = step.icon;
              const activeStepNumber = getActiveStep(ticket?.status);
              const isCompleted = step.id <= activeStepNumber;
              const isActive = step.id === activeStepNumber;
              const isRejected = ['rejected', 'withdrawn'].includes((ticket?.status || '').toLowerCase());
              
              return (
                <div key={step.id} className={`${styles.timelineStep} ${isCompleted && !isActive ? styles.stepCompleted : ''} ${isActive ? styles.stepActive : ''}`}>
                  <div className={`${styles.stepIcon} ${isCompleted ? styles.stepIconCompleted : ''} ${isActive ? styles.stepIconActive : ''}`}>
                    <Icon />
                  </div>
                  <div className={styles.stepLabel}>{step.label}</div>
                </div>
              );
            })}
            {/* Show rejected/withdrawn as a terminal state */}
            {['rejected', 'withdrawn'].includes((ticket?.status || '').toLowerCase()) && (
              <div className={styles.timelineStep}>
                <div className={`${styles.stepIcon} ${styles.stepIconRejected}`}>
                  <FiXCircle />
                </div>
                <div className={styles.stepLabel}>{ticket.status}</div>
              </div>
            )}
          </div>
        </div>
        {/* Controls */}
        {/* controls removed: raw JSON viewer button intentionally omitted */}

        {/* EMPLOYEE SECTION - Always visible */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Employee</div>
          <div className={styles.userCardWrap}>
            <div className={styles.userCard}>
              <div className={styles.avatar}>
                <img
                  src={employeeImage}
                  alt={ticket?.employeeName || 'Employee'}
                  className={styles.avatarImageInner}
                  onError={(e) => {
                    console.warn('Employee image failed to load:', e.currentTarget.src, 'ticket:', ticket?.ticketNumber || ticket?.id || ticket?.employeeId);
                    e.currentTarget.src = DEFAULT_AVATAR;
                  }}
                />
              </div>
              <div className={styles.userInfo}>
                <div className={styles.userName}>
                  {
                    // Prefer remote employee names, then local fixture, then ticket fields
                    (remoteEmployee && ((remoteEmployee.first_name || remoteEmployee.firstName || '') + ' ' + (remoteEmployee.last_name || remoteEmployee.lastName || '')).trim())
                    || (employeeUser && `${employeeUser.firstName || ''} ${employeeUser.lastName || ''}`.trim())
                    || ticket?.employeeName
                    || 'None'
                  }
                </div>
                <div className={styles.userMeta}>
                  {
                    // department
                    (remoteEmployee && (remoteEmployee.department || remoteEmployee.dept))
                    || ticket?.employeeDepartment
                    || (employeeUser && employeeUser.department)
                    || 'None'
                  }
                  <br />
                  Employee ID: {
                    (remoteEmployee && (remoteEmployee.company_id || remoteEmployee.companyId || remoteEmployee.employee_id))
                    || ticket?.employeeCompanyId || ticket?.employeeId
                    || (employeeUser && (employeeUser.employeeId || employeeUser.id))
                    || 'None'
                  }
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* COORDINATOR SECTION - Visible when ticket is New/Pending (stage 1) and coordinator approved it */}
        {['new', 'pending'].includes(ticketStage) && ticket?.coordinatorReview && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Ticket Coordinator Review</div>
            <div className={styles.userCardWrap}>
              <div className={styles.userCard}>
                <div className={styles.avatar}>
                  <img
                    src={coordinatorImage}
                    alt={ticket?.coordinatorReview?.coordinatorName || 'Coordinator'}
                    className={styles.avatarImageInner}
                    onError={(e) => {
                      console.warn('Coordinator image failed to load:', e.currentTarget.src, 'ticket:', ticket?.ticketNumber || ticket?.id);
                      e.currentTarget.src = DEFAULT_AVATAR;
                    }}
                  />
                </div>
                <div className={styles.userInfo}>
                  <div className={styles.userName}>{ticket?.coordinatorReview?.coordinatorName || (coordinatorUser ? `${coordinatorUser.firstName} ${coordinatorUser.lastName}` : 'None')}</div>
                  <div className={styles.userMeta}>
                    {coordinatorUser?.department || ticket?.department || 'None'}<br />
                    Date Reviewed: {formatDate ? formatDate(ticket?.coordinatorReview?.dateReviewed) : ticket?.coordinatorReview?.dateReviewed || 'None'}
                  </div>
                </div>
              </div>
            </div>
            {/* Coordinator Actions Info */}
            {ticket?.coordinatorReview && (
              <div className={styles.coordinatorActionsCard}>
                {ticket?.priorityLevel && (
                  <div className={styles.infoField}>
                    <div className={styles.fieldLabel}>Priority Level</div>
                    <div className={styles.fieldValue}>{ticket.priorityLevel}</div>
                  </div>
                )}
                {ticket?.department && (
                  <div className={styles.infoField}>
                    <div className={styles.fieldLabel}>Assigned Department</div>
                    <div className={styles.fieldValue}>{ticket.department}</div>
                  </div>
                )}
                {ticket?.coordinatorReview?.comment && (
                  <div className={styles.infoField}>
                    <div className={styles.fieldLabel}>Comment to Agent</div>
                    <div className={styles.fieldValue}>{ticket.coordinatorReview.comment}</div>
                  </div>
                )}
                {ticket?.coordinatorReview?.status === 'rejected' && ticket?.coordinatorReview?.rejectionComment && (
                  <div className={styles.infoField}>
                    <div className={styles.fieldLabel}>Rejection Reason</div>
                    <div className={styles.fieldValue}>{ticket.coordinatorReview.rejectionComment}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ASSIGNED AGENT SECTION - Visible during In Progress and Completed stages
            Show a placeholder when there is no assigned agent so the UI can be wired to backend later */}
  {['in-progress', 'completed'].includes(ticketStage) && !hideAssignedAgent && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Assigned Agent</div>
            <div className={styles.userCardWrap}>
              {ticket?.assignedTo ? (
                <div className={styles.userCard}>
                  <div className={styles.avatar}>
                    <img
                      src={agentImage}
                      alt={agentName}
                      className={styles.avatarImageInner}
                      onError={(e) => {
                        console.warn('Agent image failed to load:', e.currentTarget.src, 'ticket:', ticket?.ticketNumber || ticket?.id);
                        e.currentTarget.src = DEFAULT_AVATAR;
                      }}
                    />
                  </div>
                  <div className={styles.userInfo}>
                    <div className={styles.userName}>{agentName}</div>
                    <div className={styles.userMeta}>
                      {agentUser?.department || 'None'}<br />
                      Date Assigned: {formatDate ? formatDate(ticket?.dateAssigned) : ticket?.dateAssigned || 'None'}
                    </div>
                  </div>
                </div>
                ) : (
                // Placeholder card when no agent is assigned yet
                <div className={styles.userCard}>
                  <div className={styles.avatar}>
                    <img
                      src={DEFAULT_AVATAR}
                      alt="Unassigned"
                      className={styles.avatarImageInner}
                      onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
                    />
                  </div>
                  <div className={styles.userInfo}>
                    <div className={styles.userName}>Unassigned</div>
                    <div className={styles.userMeta}>
                      -<br />
                      Date Assigned: None
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MONITORING VIEW - Visible to System Admins during In Progress and Completed stages */}
        {isSystemAdmin && ['in-progress', 'completed'].includes(ticketStage) && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Monitoring & SLA</div>
            <div className={styles.monitoringCard}>
              <div className={styles.infoField}>
                <div className={styles.fieldLabel}>SLA Status</div>
                <div className={`${styles.fieldValue} ${styles[`sla-${calculateSLAStatus().toLowerCase().replace(' ', '-')}`]}`}>
                  {calculateSLAStatus()}
                </div>
              </div>
              <div className={styles.infoField}>
                <div className={styles.fieldLabel}>Current Status</div>
                <div className={styles.fieldValue}>{ticket?.status || 'None'}</div>
              </div>
              {ticket?.targetResolutionDate && (
                <div className={styles.infoField}>
                  <div className={styles.fieldLabel}>Target Resolution Date</div>
                  <div className={styles.fieldValue}>{formatDate ? formatDate(ticket.targetResolutionDate) : ticket.targetResolutionDate}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* COMPLETION INFO - Visible only when ticket is Closed */}
        {(ticket?.status && String(ticket.status).toLowerCase() === 'closed') && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Resolution Details</div>
            <div className={styles.resolutionCard}>
              <div className={styles.infoField}>
                <div className={styles.fieldLabel}>Status</div>
                <div className={styles.fieldValue}>{ticket?.status || 'None'}</div>
              </div>
              <div className={styles.infoField}>
                <div className={styles.fieldLabel}>Date Completed</div>
                <div className={styles.fieldValue}>{formatDate ? (dateCompletedRaw ? formatDate(dateCompletedRaw) : 'None') : (dateCompletedRaw || 'None')}</div>
              </div>
              <div className={styles.infoField}>
                <div className={styles.fieldLabel}>CSAT Rating</div>
                <div className={styles.fieldValue}>
                  {csatRaw ? `${csatRaw}/5 \u2B50` : 'None'}
                </div>
              </div>
              {/* Feedback removed from Resolution Details per request */}
            </div>
          </div>
        )}
      </div>
      {/* Raw JSON viewer removed */}
    </div>
  );
}
