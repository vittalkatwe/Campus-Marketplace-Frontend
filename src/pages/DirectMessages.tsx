import { useState, useEffect } from 'react';
import { MessageSquare, Search, Loader2 } from 'lucide-react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { User, Message } from '../types';
import { DirectChat } from '../components/DirectChat';
import { useWebSocket } from '../context/WebSocketContext';

export const DirectMessages = () => {
  const { token, userEmail } = useAuth();
  const { isConnected, subscribeToTopic } = useWebSocket();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<User[]>([]);

  // Fetch DM contacts on mount
  useEffect(() => {
    const fetchContacts = async () => {
      if (!token) return;
      try {
        const emails: string[] = await api.getDMContacts(token); // returns array of emails
        const contacts: User[] = emails.map((email, index) => ({
          id: `${email}-${index}`,
          email,
        }));
        setConversations(contacts);
      } catch (err) {
        console.error('Failed to fetch DM contacts:', err);
      }
    };
    fetchContacts();
  }, [token]);

  // Subscribe to incoming DMs for real-time updates
  useEffect(() => {
    if (!isConnected) return;
  
    const unsubscribeReceiver = subscribeToTopic(`/user/${userEmail}/queue/messages`, (message: Message) => {
      if (!message.senderEmail || !message.receiverEmail) return;
  
      const otherEmail = message.senderEmail === userEmail ? message.receiverEmail : message.senderEmail;
  
      setConversations(prev => {
        if (!prev.find(u => u.email === otherEmail)) {
          return [{ id: `${otherEmail}-${Math.random()}`, email: otherEmail }, ...prev];
        }
        return prev;
      });
    });
  
    return () => unsubscribeReceiver();
  }, [isConnected, subscribeToTopic, userEmail]);
  
  // Debounced search
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchQuery.trim() && token) handleSearch();
      else setSearchResults([]);
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery, token]);

  const handleSearch = async () => {
    if (!searchQuery.trim() || !token) return;

    setSearching(true);
    try {
      const results = (await api.searchUsers(searchQuery, token)) as User[];
      const filtered = results
        .filter(u => u.email)
        .map((u, index) => ({
          id: u.id?.toString() || `${u.email}-${index}-${Math.random()}`,
          email: u.email!,
        }));
      setSearchResults(filtered);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectUser = (user: User) => {
    if (!user.email) return;
    setSelectedUser(user);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Render DirectChat if a user is selected
  if (selectedUser) {
    return (
      <DirectChat
        recipient={selectedUser}
        onBack={() => setSelectedUser(null)}
        // Optional: pass conversations if needed
      />
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-6">
        <h1 className="text-2xl font-bold text-slate-900">Direct Messages</h1>
        <p className="text-slate-600 mt-1">Chat privately with other users</p>
      </div>

      {/* Search */}
      <div className="p-4 bg-white border-b border-slate-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users by email..."
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-600 animate-spin" />
          )}
        </div>

        {searchResults.length > 0 && (
          <div className="mt-2 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
            {searchResults.map((user, index) => (
              <button
                key={user.id ?? `${user.email}-${index}`}
                onClick={() => handleSelectUser(user)}
                className="w-full px-4 py-3 hover:bg-slate-50 flex items-center gap-3 transition border-b border-slate-100 last:border-0"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-medium text-lg">
                    {user.email?.[0]?.toUpperCase() ?? '?'}
                  </span>
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-slate-900">{user.email ?? 'Unknown'}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto p-4">
        {conversations.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No conversations yet</p>
            <p className="text-sm text-slate-400 mt-1">Search for users to start chatting</p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((user, index) => (
              <button
                key={user.id ?? `${user.email}-${index}`}
                onClick={() => handleSelectUser(user)}
                className="w-full bg-white border border-slate-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition flex items-center gap-3"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-medium text-lg">
                    {user.email?.[0]?.toUpperCase() ?? '?'}
                  </span>
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-slate-900">{user.email ?? 'Unknown'}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
