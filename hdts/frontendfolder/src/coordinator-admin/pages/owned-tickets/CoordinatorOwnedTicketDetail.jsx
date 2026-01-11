import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaPaperclip, FaDownload, FaFile, FaCircle } from 'react-icons/fa';
import { ToastContainer } from 'react-toastify';
import styles from './CoordinatorOwnedTicketDetail.module.css';
import { backendTicketService } from '../../../services/backend/ticketService';
import { useAuth } from '../../../context/AuthContext';
import { mockOwnedTickets, coordinatorTicketActions, coordinatorMessages, requesterMessages as mockRequesterMessages } from '../../../mock-data/ownedTickets';
import Breadcrumb from '../../../shared/components/Breadcrumb';
import Skeleton from '../../../shared/components/Skeleton/Skeleton';
import { API_CONFIG } from '../../../config/environment';
import { useMessaging } from '../../../shared/hooks/messaging';
import EscalateTicketModal from '../../components/modals/EscalateTicketModal';
import TransferTicketModal from '../../components/modals/TransferTicketModal';
import WorkflowVisualizer2 from '../../../shared/components/WorkflowVisualizer/WorkflowVisualizer2';
import { useWorkflowProgress } from '../../../shared/hooks/useWorkflowProgress';
import { MessageBubble, MessageInput, DateDivider } from '../../../shared/components/Messaging';
import 'react-toastify/dist/ReactToastify.css';

const CoordinatorOwnedTicketDetail = () => {
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
  const [requesterAttachments, setRequesterAttachments] = useState([]);
  const fileInputRef = useRef(null);
  const [showAllMessages, setShowAllMessages] = useState(false);
  
  // HTTP-based typing indicator for requester communication
  const [employeeTyping, setEmployeeTyping] = useState(null);
  const typingTimeoutRef = useRef(null);
  
  // TTS Agent messaging input
  const [agentMessageInput, setAgentMessageInput] = useState('');
  const [agentAttachments, setAgentAttachments] = useState([]);
  const messagesEndRef = useRef(null);
  const agentMessagesContainerRef = useRef(null);
  // Requester message thread scrolling refs
  const requesterThreadRef = useRef(null);
  const requesterMessagesEndRef = useRef(null);
  const prevShowAllRef = useRef(undefined);

  // Priority and status states
  const [ticketStatus, setTicketStatus] = useState('LOW');
  const [lifecycle, setLifecycle] = useState('Triage Ticket');

  // Action log
  const [actionLog, setActionLog] = useState([]);

  // Modal states for ticket owner management
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Real-time messaging with TTS agents
  const userDisplayName = `${currentUser?.first_name || ''} ${currentUser?.last_name || ''}`.trim() || 
    currentUser?.username || currentUser?.email || 'Coordinator';

  // Fetch workflow visualization data for this ticket
  const { tracker: workflowData, loading: workflowLoading, error: workflowError } = useWorkflowProgress(ticketNumber);

  // Helpers: normalize text and build full name including middle name
  const normalizeText = (t) => {
    if (!t && t !== 0) return '';
    try {
      return String(t).replace(/\s+/g, ' ').trim();
    } catch (e) {
      return String(t || '');
    }
  };

  const buildFullName = (user) => {
    if (!user) return null;
    if (typeof user === 'string') return normalizeText(user);
    const first = user.first_name || user.firstName || user.name || user.full_name || '';
    const middle = user.middle_name || user.middleName || '';
    const last = user.last_name || user.lastName || '';
    const combined = `${first} ${middle} ${last}`;
    const cleaned = normalizeText(combined);
    return cleaned || null;
  };

  const formatDateTime = (d) => {
    try {
      const dt = new Date(d);
      const pad = (n) => String(n).padStart(2, '0');
      const day = pad(dt.getDate());
      const month = pad(dt.getMonth() + 1);
      const year = dt.getFullYear();
      const hours = pad(dt.getHours());
      const minutes = pad(dt.getMinutes());
      const seconds = pad(dt.getSeconds());
      return `${day}/${month}/${year} at ${hours}:${minutes}:${seconds}`;
    } catch (e) {
      return String(d);
    }
  };
  
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
    ticketNumber, // Use ticket number as the messaging ticket ID
    userDisplayName, // Use display name for typing indicators
    {
      name: userDisplayName,
      role: 'HDTS: Ticket Coordinator',
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
          // Build ticket owner full name from taskData if available
          // For owned tickets page, the current user IS the ticket owner, so use that as fallback
          const ticketOwnerFullName = taskData?.ticket_owner_full_name 
            || (taskData?.ticket_owner_first_name || taskData?.ticket_owner_last_name
                ? `${taskData?.ticket_owner_first_name || ''} ${taskData?.ticket_owner_middle_name || ''} ${taskData?.ticket_owner_last_name || ''}`.replace(/\s+/g, ' ').trim()
                : null)
            || taskData?.ticket_owner_name
            // On owned tickets page, the current user IS the owner - use their name
            || buildFullName(currentUser)
            || `${currentUser?.first_name || ''} ${currentUser?.middle_name || ''} ${currentUser?.last_name || ''}`.replace(/\s+/g, ' ').trim()
            || (typeof helpdeskData?.assigned_to === 'string' ? helpdeskData.assigned_to : null)
            || null;
          
          const mergedData = {
            // Task/workflow info (from workflow_api)
            taskId: taskData?.task_id,
            ticketOwnerId: taskData?.ticket_owner_id,
            ticketOwnerName: taskData?.ticket_owner_name,
            ticketOwnerFullName: ticketOwnerFullName,
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
            
            // Assigned to (from helpdesk) - handle both string and object formats
            // StringRelatedField returns a string like "Maria Garcia", 
            // while nested serializer returns an object with first_name, etc.
            assignedTo: helpdeskData?.assigned_to 
              ? (typeof helpdeskData.assigned_to === 'string' 
                  ? helpdeskData.assigned_to 
                  : `${helpdeskData.assigned_to.first_name || ''} ${helpdeskData.assigned_to.middle_name || ''} ${helpdeskData.assigned_to.last_name || ''}`.replace(/\s+/g, ' ').trim())
              : taskData?.ticket_owner_name || taskData?.assigned_to || 'N/A',
            
            // Attachments (from helpdesk)
            attachments: helpdeskData?.attachments || [],
            
            // Comments (from helpdesk)
            comments: helpdeskData?.comments || [],
            
            // Additional ticket fields (from helpdesk)
            assetName: helpdeskData?.asset_name,
            assetId: helpdeskData?.asset_id,
            serialNumber: helpdeskData?.serial_number,
            location: helpdeskData?.location,
            checkOutDate: helpdeskData?.check_out_date,
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
          setTicketStatus(mergedData.priority || 'LOW');
          setLifecycle(mergedData.currentStepName || 'Triage Ticket');

          // Use real comments from helpdesk if available
          if (helpdeskData?.comments && helpdeskData.comments.length > 0) {
            // In the helpdesk system:
            // - "employee" is the person who CREATED/SUBMITTED the ticket (the requester) = "Ticket Owner" in business terms
            // - Staff members responding are "Employees" from coordinator's view
            const requesterId = helpdeskData?.employee?.id; // The ticket requester's ID
            
            // Build full name for the ticket requester (stored in employee field)
            const requester = helpdeskData?.employee || {};
            const requesterFullName = buildFullName(requester) 
              || requester.full_name 
              || requester.fullName 
              || requester.name 
              || `${requester.first_name || ''} ${requester.middle_name || ''} ${requester.last_name || ''}`.replace(/\s+/g, ' ').trim()
              || requester.username
              || mergedData.requester 
              || 'Unknown';

            const formattedComments = helpdeskData.comments.map(comment => {
              const user = comment.user || {};
              const userId = user?.id || comment.user_id;
              const isSystem = !!comment.system || comment.is_system || (comment.comment || '').includes('Thank you for your message');
              
              // Check if this comment is from the ticket requester (the "Ticket Owner")
              const isTicketRequester = userId && requesterId && String(userId) === String(requesterId);
              
              // Build full name from the comment's user object
              const commentUserFullName = buildFullName(user) 
                || user.full_name 
                || user.fullName 
                || user.name 
                || `${user.first_name || ''} ${user.middle_name || ''} ${user.last_name || ''}`.replace(/\s+/g, ' ').trim()
                || user.username;
              
              // Determine display name
              let fullName;
              if (isSystem) {
                fullName = 'Support Team';
              } else if (isTicketRequester) {
                // Use the requester's full name
                fullName = requesterFullName;
              } else {
                // Staff member - use their name from the comment user object
                fullName = commentUserFullName || 'Staff Member';
              }
              
              // Determine role label
              let roleLabel;
              if (isSystem) {
                roleLabel = 'System';
              } else if (isTicketRequester) {
                roleLabel = 'Ticket Owner';
              } else {
                roleLabel = 'Employee';
              }
              
              // Internal messages should not be seen by ticket owner
              const isInternal = !!comment.is_internal || isSystem;
              
              return {
                id: comment.id,
                sender: fullName,
                role: roleLabel,
                datetime: formatDateTime(comment.created_at || comment.createdAt || new Date()),
                content: normalizeText(comment.comment || comment.message || ''),
                isInternal: isInternal,
                isOwn: user?.id === currentUser?.id,
                system: isSystem,
              };
            });

            // For admin/coordinator view we show all comments (both public and internal), marking internal ones.
            setRequesterMessages(formattedComments.length > 0 ? formattedComments : [{
              id: '1',
              sender: requesterFullName,
              role: 'Ticket Owner',
              datetime: formatDateTime(mergedData.createdDate),
              content: normalizeText(mergedData.description || 'No description provided'),
              isOwn: false
            }]);
          } else {
            // Initialize requester messages only (agent messages use real-time WebSocket)
            // In the fallback case, use the requester/employee info for ticket owner display
            const emp = mergedData.employee || {};
            const requesterFullName = buildFullName(emp) 
              || emp.full_name 
              || emp.name 
              || mergedData.requester 
              || 'Unknown';
            setRequesterMessages([{
              id: '1',
              sender: requesterFullName,
              role: 'Ticket Owner',
              datetime: formatDateTime(mergedData.createdDate),
              content: normalizeText(mergedData.description || 'No description provided'),
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
            // Build full name for action log
            const ownerFullName = mergedData.ticketOwnerFullName 
              || mergedData.ticketOwnerName 
              || buildFullName(currentUser) 
              || `${currentUser?.first_name || ''} ${currentUser?.middle_name || ''} ${currentUser?.last_name || ''}`.replace(/\s+/g, ' ').trim() 
              || 'You';
            logEntries.push({
              id: '1',
              user: ownerFullName,
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

  // HTTP-based polling for employee typing status (for requester communication)
  useEffect(() => {
    if (!ticketNumber || !currentUser?.id) return;

    const pollEmployeeTypingStatus = async () => {
      try {
        const result = await backendTicketService.getTypingStatus(ticketNumber, currentUser.id);
        if (result?.is_typing && result?.user_name) {
          setEmployeeTyping(result.user_name);
        } else {
          setEmployeeTyping(null);
        }
      } catch (err) {
        // Silently ignore typing status errors
      }
    };

    // Poll every 2 seconds
    const interval = setInterval(pollEmployeeTypingStatus, 2000);
    pollEmployeeTypingStatus(); // Initial poll

    return () => clearInterval(interval);
  }, [ticketNumber, currentUser?.id]);

  // Send typing status to backend when coordinator types in requester reply box
  const handleRequesterTypingStart = () => {
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Send typing indicator to backend
    backendTicketService.setTypingStatus(ticketNumber, true, currentUser?.id, userDisplayName).catch(() => {});
    
    // Auto-stop typing after 3 seconds of no input
    typingTimeoutRef.current = setTimeout(() => {
      backendTicketService.setTypingStatus(ticketNumber, false, currentUser?.id, userDisplayName).catch(() => {});
    }, 3000);
  };

  const handleRequesterTypingStop = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    backendTicketService.setTypingStatus(ticketNumber, false, currentUser?.id, userDisplayName).catch(() => {});
  };

  const handleAttachClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFilesSelected = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setRequesterAttachments((prev) => [...prev, ...files]);
    }
    // reset input so same file can be selected again if removed
    e.target.value = '';
  };

  const removeAttachment = (index) => {
    setRequesterAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Send message to TTS agents via real-time WebSocket with attachment support
  const handleSendAgentMessage = async () => {
    if (!agentMessageInput.trim() && agentAttachments.length === 0) return;
    
    try {
      stopTyping();
      await sendAgentMessage(agentMessageInput.trim(), agentAttachments);
      setAgentMessageInput('');
      setAgentAttachments([]);
    } catch (err) {
      console.error('Failed to send message:', err);
      // Optionally show error toast
    }
  };

  // Handle typing indicator for agent messages
  const handleAgentMessageInputChange = (value) => {
    setAgentMessageInput(value);
    if (value.trim()) {
      startTyping();
    } else {
      stopTyping();
    }
  };

  // Helper for date comparison (for message grouping)
  const isSameDay = (d1, d2) => {
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    return date1.toDateString() === date2.toDateString();
  };

  const handleSendRequesterMessage = async () => {
    if (replyContent.trim() || requesterAttachments.length > 0) {
      handleRequesterTypingStop(); // Stop typing indicator via HTTP

      // Create preview URLs for optimistic display
      const previewAttachments = requesterAttachments.map((f) => ({
        filename: f.name,
        previewUrl: URL.createObjectURL(f),
        uploading: true,
      }));

      const tempId = `temp-${Date.now()}`;
      const newMsg = {
        id: tempId,
        sender: currentUser?.first_name || 'You',
        role: currentUser?.role || 'Coordinator',
        timestamp: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        content: replyContent,
        attachments: previewAttachments,
        isOwn: true,
      };

      // Optimistically add to UI
      setRequesterMessages((prev) => [...prev, newMsg]);
      const messageToSend = replyContent;
      setReplyContent('');

      // Persist to backend so employee can see the message
      try {
        const ticketId = helpdeskTicket?.id || ticket?.id || ticket?.ticketId;
        if (ticketId) {
          if (requesterAttachments.length === 0) {
            await backendTicketService.createComment(ticketId, messageToSend, false);
          } else {
            // Send first attachment with the comment, then any remaining attachments as separate comments
            const [first, ...rest] = requesterAttachments;
            try {
              await backendTicketService.createCommentWithAttachment(ticketId, messageToSend, first, false);
            } catch (e) {
              console.warn('Failed to upload first attachment:', e);
            }
            for (const file of rest) {
              try {
                await backendTicketService.createCommentWithAttachment(ticketId, '', file, false);
              } catch (e) {
                console.warn('Failed to upload attachment:', e);
              }
            }

            // clear attachments after sending
            setRequesterAttachments([]);
          }

          // After uploads complete, refresh comments to get canonical server data
          try {
            await refreshComments();
          } catch (e) {
            console.warn('Failed to refresh comments after upload:', e);
          }

          // Revoke preview object URLs to avoid memory leak
          try {
            previewAttachments.forEach(a => { if (a.previewUrl) URL.revokeObjectURL(a.previewUrl); });
          } catch (e) {
            // ignore
          }

          console.log('Comment and attachments uploaded');
        }
      } catch (error) {
        console.error('Failed to send comment to backend:', error);
        // Message is already added to UI, so we don't need to remove it
      }
    }
  };

  // Function to refresh comments from backend
  const refreshComments = async () => {
    try {
      const tktNum = ticketNumber || ticket?.ticket_number || ticket?.ticketNumber;
      if (!tktNum) return;
      
      const helpdeskData = await backendTicketService.getHelpdeskTicketByNumber(tktNum);
      
      if (helpdeskData?.comments && helpdeskData.comments.length > 0) {
        const formattedComments = helpdeskData.comments.map(comment => {
          // Backend returns singular attachment/attachment_name fields, not an array
          const attachments = [];
          if (comment.attachment) {
            // Backend returns /media/... URLs - these go through Vite's /media proxy directly
            // Don't prepend /helpdesk as that's a different proxy route
            let fileUrl = comment.attachment;
            if (fileUrl.startsWith('http')) {
              // Already absolute URL - extract path for proxy
              try {
                const urlObj = new URL(fileUrl);
                fileUrl = urlObj.pathname;
              } catch (e) {
                // keep as-is
              }
            }
            // The backend returns /api/media/... but vite proxy expects /media/...
            // Convert /api/media/... to /media/... so proxy can route correctly
            if (fileUrl.startsWith('/api/media/')) {
              fileUrl = fileUrl.replace('/api/media/', '/media/');
            }
            attachments.push({
              id: comment.id,
              file: fileUrl,
              filename: comment.attachment_name || comment.attachment.split('/').pop() || 'attachment',
              type: comment.attachment_type || ''
            });
          }
          // Also check for attachments array in case backend changes
          if (Array.isArray(comment.attachments) && comment.attachments.length > 0) {
            comment.attachments.forEach(att => {
              attachments.push({
                id: att.id || att.attachment_id,
                file: att.previewUrl || att.file || att.file_url || att.url || att.download_url || att.path || null,
                filename: att.filename || att.file_name || att.name || 'attachment'
              });
            });
          }
          
          return {
            id: comment.id,
            sender: comment.user 
              ? `${comment.user.first_name || ''} ${comment.user.last_name || ''}`.trim() || 'Unknown'
              : 'Unknown',
            role: comment.user?.role || 'Employee',
            timestamp: new Date(comment.created_at).toLocaleDateString(),
            time: new Date(comment.created_at).toLocaleTimeString(),
            content: comment.comment,
            isInternal: comment.is_internal,
            isOwn: comment.user?.id === currentUser?.id || comment.user_cookie_id === currentUser?.id,
            attachments
          };
        });
        
        const publicComments = formattedComments.filter(c => !c.isInternal);
        setRequesterMessages(publicComments);

        // Update the ticket object so the agent messages pane (which falls back to ticket.comments)
        // immediately sees the newly returned comments/attachments without requiring a full page reload.
        setTicket((prev) => ({
          ...(prev || {}),
          comments: helpdeskData.comments
        }));

        // Helpful debug: expose the raw returned comments to console when attachments are involved
        try {
          const hadAttachments = helpdeskData.comments.some(c => (c.attachments || c.files || []).length > 0);
          if (hadAttachments) console.debug('refreshComments: got helpdesk comments with attachments', helpdeskData.comments);
        } catch (e) {
          // ignore
        }
      }
    } catch (error) {
      console.error('Failed to refresh comments:', error);
    }
  };

  // Poll for new comments every 10 seconds when on messages tab
  useEffect(() => {
    if (activeTab !== 'messages' && mainTab !== 'requester') return;
    
    const interval = setInterval(refreshComments, 10000);
    return () => clearInterval(interval);
  }, [activeTab, mainTab, ticketNumber, currentUser?.id]);

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

  // Render all messages in the DOM; CSS controls the visible area.
  const displayedRequesterMessages = requesterMessages;

  // Auto-scroll the limited requester thread to bottom on initial load
  // or when collapsing from expanded -> limited so latest messages are visible.
  useEffect(() => {
    const prev = prevShowAllRef.current;
    // Start limited view scrolled to top so users see the beginning of the thread.
    if (!showAllMessages && requesterThreadRef.current) {
      try {
        requesterThreadRef.current.scrollTop = 0;
      } catch (e) {
        // ignore
      }
    }
    prevShowAllRef.current = showAllMessages;
  }, [showAllMessages, requesterMessages.length]);

  // Agent messages: ONLY show real-time/TTS agent messages
  // Do NOT fall back to helpdesk comments - those are for Requester Communication tab only
  const displayedAgentMessages = (agentMessages && agentMessages.length > 0)
    ? agentMessages
    : [];

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

  // Determine user permissions for escalation/transfer
  // Use is_owner and is_admin flags from the API response (set by backend after validation)
  // IMPORTANT: On the Owned Tickets page, the current user IS the ticket owner by definition
  // (the page only shows tickets owned by the current user), so we default to true here
  // when the workflow API is unavailable (is_owner flag not set)
  const isTicketOwner = ticket?.is_owner === true || ticket?.is_owner === undefined;
  const isAdminFromAPI = ticket?.is_admin === true;
  
  // Fallback: Check if user is a Ticket Coordinator - case-insensitive comparison
  const userRole = currentUser?.role || '';
  const isTicketCoordinator = userRole.toLowerCase() === 'ticket coordinator' || 
                              currentUser?.roles?.some(r => {
                                const roleName = typeof r === 'string' ? r : r.role || r.role_name || '';
                                return roleName.toLowerCase() === 'ticket coordinator';
                              });
  
  // Check if user is an Admin (System Admin or Admin) - use API flag if available, fallback to local check
  const isAdmin = isAdminFromAPI || 
                  userRole.toLowerCase() === 'admin' || 
                  userRole.toLowerCase() === 'system admin' ||
                  currentUser?.roles?.some(r => {
                    const roleName = typeof r === 'string' ? r : r.role || r.role_name || '';
                    return roleName.toLowerCase() === 'admin' || roleName.toLowerCase() === 'system admin';
                  });

  // Debug logging for permission checks
  console.log('Ticket Owner Actions - Permission Check:', {
    isTicketOwner,
    isAdminFromAPI,
    isTicketCoordinator,
    isAdmin,
    userRole,
    ticketFlags: ticket ? { is_owner: ticket.is_owner, is_admin: ticket.is_admin } : null
  });

  // Handlers for escalation and transfer modals
  const handleEscalateSuccess = (ticketNumber, result) => {
    setShowEscalateModal(false);
    // Add to action log
    setActionLog([
      {
        id: Date.now().toString(),
        user: currentUser?.first_name || 'You',
        role: currentUser?.role || 'Coordinator',
        action: `Escalated to ${result.new_owner?.name || 'another coordinator'}`,
        timestamp: new Date().toLocaleDateString(),
        badge: 'ESCALATED'
      },
      ...actionLog
    ]);
    // Navigate back to owned tickets since we're no longer the owner
    setTimeout(() => {
      navigate('/admin/owned-tickets');
    }, 2000);
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
    // Reload the page to show updated owner
    setTimeout(() => {
      window.location.reload();
    }, 2000);
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
      {/* Breadcrumb Header */}
      <Breadcrumb
        root="Owned Tickets"
        currentPage="Ticket Details"
        rootNavigatePage="/admin/owned-tickets"
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

          {/* Workflow Visualizer - shows the ticket's progress through the TTS workflow */}
          {workflowData && !workflowError && (
            <div className={styles['workflow-section']}>
              <WorkflowVisualizer2 workflowData={workflowData} ticketStatus={ticket?.status} />
            </div>
          )}

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
                {/* Subject */}
                <div className={styles['field-group']}>
                  <label>Subject:</label>
                  <p className={styles['field-value']}>{ticket.subject}</p>
                </div>

                {/* Description */}
                <div className={styles['field-group']}>
                  <label>Description:</label>
                  <p className={styles['field-value']}>{ticket.description}</p>
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
                    {ticket.assetId && (
                      <div>
                        <label>Asset ID:</label>
                        <p>{ticket.assetId}</p>
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
                    {ticket.checkOutDate && (
                      <div>
                        <label>Check Out Date:</label>
                        <p>{ticket.checkOutDate}</p>
                      </div>
                    )}
                    {ticket.expectedReturnDate && (
                      <div>
                        <label>Expected Return Date:</label>
                        <p>{ticket.expectedReturnDate}</p>
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
                      // Convert backend URLs to use /media proxy route
                      let fileUrl = attachment.file || '';
                      if (fileUrl.startsWith('http')) {
                        try {
                          const urlObj = new URL(fileUrl);
                          fileUrl = urlObj.pathname;
                        } catch (e) {
                          // keep as-is
                        }
                      }
                      // The backend returns /api/media/... but vite proxy expects /media/...
                      // Convert /api/media/... to /media/... so proxy can route correctly
                      if (fileUrl.startsWith('/api/media/')) {
                        fileUrl = fileUrl.replace('/api/media/', '/media/');
                      }
                      const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
                      const mimeType = attachment.file_type || '';
                      const isViewable = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(fileExt)
                        || mimeType.startsWith('image/') || mimeType === 'application/pdf';
                      
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
                            {...(!isViewable && fileUrl ? { download: fileName } : {})}
                          >
                            {isViewable ? <><FaFile /> View</> : <><FaDownload /> Download</>}
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
                <div className={`${styles['message-thread']} ${showAllMessages ? styles['expanded'] : styles['limited']}`} ref={requesterThreadRef}>
                  {displayedRequesterMessages.map((msg) => (
                    <div key={msg.id} className={`${styles['message']} ${msg.isOwn ? styles['own'] : ''}`}>
                      <div className={styles['message-header']}>
                        <div className={styles['sender']}>{msg.sender}{msg.isInternal ? ' (this message should not be seen by the Ticket Owner)' : ''}</div>
                        <div className={styles['role']}>({msg.role})</div>
                        <div className={styles['timestamp']}>{msg.datetime || `${msg.timestamp} at ${msg.time}`}</div>
                      </div>
                      <div className={styles['message-body']}>{msg.content}</div>
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className={styles['message-attachments']}>
                          {msg.attachments.map((att, idx) => {
                            // The file URL should already be normalized from refreshComments
                            const fileUrl = att.file || att.previewUrl || null;
                            const displayName = att.filename || 'attachment';
                            const fileExt = displayName.split('.').pop()?.toLowerCase() || '';
                            const mimeType = att.type || '';
                            // Viewable files should open in new tab without download prompt
                            const isViewable = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(fileExt) 
                              || mimeType.startsWith('image/') || mimeType === 'application/pdf';
                            
                            return (
                              <div key={att.id || `${displayName}-${idx}`} className={styles['attachment-inline']}>
                                <a 
                                  href={fileUrl || '#'} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className={styles['attachment-link']}
                                  {...(!isViewable && fileUrl ? { download: displayName } : {})}
                                >
                                  {isViewable ? '🔗' : '📎'} {displayName}
                                </a>
                                {att.uploading && <span className={styles['uploading-tag']}> uploading...</span>}
                              </div>
                            );
                          })}
                        </div>
                      )}
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

                {/* Reply Section */}
                <div className={styles['reply-section']}>
                  <div className={styles['reply-to']}>
                    To: <strong>{buildFullName(ticket?.employee) || ticket?.requester || 'Requester'}</strong>
                    {employeeTyping && (
                      <span className={styles['typing-hint']}> — {employeeTyping} is typing...</span>
                    )}
                  </div>
                  <textarea
                    value={replyContent}
                    onChange={(e) => { setReplyContent(e.target.value); handleRequesterTypingStart(); }}
                    onBlur={handleRequesterTypingStop}
                    placeholder="Type your message..."
                    className={styles['reply-textarea']}
                    rows="4"
                  />
                  <div className={styles['reply-actions']}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      style={{ display: 'none' }}
                      onChange={handleFilesSelected}
                    />
                    <button type="button" className={styles['attach-btn']} onClick={handleAttachClick}>
                      📎 Attach files
                    </button>
                    {requesterAttachments && requesterAttachments.length > 0 && (
                      <div className={styles['attached-list']}>
                        {requesterAttachments.map((f, i) => (
                          <div key={`${f.name}-${i}`} className={styles['attached-item']}>
                            <span className={styles['attached-name']}>{f.name}</span>
                            <button type="button" className={styles['remove-attach']} onClick={() => removeAttachment(i)}>Remove</button>
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      className={styles['send-btn']}
                      onClick={handleSendRequesterMessage}
                      disabled={!replyContent.trim() && requesterAttachments.length === 0}
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
                  <p>{ticket.ticketOwnerFullName || ticket.ticketOwnerName || ticket.assignedTo || 'N/A'}</p>
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

              {/* Ticket Owner Management Actions */}
              <div className={styles['owner-actions']}>
                <h3>Ticket Owner Actions</h3>
                <div className={styles['action-buttons']}>
                  {/* Escalate button - only for ticket owner who is a coordinator */}
                  {isTicketOwner && isTicketCoordinator && (
                    <button
                      className={styles['escalate-btn']}
                      onClick={() => setShowEscalateModal(true)}
                    >
                      <span className={styles['btn-icon']}>⬆️</span>
                      Escalate Ownership
                    </button>
                  )}
                  
                  {/* Transfer button - for admins (can transfer any ticket) */}
                  {isAdmin && (
                    <button
                      className={styles['transfer-btn']}
                      onClick={() => setShowTransferModal(true)}
                    >
                      <span className={styles['btn-icon']}>🔄</span>
                      Transfer Ownership
                    </button>
                  )}

                  {/* Show message if owner but no actions available */}
                  {!isTicketCoordinator && !isAdmin && (
                    <p className={styles['no-actions-text']}>
                      No owner management actions available for your role.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className={styles['sidebar-content']}>
              {/* TTS Agent Messages - Real-time WebSocket with improved UI */}
              <div className={styles['messages-section']}>
                <div className={styles['messages-header']}>
                  <h3>TTS Agent Messages</h3>
                  <span className={`${styles['connection-status']} ${wsConnected ? styles['connected'] : styles['disconnected']}`}>
                    <FaCircle size={8} />
                    {wsConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                
                <div className={styles['message-list']} ref={agentMessagesContainerRef}>
                  {messagingLoading && displayedAgentMessages.length === 0 ? (
                    <div className={styles['loading-messages']}>
                      <div className={styles['loading-spinner']}></div>
                      <p>Loading messages...</p>
                    </div>
                  ) : displayedAgentMessages.length === 0 ? (
                    <div className={styles['no-messages']}>
                      <div className={styles['empty-icon']}>💬</div>
                      <p>No messages yet</p>
                      <span>Start a conversation with TTS agents!</span>
                    </div>
                  ) : (
                    <>
                      {displayedAgentMessages.map((msg, index) => {
                        const isOwnMessage = String(msg.user_id || msg.user?.id) === String(currentUser?.id || currentUser?.user_id);
                        
                        // Grouping logic
                        const prevMsg = displayedAgentMessages[index - 1];
                        const nextMsg = displayedAgentMessages[index + 1];
                        
                        const isFirstInGroup = !prevMsg || 
                          String(prevMsg.user_id) !== String(msg.user_id) || 
                          !isSameDay(prevMsg.created_at, msg.created_at);
                        
                        const isLastInGroup = !nextMsg || 
                          String(nextMsg.user_id) !== String(msg.user_id) || 
                          !isSameDay(nextMsg.created_at, msg.created_at);
                        
                        // Date divider logic
                        const showDateDivider = !prevMsg || !isSameDay(prevMsg.created_at, msg.created_at);

                        return (
                          <React.Fragment key={msg.message_id || msg.id}>
                            {showDateDivider && <DateDivider date={msg.created_at} />}
                            <MessageBubble
                              message={msg}
                              isOwn={isOwnMessage}
                              currentUserId={currentUser?.id || currentUser?.user_id}
                              currentUserData={currentUser}
                              isFirstInGroup={isFirstInGroup}
                              isLastInGroup={isLastInGroup}
                            />
                          </React.Fragment>
                        );
                      })}
                    </>
                  )}
                  
                  {/* Typing indicator */}
                  {typingUsers.length > 0 && (
                    <div className={styles['typing-indicator-wrapper']}>
                      <div className={styles['typing-dots']}>
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                      <span className={styles['typing-text']}>
                        {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                      </span>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>

                {/* Improved Message Input with attachments and emoji support */}
                <MessageInput
                  message={agentMessageInput}
                  setMessage={handleAgentMessageInputChange}
                  attachments={agentAttachments}
                  setAttachments={setAgentAttachments}
                  onSend={handleSendAgentMessage}
                  onTyping={startTyping}
                  onStopTyping={stopTyping}
                  isLoading={messagingLoading}
                  disabled={!wsConnected}
                  placeholder="Type a message to TTS agents..."
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Escalate Modal */}
      {showEscalateModal && ticket && (
        <EscalateTicketModal
          ticket={ticket}
          onClose={() => setShowEscalateModal(false)}
          onSuccess={handleEscalateSuccess}
        />
      )}

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

export default CoordinatorOwnedTicketDetail;
