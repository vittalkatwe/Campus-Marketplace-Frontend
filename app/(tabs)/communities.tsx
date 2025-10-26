import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { webSocketService } from '@/services/WebSocketService';

const BASE_URL = 'http://192.168.1.7:8080';

interface Community {
  id: number;
  name: string;
  description: string;
  createdAt: string;
  isAnonymous?: boolean;
}

interface CommunityMessage {
  id?: number;
  senderEmail: string;
  communityId: number;
  content: string;
  timestamp: string;
  _type?: 'community';
}

export default function CommunitiesScreen() {
  const { token, userEmail } = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [showCommunityModal, setShowCommunityModal] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const selectedCommunityRef = useRef<Community | null>(null);

  // Update ref whenever selectedCommunity changes
  useEffect(() => {
    selectedCommunityRef.current = selectedCommunity;
    console.log('📝 Selected community updated to:', selectedCommunity?.name);
  }, [selectedCommunity]);

  // Fetch communities on mount
  useEffect(() => {
    if (token) {
      fetchCommunities();
    }
  }, [token]);

  // Setup WebSocket connection and message handling
  useEffect(() => {
    if (!token || !userEmail) {
      console.log('⚠️ WebSocket: not authenticated, skipping...');
      return;
    }

    console.log('🔌 Setting up WebSocket connection for communities...');

    // Connect to WebSocket service
    webSocketService.connect(token, userEmail);

    // Subscribe to connection changes
    const unsubscribeConnection = webSocketService.onConnectionChange((isConnected) => {
      console.log('🔌 WebSocket connection status:', isConnected);
      setConnected(isConnected);
    });

    // Subscribe to incoming messages
    const unsubscribeMessages = webSocketService.onMessage((message: CommunityMessage) => {
      console.log('📨 Received community message:', message);
      
      // Only process community messages
      if (message._type === 'community') {
        handleIncomingCommunityMessage(message);
      }
    });

    return () => {
      console.log('🧹 Cleaning up WebSocket subscriptions');
      unsubscribeConnection();
      unsubscribeMessages();
    };
  }, [token, userEmail]);

  // Fetch messages when community is selected
  useEffect(() => {
    if (selectedCommunity && token) {
      fetchCommunityMessages(selectedCommunity.id);
    }
  }, [selectedCommunity, token]);

  const fetchCommunities = async () => {
    if (!token) return;

    try {
      console.log('📋 Fetching communities...');
      const response = await fetch(`${BASE_URL}/api/communities`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const communitiesData: Community[] = await response.json();
        console.log('✅ Fetched communities:', communitiesData);
        setCommunities(communitiesData);
      } else {
        console.error('❌ Failed to fetch communities:', response.status);
        Alert.alert('Error', 'Failed to load communities');
      }
    } catch (error) {
      console.error('❌ Error fetching communities:', error);
      Alert.alert('Error', 'Failed to load communities');
    } finally {
      setLoading(false);
    }
  };

  const fetchCommunityMessages = async (communityId: number) => {
    if (!token) return;

    try {
      console.log('💬 Fetching community messages for:', communityId);
      const response = await fetch(
        `${BASE_URL}/api/messages/community/${communityId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const msgs: CommunityMessage[] = await response.json();
        console.log(`✅ Fetched ${msgs.length} community messages`);
        setMessages(msgs);

        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        console.error('❌ Failed to fetch community messages:', response.status);
      }
    } catch (error) {
      console.error('❌ Error fetching community messages:', error);
    }
  };

  const handleIncomingCommunityMessage = (message: CommunityMessage) => {
    const currentCommunity = selectedCommunityRef.current;
    
    if (currentCommunity && message.communityId === currentCommunity.id) {
      console.log('✅ Message is for current community, adding to UI');
      setMessages((prevMessages) => {
        // Prevent duplicates
        const exists = prevMessages.some(
          (m) =>
            m.content === message.content &&
            m.timestamp === message.timestamp &&
            m.senderEmail === message.senderEmail
        );
        
        if (exists) {
          console.log('⚠️ Duplicate message, skipping');
          return prevMessages;
        }
        
        console.log('✅ Adding new community message to UI');
        return [...prevMessages, message];
      });

      // Scroll to bottom after adding message
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } else {
      console.log('ℹ️ Message is for different community or no community selected');
    }
  };

  const sendMessage = () => {
    if (!messageInput.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    if (!selectedCommunity) {
      Alert.alert('Error', 'No community selected');
      return;
    }

    if (!connected) {
      Alert.alert('Error', 'Not connected to chat server. Please wait...');
      return;
    }

    if (!userEmail) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    console.log('📤 Sending community message:', {
      communityId: selectedCommunity.id,
      content: messageInput.trim()
    });

    try {
      setSending(true);

      const success = webSocketService.sendCommunityMessage(
        selectedCommunity.id,
        messageInput.trim()
      );

      if (success) {
        console.log('✅ Community message sent successfully');
        setMessageInput('');
      } else {
        Alert.alert('Error', 'Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error sending community message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return '';
    }
  };

  const formatDate = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString();
    } catch (error) {
      return '';
    }
  };

  const renderCommunityItem = ({ item }: { item: Community }) => (
    <TouchableOpacity
      style={[
        styles.communityItem,
        selectedCommunity?.id === item.id && styles.communityItemSelected,
      ]}
      onPress={() => {
        console.log('🏠 Selected community:', item.name);
        setSelectedCommunity(item);
        setShowCommunityModal(true);
      }}
    >
      <View style={styles.communityAvatar}>
        <Text style={styles.communityAvatarText}>
          {item.name[0].toUpperCase()}
        </Text>
      </View>
      <View style={styles.communityInfo}>
        <Text style={styles.communityName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.communityDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <Text style={styles.communityMeta}>
          Created {formatDate(item.createdAt)}
          {item.isAnonymous && ' • Anonymous'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#999" />
    </TouchableOpacity>
  );

  const renderMessageItem = ({ item }: { item: CommunityMessage }) => {
    const isOwn = item.senderEmail === userEmail;
    const displayName = selectedCommunity?.isAnonymous && !isOwn ? 'Anonymous' : item.senderEmail;

    return (
      <View
        style={[
          styles.messageContainer,
          isOwn ? styles.myMessage : styles.theirMessage,
        ]}
      >
        {!isOwn && (
          <Text style={styles.senderName}>{displayName}</Text>
        )}
        <View
          style={[
            styles.messageBubble,
            isOwn ? styles.myMessageBubble : styles.theirMessageBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isOwn ? styles.myMessageText : styles.theirMessageText,
            ]}
          >
            {item.content}
          </Text>
          <Text
            style={[
              styles.messageTime,
              isOwn ? styles.myMessageTime : styles.theirMessageTime,
            ]}
          >
            {formatTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Communities</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EF4444" />
          <Text style={styles.loadingText}>Loading communities...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {!connected && (
        <View style={styles.connectionBanner}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.connectionText}>Connecting...</Text>
        </View>
      )}

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Communities</Text>
        {connected && (
          <View style={styles.connectedIndicator}>
            <View style={styles.connectedDot} />
            <Text style={styles.connectedText}>Connected</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        {communities.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No communities available</Text>
            <Text style={styles.emptySubtext}>
              Communities will appear here when created
            </Text>
          </View>
        ) : (
          <FlatList
            data={communities}
            renderItem={renderCommunityItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.communitiesList}
          />
        )}
      </View>

      {/* Community Chat Modal */}
      <Modal
        visible={showCommunityModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCommunityModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          {selectedCommunity && (
            <KeyboardAvoidingView
              style={styles.chatContainer}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
              <View style={styles.chatHeader}>
                <TouchableOpacity
                  onPress={() => {
                    setShowCommunityModal(false);
                    setSelectedCommunity(null);
                    setMessages([]);
                  }}
                  style={styles.backButton}
                >
                  <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <View style={styles.chatHeaderAvatar}>
                  <Text style={styles.chatHeaderAvatarText}>
                    {selectedCommunity.name[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.chatHeaderInfo}>
                  <Text style={styles.chatHeaderTitle} numberOfLines={1}>
                    {selectedCommunity.name}
                  </Text>
                  <Text style={styles.chatHeaderStatus}>
                    {selectedCommunity.isAnonymous ? 'Anonymous Community' : 'Community Chat'}
                  </Text>
                </View>
              </View>

              <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessageItem}
                keyExtractor={(item, index) => `${item.timestamp}-${index}`}
                contentContainerStyle={styles.messagesList}
                onContentSizeChange={() => {
                  flatListRef.current?.scrollToEnd({ animated: true });
                }}
                onLayout={() => {
                  flatListRef.current?.scrollToEnd({ animated: false });
                }}
                ListEmptyComponent={
                  <View style={styles.emptyMessages}>
                    <Ionicons name="chatbubbles-outline" size={48} color="#ccc" />
                    <Text style={styles.emptyMessagesText}>No messages yet</Text>
                    <Text style={styles.emptyMessagesSubtext}>
                      Start the conversation!
                    </Text>
                  </View>
                }
              />

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.messageInput}
                  placeholder={
                    selectedCommunity.isAnonymous 
                      ? "Send an anonymous message..." 
                      : "Type a message..."
                  }
                  placeholderTextColor="#999"
                  value={messageInput}
                  onChangeText={setMessageInput}
                  multiline
                  maxLength={500}
                  editable={connected}
                  onSubmitEditing={sendMessage}
                  blurOnSubmit={false}
                />
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    (!messageInput.trim() || !connected) && styles.sendButtonDisabled,
                  ]}
                  onPress={sendMessage}
                  disabled={!messageInput.trim() || sending || !connected}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons
                      name="send"
                      size={20}
                      color={messageInput.trim() && connected ? '#fff' : '#ccc'}
                    />
                  )}
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  connectionBanner: {
    backgroundColor: '#F59E0B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  connectionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  connectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  connectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  connectedText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  communitiesList: {
    paddingVertical: 8,
  },
  communityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  communityItemSelected: {
    backgroundColor: '#F0F9FF',
  },
  communityAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  communityAvatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  communityInfo: {
    flex: 1,
  },
  communityName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  communityDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 18,
  },
  communityMeta: {
    fontSize: 12,
    color: '#999',
  },
  chatContainer: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#fff',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  chatHeaderAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chatHeaderAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  chatHeaderInfo: {
    flex: 1,
  },
  chatHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  chatHeaderStatus: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexGrow: 1,
  },
  emptyMessages: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyMessagesText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginTop: 12,
  },
  emptyMessagesSubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 4,
    textAlign: 'center',
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: '85%',
  },
  myMessage: {
    alignSelf: 'flex-end',
  },
  theirMessage: {
    alignSelf: 'flex-start',
  },
  senderName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    marginLeft: 8,
  },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  myMessageBubble: {
    backgroundColor: '#8B5CF6',
    borderBottomRightRadius: 6,
  },
  theirMessageBubble: {
    backgroundColor: '#F1F5F9',
    borderBottomLeftRadius: 6,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#fff',
  },
  theirMessageText: {
    color: '#000',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  myMessageTime: {
    color: '#E9D5FF',
    textAlign: 'right',
  },
  theirMessageTime: {
    color: '#64748B',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    backgroundColor: '#fff',
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
    color: '#000',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#F1F5F9',
  },
});