import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaEdit, FaSave, FaTimes, FaPaperclip, FaDownload, FaFile } from 'react-icons/fa';
import styles from './CoordinatorOwnedTicketDetail.module.css';
import { backendTicketService } from '../../../services/backend/ticketService';
import { useAuth } from '../../../context/AuthContext';
import { mockOwnedTickets, coordinatorTicketActions, coordinatorMessages, requesterMessages as mockRequesterMessages } from '../../../mock-data/ownedTickets';
import Breadcrumb from '../../../shared/components/Breadcrumb';
import Skeleton from '../../../shared/components/Skeleton/Skeleton';
import { API_CONFIG } from '../../../config/environment';

const CoordinatorOwnedTicketDetail = () => {
  const { ticketNumber } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [ticket, setTicket] = useState(null);
  const [helpdeskTicket, setHelpdeskTicket] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  const [mainTab, setMainTab] = useState('ticket');

  // Edit states
  const [isEditingSubject, setIsEditingSubject] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  // Message states
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [requesterMessages, setRequesterMessages] = useState([]);
  const [replyContent, setReplyContent] = useState('');
  const [showAllMessages, setShowAllMessages] = useState(false);

  // Priority and status states
  const [ticketStatus, setTicketStatus] = useState('LOW');
  const [lifecycle, setLifecycle] = useState('Triage Ticket');

  // Action log
  const [actionLog, setActionLog] = useState([]);

  useEffect(() => {
    const loadTicket = async () => {
      try {
        setIsLoading(true);
        let taskData = null;
        let helpdeskData = null;
        
        // Fetch both task data from workflow_api AND full ticket from helpdesk in parallel
        try {
          const [taskResponse, helpdeskResponse] = await Promise.all([
            backendTicketService.getOwnedTicketByNumber(ticketNumber).catch(err => {
              console.warn('Failed to fetch task data:', err);
              return null;
            }),
            backendTicketService.getHelpdeskTicketByNumber(ticketNumber).catch(err => {
              console.warn('Failed to fetch helpdesk ticket:', err);
              return null;
            })
          ]);
          
          taskData = taskResponse;
          helpdeskData = helpdeskResponse;
          
          // Store helpdesk data separately for attachments, comments, etc.
          if (helpdeskData) {
            setHelpdeskTicket(helpdeskData);
          }
        } catch (err) {
          console.warn('Backend unavailable, using mock data:', err);
          // Fallback to mock data
          const found = mockOwnedTickets.find(t => {
            const tNum = t.ticket_number || t.ticket_id || t.ticketNumber || t.id;
            return String(tNum) === String(ticketNumber);
          });
          if (found) {
            taskData = found;
          }
        }

        if (taskData || helpdeskData) {
          // Merge task data (workflow info) with helpdesk data (full ticket details)
          const mergedData = {
            // Task/workflow info (from workflow_api)
            taskId: taskData?.task_id,
            ticketOwnerId: taskData?.ticket_owner_id,
            ticketOwnerName: taskData?.ticket_owner_name,
            ticketOwnerRole: taskData?.ticket_owner_role,
            workflowName: taskData?.workflow_name || 'N/A',
            currentStepName: taskData?.current_step_name || 'N/A',
            currentStepRole: taskData?.current_step_role || 'N/A',
            targetResolution: taskData?.target_resolution,
            assignedUsers: taskData?.assigned_users || [],
            taskStatus: taskData?.status,
            
            // Full ticket details (from helpdesk - prefer this data)
            id: helpdeskData?.ticket_number || taskData?.ticket_number || ticketNumber,
            ticketId: helpdeskData?.id || taskData?.ticket_id,
            subject: helpdeskData?.subject || taskData?.ticket_subject || taskData?.subject || 'N/A',
            description: helpdeskData?.description || taskData?.ticket_description || taskData?.description || '',
            status: helpdeskData?.status || taskData?.status || 'pending',
            priority: helpdeskData?.priority || helpdeskData?.priorityLevel || taskData?.priority || 'Medium',
            category: helpdeskData?.category || taskData?.category || 'N/A',
            subCategory: helpdeskData?.sub_category || taskData?.sub_category || taskData?.subCategory || 'N/A',
            department: helpdeskData?.department || taskData?.department || 'N/A',
            createdDate: helpdeskData?.submit_date || taskData?.created_at || taskData?.submit_date || new Date().toISOString(),
            updateDate: helpdeskData?.update_date,
            
            // Employee/requester info (from helpdesk)
            employee: helpdeskData?.employee || null,
            requester: helpdeskData?.employee 
              ? `${helpdeskData.employee.first_name || ''} ${helpdeskData.employee.last_name || ''}`.trim() || 'N/A'
              : taskData?.requester_name || taskData?.requester || 'N/A',
            requesterEmail: helpdeskData?.employee?.email || 'N/A',
            requesterDepartment: helpdeskData?.employee?.department || helpdeskData?.department || 'N/A',
            
            // Assigned to (from helpdesk)
            assignedTo: helpdeskData?.assigned_to 
              ? `${helpdeskData.assigned_to.first_name || ''} ${helpdeskData.assigned_to.last_name || ''}`.trim()
              : taskData?.ticket_owner_name || taskData?.assigned_to || 'N/A',
            
            // Attachments (from helpdesk)
            attachments: helpdeskData?.attachments || [],
            
            // Comments (from helpdesk)
            comments: helpdeskData?.comments || [],
            
            // Additional ticket fields (from helpdesk)
            assetName: helpdeskData?.asset_name,
            serialNumber: helpdeskData?.serial_number,
            location: helpdeskData?.location,
            expectedReturnDate: helpdeskData?.expected_return_date,
            issueType: helpdeskData?.issue_type,
            otherIssue: helpdeskData?.other_issue,
            performanceStartDate: helpdeskData?.performance_start_date,
            performanceEndDate: helpdeskData?.performance_end_date,
            costItems: helpdeskData?.cost_items,
            requestedBudget: helpdeskData?.requested_budget,
            approvedBy: helpdeskData?.approved_by,
            rejectedBy: helpdeskData?.rejected_by,
            dateCompleted: helpdeskData?.date_completed,
            csatRating: helpdeskData?.csat_rating,
            dynamicData: helpdeskData?.dynamic_data,
            
            // Spread any additional data
            ...taskData
          };
          
          setTicket(mergedData);
          setSubject(mergedData.subject);
          setDescription(mergedData.description);
          setTicketStatus(mergedData.priority || 'LOW');
          setLifecycle(mergedData.currentStepName || 'Triage Ticket');

          // Use real comments from helpdesk if available
          if (helpdeskData?.comments && helpdeskData.comments.length > 0) {
            const formattedComments = helpdeskData.comments.map(comment => ({
              id: comment.id,
              sender: comment.user 
                ? `${comment.user.first_name || ''} ${comment.user.last_name || ''}`.trim() || 'Unknown'
                : 'Unknown',
              role: comment.user?.role || 'Employee',
              timestamp: new Date(comment.created_at).toLocaleDateString(),
              time: new Date(comment.created_at).toLocaleTimeString(),
              content: comment.comment,
              isInternal: comment.is_internal,
              isOwn: comment.user?.id === currentUser?.id
            }));
            
            // Split into internal (TTS agent) messages and requester messages
            const internalComments = formattedComments.filter(c => c.isInternal);
            const publicComments = formattedComments.filter(c => !c.isInternal);
            
            setMessages(internalComments.length > 0 ? internalComments : [{
              id: '1',
              sender: 'Support Team',
              role: 'TTS Agent',
              timestamp: new Date().toLocaleDateString(),
              time: new Date().toLocaleTimeString(),
              content: 'Ticket acknowledged. Working on resolution.'
            }]);
            
            setRequesterMessages(publicComments.length > 0 ? publicComments : [{
              id: '1',
              sender: mergedData.requester || 'Requester',
              role: 'Requester',
              timestamp: new Date(mergedData.createdDate).toLocaleDateString(),
              time: new Date(mergedData.createdDate).toLocaleTimeString(),
              content: mergedData.description || 'No description provided',
              isOwn: false
            }]);
          } else {
            // Initialize with default messages
            setMessages([{
              id: '1',
              sender: 'Support Team',
              role: 'TTS Agent',
              timestamp: new Date().toLocaleDateString(),
              time: new Date().toLocaleTimeString(),
              content: 'Ticket acknowledged. Working on resolution.'
            }]);

            setRequesterMessages([{
              id: '1',
              sender: mergedData.requester || 'Requester',
              role: 'Requester',
              timestamp: new Date(mergedData.createdDate).toLocaleDateString(),
              time: new Date(mergedData.createdDate).toLocaleTimeString(),
              content: mergedData.description || 'No description provided',
              isOwn: false
            }]);
          }

          // Initialize action log with task history if available
          const logEntries = [];
          if (mergedData.assignedUsers && mergedData.assignedUsers.length > 0) {
            mergedData.assignedUsers.forEach((user, index) => {
              logEntries.push({
                id: `assigned-${index}`,
                user: user.user_full_name || 'System',
                role: user.role || 'Agent',
                action: `Assigned as ${user.role}`,
                timestamp: user.assigned_on ? new Date(user.assigned_on).toLocaleDateString() : new Date().toLocaleDateString(),
                badge: user.status?.toUpperCase() || 'ASSIGNED'
              });
            });
          }
          
          if (logEntries.length === 0) {
            logEntries.push({
              id: '1',
              user: mergedData.ticketOwnerName || currentUser?.first_name || 'You',
              role: mergedData.ticketOwnerRole || 'Coordinator',
              action: 'Assigned as Ticket Owner',
              timestamp: new Date(mergedData.createdDate || new Date()).toLocaleDateString(),
              badge: 'ASSIGNED'
            });
          }
          
          setActionLog(logEntries);
        }
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load ticket:', err);
        setIsLoading(false);
      }
    };

    loadTicket();
  }, [ticketNumber, currentUser]);

  const handleSaveSubject = () => {
    if (ticket) {
      setTicket({ ...ticket, subject });
      setIsEditingSubject(false);
    }
  };

  const handleSaveDescription = () => {
    if (ticket) {
      setTicket({ ...ticket, description });
      setIsEditingDescription(false);
    }
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const newMsg = {
        id: Date.now().toString(),
        sender: currentUser?.first_name || 'You',
        role: currentUser?.role || 'Agent',
        timestamp: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        content: newMessage
      };
      setMessages([...messages, newMsg]);
      setNewMessage('');
    }
  };

  const handleSendRequesterMessage = () => {
    if (replyContent.trim()) {
      const newMsg = {
        id: Date.now().toString(),
        sender: currentUser?.first_name || 'You',
        role: currentUser?.role || 'Coordinator',
        timestamp: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        content: replyContent,
        isOwn: true
      };
      setRequesterMessages([...requesterMessages, newMsg]);
      setReplyContent('');
    }
  };

  const handleStatusChange = (newStatus) => {
    setTicketStatus(newStatus);
    setActionLog([
      {
        id: Date.now().toString(),
        user: currentUser?.first_name || 'You',
        role: currentUser?.role || 'Coordinator',
        action: `Changed priority to ${newStatus}`,
        timestamp: new Date().toLocaleDateString(),
        badge: newStatus
      },
      ...actionLog
    ]);
  };

  const handleLifecycleChange = (newLifecycle) => {
    setLifecycle(newLifecycle);
    setActionLog([
      {
        id: Date.now().toString(),
        user: currentUser?.first_name || 'You',
        role: currentUser?.role || 'Coordinator',
        action: newLifecycle,
        timestamp: new Date().toLocaleDateString(),
        badge: newLifecycle.replace(' ', '_').toUpperCase()
      },
      ...actionLog
    ]);
  };

  const displayedRequesterMessages = showAllMessages 
    ? requesterMessages 
    : requesterMessages.slice(-3);

  const getPriorityColor = (priority) => {
    switch (priority?.toUpperCase()) {
      case 'CRITICAL':
        return styles['priority-critical'];
      case 'HIGH':
        return styles['priority-high'];
      case 'MEDIUM':
        return styles['priority-medium'];
      case 'LOW':
        return styles['priority-low'];
      default:
        return styles['priority-low'];
    }
  };

  const getStatusColor = (status) => {
    if (!status) return '';
    const lower = status.toLowerCase().replace(/\s+/g, '-');
    return styles[`status-${lower}`] || '';
  };

  if (isLoading) {
    return <Skeleton height={200} />;
  }

  if (!ticket) {
    return (
      <div className={styles['detail-container']}>
        <div className={styles['error-message']}>
          <p>Ticket not found</p>
          <button onClick={() => navigate('/admin/owned-tickets')}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles['detail-container']}>
      {/* Header */}
      <div className={styles['detail-header']}>
        <button 
          className={styles['back-btn']}
          onClick={() => navigate('/admin/owned-tickets')}
        >
          <FaArrowLeft /> Back
        </button>
        <div className={styles['header-content']}>
          <h1>Ticket #{ticket.id}</h1>
          <div className={styles['header-badges']}>
            <span className={`${styles['status-badge']} ${getStatusColor(ticket.status)}`}>
              {ticket.status}
            </span>
            <span className={`${styles['priority-badge']} ${getPriorityColor(ticketStatus)}`}>
              {ticketStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={styles['content-wrapper']}>
        {/* Left Panel */}
        <div className={styles['main-panel']}>
          {/* Ticket Stage Display */}
          <div className={styles['stage-display']}>
            <label>Stage:</label>
            <span className={styles['stage-value']}>{lifecycle}</span>
          </div>

          {/* Priority Display */}
          <div className={styles['priority-display']}>
            <label>Priority:</label>
            <span className={`${styles['priority-value']} ${styles[`priority-${ticketStatus.toLowerCase()}`]}`}>
              {ticketStatus}
            </span>
          </div>

          {/* Tabs */}
          <div className={styles['tabs']}>
            <button
              className={`${styles['tab']} ${mainTab === 'ticket' ? styles['active'] : ''}`}
              onClick={() => setMainTab('ticket')}
            >
              Ticket Details
            </button>
            <button
              className={`${styles['tab']} ${mainTab === 'attachments' ? styles['active'] : ''}`}
              onClick={() => setMainTab('attachments')}
            >
              Attachments {ticket.attachments?.length > 0 && `(${ticket.attachments.length})`}
            </button>
            <button
              className={`${styles['tab']} ${mainTab === 'requester' ? styles['active'] : ''}`}
              onClick={() => setMainTab('requester')}
            >
              Requester Communication
            </button>
          </div>

          {/* Tab Content */}
          <div className={styles['tab-content']}>
            {mainTab === 'ticket' ? (
              <div className={styles['ticket-details']}>
                {/* Subject */}
                <div className={styles['field-group']}>
                  <div className={styles['field-header']}>
                    <label>Subject:</label>
                    {!isEditingSubject && (
                      <button
                        className={styles['edit-btn']}
                        onClick={() => setIsEditingSubject(true)}
                      >
                        <FaEdit /> Edit
                      </button>
                    )}
                  </div>
                  {isEditingSubject ? (
                    <div className={styles['edit-form']}>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className={styles['edit-input']}
                      />
                      <div className={styles['edit-actions']}>
                        <button
                          className={styles['save-btn']}
                          onClick={handleSaveSubject}
                        >
                          <FaSave /> Save
                        </button>
                        <button
                          className={styles['cancel-btn']}
                          onClick={() => {
                            setSubject(ticket.subject);
                            setIsEditingSubject(false);
                          }}
                        >
                          <FaTimes /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className={styles['field-value']}>{ticket.subject}</p>
                  )}
                </div>

                {/* Description */}
                <div className={styles['field-group']}>
                  <div className={styles['field-header']}>
                    <label>Description:</label>
                    {!isEditingDescription && (
                      <button
                        className={styles['edit-btn']}
                        onClick={() => setIsEditingDescription(true)}
                      >
                        <FaEdit /> Edit
                      </button>
                    )}
                  </div>
                  {isEditingDescription ? (
                    <div className={styles['edit-form']}>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className={styles['edit-textarea']}
                        rows="4"
                      />
                      <div className={styles['edit-actions']}>
                        <button
                          className={styles['save-btn']}
                          onClick={handleSaveDescription}
                        >
                          <FaSave /> Save
                        </button>
                        <button
                          className={styles['cancel-btn']}
                          onClick={() => {
                            setDescription(ticket.description);
                            setIsEditingDescription(false);
                          }}
                        >
                          <FaTimes /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className={styles['field-value']}>{ticket.description}</p>
                  )}
                </div>

                {/* Additional Info */}
                <div className={styles['info-grid']}>
                  <div>
                    <label>Category:</label>
                    <p>{ticket.category}</p>
                  </div>
                  <div>
                    <label>Sub-Category:</label>
                    <p>{ticket.subCategory}</p>
                  </div>
                  <div>
                    <label>Department:</label>
                    <p>{ticket.department}</p>
                  </div>
                  <div>
                    <label>Created Date:</label>
                    <p>{new Date(ticket.createdDate).toLocaleString()}</p>
                  </div>
                </div>

                {/* Additional Ticket Fields from Helpdesk */}
                {(ticket.assetName || ticket.serialNumber || ticket.location || ticket.issueType) && (
                  <div className={styles['info-grid']} style={{ marginTop: '1rem' }}>
                    {ticket.assetName && (
                      <div>
                        <label>Asset Name:</label>
                        <p>{ticket.assetName}</p>
                      </div>
                    )}
                    {ticket.serialNumber && (
                      <div>
                        <label>Serial Number:</label>
                        <p>{ticket.serialNumber}</p>
                      </div>
                    )}
                    {ticket.location && (
                      <div>
                        <label>Location:</label>
                        <p>{ticket.location}</p>
                      </div>
                    )}
                    {ticket.issueType && (
                      <div>
                        <label>Issue Type:</label>
                        <p>{ticket.issueType}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Requester Info */}
                {ticket.employee && (
                  <div className={styles['info-section']} style={{ marginTop: '1rem' }}>
                    <h4>Requester Information</h4>
                    <div className={styles['info-grid']}>
                      <div>
                        <label>Name:</label>
                        <p>{`${ticket.employee.first_name || ''} ${ticket.employee.last_name || ''}`.trim() || 'N/A'}</p>
                      </div>
                      <div>
                        <label>Email:</label>
                        <p>{ticket.employee.email || 'N/A'}</p>
                      </div>
                      <div>
                        <label>Company ID:</label>
                        <p>{ticket.employee.company_id || 'N/A'}</p>
                      </div>
                      <div>
                        <label>Department:</label>
                        <p>{ticket.employee.department || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : mainTab === 'attachments' ? (
              <div className={styles['attachments-section']}>
                <h3><FaPaperclip /> Attachments</h3>
                {ticket.attachments && ticket.attachments.length > 0 ? (
                  <div className={styles['attachments-list']}>
                    {ticket.attachments.map((attachment, index) => {
                      const fileName = attachment.file_name || attachment.file?.split('/').pop() || `Attachment ${index + 1}`;
                      const fileUrl = attachment.file?.startsWith('http') 
                        ? attachment.file 
                        : `${API_CONFIG.BACKEND.BASE_URL}${attachment.file}`;
                      
                      return (
                        <div key={attachment.id || index} className={styles['attachment-item']}>
                          <div className={styles['attachment-info']}>
                            <FaFile className={styles['file-icon']} />
                            <div className={styles['attachment-details']}>
                              <span className={styles['attachment-name']}>{fileName}</span>
                              {attachment.uploaded_at && (
                                <span className={styles['attachment-date']}>
                                  Uploaded: {new Date(attachment.uploaded_at).toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <a 
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles['download-btn']}
                          >
                            <FaDownload /> Download
                          </a>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className={styles['no-attachments']}>
                    <FaPaperclip />
                    <p>No attachments for this ticket</p>
                  </div>
                )}
              </div>
            ) : (
              <div className={styles['requester-comms']}>
                {/* Message Thread */}
                <div className={styles['message-thread']}>
                  {displayedRequesterMessages.map((msg) => (
                    <div key={msg.id} className={`${styles['message']} ${msg.isOwn ? styles['own'] : ''}`}>
                      <div className={styles['message-header']}>
                        <span className={styles['sender']}>{msg.sender}</span>
                        <span className={styles['role']}>({msg.role})</span>
                        <span className={styles['timestamp']}>
                          {msg.timestamp} at {msg.time}
                        </span>
                      </div>
                      <div className={styles['message-body']}>{msg.content}</div>
                    </div>
                  ))}

                  {requesterMessages.length > 3 && (
                    <div className={styles['show-more']}>
                      <button onClick={() => setShowAllMessages(!showAllMessages)}>
                        {showAllMessages ? 'Show fewer messages' : `Show all ${requesterMessages.length} messages`}
                      </button>
                    </div>
                  )}
                </div>

                {/* Reply Section */}
                <div className={styles['reply-section']}>
                  <div className={styles['reply-to']}>
                    To: <strong>{ticket.requester || 'Requester'}</strong>
                  </div>
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Type your message..."
                    className={styles['reply-textarea']}
                    rows="4"
                  />
                  <div className={styles['reply-actions']}>
                    <button className={styles['attach-btn']}>
                      📎 Attach files
                    </button>
                    <button
                      className={styles['send-btn']}
                      onClick={handleSendRequesterMessage}
                      disabled={!replyContent.trim()}
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className={styles['right-panel']}>
          {/* Details/Messages Tabs */}
          <div className={styles['sidebar-tabs']}>
            <button
              className={`${styles['sidebar-tab']} ${activeTab === 'details' ? styles['active'] : ''}`}
              onClick={() => setActiveTab('details')}
            >
              Details
            </button>
            <button
              className={`${styles['sidebar-tab']} ${activeTab === 'messages' ? styles['active'] : ''}`}
              onClick={() => setActiveTab('messages')}
            >
              Messages
            </button>
          </div>

          {activeTab === 'details' ? (
            <div className={styles['sidebar-content']}>
              {/* Ticket Info */}
              <div className={styles['info-section']}>
                <h3>Ticket Information</h3>
                <div className={styles['info-item']}>
                  <label>Ticket Owner:</label>
                  <p>{ticket.ticketOwnerName || ticket.assignedTo}</p>
                </div>
                <div className={styles['info-item']}>
                  <label>Status:</label>
                  <p>{ticket.status}</p>
                </div>
                <div className={styles['info-item']}>
                  <label>Priority:</label>
                  <p>{ticketStatus}</p>
                </div>
                <div className={styles['info-item']}>
                  <label>Workflow:</label>
                  <p>{ticket.workflowName || 'N/A'}</p>
                </div>
                <div className={styles['info-item']}>
                  <label>Current Step:</label>
                  <p>{ticket.currentStepName || lifecycle}</p>
                </div>
                <div className={styles['info-item']}>
                  <label>Current Role:</label>
                  <p>{ticket.currentStepRole || 'N/A'}</p>
                </div>
                {ticket.targetResolution && (
                  <div className={styles['info-item']}>
                    <label>Target Resolution:</label>
                    <p>{new Date(ticket.targetResolution).toLocaleString()}</p>
                  </div>
                )}
              </div>

              {/* Assigned Users */}
              {ticket.assignedUsers && ticket.assignedUsers.length > 0 && (
                <div className={styles['info-section']}>
                  <h3>Assigned Users</h3>
                  {ticket.assignedUsers.map((user, index) => (
                    <div key={user.task_item_id || index} className={styles['info-item']}>
                      <label>{user.role}:</label>
                      <p>{user.user_full_name} ({user.status || 'assigned'})</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Log */}
              <div className={styles['action-log']}>
                <h3>Action Log</h3>
                <div className={styles['log-entries']}>
                  {actionLog.map((entry) => (
                    <div key={entry.id} className={styles['log-entry']}>
                      <div className={styles['log-header']}>
                        <span className={styles['log-user']}>{entry.user}</span>
                        <span className={styles['log-badge']}>{entry.badge}</span>
                      </div>
                      <p className={styles['log-action']}>{entry.action}</p>
                      <span className={styles['log-time']}>{entry.timestamp}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className={styles['sidebar-content']}>
              {/* TTS Agent Messages */}
              <div className={styles['messages-section']}>
                <h3>TTS Agent Messages</h3>
                <div className={styles['message-list']}>
                  {messages.map((msg) => (
                    <div key={msg.id} className={styles['msg-item']}>
                      <div className={styles['msg-sender']}>{msg.sender}</div>
                      <p className={styles['msg-text']}>{msg.content}</p>
                      <span className={styles['msg-time']}>{msg.time}</span>
                    </div>
                  ))}
                </div>

                {/* Send Message */}
                <div className={styles['send-msg-form']}>
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message to TTS agents..."
                    className={styles['msg-textarea']}
                    rows="3"
                  />
                  <button
                    className={styles['send-msg-btn']}
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoordinatorOwnedTicketDetail;
