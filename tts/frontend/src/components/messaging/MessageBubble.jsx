import React, { useState, useRef, useEffect } from 'react';
import styles from './MessageBubble.module.css';
import AttachmentPreview from './AttachmentPreview';
import MessageReactions from './MessageReactions';

// Quick reaction emojis
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '🔥'];

const MessageBubble = ({ 
  message, 
  isOwn, 
  currentUserId,
  currentUserData,
  onEdit, 
  onUnsend,
  onReaction,
  onDownloadAttachment
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showQuickReactions, setShowQuickReactions] = useState(false);
  const menuRef = useRef(null);
  const quickReactionRef = useRef(null);

  const { 
    message_id, 
    message: text, 
    sender, 
    sender_role, 
    is_edited,
    is_unsent,
    unsent_for_all,
    attachments = [],
    reactions = [],
    reaction_counts = {},
    created_at 
  } = message;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
      if (quickReactionRef.current && !quickReactionRef.current.contains(event.target)) {
        setShowQuickReactions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    
    const options = { hour: '2-digit', minute: '2-digit' };
    return date.toLocaleTimeString([], options);
  };

  const handleMenuAction = (action) => {
    setShowMenu(false);
    switch (action) {
      case 'edit':
        onEdit(message);
        break;
      case 'unsend':
        onUnsend?.(message_id, false);
        break;
      case 'unsend_all':
        onUnsend?.(message_id, true);
        break;
      default:
        break;
    }
  };

  const handleQuickReaction = (emoji) => {
    onReaction(message_id, emoji);
    setShowQuickReactions(false);
  };

  // Show unsent message placeholder
  if (is_unsent) {
    return (
      <div className={`${styles.messageWrapper} ${isOwn ? styles.own : styles.other}`}>
        {!isOwn && <div className={styles.avatar}>{sender?.charAt(0)?.toUpperCase()}</div>}
        <div className={styles.messageContent}>
          {!isOwn && (
            <div className={styles.messageMeta}>
              <span className={styles.senderName}>{sender}</span>
            </div>
          )}
          <div className={`${styles.bubble} ${styles.bubbleUnsent}`}>
            <p className={styles.unsentText}>
              <i className="fa-solid fa-ban"></i>
              {unsent_for_all 
                ? 'This message was unsent' 
                : isOwn 
                  ? 'You unsent this message' 
                  : `${sender} unsent this message`}
            </p>
          </div>
          <div className={styles.messageTime}>{formatTime(created_at)}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.messageWrapper} ${isOwn ? styles.own : styles.other}`}>
      {!isOwn && <div className={styles.avatar}>{sender?.charAt(0)?.toUpperCase()}</div>}
      
      <div className={styles.messageContent}>
        {!isOwn && (
          <div className={styles.messageMeta}>
            <span className={styles.senderName}>{sender}</span>
            {sender_role && <span className={styles.senderRole}>• {sender_role}</span>}
          </div>
        )}
        
        {/* Message bubble with hover actions - only show if there's text */}
        {text?.trim() && (
          <div className={styles.bubbleWrapper}>
            <div className={`${styles.bubble} ${isOwn ? styles.bubbleOwn : styles.bubbleOther}`}>
              <p className={styles.messageText}>{text}</p>
              {is_edited && <span className={styles.editedTag}>(edited)</span>}
              
              {/* Quick reactions button inside bubble */}
              <div 
                className={`${styles.inlineReactionBtn} ${isOwn ? styles.reactionLeft : styles.reactionRight}`} 
                ref={quickReactionRef}
              >
                <button 
                  className={styles.reactionTrigger}
                  onClick={() => setShowQuickReactions(!showQuickReactions)}
                  title="Add reaction"
                >
                  <i className="fa-regular fa-face-smile"></i>
                </button>
                
                {/* Quick reaction picker */}
                {showQuickReactions && (
                  <div className={`${styles.quickReactionPicker} ${isOwn ? styles.pickerRight : styles.pickerLeft}`}>
                    {QUICK_REACTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        className={styles.quickReactionBtn}
                        onClick={() => handleQuickReaction(emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* More options menu (for own messages with text) */}
            {isOwn && (
              <div className={styles.menuWrapper} ref={menuRef}>
                <button 
                  className={styles.menuBtn}
                  onClick={() => setShowMenu(!showMenu)}
                  title="More options"
                >
                  <i className="fa-solid fa-ellipsis-vertical"></i>
                </button>
                
                {showMenu && (
                  <div className={styles.dropdownMenu}>
                    <button 
                      className={styles.menuItem}
                      onClick={() => handleMenuAction('edit')}
                    >
                      <i className="fa-solid fa-pen"></i>
                      Edit
                    </button>
                    <button 
                      className={styles.menuItem}
                      onClick={() => handleMenuAction('unsend')}
                    >
                      <i className="fa-solid fa-rotate-left"></i>
                      Unsend for me
                    </button>
                    <button 
                      className={styles.menuItem}
                      onClick={() => handleMenuAction('unsend_all')}
                    >
                      <i className="fa-solid fa-ban"></i>
                      Unsend for everyone
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className={`${styles.attachmentWrapper} ${!text?.trim() ? styles.attachmentOnly : ''}`}>
            {/* Menu on the left for own messages (attachment-only) */}
            {!text?.trim() && isOwn && (
              <div className={styles.attachmentMenuLeft} ref={menuRef}>
                <button 
                  className={styles.menuBtn}
                  onClick={() => setShowMenu(!showMenu)}
                  title="More options"
                >
                  <i className="fa-solid fa-ellipsis-vertical"></i>
                </button>
                
                {showMenu && (
                  <div className={styles.dropdownMenu}>
                    <button 
                      className={styles.menuItem}
                      onClick={() => handleMenuAction('unsend')}
                    >
                      <i className="fa-solid fa-rotate-left"></i>
                      Unsend for me
                    </button>
                    <button 
                      className={styles.menuItem}
                      onClick={() => handleMenuAction('unsend_all')}
                    >
                      <i className="fa-solid fa-ban"></i>
                      Unsend for everyone
                    </button>
                  </div>
                )}
              </div>
            )}
            
            <div className={styles.attachmentsContainer}>
              {attachments.map((attachment) => (
                <AttachmentPreview
                  key={attachment.attachment_id}
                  attachment={attachment}
                  onDownload={onDownloadAttachment}
                  isOwn={isOwn}
                />
              ))}
              
              {/* Quick reactions for attachment-only messages */}
              {!text?.trim() && (
                <div 
                  className={`${styles.inlineReactionBtn} ${styles.attachmentReaction}`} 
                  ref={quickReactionRef}
                >
                  <button 
                    className={styles.reactionTrigger}
                    onClick={() => setShowQuickReactions(!showQuickReactions)}
                    title="Add reaction"
                  >
                    <i className="fa-regular fa-face-smile"></i>
                  </button>
                  
                  {showQuickReactions && (
                    <div className={`${styles.quickReactionPicker} ${isOwn ? styles.pickerRight : styles.pickerLeft}`}>
                      {QUICK_REACTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          className={styles.quickReactionBtn}
                          onClick={() => handleQuickReaction(emoji)}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Menu on the right for other's messages (attachment-only) */}
            {!text?.trim() && !isOwn && (
              <div className={styles.attachmentMenuRight}>
                {/* Others don't have menu options, just a placeholder for symmetry */}
              </div>
            )}
          </div>
        )}

        {/* Reactions */}
        <MessageReactions
          messageId={message_id}
          reactions={reactions}
          reactionCounts={reaction_counts}
          currentUserId={currentUserId}
          currentUserData={currentUserData}
          onReaction={onReaction}
          isOwn={isOwn}
        />

        <div className={styles.messageTime}>{formatTime(created_at)}</div>
      </div>
    </div>
  );
};

export default MessageBubble;
