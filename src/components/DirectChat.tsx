import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';
import { User, Message } from '../types';

interface DirectChatProps {
  recipient: User;
  onBack: () => void;
}

export const DirectChat = ({ recipient, onBack }: DirectChatProps) => {
  const { userEmail, token } = useAuth();
  const { isConnected, sendMessage, subscribeToTopic } = useWebSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch DM history when opening a chat
  useEffect(() => {
    const fetchDMHistory = async () => {
      try {
        const res = await fetch(
          `http://localhost:8080/api/messages/dm/${recipient.email}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!res.ok) throw new Error('Failed to fetch DM history');
        const data: Message[] = await res.json();
        setMessages(data);
      } catch (err) {
        console.error('Failed to fetch DM history:', err);
      }
    };
    fetchDMHistory();
  }, [recipient.email, token]);

  // Subscribe to real-time messages for THIS user
  useEffect(() => {
    if (!isConnected || !userEmail) return;

    console.log('Subscribing to /user/queue/messages for user:', userEmail);

    const unsubscribe = subscribeToTopic(
      `/user/${userEmail}/queue/messages`,
      (message: Message) => {
        console.log('Received DM:', message);

        // Only add messages relevant to this conversation
        if (
          (message.senderEmail === recipient.email && 
           message.receiverEmail === userEmail) ||
          (message.senderEmail === userEmail && 
           message.receiverEmail === recipient.email)
        ) {
          setMessages((prev) => {
            // Prevent duplicates
            const exists = prev.some(
              (m) =>
                m.content === message.content &&
                m.timestamp === message.timestamp &&
                m.senderEmail === message.senderEmail
            );
            if (exists) return prev;
            return [...prev, message];
          });
        }
      }
    );

    return () => unsubscribe();
  }, [isConnected, recipient.email, userEmail, subscribeToTopic]);

  // Scroll to bottom on message update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim() || !isConnected || !userEmail) return;

    const message: Message = {
      senderEmail: userEmail,
      receiverEmail: recipient.email,
      content: inputValue.trim(),
      timestamp: new Date().toISOString(),
    };

    console.log('Sending DM:', message);
    sendMessage(message);
    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-slate-200 p-4 flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </button>
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
          <span className="text-blue-600 font-medium">
            {recipient.email[0].toUpperCase()}
          </span>
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-slate-900">{recipient.email}</h2>
          <p className="text-sm text-slate-500">Direct message</p>
        </div>
        {!isConnected && (
          <div className="flex items-center gap-2 text-sm text-amber-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            Connecting...
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((message, index) => {
            const isOwn = message.senderEmail === userEmail;
            return (
              <div
                key={index}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-2 rounded-2xl ${
                    isOwn
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-900'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                  <div
                    className={`text-xs mt-1 ${
                      isOwn ? 'text-blue-100' : 'text-slate-500'
                    }`}
                  >
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            disabled={!isConnected}
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || !isConnected}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};