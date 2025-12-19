import { useState } from 'react';
import { Send } from 'lucide-react';

interface Message {
  id: string;
  sender: string;
  role: string;
  timestamp: string;
  time: string;
  content: string;
  isOwn?: boolean;
}

interface MessagesPanelProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
  currentUser: string;
}

export function MessagesPanel({ messages, onSendMessage, currentUser }: MessagesPanelProps) {
  const [newMessage, setNewMessage] = useState('');

  const handleSend = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage);
      setNewMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[600px]">
      {/* Header */}
      <div className="p-4 border-b bg-purple-600">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white text-purple-600 flex items-center justify-center">
            TTS
          </div>
          <div>
            <div className="text-white">TTS Agent Messages</div>
            <div className="text-purple-100 text-sm">Communicate with support team</div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className="flex items-start gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 text-sm">
              {message.sender.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="flex-1">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-sm">{message.sender}</span>
                <span className="text-xs text-gray-500">• {message.role}</span>
              </div>
              <div className="bg-gray-100 rounded-lg p-3 text-sm">
                {message.content}
              </div>
              <div className="text-xs text-gray-400 mt-1">{message.time}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex items-end gap-2">
          <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0 text-xs">
            📎
          </div>
          <div className="flex-1">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              rows={1}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className="w-10 h-10 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}