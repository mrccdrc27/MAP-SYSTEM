import React, { useRef, useState } from 'react';
import { FiPaperclip, FiSend, FiSmile, FiX } from 'react-icons/fi';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
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
  attachments = [], 
  setAttachments,
  onSend, 
  onTyping,
  onStopTyping,
  isLoading,
  disabled = false,
  placeholder = "Type a message..."
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
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if ((message.trim() || attachments.length > 0) && !isLoading && !disabled) {
      onSend();
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (setAttachments) {
      setAttachments(prev => [...prev, ...files]);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const removeAttachment = (index) => {
    if (setAttachments) {
      setAttachments(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Check if file is an image for preview
  const isImageFile = (file) => {
    return file.type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
  };

  return (
    <div className={styles.inputWrapper}>
      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className={styles.attachmentsPreview}>
          {attachments.map((file, index) => (
            <div key={index} className={styles.attachmentChip}>
              {isImageFile(file) ? (
                <div className={styles.imageThumb}>
                  <img 
                    src={URL.createObjectURL(file)} 
                    alt={file.name}
                    onLoad={(e) => URL.revokeObjectURL(e.target.src)}
                  />
                </div>
              ) : (
                <span className={styles.attachmentIcon}>
                  <FiPaperclip size={14} />
                </span>
              )}
              <span className={styles.attachmentName}>{file.name}</span>
              <button 
                onClick={() => removeAttachment(index)}
                className={styles.removeBtn}
                type="button"
              >
                <FiX size={12} />
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
          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.webp,.zip,.rar,.xls,.xlsx,.ppt,.pptx"
          style={{ display: 'none' }}
        />
        
        <button
          onClick={() => fileInputRef.current?.click()}
          className={styles.attachBtn}
          disabled={isLoading || disabled}
          type="button"
          title="Attach file"
        >
          <FiPaperclip size={18} />
        </button>

        {/* Emoji Picker Button */}
        <div className={styles.emojiPickerWrapper} ref={emojiPickerRef}>
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={styles.emojiBtn}
            disabled={isLoading || disabled}
            type="button"
            title="Add emoji"
          >
            <FiSmile size={18} />
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
                  <FiX size={14} />
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
          placeholder={placeholder}
          className={styles.textarea}
          disabled={isLoading || disabled}
          rows={1}
        />

        <button
          onClick={handleSend}
          className={styles.sendBtn}
          disabled={isLoading || disabled || (!message.trim() && attachments.length === 0)}
          type="button"
        >
          {isLoading ? (
            <AiOutlineLoading3Quarters size={18} className={styles.spinner} />
          ) : (
            <FiSend size={18} />
          )}
        </button>
      </div>
    </div>
  );
};

export default MessageInput;
