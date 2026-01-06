import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useMessaging } from '../../hooks/useMessaging';
import { useAuth } from '../../context/AuthContext';
import { useAutoScroll } from '../../hooks/useAutoScroll';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import DateDivider from './DateDivider';
import styles from './Messaging.module.css';

const Messaging = ({ ticket_id , ticket_owner, onExpandToggle, isExpanded: externalExpanded }) => {
  const { user: authUser } = useAuth();
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [editingMessage, setEditingMessage] = useState(null);
  const [internalExpanded, setInternalExpanded] = useState(false);
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  
  // Use external expanded state if provided, otherwise use internal
  const isExpanded = externalExpanded !== undefined ? externalExpanded : internalExpanded;
  
  const handleExpandToggle = () => {
    if (onExpandToggle) {
      onExpandToggle(!isExpanded);
    } else {
      setInternalExpanded(!internalExpanded);
    }
  };

  const currentUserId = authUser?.id || authUser?.user_id;
  // Build user's display name from available fields
  const currentIdentifier = authUser?.full_name || 
    (authUser?.first_name && authUser?.last_name 
      ? `${authUser.first_name} ${authUser.last_name}` 
      : authUser?.first_name || authUser?.username || authUser?.email || 'User');

  // Debug: log authUser to see available fields
  console.log('[Messaging] authUser:', authUser);
  console.log('[Messaging] currentIdentifier:', currentIdentifier);

  const ownerName =
  ticket_owner?.first_name && ticket_owner?.last_name
    ? `${ticket_owner.first_name} ${ticket_owner.last_name}`
    : ticket_owner?.username || ticket_owner?.email || 'Unknown User';

  const {
    messages,
    isConnected,
    isLoading,
    error,
    typingUsers,
    onlineUsers,
    fetchMessages,
    sendMessage: sendMessageAPI,
    editMessage,
    deleteMessage,
    unsendMessage,
    addReaction,
    removeReaction,
    downloadAttachment,
    startTyping,
    stopTyping,
  } = useMessaging(ticket_id, currentIdentifier);

  // Determine if ticket owner is online (check against onlineUsers list)
  const isOwnerOnline = onlineUsers?.some(user => 
    user === ownerName || 
    user === ticket_owner?.username || 
    user === ticket_owner?.email
  );

  // Disable body scroll when expanded
  React.useEffect(() => {
    if (isExpanded) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isExpanded]);

  // Use auto-scroll hook
  useAutoScroll(messages, containerRef);

  // Send message
  const handleSendMessage = async () => {
    if (!message.trim() && attachments.length === 0) return;
    
    try {
      await sendMessageAPI(message.trim(), attachments);
      setMessage('');
      setAttachments([]);
      stopTyping();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // Handle message editing
  const handleEditMessage = async (messageToEdit) => {
    const newText = prompt('Edit message:', messageToEdit.message);
    if (newText && newText.trim()) {
      try {
        await editMessage(messageToEdit.message_id, newText);
      } catch (error) {
        console.error('Failed to edit message:', error);
      }
    }
  };

  // Handle message unsend
  const handleUnsendMessage = async (messageId, forAll = false) => {
    try {
      await unsendMessage(messageId, forAll);
    } catch (error) {
      console.error('Failed to unsend message:', error);
    }
  };

  // Handle reactions
  const handleReaction = async (messageId, emoji) => {
    try {
      const msg = messages.find(m => m.message_id === messageId);
      
      // The API returns reactions with 'user' and 'user_full_name' fields
      // We need to match based on the user's full name
      const currentUserFullName = authUser?.full_name || `${authUser?.first_name} ${authUser?.last_name}`.trim();
      
      // Check if user has already reacted with this emoji
      const userReaction = msg?.reactions?.find(r => {
        // Match by full name since the API doesn't return user_id in reactions
        return (r.user === currentUserFullName || r.user_full_name === currentUserFullName) 
          && r.reaction === emoji;
      });

      if (userReaction) {
        await removeReaction(messageId, emoji);
      } else {
        await addReaction(messageId, emoji);
      }
    } catch (error) {
      console.error('Failed to handle reaction:', error);
    }
  };

  // Helper for date comparison
  const isSameDay = (d1, d2) => {
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    return date1.toDateString() === date2.toDateString();
  };

  const content = (
    <>
      {/* Backdrop overlay when expanded */}
      {isExpanded && (
        <div className={styles.backdrop} onClick={handleExpandToggle} />
      )}
      
      <div className={`${styles.messagingContainer} ${isExpanded ? styles.expanded : ''}`}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h3 className={styles.title}>Ticket Discussion</h3>
            <div className={styles.headerActions}>
              <div className={styles.statusIndicator}>
                <span className={`${styles.statusDot} ${isConnected ? styles.online : styles.offline}`} />
                <span className={styles.statusText}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <button 
                className={styles.expandBtn}
                onClick={handleExpandToggle}
                title={isExpanded ? 'Collapse' : 'Expand'}
              >
                <i className={`fa-solid ${isExpanded ? 'fa-compress' : 'fa-expand'}`}></i>
              </button>
            </div>
          </div>
          {/* {error && <div className={styles.error}>{error}</div>} */}
        </div>

        {/* Messages Container */}
      <div className={styles.messagesContainer} ref={containerRef}>
        {isLoading && messages.length === 0 ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p>Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>💬</div>
            <p>No messages yet</p>
            <span>Start the conversation!</span>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => {
              const isOwn = currentUserId && msg.user_id && 
                String(currentUserId) === String(msg.user_id);
              
              // Grouping logic
              const prevMsg = messages[index - 1];
              const nextMsg = messages[index + 1];
              
              const isFirstInGroup = !prevMsg || 
                String(prevMsg.user_id) !== String(msg.user_id) || 
                !isSameDay(prevMsg.created_at, msg.created_at);
              
              const isLastInGroup = !nextMsg || 
                String(nextMsg.user_id) !== String(msg.user_id) || 
                !isSameDay(nextMsg.created_at, msg.created_at);
              
              // Date divider logic
              const showDateDivider = !prevMsg || !isSameDay(prevMsg.created_at, msg.created_at);

              return (
                <React.Fragment key={msg.message_id}>
                  {showDateDivider && <DateDivider date={msg.created_at} />}
                  <MessageBubble
                    message={msg}
                    isOwn={isOwn}
                    currentUserId={currentUserId}
                    currentUserData={authUser}
                    onEdit={handleEditMessage}
                    onUnsend={handleUnsendMessage}
                    onReaction={handleReaction}
                    onDownloadAttachment={downloadAttachment}
                    isExpanded={isExpanded}
                    isFirstInGroup={isFirstInGroup}
                    isLastInGroup={isLastInGroup}
                  />
                </React.Fragment>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className={styles.typingIndicator}>
            <div className={styles.typingDots}>
              <span className={styles.dot} />
              <span className={styles.dot} />
              <span className={styles.dot} />
            </div>
            <span className={styles.typingText}>
              {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </span>
          </div>
        )}
      </div>

      {/* Input Area */}
      <MessageInput
        message={message}
        setMessage={setMessage}
        attachments={attachments}
        setAttachments={setAttachments}
        onSend={handleSendMessage}
        onTyping={startTyping}
        onStopTyping={stopTyping}
        isLoading={isLoading}
      />
    </div>
    </>
  );

  if (isExpanded) {
    return ReactDOM.createPortal(content, document.body);
  }

  return content;
};

export default Messaging;
