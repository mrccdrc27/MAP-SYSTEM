import React, { useState, useRef } from "react";
import { useMessaging } from "../../hooks/useMessaging";
import { useAuth } from "../../api/AuthContext";
import styles from "./messaging.module.css";

const Messaging = ({
  ticket_id,
  agentName = "Agent",
  agentStatus = "Active",
  currentUser = null,
}) => {
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState('');
  const [showReactionModal, setShowReactionModal] = useState(null); // messageId for which modal is shown
  const [reactionTooltip, setReactionTooltip] = useState(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);

  // Get user from AuthContext
  const { user: authUser } = useAuth();
  
  // Use authUser if available, fallback to currentUser prop
  const currentUserData = authUser || currentUser;
  
  // Get current user ID - this is the most reliable identifier
  const currentUserId = currentUserData?.id || currentUserData?.user_id;

  // Get current user identifier for display purposes
  const currentIdentifier = currentUserData?.full_name || 
    currentUserData?.user_id ||
    currentUserData?.id ||
    currentUserData?.email ||
    `${currentUserData?.first_name || ""} ${currentUserData?.last_name || ""}`.trim() ||
    "Employee";

  // Debug logging
  console.log('Current User Debug:', {
    authUser,
    currentUser,
    currentUserData,
    currentUserId,
    currentIdentifier
  });

  const {
    ticket, // Add ticket state
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

  // Add debugging - remove this after fixing
  console.log('Messaging Component Debug:', {
    ticket_id,
    ticket,
    messagesCount: messages?.length || 0,
    isLoading,
    error,
    isConnected
  });

  // Scroll to bottom when messages change
  const scrollToBottom = (behavior = "smooth") => {
    try {
      if (containerRef.current) {
        containerRef.current.scrollTo({
          top: containerRef.current.scrollHeight,
          behavior,
        });
      } else {
        messagesEndRef.current?.scrollIntoView({ behavior });
      }
    } catch (err) {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    }
  };

  // Send message with attachments
  const sendMessage = async () => {
    if (!message.trim() && attachments.length === 0) return;
    
    try {
      await sendMessageAPI(message.trim(), attachments);
      setMessage("");
      setAttachments([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      stopTyping();
      setTimeout(() => scrollToBottom(), 100);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // Handle message editing
  const handleEditMessage = async (messageId) => {
    if (!editText.trim()) return;

    try {
      await editMessage(messageId, editText);
      setEditingMessage(null);
      setEditText('');
    } catch (error) {
      console.error('Failed to edit message:', error);
    }
  };

  // Handle message deletion
  const handleDeleteMessage = async (messageId) => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      try {
        await deleteMessage(messageId);
      } catch (error) {
        console.error('Failed to delete message:', error);
      }
    }
  };

  // Handle reactions
  const handleReaction = async (messageId, reaction) => {
    try {
      const message = messages.find(msg => msg.message_id === messageId);
      
      // Use user_id for reliable reaction detection (primary method)
      let existingReaction = null;
      
      if (currentUserId && message?.reactions) {
        existingReaction = message.reactions.find(r => {
          // First try user_id comparison (most reliable)
          if (r.user_id && currentUserId) {
            return String(r.user_id) === String(currentUserId) && r.reaction === reaction;
          }
          return false;
        });
        
        // If no user_id match found, fall back to name matching for backward compatibility
        if (!existingReaction) {
          const possibleIdentifiers = [
            currentUserData?.full_name,
            currentUserData?.user_id,
            currentUserData?.id,
            currentUserData?.email,
            currentUserData?.username,
            `${currentUserData?.first_name || ""} ${currentUserData?.last_name || ""}`.trim(),
            currentIdentifier
          ].filter(Boolean);

          existingReaction = message.reactions.find(r => {
            const reactionUser = r.user_full_name || r.user;
            return possibleIdentifiers.some(id => 
              (reactionUser === id || String(reactionUser).toLowerCase() === String(id).toLowerCase()) &&
              r.reaction === reaction
            );
          });
        }
      }

      console.log('Handle Reaction Debug:', {
        messageId,
        reaction,
        currentUserId,
        existingReaction,
        messageReactions: message?.reactions
      });

      if (existingReaction) {
        await removeReaction(messageId, reaction);
      } else {
        await addReaction(messageId, reaction);
      }
    } catch (error) {
      console.error('Failed to handle reaction:', error);
    }
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setAttachments(prev => [...prev, ...files]);
  };

  // Remove attachment
  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Handle input change with typing indicators
  const handleInputChange = (e) => {
    setMessage(e.target.value);
    if (e.target.value.trim()) {
      startTyping();
    } else {
      stopTyping();
    }
  };

  const formatTimestamp = (iso) => {
    try {
      const d = new Date(iso);
      return (
        d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) +
        " | " +
        d.toLocaleDateString()
      );
    } catch {
      return iso;
    }
  };

  const availableReactions = ['👍', '👎', '❤️', '😂', '😮', '😢', '😡', '👏', '🎉', '🔥'];

  return (
    <div className={styles.messagingPage}>
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <span className={styles.agentName}>{agentName}</span>
          <span className={styles.agentStatus}>{agentStatus}</span>
          <span className={`${styles.connectionStatus} ${isConnected ? styles.connected : styles.disconnected}`}>

            
            {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </span>
        </div>
        {error && <div className={styles.error}>Error: {error}</div>}
      </div>

      <div className={styles.messageContainer} ref={containerRef}>
        {isLoading && messages.length === 0 && (
          <div className={styles.loadingText}>Loading messages...</div>
        )}

        {messages.map((m) => {
          const senderValue = m.sender || "Unknown User";
          const senderRole = m.sender_role || null;
          
          // Use user_id for reliable message ownership identification
          const isOwn = currentUserId && m.user_id && 
            (String(currentUserId) === String(m.user_id));

          // Debug logging for message ownership
          console.log(`Message ${m.message_id} Ownership:`, {
            messageUserId: m.user_id,
            currentUserId,
            isOwn,
            sender: senderValue
          });

          return (
            <div className={styles.messageGroup} key={m.message_id}>
              {editingMessage === m.message_id ? (
                <div className={styles.editForm}>
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={3}
                    className={styles.editTextarea}
                  />
                  <div className={styles.editActions}>
                    <button onClick={() => handleEditMessage(m.message_id)} className={styles.saveButton}>
                      Save
                    </button>
                    <button onClick={() => setEditingMessage(null)} className={styles.cancelButton}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {isOwn ? (
                    <div className={styles.messageRight}>
                      <div className={styles.messageBubble}>
                        <div className={styles.messageBubbleBlue}>
                          <div className={styles.messageHeader}>
                            <span className={styles.senderName}>You</span>
                            {senderRole && (
                              <span className={styles.senderRole}>({senderRole})</span>
                            )}
                          </div>
                          <div className={styles.messageContent}>
                            {m.message}
                            {m.is_edited && <span className={styles.editedIndicator}> (edited)</span>}
                          </div>
                        </div>
                      </div>

                      {/* Attachments */}
                      {m.attachments && m.attachments.length > 0 && (
                        <div className={styles.attachments}>
                          {m.attachments.map((attachment) => (
                            <div key={attachment.attachment_id} className={styles.attachment}>
                              <button 
                                onClick={() => downloadAttachment(attachment.attachment_id)}
                                className={styles.attachmentButton}
                              >
                                📎 {attachment.filename} ({Math.round(attachment.file_size / 1024)}KB)
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reactions for own messages */}
                      <div className={styles.reactions}>
                        {/* Show existing reactions with counts */}
                        {Object.keys(m.reaction_counts || {}).length > 0 && (
                          <div className={styles.existingReactions}>
                            {Object.entries(m.reaction_counts || {}).map(([emoji, count]) => {
                              // Use user_id for reaction detection as well
                              const userReacted = m.reactions?.some(r => {
                                // Check if reaction has user_id field, otherwise fall back to name matching
                                if (r.user_id && currentUserId) {
                                  return String(r.user_id) === String(currentUserId);
                                }
                                // Fallback to name matching if user_id not available in reactions
                                const reactionUser = r.user_full_name || r.user;
                                const possibleIdentifiers = [
                                  currentUserData?.full_name,
                                  currentUserData?.user_id,
                                  currentUserData?.id,
                                  currentUserData?.email,
                                  currentUserData?.username,
                                  `${currentUserData?.first_name || ""} ${currentUserData?.last_name || ""}`.trim(),
                                  currentIdentifier
                                ].filter(Boolean);
                                
                                return possibleIdentifiers.some(id => 
                                  reactionUser === id || 
                                  String(reactionUser).toLowerCase() === String(id).toLowerCase()
                                ) && r.reaction === emoji;
                              });
                              
                              const reactorNames = m.reactions
                                ?.filter(r => r.reaction === emoji)
                                ?.map(r => r.user_full_name || r.user)
                                ?.slice(0, 3) // Show first 3 names
                                ?.join(', ');
                              
                              return (
                                <button
                                  key={emoji}
                                  className={`${styles.reactionCount} ${userReacted ? styles.userReacted : ''}`}
                                  onClick={() => handleReaction(m.message_id, emoji)}
                                  title={`${reactorNames}${m.reactions?.filter(r => r.reaction === emoji).length > 3 ? ' and others' : ''}`}
                                  onMouseEnter={() => setReactionTooltip({ messageId: m.message_id, emoji, names: reactorNames })}
                                  onMouseLeave={() => setReactionTooltip(null)}
                                >
                                  {emoji} {count}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        
                        {/* Add reaction button */}
                        <div className={styles.addReactionContainer}>
                          <button
                            className={styles.addReactionButton}
                            onClick={() => setShowReactionModal(showReactionModal === m.message_id ? null : m.message_id)}
                            title="Add reaction"
                          >
                            😊
                          </button>
                          
                          {/* Facebook-style reaction modal */}
                          {showReactionModal === m.message_id && (
                            <div className={styles.reactionModal}>
                              <div className={styles.reactionModalContent}>
                                {availableReactions.map((emoji) => (
                                  <button
                                    key={emoji}
                                    className={styles.reactionModalOption}
                                    onClick={() => {
                                      handleReaction(m.message_id, emoji);
                                      setShowReactionModal(null);
                                    }}
                                    title={`React with ${emoji}`}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Message Actions for own messages */}
                      <div className={styles.messageActions}>
                        <button 
                          onClick={() => {
                            setEditingMessage(m.message_id);
                            setEditText(m.message);
                          }}
                          className={styles.actionButton}
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteMessage(m.message_id)}
                          className={styles.actionButton}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.messageLeft}>
                      <div className={styles.avatar}></div>
                      <div className={styles.messageBubble}>
                        <div className={styles.messageBubbleGray}>
                          <div className={styles.messageHeader}>
                            <span className={styles.senderName}>{senderValue}</span>
                            {senderRole && (
                              <span className={styles.senderRole}>({senderRole})</span>
                            )}
                          </div>
                          <div className={styles.messageContent}>
                            {m.message}
                            {m.is_edited && <span className={styles.editedIndicator}> (edited)</span>}
                          </div>
                        </div>
                      </div>

                      {/* Attachments */}
                      {m.attachments && m.attachments.length > 0 && (
                        <div className={styles.attachments}>
                          {m.attachments.map((attachment) => (
                            <div key={attachment.attachment_id} className={styles.attachment}>
                              <button 
                                onClick={() => downloadAttachment(attachment.attachment_id)}
                                className={styles.attachmentButton}
                              >
                                📎 {attachment.filename} ({Math.round(attachment.file_size / 1024)}KB)
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reactions for other messages */}
                      <div className={styles.reactions}>
                        {/* Show existing reactions with counts */}
                        {Object.keys(m.reaction_counts || {}).length > 0 && (
                          <div className={styles.existingReactions}>
                            {Object.entries(m.reaction_counts || {}).map(([emoji, count]) => {
                              // Use user_id for reaction detection as well
                              const userReacted = m.reactions?.some(r => {
                                // Check if reaction has user_id field, otherwise fall back to name matching
                                if (r.user_id && currentUserId) {
                                  return String(r.user_id) === String(currentUserId);
                                }
                                // Fallback to name matching if user_id not available in reactions
                                const reactionUser = r.user_full_name || r.user;
                                const possibleIdentifiers = [
                                  currentUserData?.full_name,
                                  currentUserData?.user_id,
                                  currentUserData?.id,
                                  currentUserData?.email,
                                  currentUserData?.username,
                                  `${currentUserData?.first_name || ""} ${currentUserData?.last_name || ""}`.trim(),
                                  currentIdentifier
                                ].filter(Boolean);
                                
                                return possibleIdentifiers.some(id => 
                                  reactionUser === id || 
                                  String(reactionUser).toLowerCase() === String(id).toLowerCase()
                                ) && r.reaction === emoji;
                              });
                              
                              const reactorNames = m.reactions
                                ?.filter(r => r.reaction === emoji)
                                ?.map(r => r.user_full_name || r.user)
                                ?.slice(0, 3) // Show first 3 names
                                ?.join(', ');
                              
                              return (
                                <button
                                  key={emoji}
                                  className={`${styles.reactionCount} ${userReacted ? styles.userReacted : ''}`}
                                  onClick={() => handleReaction(m.message_id, emoji)}
                                  title={`${reactorNames}${m.reactions?.filter(r => r.reaction === emoji).length > 3 ? ' and others' : ''}`}
                                  onMouseEnter={() => setReactionTooltip({ messageId: m.message_id, emoji, names: reactorNames })}
                                  onMouseLeave={() => setReactionTooltip(null)}
                                >
                                  {emoji} {count}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        
                        {/* Add reaction button */}
                        <div className={styles.addReactionContainer}>
                          <button
                            className={styles.addReactionButton}
                            onClick={() => setShowReactionModal(showReactionModal === m.message_id ? null : m.message_id)}
                            title="Add reaction"
                          >
                            😊
                          </button>
                          
                          {/* Facebook-style reaction modal */}
                          {showReactionModal === m.message_id && (
                            <div className={styles.reactionModal}>
                              <div className={styles.reactionModalContent}>
                                {availableReactions.map((emoji) => (
                                  <button
                                    key={emoji}
                                    className={styles.reactionModalOption}
                                    onClick={() => {
                                      handleReaction(m.message_id, emoji);
                                      setShowReactionModal(null);
                                    }}
                                    title={`React with ${emoji}`}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className={styles.messageTimestamp}>
                {formatTimestamp(m.created_at)}
              </div>
            </div>
          );
        })}

        {/* Typing Indicators */}
        {typingUsers.length > 0 && (
          <div className={styles.typingIndicators}>
            {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className={styles.footer}>
        {/* File Attachments Preview */}
        {attachments.length > 0 && (
          <div className={styles.attachmentsPreview}>
            {attachments.map((file, index) => (
              <div key={index} className={styles.attachmentPreview}>
                <span>{file.name}</span>
                <button 
                  type="button" 
                  onClick={() => removeAttachment(index)}
                  className={styles.removeAttachment}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className={styles.inputContainer}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.zip,.rar"
            style={{ display: 'none' }}
          />
          
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()}
            className={styles.attachButton}
            disabled={isLoading}
          >
            📎
          </button>

          <input
            type="text"
            className={styles.messageInput}
            placeholder="Type your message here..."
            value={message}
            onChange={handleInputChange}
            onBlur={stopTyping}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            disabled={isLoading}
          />
          
          <button
            className={styles.sendButton}
            onClick={sendMessage}
            disabled={isLoading || (!message.trim() && attachments.length === 0)}
          >
            {isLoading ? "..." : "➤"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Messaging;
