import { useState, useEffect, useRef } from 'react';
import { backendTicketService } from '../../../services/backend/ticketService';
import { addComment, getTicketByNumber } from '../../../utilities/storages/ticketStorage';
import { FiPaperclip, FiSend, FiChevronDown, FiDownload, FiFile, FiX } from 'react-icons/fi';
import { FaFileImage, FaFilePdf, FaFileWord, FaFileExcel, FaFileCsv } from 'react-icons/fa';
import styles from './TicketMessaging.module.css';

const formatTimestamp = () => {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatTimestampFromISO = (iso) => {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return String(iso);
  }
};

// Get initials from sender name
const getInitials = (name) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// Normalize names and text: collapse multiple spaces and trim
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
  const last = user.last_name || user.lastName || '';
  const combined = `${first} ${last}`;
  const cleaned = normalizeText(combined);
  return cleaned || null;
};

export default function TicketMessaging({ initialMessages = [], ticketId = null, ticketNumber = null }) {
  const [messages, setMessages] = useState(
    initialMessages.map(msg => ({
      ...msg,
      // Prefer explicit timestamp, then created_at/createdAt formatted as time, else fallback to now
      timestamp: msg.timestamp || (msg.created_at ? formatTimestampFromISO(msg.created_at) : (msg.createdAt ? formatTimestampFromISO(msg.createdAt) : formatTimestamp()))
    }))
  );
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  // HTTP-based typing indicator state
  const [typingUser, setTypingUser] = useState(null);
  
  const messagesEndRef = useRef(null);
  const chatMessagesRef = useRef(null);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Get current user id for excluding self from typing indicators
  let currentUserId = null;
  let currentUserName = 'Employee';
  try {
    const u = localStorage.getItem('user');
    if (u) {
      const parsed = JSON.parse(u);
      currentUserId = parsed?.id || parsed?.user_id || parsed?.username || parsed?.email || 'employee';
      currentUserName = buildFullName(parsed) || parsed?.username || parsed?.email || 'Employee';
    }
  } catch (e) {
    currentUserId = 'employee';
  }

  const wsTicketId = ticketNumber || ticketId || null;

  // Poll for typing status every 2 seconds
  useEffect(() => {
    if (!wsTicketId) return;
    
    const pollTypingStatus = async () => {
      try {
        const result = await backendTicketService.getTypingStatus(wsTicketId, currentUserId);
        if (result?.is_typing && result?.user_name) {
          setTypingUser(result.user_name);
        } else {
          setTypingUser(null);
        }
      } catch (e) {
        // Silently fail
      }
    };
    
    pollTypingStatus();
    const interval = setInterval(pollTypingStatus, 2000);
    return () => clearInterval(interval);
  }, [wsTicketId, currentUserId]);

  // Send typing status when user types
  const handleTypingStart = () => {
    if (!wsTicketId) return;
    backendTicketService.setTypingStatus(wsTicketId, true, currentUserId, currentUserName);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Auto-stop typing after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      backendTicketService.setTypingStatus(wsTicketId, false, currentUserId, currentUserName);
    }, 3000);
  };

  const handleTypingStop = () => {
    if (!wsTicketId) return;
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    backendTicketService.setTypingStatus(wsTicketId, false, currentUserId, currentUserName);
  };

  // Poll for new messages from coordinator every 10 seconds
  useEffect(() => {
    if (!ticketNumber && !ticketId) return;
    
    const fetchNewMessages = async () => {
      try {
        const tktNum = ticketNumber || ticketId;
        const response = await backendTicketService.getTicketByNumber(tktNum);
        if (response?.comments && response.comments.length > 0) {
          // Determine ticket owner/requester name (prefer structured names)
          let ticketOwnerName = null;
          if (response.requester) {
            ticketOwnerName = buildFullName(response.requester) || response.requester?.full_name || response.requester?.requester_name || null;
          }
          ticketOwnerName = ticketOwnerName || response.requester_name || response.requesterName || null;
          // Filter out internal comments
          const visibleComments = response.comments.filter(c => !c.is_internal && !c.isInternal);
          
          // Format comments
          const formattedMessages = visibleComments.map(comment => {
            const commentUser = comment.user || {};
            const role = (commentUser.role || '').toLowerCase();

            // Resolve current user id from local storage (if available)
            let currentUserId = null;
            try {
              const stored = localStorage.getItem('user');
              if (stored) {
                const parsed = JSON.parse(stored);
                currentUserId = parsed?.id || parsed?.user_id || null;
              }
            } catch (e) {
              currentUserId = null;
            }

            // Determine if this comment was created by the current (employee) user
            const commentUserId = commentUser?.id || comment.user_id || comment.user_cookie_id || null;
            if (commentUserId && currentUserId && String(commentUserId) === String(currentUserId)) {
              return {
                id: comment.id,
                sender: 'You',
                message: normalizeText(comment.comment || comment.message || ''),
                timestamp: comment.created_at ? formatTimestampFromISO(comment.created_at) : formatTimestamp(),
              };
            }

            // Otherwise, classify as Support Team if role indicates an admin/coordinator/system account
            if (role.includes('ticket') || role.includes('coordinator') || role.includes('admin') || role.includes('system') || role.includes('support') ) {
              return {
                id: comment.id,
                sender: 'Support Team',
                message: normalizeText(comment.comment || comment.message || ''),
                timestamp: comment.created_at ? formatTimestampFromISO(comment.created_at) : formatTimestamp(),
              };
            }

            // Fallback: show provided user name or default label
            const userNameFromComment = buildFullName(commentUser) || commentUser?.full_name || commentUser?.username || null;
            const finalName = userNameFromComment || ticketOwnerName || 'Employee';
            return {
              id: comment.id,
              sender: finalName,
              message: normalizeText(comment.comment || comment.message || ''),
              timestamp: comment.created_at ? formatTimestampFromISO(comment.created_at) : formatTimestamp(),
            };
          });
          
          // Only update if we have new messages (compare by count to avoid flicker)
          const existingIds = new Set(messages.map(m => String(m.id)));
          const newMsgs = formattedMessages.filter(m => !existingIds.has(String(m.id)));
          
          if (newMsgs.length > 0) {
            // Merge new messages with existing ones, avoiding duplicates
            setMessages(prev => {
              const prevIds = new Set(prev.map(m => String(m.id)));
              const toAdd = formattedMessages.filter(m => !prevIds.has(String(m.id)));
              return [...prev, ...toAdd];
            });
          }
        }
      } catch (error) {
        // Silent fail - don't spam console with polling errors
      }
    };
    
    // Initial fetch
    fetchNewMessages();
    
    // Poll every 10 seconds
    const interval = setInterval(fetchNewMessages, 10000);
    return () => clearInterval(interval);
  }, [ticketNumber, ticketId]);

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [newMessage]);

  // Scroll detection
  useEffect(() => {
    const chatMessages = chatMessagesRef.current;
    if (!chatMessages) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = chatMessages;
      setShowScrollButton(scrollHeight - scrollTop - clientHeight > 150);
    };

    chatMessages.addEventListener('scroll', handleScroll);
    return () => chatMessages.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    const tempId = Date.now();
    const newMsg = {
      id: tempId,
      sender: 'You',
      message: newMessage,
      timestamp: formatTimestamp(),
    };

    // Optimistic UI update
    setMessages(prev => [...prev, newMsg]);
    const messageToSend = newMessage;
    setNewMessage('');
    try { stopTyping(); } catch (e) {}

    // Persist optimistic message locally (temp id)
    try {
      const tgt = ticketNumber || ticketId || null;
      if (tgt) {
        addComment(tgt, { id: newMsg.id, message: newMsg.message, created_at: new Date().toISOString(), user: { id: 'current', name: 'You' }, is_internal: false });
      }
    } catch (e) {
      console.error('Failed to persist message locally:', e);
    }

    // Send comment to backend so coordinator can see it and reconcile optimistic message
    try {
      // Prefer ticketId, but if not available, get the ticket by number first
      let targetId = ticketId;
      if (!targetId && ticketNumber) {
        const ticketData = await backendTicketService.getTicketByNumber(ticketNumber);
        targetId = ticketData?.id;
      }

      if (targetId) {
        const result = await backendTicketService.createComment(targetId, messageToSend, false);
        console.log('Comment sent to backend successfully', result);

        // Replace optimistic message in UI with server-provided comment (match by tempId)
        setMessages(prev => prev.map(m => {
          if (m.id === tempId) {
            return {
              id: result.id || tempId,
              sender: 'You',
              message: result.comment || result.message || messageToSend,
              timestamp: result.created_at ? formatTimestampFromISO(result.created_at) : formatTimestamp(),
            };
          }
          return m;
        }));

        // Reconcile localStorage: replace temp comment with server comment if present
        try {
          const raw = localStorage.getItem('tickets');
          if (raw) {
            const tickets = JSON.parse(raw);
            const tgtIndex = tickets.findIndex(t => String(t.ticketNumber) === String(ticketNumber) || String(t.id) === String(targetId));
            if (tgtIndex !== -1) {
              const tk = tickets[tgtIndex];
              tk.comments = Array.isArray(tk.comments) ? tk.comments : (Array.isArray(tk.comment) ? tk.comment : []);
              // Find temp comment by id or by matching message and recent timestamp
              const tempIndex = tk.comments.findIndex(c => String(c.id) === String(tempId) || (c.comment === messageToSend && Math.abs(new Date(c.created_at).getTime() - Date.now()) < 120000));
              const serverComment = {
                id: result.id || (tempIndex !== -1 ? tk.comments[tempIndex].id : Date.now()),
                comment: result.comment || result.message || messageToSend,
                created_at: result.created_at || new Date().toISOString(),
                user: result.user || { id: 'current', name: 'You' },
                is_internal: result.is_internal ?? false,
              };

              if (tempIndex !== -1) {
                tk.comments[tempIndex] = serverComment;
              } else {
                tk.comments.push(serverComment);
              }

              tickets[tgtIndex] = tk;
              localStorage.setItem('tickets', JSON.stringify(tickets));
            }
          }
        } catch (e) {
          console.warn('Failed to reconcile localStorage comments:', e);
        }
      }
    } catch (err) {
      console.warn('Failed to send comment to backend:', err);
    }

    // Simulate typing response — only add the automated Support Team reply once per ticket
    const autoResponseText = 'Thank you for your message. Our team is reviewing your ticket and will respond shortly.';

    // Check current state (including newly added message)
    const currentMessages = [...messages, newMsg];
    const alreadyInState = currentMessages.some(m => m.sender === 'Support Team' && (m.message || '').includes('Thank you for your message'));

    // Also check initialMessages prop (backend-loaded messages)
    const alreadyInInitial = initialMessages.some(m => m.sender === 'Support Team' && (m.message || '').includes('Thank you for your message'));

    let alreadyPersisted = false;
    try {
      if (ticketNumber) {
        const stored = getTicketByNumber(ticketNumber);
        const comments = stored?.comments || [];
        alreadyPersisted = comments.some(c => ((c.user && (c.user.name === 'Support Team' || c.user === 'Support Team')) || c.user === 'support') && (c.comment || c.message || '').includes('Thank you for your message'));
      }
    } catch (e) {
      // ignore storage lookup errors
    }

    const shouldAddAuto = !alreadyInState && !alreadyInInitial && !alreadyPersisted;
        if (shouldAddAuto) {
      setIsTyping(true);
      setTimeout(async () => {
        const response = {
          id: Date.now() + 1,
          sender: 'Support Team',
          message: autoResponseText,
              timestamp: formatTimestamp(),
        };
        setMessages(prev => [...prev, response]);
        setIsTyping(false);

        // Persist the auto-response to backend so it survives refresh
        if (ticketId) {
          try {
            await backendTicketService.createAutoResponse(ticketId, autoResponseText);
          } catch (e) {
            console.warn('Failed to persist auto-response to backend:', e);
          }
        }

        // Also persist locally as backup
        try {
          const tgt = ticketNumber || ticketId || null;
          if (tgt) {
            addComment(tgt, { id: response.id, message: response.message, created_at: new Date().toISOString(), timestamp: response.timestamp, user: { id: 'support', name: 'Support Team' }, is_internal: false });
          }
        } catch (e) {
          console.warn('Failed to persist auto-response locally:', e);
        }
      }, 1500);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Helper to check if file is an image
  const isImageFile = (filename, mimeType) => {
    if (mimeType && mimeType.startsWith('image/')) return true;
    const ext = (filename || '').toLowerCase().split('.').pop();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext);
  };

  // Helper to get file icon based on extension/type
  const getFileIcon = (filename, mimeType) => {
    const ext = (filename || '').toLowerCase().split('.').pop();
    if (ext === 'pdf' || mimeType === 'application/pdf') return <FaFilePdf style={{ color: '#e74c3c' }} />;
    if (['doc', 'docx'].includes(ext) || mimeType?.includes('word')) return <FaFileWord style={{ color: '#2b579a' }} />;
    if (['xls', 'xlsx'].includes(ext) || mimeType?.includes('excel') || mimeType?.includes('spreadsheet')) return <FaFileExcel style={{ color: '#217346' }} />;
    if (ext === 'csv' || mimeType === 'text/csv') return <FaFileCsv style={{ color: '#217346' }} />;
    if (isImageFile(filename, mimeType)) return <FaFileImage style={{ color: '#3498db' }} />;
    return <FiFile style={{ color: '#7f8c8d' }} />;
  };

  // Get secure URL for attachment (through Vite proxy)
  const getAttachmentUrl = (url) => {
    if (!url) return null;
    // If URL is already relative or starts with /media, use as-is
    if (url.startsWith('/')) return url;
    // Extract path from full URL if needed
    try {
      const urlObj = new URL(url);
      return urlObj.pathname;
    } catch {
      return url;
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Reset file input
    e.target.value = '';

    const isImage = isImageFile(file.name, file.type);
    
    // Create temporary message with loading state
    const tempId = Date.now();
    const tempMsg = {
      id: tempId,
      sender: 'You',
      message: '',
      timestamp: formatTimestamp(),
      attachment: {
        name: file.name,
        type: file.type,
        url: isImage ? URL.createObjectURL(file) : null,
        isLoading: true,
        isImage,
      },
    };
    
    setMessages(prev => [...prev, tempMsg]);

    // Upload to backend
    if (ticketId) {
      try {
        const result = await backendTicketService.createCommentWithAttachment(ticketId, '', file, false);
        
        // Update message with real URL from server
        setMessages(prev => prev.map(msg => 
          msg.id === tempId 
            ? {
                ...msg,
                id: result.id || tempId,
                attachment: {
                  name: result.attachment_name || file.name,
                  type: result.attachment_type || file.type,
                  url: result.attachment ? getAttachmentUrl(result.attachment) : (isImage ? URL.createObjectURL(file) : null),
                  isLoading: false,
                  isImage,
                },
              }
            : msg
        ));

        // Persist locally
        try {
          const tgt = ticketNumber || ticketId || null;
          if (tgt) {
            addComment(tgt, {
              id: result.id || tempId,
              message: '',
              attachment: result.attachment,
              attachment_name: result.attachment_name || file.name,
              attachment_type: result.attachment_type || file.type,
              created_at: new Date().toISOString(),
              user: { id: 'current', name: 'You' },
              is_internal: false,
            });
          }
        } catch (e) {
          console.error('Failed to persist attachment locally:', e);
        }
      } catch (error) {
        console.error('Failed to upload attachment:', error);
        // Update message to show error
        setMessages(prev => prev.map(msg => 
          msg.id === tempId 
            ? {
                ...msg,
                attachment: {
                  ...msg.attachment,
                  isLoading: false,
                  error: 'Upload failed',
                },
              }
            : msg
        ));
      }
    } else {
      // No ticket ID, just show locally
      setMessages(prev => prev.map(msg => 
        msg.id === tempId 
          ? {
              ...msg,
              attachment: {
                ...msg.attachment,
                isLoading: false,
              },
            }
          : msg
      ));
    }
  };

  // Render attachment content (image preview or file link)
  const renderAttachment = (attachment) => {
    if (!attachment) return null;
    
    const { name, type, url, isLoading, error, isImage } = attachment;
    
    if (isLoading) {
      return (
        <div className={styles['attachment-loading']}>
          <span className={styles['loading-spinner']}></span>
          <span>Uploading {name}...</span>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className={styles['attachment-error']}>
          <FiX /> {error}: {name}
        </div>
      );
    }
    
    if (isImage && url) {
      return (
        <div className={styles['attachment-image-container']}>
          <a href={url} target="_blank" rel="noopener noreferrer">
            <img 
              src={url} 
              alt={name} 
              className={styles['attachment-image']}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div className={styles['attachment-file-fallback']} style={{ display: 'none' }}>
              {getFileIcon(name, type)}
              <span>{name}</span>
            </div>
          </a>
        </div>
      );
    }
    
    // Document link
    return (
      <a 
        href={url || '#'} 
        target="_blank" 
        rel="noopener noreferrer"
        className={styles['attachment-link']}
        onClick={(e) => {
          if (!url) {
            e.preventDefault();
            alert('File URL not available');
          }
        }}
      >
        {getFileIcon(name, type)}
        <span className={styles['attachment-name']}>{name}</span>
        <FiDownload className={styles['attachment-download-icon']} />
      </a>
    );
  };

  // Group consecutive messages from same sender
  const groupedMessages = messages.reduce((acc, msg, index) => {
    const prevMsg = messages[index - 1];
    const isGrouped = prevMsg && prevMsg.sender === msg.sender;
    
    acc.push({
      ...msg,
      showSender: !isGrouped,
      showAvatar: !isGrouped
    });
    
    return acc;
  }, []);

  const renderMessage = (msg, index) => {
    const isUser = msg.sender === 'You';
    const initials = getInitials(msg.sender);
    
    // Handle both formats: 
    // 1. New uploads have msg.attachment as object with { name, type, url, isImage, isLoading }
    // 2. Loaded messages have msg.attachment as URL string + msg.attachmentName, msg.attachmentType
    let attachmentData = null;
    if (msg.attachment) {
      if (typeof msg.attachment === 'object' && msg.attachment !== null) {
        // New upload format - already an object
        attachmentData = msg.attachment;
      } else if (typeof msg.attachment === 'string') {
        // Loaded from backend - convert to object format
        const attachmentUrl = getAttachmentUrl(msg.attachment);
        const fileName = msg.attachmentName || msg.attachment.split('/').pop() || 'attachment';
        const mimeType = msg.attachmentType || '';
        attachmentData = {
          name: fileName,
          type: mimeType,
          url: attachmentUrl,
          isImage: isImageFile(fileName, mimeType),
          isLoading: false,
        };
      }
    }
    
    const hasAttachment = attachmentData && (attachmentData.name || attachmentData.url);
    const hasText = msg.message && msg.message.trim();

    return (
      <div key={msg.id} className={`${styles['message-group']} ${isUser ? styles['message-group-user'] : ''}`}>
        {/* Avatar - only show for first message in group */}
        {msg.showAvatar && !isUser && (
          <div className={styles['message-avatar']}>
            {initials}
          </div>
        )}
        {!msg.showAvatar && !isUser && <div className={styles['message-avatar-spacer']} />}

        <div className={styles['message-content']}>
          {/* Sender name - only show for first message in group */}
          {msg.showSender && !isUser && (
            <div className={styles['message-sender']}>
              {msg.sender}
            </div>
          )}

          <div className={`${styles['message-bubble']} ${isUser ? styles['user-message'] : styles['agent-message']} ${hasAttachment && !hasText ? styles['attachment-only'] : ''}`}>
            {/* Text message */}
            {hasText && <div>{msg.message}</div>}
            
            {/* Attachment */}
            {hasAttachment && renderAttachment(attachmentData)}
          </div>

          {/* Timestamp */}
          <div className={`${styles['message-timestamp']} ${isUser ? styles['message-timestamp-user'] : ''}`}>
            {msg.timestamp}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles['ticket-messaging-container']}>
      <div className={styles['messages-area']} ref={chatMessagesRef}>
        {groupedMessages.map(renderMessage)}

        {/* Show a subtle typing hint when ticket owner/coordinator is typing */}
        {typingUser && (
          <div className={styles['typing-indicator']} aria-live="polite" aria-label={`${typingUser} is typing`}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}

        {isTyping && (
          <div className={styles['message-group']}>
            <div className={styles['message-avatar']}>ST</div>
            <div className={styles['message-content']}>
              <div className={styles['message-sender']}>Support Team</div>
              <div className={`${styles['message-bubble']} ${styles['agent-message']} ${styles['typing-indicator']}`}>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {showScrollButton && (
        <button
          className={styles['scroll-to-bottom']}
          onClick={scrollToBottom}
          aria-label="Scroll to bottom"
        >
          <FiChevronDown />
        </button>
      )}

      <div className={styles['message-input-container']}>
        <div className={styles['input-row']}>
          <label className={styles['upload-btn']} title="Attach file">
            <input type="file" onChange={handleFileUpload} hidden />
            <FiPaperclip />
          </label>

          <div className={`${styles['input-wrapper']} ${newMessage.split('\n').length > 1 ? styles['input-expanded'] : ''}`}>
            <textarea
                ref={textareaRef}
                className={styles['message-input']}
                value={newMessage}
                onChange={(e) => { setNewMessage(e.target.value); handleTypingStart(); }}
                onBlur={handleTypingStop}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                rows={1}
              />
          </div>

          <button
            className={styles['send-button']}
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            aria-label="Send message"
          >
            <FiSend />
          </button>
        </div>
      </div>
    </div>
  );
}