import { useState, useEffect, useRef } from 'react';
import { backendTicketService } from '../../../services/backend/ticketService';
import { addComment, getTicketByNumber } from '../../../utilities/storages/ticketStorage';
import { FiPaperclip, FiSend, FiChevronDown } from 'react-icons/fi';
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
  
  const messagesEndRef = useRef(null);
  const chatMessagesRef = useRef(null);
  const textareaRef = useRef(null);

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

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const newMsg = {
      id: Date.now(),
      sender: 'You',
      message: newMessage,
      timestamp: formatTimestamp(),
    };

    setMessages(prev => [...prev, newMsg]);
    // Persist the message locally so it remains after reload
    try {
      const tgt = ticketNumber || ticketId || null;
      if (tgt) {
        addComment(tgt, { id: newMsg.id, message: newMsg.message, created_at: new Date().toISOString(), user: { id: 'current', name: 'You' }, is_internal: false });
      }
    } catch (e) {
      console.error('Failed to persist message locally:', e);
    }

    // If backend is available, create a comment on the server (best-effort)
    if (ticketId) {
      backendTicketService.createComment(ticketId, newMessage).catch(err => {
        console.warn('Failed to send comment to backend (will keep local copy):', err);
      });
    }
    setNewMessage('');

    // Simulate typing response — only add the automated Support Team reply once per ticket
    const autoResponseText = 'Thank you for your message. Our team is reviewing your ticket and will respond shortly.';

    const alreadyInState = messages.some(m => m.sender === 'Support Team' && (m.message || '').includes('Thank you for your message'));

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

    const shouldAddAuto = !alreadyInState && !alreadyPersisted;
        if (shouldAddAuto) {
      setIsTyping(true);
      setTimeout(() => {
        const response = {
          id: Date.now() + 1,
          sender: 'Support Team',
          message: autoResponseText,
              timestamp: formatTimestamp(),
        };
        setMessages(prev => [...prev, response]);
        setIsTyping(false);

        // Persist the auto-response so it remains visible later (one-time only)
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

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const fileMsg = {
        id: Date.now(),
        sender: 'You',
        message: `📎 ${file.name}`,
        timestamp: formatTimestamp(),
      };
      setMessages(prev => [...prev, fileMsg]);
    }
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

          <div className={`${styles['message-bubble']} ${isUser ? styles['user-message'] : styles['agent-message']}`}>
            {msg.message}
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
              onChange={(e) => setNewMessage(e.target.value)}
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