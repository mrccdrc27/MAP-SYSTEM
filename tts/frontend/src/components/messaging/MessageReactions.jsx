import React from 'react';
import styles from './MessageReactions.module.css';

const MessageReactions = ({
  messageId,
  reactions,
  reactionCounts,
  currentUserId,
  currentUserData,
  onReaction,
  isOwn
}) => {
  const hasReactions = Object.keys(reactionCounts).length > 0;

  // Check if current user reacted with specific emoji
  const hasUserReacted = (emoji) => {
    // The API returns reactions with 'user' and 'user_full_name' fields, NOT 'user_id'
    const currentUserFullName = currentUserData?.full_name || 
      `${currentUserData?.first_name} ${currentUserData?.last_name}`.trim();
    
    return reactions?.some(r => {
      // Match by full name since the API doesn't return user_id in reactions
      return (r.user === currentUserFullName || r.user_full_name === currentUserFullName) 
        && r.reaction === emoji;
    });
  };

  // Get names of users who reacted with specific emoji
  const getReactorNames = (emoji) => {
    return reactions
      ?.filter(r => r.reaction === emoji)
      ?.map(r => r.user_full_name || r.user)
      ?.slice(0, 3)
      ?.join(', ');
  };

  // Don't render anything if no reactions
  if (!hasReactions) {
    return null;
  }

  return (
    <div className={`${styles.reactionsContainer} ${isOwn ? styles.reactionsOwn : styles.reactionsOther}`}>
      {/* Existing Reactions */}
      <div className={styles.reactionsList}>
        {Object.entries(reactionCounts).map(([emoji, count]) => {
          const userReacted = hasUserReacted(emoji);
          const names = getReactorNames(emoji);
          const moreCount = reactions?.filter(r => r.reaction === emoji).length - 3;

          return (
            <button
              key={emoji}
              className={`${styles.reactionBubble} ${userReacted ? styles.userReacted : ''}`}
              onClick={() => onReaction(messageId, emoji)}
              title={`${names}${moreCount > 0 ? ` and ${moreCount} others` : ''}`}
            >
              <span className={styles.reactionEmoji}>{emoji}</span>
              <span className={styles.reactionCount}>{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MessageReactions;
