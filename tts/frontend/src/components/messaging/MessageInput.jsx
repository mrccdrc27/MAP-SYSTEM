import React, { useRef } from 'react';
import styles from './MessageInput.module.css';

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
                {file.type.startsWith('image/') ? '🖼️' : '📎'}
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
          📎
        </button>

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
          {isLoading ? '⏳' : '➤'}
        </button>
      </div>
    </div>
  );
};

export default MessageInput;
