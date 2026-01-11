import React, { useState, useRef, useEffect } from 'react';
import { FiSmile, FiMoreVertical, FiEdit2 } from 'react-icons/fi';
import { MdUndo, MdBlock } from 'react-icons/md';
import styles from './MessageBubble.module.css';
import AttachmentPreview from './AttachmentPreview';

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
  onDownloadAttachment,
  isExpanded,
  isFirstInGroup = true,
  isLastInGroup = true
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showQuickReactions, setShowQuickReactions] = useState(false);
  const menuRef = useRef(null);
  const quickReactionRef = useRef(null);

  const { 
    message_id, 
    id,
    message: text, 
    content,
    sender, 
    sender_role, 
    is_edited,
    is_unsent,
    unsent_for_all,
    attachments = [],
    reactions = [],
    reaction_counts = {},
    created_at,
    timestamp,
    time
  } = message;

  // Normalize values
  const normalizedId = message_id || id;
  const normalizedText = text || content || '';
  const normalizedTimestamp = created_at || timestamp;

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

  const formatTime = (ts) => {
    if (!ts) return time || '';
    const date = new Date(ts);
    const options = { hour: 'numeric', minute: '2-digit', hour12: true };
    return date.toLocaleTimeString([], options);
  };

  const handleMenuAction = (action) => {
    setShowMenu(false);
    switch (action) {
      case 'edit':
        onEdit?.(message);
        break;
      case 'unsend':
        onUnsend?.(normalizedId, false);
        break;
      case 'unsend_all':
        onUnsend?.(normalizedId, true);
        break;
      default:
        break;
    }
  };

  const handleQuickReaction = (emoji) => {
    onReaction?.(normalizedId, emoji);
    setShowQuickReactions(false);
  };

  // Avatar visibility: Show only for the last message in a group
  const showAvatar = isLastInGroup; 
  
  // Show sender name only on first message of group
  const showSenderName = !isOwn && isFirstInGroup;

  // Show unsent message placeholder
  if (is_unsent) {
    return (
      <div className={`${styles.messageWrapper} ${isOwn ? styles.own : styles.other}`}>
        {!isOwn && (
          <div className={styles.avatarContainer}>
             {showAvatar ? (
               <div className={styles.avatar}>{sender?.charAt(0)?.toUpperCase() || '?'}</div>
             ) : (
               <div className={styles.avatarPlaceholder} />
             )}
          </div>
        )}
        <div className={styles.messageContent}>
          {showSenderName && (
            <div className={styles.messageMeta}>
              <span className={styles.senderName}>{sender || 'Unknown'}</span>
            </div>
          )}
          <div className={`${styles.bubble} ${styles.bubbleUnsent}`}>
            <p className={styles.unsentText}>
              <MdBlock size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              {unsent_for_all 
                ? ' This message was unsent' 
                : isOwn 
                  ? ' You unsent this message' 
                  : ` ${sender} unsent this message`}
            </p>
          </div>
          {isLastInGroup && <div className={styles.messageTime}>{formatTime(normalizedTimestamp)}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.messageWrapper} ${isOwn ? styles.own : styles.other}`}>
      {!isOwn && (
         <div className={styles.avatarContainer}>
           {showAvatar ? (
             <div className={styles.avatar}>{sender?.charAt(0)?.toUpperCase() || '?'}</div>
           ) : (
             <div className={styles.avatarPlaceholder} />
           )}
         </div>
      )}
      
      <div className={`${styles.messageContent} ${isExpanded ? styles.contentExpanded : ''}`}>
        {showSenderName && (
          <div className={styles.messageMeta}>
            <span className={styles.senderName}>{sender || 'Unknown'}</span>
            {sender_role && <span className={styles.senderRole}>• {sender_role}</span>}
          </div>
        )}
        
        {/* Message bubble with hover actions - only show if there's text */}
        {normalizedText?.trim() && (
          <div className={styles.bubbleWrapper}>
            <div 
              className={`${styles.bubble} ${isOwn ? styles.bubbleOwn : styles.bubbleOther} ${isExpanded ? styles.bubbleExpanded : ''}`}
            >
              <p className={styles.messageText}>
                {normalizedText}
                {is_edited && <span className={styles.editedTag}> (edited)</span>}
              </p>
              
              {/* Time inside bubble */}
              <span className={styles.bubbleTime}>{formatTime(normalizedTimestamp)}</span>
              
              {/* Quick reactions button inside bubble */}
              {onReaction && (
                <div 
                  className={`${styles.inlineReactionBtn} ${isOwn ? styles.reactionLeft : styles.reactionRight}`} 
                  ref={quickReactionRef}
                >
                  <button 
                    className={styles.reactionTrigger}
                    onClick={() => setShowQuickReactions(!showQuickReactions)}
                    title="Add reaction"
                  >
                    <FiSmile size={14} />
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
              )}
            </div>

            {/* More options menu (for own messages with text) */}
            {isOwn && (onEdit || onUnsend) && (
              <div className={styles.menuWrapper} ref={menuRef}>
                <button 
                  className={styles.menuBtn}
                  onClick={() => setShowMenu(!showMenu)}
                  title="More options"
                >
                  <FiMoreVertical size={16} />
                </button>
                
                {showMenu && (
                  <div className={styles.dropdownMenu}>
                    {onEdit && (
                      <button 
                        className={styles.menuItem}
                        onClick={() => handleMenuAction('edit')}
                      >
                        <FiEdit2 size={14} />
                        Edit
                      </button>
                    )}
                    {onUnsend && (
                      <>
                        <button 
                          className={styles.menuItem}
                          onClick={() => handleMenuAction('unsend')}
                        >
                          <MdUndo size={14} />
                          Unsend for me
                        </button>
                        <button 
                          className={styles.menuItem}
                          onClick={() => handleMenuAction('unsend_all')}
                        >
                          <MdBlock size={14} />
                          Unsend for everyone
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Attachments */}
        {attachments && attachments.length > 0 && (
          <div className={`${styles.attachmentWrapper} ${!normalizedText?.trim() ? styles.attachmentOnly : ''}`}>
            <div className={`${styles.attachmentsContainer} ${isExpanded ? styles.attachmentsExpanded : ''}`}>
              {attachments.map((attachment, idx) => (
                <AttachmentPreview
                  key={attachment.attachment_id || attachment.id || idx}
                  attachment={attachment}
                  onDownload={onDownloadAttachment}
                  isOwn={isOwn}
                  isExpanded={isExpanded}
                />
              ))}
            </div>
          </div>
        )}

        {/* Reactions display */}
        {reactions && reactions.length > 0 && (
          <div className={styles.reactionsContainer}>
            {Object.entries(reaction_counts || {}).map(([emoji, count]) => (
              <button 
                key={emoji}
                className={styles.reactionBadge}
                onClick={() => onReaction?.(normalizedId, emoji)}
              >
                {emoji} {count}
              </button>
            ))}
          </div>
        )}
        
        {/* Only show external time if it's attachment only AND it is the last in group */}
        {!normalizedText?.trim() && attachments?.length > 0 && isLastInGroup && (
          <div className={styles.messageTime}>{formatTime(normalizedTimestamp)}</div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
