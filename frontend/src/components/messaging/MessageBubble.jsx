import React from 'react';
import styles from './MessageBubble.module.css';
import AttachmentPreview from './AttachmentPreview';
import MessageReactions from './MessageReactions';

const MessageBubble = ({ 
  message, 
  isOwn, 
  currentUserId,
  currentUserData,
  onEdit, 
  onDelete,
  onReaction,
  onDownloadAttachment,
  showReactionModal,
  setShowReactionModal
}) => {
  const { 
    message_id, 
    message: text, 
    sender, 
    sender_role, 
    is_edited, 
    attachments = [],
    reactions = [],
    reaction_counts = {},
    created_at 
  } = message;

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
        
        <div className={`${styles.bubble} ${isOwn ? styles.bubbleOwn : styles.bubbleOther}`}>
          <p className={styles.messageText}>{text}</p>
          {is_edited && <span className={styles.editedTag}>(edited)</span>}
        </div>

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className={styles.attachmentsContainer}>
            {attachments.map((attachment) => (
              <AttachmentPreview
                key={attachment.attachment_id}
                attachment={attachment}
                onDownload={onDownloadAttachment}
                isOwn={isOwn}
              />
            ))}
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
          showReactionModal={showReactionModal}
          setShowReactionModal={setShowReactionModal}
          isOwn={isOwn}
        />

        <div className={styles.messageTime}>{formatTime(created_at)}</div>

        {/* Message Actions for own messages */}
        {isOwn && (
          <div className={styles.messageActions}>
            <button onClick={() => onEdit(message)} className={styles.actionBtn}>
              ✏️ Edit
            </button>
            <button onClick={() => onDelete(message_id)} className={styles.actionBtn}>
              🗑️ Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
