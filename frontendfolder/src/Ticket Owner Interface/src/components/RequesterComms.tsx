import { useState, useRef, useEffect } from 'react';
import { Send, ChevronDown, ChevronUp, Paperclip, X, FileText, Image as ImageIcon, File } from 'lucide-react';

interface Message {
  id: string;
  sender: string;
  role: string;
  timestamp: string;
  time: string;
  content: string;
  isOwn?: boolean;
}

interface RequesterCommsProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
  currentUser: string;
  requesterName: string;
}

export function RequesterComms({ messages, onSendMessage, currentUser, requesterName }: RequesterCommsProps) {
  const [replyContent, setReplyContent] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (replyContent.trim() || attachedFiles.length > 0) {
      onSendMessage(replyContent);
      setReplyContent('');
      setAttachedFiles([]);
      // Reset textarea height after sending
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReplyContent(e.target.value);
    
    // Auto-expand textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext || '')) {
      return <ImageIcon className="w-4 h-4 text-blue-600" />;
    }
    if (['pdf', 'doc', 'docx', 'txt'].includes(ext || '')) {
      return <FileText className="w-4 h-4 text-gray-600" />;
    }
    return <File className="w-4 h-4 text-gray-600" />;
  };

  const displayedMessages = showAll ? messages : messages.slice(-3);
  const hasMoreMessages = messages.length > 3;

  return (
    <div className="bg-white">
      {/* Email Thread */}
      <div className="p-6 space-y-6">
        {displayedMessages.map((message) => (
          <div key={message.id} className="border-l-4 border-gray-200 pl-4">
            {/* Email Header */}
            <div className="flex items-start gap-3 mb-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm text-white ${
                message.isOwn ? 'bg-blue-600' : 'bg-gray-600'
              }`}>
                {message.sender.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-gray-900">{message.sender}</span>
                  <span className="text-xs text-gray-500">({message.role})</span>
                </div>
                <div className="text-sm text-gray-500">
                  {message.timestamp} at {message.time}
                </div>
              </div>
            </div>

            {/* Email Body */}
            <div className="text-gray-900 leading-relaxed whitespace-pre-wrap">
              {message.content}
            </div>
          </div>
        ))}

        {/* Show More/Less Button */}
        {hasMoreMessages && (
          <div className="flex justify-center pt-2">
            <button
              onClick={() => setShowAll(!showAll)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              {showAll ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Show fewer messages
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Show all {messages.length} messages
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Reply Section */}
      <div className="border-t bg-gray-50 p-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span>To:</span>
            <span className="text-gray-900">{requesterName}</span>
          </div>
          <textarea
            value={replyContent}
            onChange={handleTextareaChange}
            placeholder="Type your message..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none overflow-hidden"
            ref={textareaRef}
          />
          
          {/* Attached Files */}
          {attachedFiles.length > 0 && (
            <div className="space-y-2">
              {attachedFiles.map((file, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded-lg"
                >
                  <div className="flex-shrink-0">
                    {getFileIcon(file.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveFile(index)}
                    className="flex-shrink-0 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                multiple
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Paperclip className="w-4 h-4" />
                Attach files
              </button>
            </div>
            <button
              onClick={handleSend}
              disabled={!replyContent.trim() && attachedFiles.length === 0}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}