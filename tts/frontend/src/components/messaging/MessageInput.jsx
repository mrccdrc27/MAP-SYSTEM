import React, { useRef, useState } from 'react';
import styles from './MessageInput.module.css';

// Common emoji categories for quick access
const EMOJI_CATEGORIES = {
  'Smileys': ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😍', '🥰', '😘'],
  'Gestures': ['👍', '👎', '👏', '🙌', '🤝', '✌️', '🤞', '👌', '🤙', '💪', '🙏'],
  'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💕', '💗', '💖'],
  'Objects': ['🔥', '⭐', '✨', '💡', '📌', '🎉', '🎊', '🏆', '💯', '✅', '❌']
};

const MessageInput = ({ 
  message, 
  setMessage, 
  attachments, 
  setAttachments,
  onSend, 
  onTyping,
  onStopTyping,
  isLoading 
}) => {
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef(null);

  // Handle emoji selection
  const handleEmojiSelect = (emoji) => {
    setMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  const handleInputChange = (e) => {
    setMessage(e.target.value);
    if (e.target.value.trim()) {
      onTyping?.();
    } else {
      onStopTyping?.();
    }
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if ((message.trim() || attachments.length > 0) && !isLoading) {
      onSend();
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className={styles.inputWrapper}>
      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className={styles.attachmentsPreview}>
          {attachments.map((file, index) => (
            <div key={index} className={styles.attachmentChip}>
              <span className={styles.attachmentIcon}>
                <i className={file.type.startsWith('image/') ? 'fa-regular fa-image' : 'fa-solid fa-paperclip'}></i>
              </span>
              <span className={styles.attachmentName}>{file.name}</span>
              <button 
                onClick={() => removeAttachment(index)}
                className={styles.removeBtn}
                type="button"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className={styles.inputContainer}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.webp,.zip,.rar"
          style={{ display: 'none' }}
        />
        
        <button
          onClick={() => fileInputRef.current?.click()}
          className={styles.attachBtn}
          disabled={isLoading}
          type="button"
          title="Attach file"
        >
          <i className="fa-solid fa-paperclip"></i>
        </button>

        {/* Emoji Picker Button */}
        <div className={styles.emojiPickerWrapper} ref={emojiPickerRef}>
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={styles.emojiBtn}
            disabled={isLoading}
            type="button"
            title="Add emoji"
          >
            <i className="fa-regular fa-face-smile"></i>
          </button>
          
          {showEmojiPicker && (
            <div className={styles.emojiPicker}>
              <div className={styles.emojiPickerHeader}>
                <span>Emojis</span>
                <button 
                  onClick={() => setShowEmojiPicker(false)}
                  className={styles.emojiPickerClose}
                  type="button"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
              <div className={styles.emojiPickerContent}>
                {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
                  <div key={category} className={styles.emojiCategory}>
                    <div className={styles.emojiCategoryLabel}>{category}</div>
                    <div className={styles.emojiGrid}>
                      {emojis.map((emoji) => (
                        <button
                          key={emoji}
                          className={styles.emojiOption}
                          onClick={() => handleEmojiSelect(emoji)}
                          type="button"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={onStopTyping}
          placeholder="Type a message..."
          className={styles.textarea}
          disabled={isLoading}
          rows={1}
        />

        <button
          onClick={handleSend}
          className={styles.sendBtn}
          disabled={isLoading || (!message.trim() && attachments.length === 0)}
          type="button"
        >
          {isLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-paper-plane"></i>}
        </button>
      </div>
    </div>
  );
};

export default MessageInput;
