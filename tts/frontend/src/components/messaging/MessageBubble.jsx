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
    const options = { hour: 'numeric', minute: '2-digit', hour12: true };
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

  // Styles logic
  const wrapperStyle = {
    marginBottom: isLastInGroup ? '12px' : '2px', // Tighter spacing within group
  };

  // Avatar visibility: Show only for the last message in a group (bottom aligned visual)
  // OR first message (top aligned visual). 
  // Current design is top aligned (flex-start).
  // Standard apps: Avatar often at bottom. 
  // Let's stick to showing avatar for the LAST message in the group to match the "tail" at bottom.
  // But wait, the previous CSS aligned items to start. I should change CSS to align to end if I want bottom avatars.
  // For now, let's keep it simple: Show avatar for every message BUT hide it (visibility: hidden) for non-last messages.
  // Actually, standard is: Avatar at BOTTOM of group.
  
  const showAvatar = isLastInGroup; 
  
  // Border radius logic
  const bubbleStyle = {};
  if (!isFirstInGroup && !isLastInGroup) {
    // Middle message: softer corners everywhere
    bubbleStyle.borderRadius = '18px 18px 18px 18px';
  } else if (isFirstInGroup && !isLastInGroup) {
    // Top of group: fully rounded (no tail yet)
    bubbleStyle.borderRadius = '18px 18px 18px 18px';
  } else if (!isFirstInGroup && isLastInGroup) {
    // Bottom of group: has the tail
    // Inherits default class style which has the tail
  }
  
  // Show sender name only on first message of group
  const showSenderName = !isOwn && isFirstInGroup;

  // Show unsent message placeholder
  if (is_unsent) {
    return (
      <div className={`${styles.messageWrapper} ${isOwn ? styles.own : styles.other}`} style={wrapperStyle}>
        {!isOwn && (
          <div className={styles.avatarContainer}>
             {showAvatar ? (
               <div className={styles.avatar}>{sender?.charAt(0)?.toUpperCase()}</div>
             ) : (
               <div className={styles.avatarPlaceholder} />
             )}
          </div>
        )}
        <div className={styles.messageContent}>
          {showSenderName && (
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
          {isLastInGroup && <div className={styles.messageTime}>{formatTime(created_at)}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.messageWrapper} ${isOwn ? styles.own : styles.other}`} style={wrapperStyle}>
      {!isOwn && (
         <div className={styles.avatarContainer}>
           {showAvatar ? (
             <div className={styles.avatar}>{sender?.charAt(0)?.toUpperCase()}</div>
           ) : (
             <div className={styles.avatarPlaceholder} />
           )}
         </div>
      )}
      
      <div className={`${styles.messageContent} ${isExpanded ? styles.contentExpanded : ''}`}>
        {showSenderName && (
          <div className={styles.messageMeta}>
            <span className={styles.senderName}>{sender}</span>
            {sender_role && <span className={styles.senderRole}>• {sender_role}</span>}
          </div>
        )}
        
        {/* Message bubble with hover actions - only show if there's text */}
        {text?.trim() && (
          <div className={styles.bubbleWrapper}>
            <div 
              className={`${styles.bubble} ${isOwn ? styles.bubbleOwn : styles.bubbleOther} ${isExpanded ? styles.bubbleExpanded : ''}`}
              style={bubbleStyle}
            >
              <p className={styles.messageText}>
                {text}
                {is_edited && <span className={styles.editedTag}>(edited)</span>}
              </p>
              
              {/* Time inside bubble */}
              <span className={styles.bubbleTime}>{formatTime(created_at)}</span>
              
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
            
            <div className={`${styles.attachmentsContainer} ${isExpanded ? styles.attachmentsExpanded : ''}`}>
              {attachments.map((attachment) => (
                <AttachmentPreview
                  key={attachment.attachment_id}
                  attachment={attachment}
                  onDownload={onDownloadAttachment}
                  isOwn={isOwn}
                  isExpanded={isExpanded}
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
        
        {/* Only show external time if it's attachment only (since text bubbles have internal time) 
            AND it is the last in group */}
        {!text?.trim() && isLastInGroup && (
          <div className={styles.messageTime}>{formatTime(created_at)}</div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
