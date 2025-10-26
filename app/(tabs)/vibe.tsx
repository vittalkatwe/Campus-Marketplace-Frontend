import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

// Types
interface User {
  id: string;
  email: string;
}

interface Community {
  id: number;
  name: string;
  description: string;
  createdAt: string;
}

interface Message {
  senderEmail: string;
  receiverEmail?: string;
  communityId?: number;
  content: string;
  timestamp: string;
}

// Props interface
interface ChatScreenProps {
  token: string;
  userEmail: string;
}

const BASE_URL = 'http://192.168.1.7:8080';

// API functions
const api = {
  getDMContacts: async (token: string): Promise<string[]> => {
    const res = await fetch(`${BASE_URL}/api/messages/dm/contacts`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  getCommunities: async (token: string): Promise<Community[]> => {
    const res = await fetch(`${BASE_URL}/api/communities`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  searchUsers: async (email: string, token: string): Promise<User[]> => {
    const res = await fetch(
      `${BASE_URL}/api/users/search?email=${encodeURIComponent(email)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return data
      .filter((u: any) => u.email)
      .map((u: any) => ({
        id: u.id?.toString() || u.email,
        email: u.email,
      }));
  },

  getDMHistory: async (recipientEmail: string, token: string): Promise<Message[]> => {
    const res = await fetch(`${BASE_URL}/api/messages/dm/${recipientEmail}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  getCommunityMessages: async (
    communityId: number,
    token: string
  ): Promise<Message[]> => {
    const res = await fetch(`${BASE_URL}/api/messages/community/${communityId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};

export default function ChatScreen({ token, userEmail }: ChatScreenProps) {
  // WebSocket state
  const [isConnected, setIsConnected] = useState(false);
  const clientRef = useRef<Client | null>(null);

  // Navigation state
  const [activeTab, setActiveTab] = useState<'dm' | 'community'>('dm');
  const [selectedChat, setSelectedChat] = useState<{
    type: 'dm' | 'community';
    data: User | Community;
  } | null>(null);

  // DM state
  const [dmContacts, setDmContacts] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);

  // Community state
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loadingCommunities, setLoadingCommunities] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const flatListRef = useRef<FlatList>(null);

  // Initialize WebSocket
  useEffect(() => {
    if (!token) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(`${BASE_URL}/ws`),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      debug: (msg) => console.log('STOMP:', msg),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,

      onConnect: (frame) => {
        console.log('✅ WebSocket Connected');
        setIsConnected(true);

        // Subscribe to personal DM queue
        client.subscribe(`/user/${userEmail}/queue/messages`, (msg) => {
          try {
            const message: Message = JSON.parse(msg.body);
            console.log('Received DM:', message);

            // Update messages if in active chat
            if (selectedChat?.type === 'dm') {
              const recipient = (selectedChat.data as User).email;
              if (
                (message.senderEmail === recipient &&
                  message.receiverEmail === userEmail) ||
                (message.senderEmail === userEmail &&
                  message.receiverEmail === recipient)
              ) {
                setMessages((prev) => {
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

            // Update contacts list
            const otherEmail =
              message.senderEmail === userEmail
                ? message.receiverEmail
                : message.senderEmail;
            if (otherEmail) {
              setDmContacts((prev) => {
                if (!prev.find((u) => u.email === otherEmail)) {
                  return [
                    { id: otherEmail, email: otherEmail },
                    ...prev,
                  ];
                }
                return prev;
              });
            }
          } catch (e) {
            console.error('Error parsing DM:', e);
          }
        });
      },

      onDisconnect: () => {
        console.log('⚠️ WebSocket Disconnected');
        setIsConnected(false);
      },

      onStompError: (frame) => {
        console.error('❌ STOMP Error:', frame.headers['message']);
        setIsConnected(false);
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      if (client.active) client.deactivate();
    };
  }, [token, userEmail]);

  // Subscribe to community topic when selected
  useEffect(() => {
    if (!isConnected || !selectedChat || selectedChat.type !== 'community') {
      return;
    }

    const community = selectedChat.data as Community;
    const subscription = clientRef.current?.subscribe(
      `/topic/community/${community.id}`,
      (msg) => {
        try {
          const message: Message = JSON.parse(msg.body);
          console.log('Received community message:', message);
          setMessages((prev) => [...prev, message]);
        } catch (e) {
          console.error('Error parsing community message:', e);
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, [isConnected, selectedChat]);

  // Fetch DM contacts on mount
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const emails = await api.getDMContacts(token);
        const contacts: User[] = emails.map((email, index) => ({
          id: `${email}-${index}`,
          email,
        }));
        setDmContacts(contacts);
      } catch (err) {
        console.error('Failed to fetch DM contacts:', err);
      }
    };
    fetchContacts();
  }, [token]);

  // Fetch communities
  useEffect(() => {
    const fetchCommunities = async () => {
      setLoadingCommunities(true);
      try {
        const data = await api.getCommunities(token);
        setCommunities(data);
      } catch (error) {
        console.error('Failed to fetch communities:', error);
        Alert.alert('Error', 'Failed to load communities');
      } finally {
        setLoadingCommunities(false);
      }
    };
    fetchCommunities();
  }, [token]);

  // Debounced search
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await api.searchUsers(searchQuery, token);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      Alert.alert('Error', 'Failed to search users');
    } finally {
      setSearching(false);
    }
  };

  // Load messages when chat is selected
  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      try {
        let data: Message[];
        if (selectedChat.type === 'dm') {
          data = await api.getDMHistory(
            (selectedChat.data as User).email,
            token
          );
        } else {
          data = await api.getCommunityMessages(
            (selectedChat.data as Community).id,
            token
          );
        }
        setMessages(data);
      } catch (err) {
        console.error('Failed to fetch messages:', err);
        Alert.alert('Error', 'Failed to load messages');
      }
    };

    fetchMessages();
  }, [selectedChat, token]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim() || !isConnected || !selectedChat) {
      if (!isConnected) {
        Alert.alert('Not Connected', 'Please wait for connection to establish');
      }
      return;
    }

    const message: Message = {
      senderEmail: userEmail,
      content: inputValue.trim(),
      timestamp: new Date().toISOString(),
      ...(selectedChat.type === 'dm'
        ? { receiverEmail: (selectedChat.data as User).email }
        : { communityId: (selectedChat.data as Community).id }),
    };

    try {
      clientRef.current?.publish({
        destination: '/app/chat.sendMessage',
        body: JSON.stringify(message),
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setInputValue('');
    } catch (error) {
      console.error('Failed to send message:', error);
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const handleSelectChat = (type: 'dm' | 'community', data: User | Community) => {
    setSelectedChat({ type, data });
    setSearchQuery('');
    setSearchResults([]);
  };

  const renderChatHeader = () => {
    if (!selectedChat) return null;

    const isUser = selectedChat.type === 'dm';
    const data = selectedChat.data;

    return (
      <View style={styles.chatHeader}>
        <TouchableOpacity
          onPress={() => setSelectedChat(null)}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>

        <View style={[styles.chatHeaderAvatar, isUser ? styles.dmAvatar : styles.communityAvatar]}>
          <Text style={styles.chatHeaderAvatarText}>
            {isUser
              ? (data as User).email[0].toUpperCase()
              : (data as Community).name[0].toUpperCase()}
          </Text>
        </View>

        <View style={styles.chatHeaderInfo}>
          <Text style={styles.chatHeaderTitle}>
            {isUser ? (data as User).email : (data as Community).name}
          </Text>
          <Text style={styles.chatHeaderSubtitle}>
            {isUser ? 'Direct message' : (data as Community).description}
          </Text>
        </View>

        {!isConnected && (
          <View style={styles.connectingBadge}>
            <ActivityIndicator size="small" color="#dc2626" />
          </View>
        )}
      </View>
    );
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwn = item.senderEmail === userEmail;

    return (
      <View
        style={[
          styles.messageContainer,
          isOwn ? styles.messageContainerOwn : styles.messageContainerOther,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isOwn ? styles.messageBubbleOwn : styles.messageBubbleOther,
          ]}
        >
          {!isOwn && selectedChat?.type === 'community' && (
            <Text style={styles.messageSender}>
              {item.senderEmail.split('@')[0]}
            </Text>
          )}
          <Text
            style={[
              styles.messageText,
              isOwn ? styles.messageTextOwn : styles.messageTextOther,
            ]}
          >
            {item.content}
          </Text>
          <Text
            style={[
              styles.messageTime,
              isOwn ? styles.messageTimeOwn : styles.messageTimeOther,
            ]}
          >
            {new Date(item.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    );
  };

  const renderChatView = () => (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {renderChatHeader()}

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item, index) => `${item.timestamp}-${index}`}
        contentContainerStyle={styles.messagesList}
        ListEmptyComponent={
          <View style={styles.emptyMessages}>
            <Ionicons name="chatbubbles-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyMessagesText}>
              No messages yet. Start the conversation!
            </Text>
          </View>
        }
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputValue}
          onChangeText={setInputValue}
          placeholder="Type a message..."
          placeholderTextColor="#94a3b8"
          editable={isConnected}
          multiline
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={!inputValue.trim() || !isConnected}
          style={[
            styles.sendButton,
            (!inputValue.trim() || !isConnected) && styles.sendButtonDisabled,
          ]}
        >
          <Ionicons name="send" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  const renderContactItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.contactItem}
      onPress={() => handleSelectChat('dm', item)}
    >
      <View style={styles.contactAvatar}>
        <Text style={styles.contactAvatarText}>
          {item.email[0].toUpperCase()}
        </Text>
      </View>
      <Text style={styles.contactEmail}>{item.email}</Text>
    </TouchableOpacity>
  );

  const renderCommunityItem = ({ item }: { item: Community }) => (
    <TouchableOpacity
      style={styles.communityItem}
      onPress={() => handleSelectChat('community', item)}
    >
      <View style={styles.communityAvatar}>
        <Ionicons name="people" size={24} color="#8b5cf6" />
      </View>
      <View style={styles.communityInfo}>
        <Text style={styles.communityName}>{item.name}</Text>
        <Text style={styles.communityDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <Text style={styles.communityDate}>
          Created {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderListView = () => (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {activeTab === 'dm' ? 'Direct Messages' : 'Communities'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {activeTab === 'dm'
            ? 'Chat privately with other users'
            : 'Join conversations with your campus'}
        </Text>
        {!isConnected && (
          <View style={styles.headerConnectionStatus}>
            <ActivityIndicator size="small" color="#EF4444" />
            <Text style={styles.headerConnectionText}>Connecting...</Text>
          </View>
        )}
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'dm' && styles.tabActive]}
          onPress={() => setActiveTab('dm')}
        >
          <Ionicons
            name="chatbubble"
            size={20}
            color={activeTab === 'dm' ? '#EF4444' : '#64748b'}
          />
          <Text
            style={[styles.tabText, activeTab === 'dm' && styles.tabTextActive]}
          >
            Messages
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'community' && styles.tabActive]}
          onPress={() => setActiveTab('community')}
        >
          <Ionicons
            name="people"
            size={20}
            color={activeTab === 'community' ? '#EF4444' : '#64748b'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'community' && styles.tabTextActive,
            ]}
          >
            Communities
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'dm' && (
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons
              name="search"
              size={20}
              color="#94a3b8"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search users by email..."
              placeholderTextColor="#94a3b8"
            />
            {searching && (
              <ActivityIndicator
                size="small"
                color="#EF4444"
                style={styles.searchLoader}
              />
            )}
          </View>

          {searchResults.length > 0 && (
            <View style={styles.searchResults}>
              <FlatList
                data={searchResults}
                renderItem={renderContactItem}
                keyExtractor={(item) => item.id}
                style={styles.searchResultsList}
              />
            </View>
          )}
        </View>
      )}

      <View style={styles.listContainer}>
        {activeTab === 'dm' ? (
          dmContacts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={64} color="#cbd5e1" />
              <Text style={styles.emptyStateText}>No conversations yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Search for users to start chatting
              </Text>
            </View>
          ) : (
            <FlatList
              data={dmContacts}
              renderItem={renderContactItem}
              keyExtractor={(item) => item.id}
            />
          )
        ) : loadingCommunities ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#EF4444" />
          </View>
        ) : communities.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyStateText}>No communities available</Text>
          </View>
        ) : (
          <FlatList
            data={communities}
            renderItem={renderCommunityItem}
            keyExtractor={(item) => item.id.toString()}
          />
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {selectedChat ? renderChatView() : renderListView()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  flex: {
    flex: 1,
  },
  header: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    padding: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    fontFamily: 'Outfit-Bold',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
    fontFamily: 'Outfit-Regular',
  },
  headerConnectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  headerConnectionText: {
    fontSize: 12,
    color: '#EF4444',
    fontFamily: 'Outfit-Medium',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#EF4444',
  },
  tabText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
    fontFamily: 'Outfit-Medium',
  },
  tabTextActive: {
    color: '#EF4444',
    fontWeight: '600',
    fontFamily: 'Outfit-SemiBold',
  },
  searchContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    padding: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0f172a',
    fontFamily: 'Outfit-Regular',
  },
  searchLoader: {
    marginLeft: 8,
  },
  searchResults: {
    marginTop: 8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    maxHeight: 256,
    overflow: 'hidden',
  },
  searchResultsList: {
    maxHeight: 256,
  },
  listContainer: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 16,
    fontWeight: '500',
    fontFamily: 'Outfit-Medium',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
    fontFamily: 'Outfit-Regular',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  contactAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#EF4444',
    fontFamily: 'Outfit-SemiBold',
  },
  contactEmail: {
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '500',
    fontFamily: 'Outfit-Medium',
  },
  communityItem: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  communityAvatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f3e8ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  communityInfo: {
    flex: 1,
  },
  communityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
    fontFamily: 'Outfit-SemiBold',
  },
  communityDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
    fontFamily: 'Outfit-Regular',
  },
  communityDate: {
    fontSize: 12,
    color: '#94a3b8',
    fontFamily: 'Outfit-Regular',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    padding: 16,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  chatHeaderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dmAvatar: {
    backgroundColor: '#fee2e2',
  },
  chatHeaderAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
    fontFamily: 'Outfit-SemiBold',
  },
  chatHeaderInfo: {
    flex: 1,
  },
  chatHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Outfit-SemiBold',
  },
  chatHeaderSubtitle: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Outfit-Regular',
  },
  connectingBadge: {
    padding: 4,
  },
  messagesList: {
    padding: 16,
  },
  emptyMessages: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyMessagesText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 16,
    fontFamily: 'Outfit-Regular',
  },
  messageContainer: {
    marginBottom: 16,
  },
  messageContainerOwn: {
    alignItems: 'flex-end',
  },
  messageContainerOther: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
  },
  messageBubbleOwn: {
    backgroundColor: '#EF4444',
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderBottomLeftRadius: 4,
  },
  messageSender: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8b5cf6',
    marginBottom: 4,
    fontFamily: 'Outfit-SemiBold',
  },
  messageText: {
    fontSize: 16,
    fontFamily: 'Outfit-Regular',
  },
  messageTextOwn: {
    color: '#ffffff',
  },
  messageTextOther: {
    color: '#0f172a',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    fontFamily: 'Outfit-Regular',
  },
  messageTimeOwn: {
    color: '#fecaca',
  },
  messageTimeOther: {
    color: '#94a3b8',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    padding: 16,
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: '#0f172a',
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    fontFamily: 'Outfit-Regular',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});