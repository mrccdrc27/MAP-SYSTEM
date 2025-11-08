import React, { useState, useRef, useEffect } from 'react';
import { useMessaging } from '../../hooks/useMessaging';
import { useAuth } from '../../api/AuthContext';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import styles from './Messaging.module.css';

const Messaging = ({ ticket_id }) => {
  console.log('🎪 Messaging component rendered with ticket_id:', ticket_id);
  
  const { user: authUser } = useAuth();
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [editingMessage, setEditingMessage] = useState(null);
  const [showReactionModal, setShowReactionModal] = useState(null);
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);

  const currentUserId = authUser?.id || authUser?.user_id;
  const currentIdentifier = authUser?.full_name || authUser?.email || 'User';

  console.log('🎪 About to call useMessaging with:', { ticket_id, currentIdentifier });

  const {
    messages,
    isConnected,
    isLoading,
    error,
    typingUsers,
    sendMessage: sendMessageAPI,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    downloadAttachment,
    startTyping,
    stopTyping,
  } = useMessaging(ticket_id, currentIdentifier);

  console.log('🎪 useMessaging returned:', { messagesCount: messages.length, isConnected, isLoading, error });

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  // Handle message deletion
  const handleDeleteMessage = async (messageId) => {
    if (window.confirm('Delete this message?')) {
      try {
        await deleteMessage(messageId);
      } catch (error) {
        console.error('Failed to delete message:', error);
      }
    }
  };

  // Handle reactions
  const handleReaction = async (messageId, emoji) => {
    try {
      const msg = messages.find(m => m.message_id === messageId);
      
      console.log('=== Reaction Debug ===');
      console.log('Current User:', authUser);
      console.log('Message reactions:', msg?.reactions);
      console.log('Looking for emoji:', emoji);
      
      // The API returns reactions with 'user' and 'user_full_name' fields, NOT 'user_id'
      // We need to match based on the user's full name
      const currentUserFullName = authUser?.full_name || `${authUser?.first_name} ${authUser?.last_name}`.trim();
      
      // Check if user has already reacted with this emoji
      const userReaction = msg?.reactions?.find(r => {
        console.log('Checking reaction:', r);
        console.log('Reaction user:', r.user, 'Current user full name:', currentUserFullName);
        
        // Match by full name since the API doesn't return user_id in reactions
        const matches = (r.user === currentUserFullName || r.user_full_name === currentUserFullName) 
          && r.reaction === emoji;
        
        console.log('Match:', matches);
        return matches;
      });

      console.log('User reaction found:', userReaction);
      console.log('===================');

      if (userReaction) {
        console.log('Removing reaction...');
        await removeReaction(messageId, emoji);
      } else {
        console.log('Adding reaction...');
        await addReaction(messageId, emoji);
      }
    } catch (error) {
      console.error('Failed to handle reaction:', error);
    }
  };

  return (
    <div className={styles.messagingContainer}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h3 className={styles.title}>Messages</h3>
          <div className={styles.statusIndicator}>
            <span className={`${styles.statusDot} ${isConnected ? styles.connected : styles.disconnected}`} />
            <span className={styles.statusText}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
        {error && <div className={styles.error}>{error}</div>}
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
            {messages.map((msg) => {
              const isOwn = currentUserId && msg.user_id && 
                String(currentUserId) === String(msg.user_id);

              return (
                <MessageBubble
                  key={msg.message_id}
                  message={msg}
                  isOwn={isOwn}
                  currentUserId={currentUserId}
                  currentUserData={authUser}
                  onEdit={handleEditMessage}
                  onDelete={handleDeleteMessage}
                  onReaction={handleReaction}
                  onDownloadAttachment={downloadAttachment}
                  showReactionModal={showReactionModal}
                  setShowReactionModal={setShowReactionModal}
                />
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
  );
};

export default Messaging;
