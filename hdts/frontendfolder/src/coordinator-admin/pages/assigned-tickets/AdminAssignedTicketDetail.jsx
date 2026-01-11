import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaPaperclip, FaDownload, FaFile, FaCircle } from 'react-icons/fa';
import { ToastContainer } from 'react-toastify';
import styles from './AdminAssignedTicketDetail.module.css';
import { backendTicketService } from '../../../services/backend/ticketService';
import { useAuth } from '../../../context/AuthContext';
import Breadcrumb from '../../../shared/components/Breadcrumb';
import Skeleton from '../../../shared/components/Skeleton/Skeleton';
import { API_CONFIG } from '../../../config/environment';
import { useMessaging } from '../../../shared/hooks/messaging';
import TransferTicketModal from '../../components/modals/TransferTicketModal';
import 'react-toastify/dist/ReactToastify.css';

const AdminAssignedTicketDetail = () => {
  const { ticketNumber } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [ticket, setTicket] = useState(null);
  const [helpdeskTicket, setHelpdeskTicket] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  const [mainTab, setMainTab] = useState('ticket');

  // Local message states (for requester communication)
  const [requesterMessages, setRequesterMessages] = useState([]);
  const [replyContent, setReplyContent] = useState('');
  const [showAllMessages, setShowAllMessages] = useState(false);
  
  // TTS Agent messaging input
  const [agentMessageInput, setAgentMessageInput] = useState('');
  const messagesEndRef = useRef(null);
  // Requester message thread refs for scrolling
  const requesterThreadRef = useRef(null);
  const requesterMessagesEndRef = useRef(null);
  const prevShowAllRef = useRef(undefined);

  // Priority and status states
  const [ticketStatus, setTicketStatus] = useState('LOW');
  const [lifecycle, setLifecycle] = useState('Triage Ticket');

  // Action log
  const [actionLog, setActionLog] = useState([]);

  // Modal states for ticket owner management
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Real-time messaging with TTS agents
  const userDisplayName = `${currentUser?.first_name || ''} ${currentUser?.last_name || ''}`.trim() || 
    currentUser?.username || currentUser?.email || 'Admin';
  
  const {
    messages: agentMessages,
    isConnected: wsConnected,
    isLoading: messagingLoading,
    typingUsers,
    sendMessage: sendAgentMessage,
    startTyping,
    stopTyping,
    fetchMessages: refreshMessages,
  } = useMessaging(
    ticketNumber,
    userDisplayName,
    {
      name: userDisplayName,
      role: 'HDTS: System Admin',
      first_name: currentUser?.first_name,
      last_name: currentUser?.last_name,
    }
  );

  // Auto-scroll to latest message
  useEffect(() => {
    if (messagesEndRef.current && activeTab === 'messages') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [agentMessages, activeTab]);

  // Keep requester thread scroll position under user control (no auto-scroll here)

  useEffect(() => {
    const loadTicket = async () => {
      try {
        setIsLoading(true);
        let taskData = null;
        let helpdeskData = null;
        
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
          
          if (helpdeskData) {
            setHelpdeskTicket(helpdeskData);
          }
        } catch (err) {
          console.warn('Backend unavailable:', err);
        }

        if (taskData || helpdeskData) {
          const mergedData = {
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
            is_owner: taskData?.is_owner,
            is_admin: taskData?.is_admin,
            
            id: helpdeskData?.ticket_number || taskData?.ticket_number || ticketNumber,
            ticketId: helpdeskData?.id || taskData?.ticket_id,
            ticketNumber: taskData?.ticket_number || helpdeskData?.ticket_number || ticketNumber,
            subject: helpdeskData?.subject || taskData?.ticket_subject || taskData?.subject || 'N/A',
            description: helpdeskData?.description || taskData?.ticket_description || taskData?.description || '',
            status: helpdeskData?.status || taskData?.status || 'pending',
            priority: helpdeskData?.priority || helpdeskData?.priorityLevel || taskData?.priority || 'Medium',
            category: helpdeskData?.category || taskData?.category || 'N/A',
            subCategory: helpdeskData?.sub_category || taskData?.sub_category || taskData?.subCategory || 'N/A',
            department: helpdeskData?.department || taskData?.department || 'N/A',
            createdDate: helpdeskData?.submit_date || taskData?.created_at || taskData?.submit_date || new Date().toISOString(),
            updateDate: helpdeskData?.update_date,
            
            employee: helpdeskData?.employee || null,
            requester: helpdeskData?.employee 
              ? `${helpdeskData.employee.first_name || ''} ${helpdeskData.employee.last_name || ''}`.trim() || 'N/A'
              : taskData?.requester_name || taskData?.requester || 'N/A',
            requesterEmail: helpdeskData?.employee?.email || 'N/A',
            requesterDepartment: helpdeskData?.employee?.department || helpdeskData?.department || 'N/A',
            
            assignedTo: helpdeskData?.assigned_to 
              ? `${helpdeskData.assigned_to.first_name || ''} ${helpdeskData.assigned_to.last_name || ''}`.trim()
              : taskData?.ticket_owner_name || taskData?.assigned_to || 'N/A',
            
            attachments: helpdeskData?.attachments || [],
            comments: helpdeskData?.comments || [],
            
            ...taskData
          };
          
          setTicket(mergedData);
          setTicketStatus(mergedData.priority || 'LOW');
          setLifecycle(mergedData.currentStepName || 'Triage Ticket');

          // Initialize requester messages
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
            
            const publicComments = formattedComments.filter(c => !c.isInternal);
            
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

          // Initialize action log
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
              user: mergedData.ticketOwnerName || 'Coordinator',
              role: mergedData.ticketOwnerRole || 'Coordinator',
              action: 'Assigned as Ticket Owner',
              timestamp: new Date(mergedData.createdDate).toLocaleDateString(),
              badge: 'ASSIGNED'
            });
          }
          
          setActionLog(logEntries);
        } else {
          setTicket(null);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading ticket:', error);
        setTicket(null);
        setIsLoading(false);
      }
    };

    if (ticketNumber) {
      loadTicket();
    }
  }, [ticketNumber, currentUser]);

  // Auto-scroll the limited requester thread to bottom on initial load
  // or when collapsing from expanded -> limited so latest messages are visible.
  useEffect(() => {
    const prev = prevShowAllRef.current;
    if (!showAllMessages && requesterThreadRef.current) {
      try {
        requesterThreadRef.current.scrollTop = 0;
      } catch (e) {
        // ignore
      }
    }
    prevShowAllRef.current = showAllMessages;
  }, [showAllMessages, requesterMessages.length]);

  const handleAgentMessageInputChange = (e) => {
    setAgentMessageInput(e.target.value);
    if (e.target.value) {
      startTyping();
    } else {
      stopTyping();
    }
  };

  const handleSendAgentMessage = async () => {
    if (!agentMessageInput.trim()) return;
    
    try {
      await sendAgentMessage(agentMessageInput.trim());
      setAgentMessageInput('');
      stopTyping();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

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

  const handleTransferSuccess = (ticketNumber, result) => {
    setShowTransferModal(false);
    // Add to action log
    setActionLog([
      {
        id: Date.now().toString(),
        user: currentUser?.first_name || 'You',
        role: currentUser?.role || 'Admin',
        action: `Transferred to ${result.new_owner?.name || 'coordinator'}`,
        timestamp: new Date().toLocaleDateString(),
        badge: 'TRANSFERRED'
      },
      ...actionLog
    ]);
    // Update ticket owner in UI
    if (result.new_owner) {
      setTicket(prev => ({
        ...prev,
        ticketOwnerName: result.new_owner.name,
        ticketOwnerId: result.new_owner.user_id
      }));
    }
  };

  if (isLoading) {
    return (
      <div className={styles['detail-container']}>
        <Skeleton height={40} width="60%" />
        <div className={styles['content-wrapper']}>
          <div className={styles['main-panel']}>
            <Skeleton height={200} />
            <Skeleton height={100} />
          </div>
          <div className={styles['right-panel']}>
            <Skeleton height={300} />
          </div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className={styles['detail-container']}>
        <div className={styles['not-found']}>
          <h2>Ticket Not Found</h2>
          <p>Ticket not found</p>
          <button onClick={() => navigate('/admin/assigned-tickets')}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles['detail-container']}>
      {/* Breadcrumb Header */}
      <Breadcrumb
        root="Assigned Tickets"
        currentPage="Ticket Details"
        rootNavigatePage="/admin/assigned-tickets"
        title={`Ticket No. ${ticket.id}`}
      />

      {/* Header badges removed (priority/status shown in Details tab) */}

      {/* Main Content */}
      <div className={styles['content-wrapper']}>
        {/* Left Panel */}
        <div className={styles['main-panel']}>
          {/* Ticket Stage Display */}
          <div className={styles['stage-display']}>
            <label>Stage:</label>
            <span className={styles['stage-value']}>{lifecycle}</span>
          </div>

          {/* Priority display removed (shown in Ticket Details section) */}

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
                <div className={styles['field-group']}>
                  <label>Subject:</label>
                  <p className={styles['field-value']}>{ticket.subject}</p>
                </div>

                <div className={styles['field-group']}>
                  <label>Description:</label>
                  <p className={styles['field-value']}>{ticket.description || 'No description provided'}</p>
                </div>

                <div className={styles['details-grid']}>
                  <div className={styles['field-group']}>
                    <label>Requester:</label>
                    <p className={styles['field-value']}>{ticket.requester}</p>
                  </div>
                  <div className={styles['field-group']}>
                    <label>Department:</label>
                    <p className={styles['field-value']}>{ticket.department}</p>
                  </div>
                  <div className={styles['field-group']}>
                    <label>Category:</label>
                    <p className={styles['field-value']}>{ticket.category}</p>
                  </div>
                  <div className={styles['field-group']}>
                    <label>Sub-Category:</label>
                    <p className={styles['field-value']}>{ticket.subCategory}</p>
                  </div>
                  <div className={styles['field-group']}>
                    <label>Created:</label>
                    <p className={styles['field-value']}>
                      {new Date(ticket.createdDate).toLocaleString()}
                    </p>
                  </div>
                  {ticket.updateDate && (
                    <div className={styles['field-group']}>
                      <label>Last Updated:</label>
                      <p className={styles['field-value']}>
                        {new Date(ticket.updateDate).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : mainTab === 'attachments' ? (
              <div className={styles['attachments-section']}>
                {ticket.attachments && ticket.attachments.length > 0 ? (
                  <div className={styles['attachment-list']}>
                    {ticket.attachments.map((att, index) => {
                      // Convert backend /api/media/... URLs to /media/... for vite proxy
                      let fileUrl = att.file || att.file_url || att.url || '';
                      if (fileUrl.startsWith('/api/media/')) {
                        fileUrl = fileUrl.replace('/api/media/', '/media/');
                      }
                      const fileName = att.file_name || att.filename || `Attachment ${index + 1}`;
                      const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
                      const mimeType = att.file_type || '';
                      const isViewable = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(fileExt)
                        || mimeType.startsWith('image/') || mimeType === 'application/pdf';
                      
                      return (
                        <div key={att.id || index} className={styles['attachment-item']}>
                          <FaFile className={styles['file-icon']} />
                          <span className={styles['attachment-name']}>{fileName}</span>
                          <a 
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles['download-btn']}
                            {...(!isViewable && fileUrl ? { download: fileName } : {})}
                          >
                            {isViewable ? <><FaFile /> View</> : <><FaDownload /> Download</>}
                          </a>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className={styles['no-attachments']}>No attachments</p>
                )}
              </div>
            ) : (
              <div className={styles['requester-messages']}>
                <div className={`${styles['messages-list']} ${showAllMessages ? styles['expanded'] : styles['limited']}`} ref={requesterThreadRef}>
                  {requesterMessages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={`${styles['message-item']} ${msg.isOwn ? styles['own-message'] : ''}`}
                    >
                      <div className={styles['message-header']}>
                        <span className={styles['sender-name']}>{msg.sender}</span>
                        <span className={styles['sender-role']}>({msg.role})</span>
                        <span className={styles['message-time']}>{msg.timestamp} {msg.time}</span>
                      </div>
                      <p className={styles['message-content']}>{msg.content}</p>
                    </div>
                  ))}
                  <div ref={requesterMessagesEndRef} />
                </div>

                {/* Show more/fewer toggle - outside scroll area so it stays at bottom */}
                {requesterMessages.length > 3 && (
                  <div className={styles['show-more']}>
                    <button onClick={() => setShowAllMessages(!showAllMessages)}>
                      {showAllMessages ? 'Show fewer messages' : `Show all ${requesterMessages.length} messages`}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
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
                {/* Priority info removed (displayed in Ticket Details) */}
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

              {/* Admin Actions */}
              <div className={styles['owner-actions']}>
                <h3>Admin Actions</h3>
                <div className={styles['action-buttons']}>
                  {/* Transfer button - Admin can transfer any ticket */}
                  <button
                    className={styles['transfer-btn']}
                    onClick={() => setShowTransferModal(true)}
                  >
                    <span className={styles['btn-icon']}>🔄</span>
                    Transfer Ownership
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className={styles['sidebar-content']}>
              {/* TTS Agent Messages - Real-time WebSocket */}
              <div className={styles['messages-section']}>
                <div className={styles['messages-header']}>
                  <h3>TTS Agent Messages</h3>
                  <span className={`${styles['connection-status']} ${wsConnected ? styles['connected'] : styles['disconnected']}`}>
                    <FaCircle size={8} />
                    {wsConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                
                <div className={styles['message-list']}>
                  {messagingLoading && agentMessages.length === 0 ? (
                    <div className={styles['loading-messages']}>Loading messages...</div>
                  ) : agentMessages.length === 0 ? (
                    <div className={styles['no-messages']}>
                      No messages yet. Start a conversation with TTS agents.
                    </div>
                  ) : (
                    agentMessages.map((msg) => {
                      const isOwnMessage = msg.user_id === (currentUser?.id || currentUser?.user_id);
                      return (
                        <div 
                          key={msg.message_id || msg.id} 
                          className={`${styles['msg-item']} ${isOwnMessage ? styles['msg-own'] : ''}`}
                        >
                          <div className={styles['msg-sender']}>
                            {msg.sender || 'Unknown'}
                            {msg.sender_role && <span className={styles['msg-role']}> ({msg.sender_role})</span>}
                          </div>
                          <p className={styles['msg-text']}>{msg.message || msg.content}</p>
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className={styles['msg-attachments']}>
                              {msg.attachments.map((att, idx) => (
                                <span key={att.attachment_id || idx} className={styles['attachment-tag']}>
                                  📎 {att.filename}
                                </span>
                              ))}
                            </div>
                          )}
                          <span className={styles['msg-time']}>
                            {msg.created_at 
                              ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : msg.time}
                            {msg.is_edited && <span className={styles['edited-tag']}> (edited)</span>}
                          </span>
                        </div>
                      );
                    })
                  )}
                  
                  {/* Typing indicator */}
                  {typingUsers.length > 0 && (
                    <div className={styles['typing-indicator']}>
                      {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>

                {/* Send Message */}
                <div className={styles['send-msg-form']}>
                  <textarea
                    value={agentMessageInput}
                    onChange={handleAgentMessageInputChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendAgentMessage();
                      }
                    }}
                    placeholder="Type a message to TTS agents..."
                    className={styles['msg-textarea']}
                    rows="3"
                    disabled={!wsConnected}
                  />
                  <button
                    className={styles['send-msg-btn']}
                    onClick={handleSendAgentMessage}
                    disabled={!agentMessageInput.trim() || !wsConnected}
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transfer Modal */}
      {showTransferModal && ticket && (
        <TransferTicketModal
          ticket={ticket}
          onClose={() => setShowTransferModal(false)}
          onSuccess={handleTransferSuccess}
        />
      )}

      <ToastContainer />
    </div>
  );
};

export default AdminAssignedTicketDetail;
