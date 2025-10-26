
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { webSocketService } from '@/services/WebSocketService';

interface Community {
  id: number;
  name: string;
  description: string;
  createdAt: string;
  isAnonymous: boolean;
}

interface CommunityMessage {
  id?: number;
  senderEmail: string;
  communityId: number;
  content: string;
  timestamp: string;
  senderName?: string;
  isOptimistic?: boolean;
}

const BASE_URL = 'http://192.168.1.7:8080';

export default function CommunitiesScreen() {
  const { token, isAuthenticated, userEmail } = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [communityMessages, setCommunityMessages] = useState<CommunityMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // WebSocket connection
  useEffect(() => {
    if (isAuthenticated && token && userEmail) {
      console.log('🔄 Initializing WebSocket connection for user:', userEmail);
      webSocketService.connect(token, userEmail);
      
      const unsubscribeConnection = webSocketService.onConnectionChange((connected) => {
        console.log('🔄 Connection status:', connected);
        setConnectionStatus(connected);
      });

      const unsubscribeMessages = webSocketService.onMessage((message: CommunityMessage) => {
        console.log('📨 New community message received:', message);
        handleIncomingMessage(message);
      });

      return () => {
        unsubscribeConnection();
        unsubscribeMessages();
      };
    }
  }, [isAuthenticated, token, userEmail]);

  // Fetch all communities
  const fetchCommunities = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/communities`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const allCommunities: Community[] = await response.json();
        console.log('Fetched communities:', allCommunities);
        setCommunities(allCommunities);
      } else {
        console.error('Failed to fetch communities, status:', response.status);
        Alert.alert('Error', 'Failed to load communities');
      }
    } catch (error) {
      console.error('Error fetching communities:', error);
      Alert.alert('Error', 'Failed to load communities');
    } finally {
      setLoading(false);
    }
  };

  // Fetch community messages
  const fetchCommunityMessages = async (communityId: number) => {
    try {
      const response = await fetch(`${BASE_URL}/api/messages/community/${communityId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const messages: CommunityMessage[] = await response.json();
        console.log('Fetched community messages:', messages);
        setCommunityMessages(messages);
      } else {
        console.error('Failed to fetch messages, status:', response.status);
        Alert.alert('Error', 'Failed to load community messages');
      }
    } catch (error) {
      console.error('Error fetching community messages:', error);
      Alert.alert('Error', 'Failed to load community messages');
    }
  };

  const handleIncomingMessage = (message: CommunityMessage) => {
    console.log('🔄 Processing incoming community message:', message);
    
    // If this message is for the currently selected community
    if (selectedCommunity && message.communityId === selectedCommunity.id) {
      console.log('✅ Adding message to current community chat');
      
      // Check if message already exists to prevent duplicates
      setCommunityMessages(prev => {
        const messageExists = prev.some(msg => 
          !msg.isOptimistic && // Don't count optimistic messages as duplicates
          msg.content === message.content && 
          msg.senderEmail === message.senderEmail &&
          Math.abs(new Date(msg.timestamp).getTime() - new Date(message.timestamp).getTime()) < 5000
        );
        
        if (!messageExists) {
          // Remove any optimistic messages with the same content and add the real message
          const filtered = prev.filter(msg => 
            !msg.isOptimistic || msg.content !== message.content
          );
          return [...filtered, message];
        }
        console.log('⚠️ Duplicate message detected, skipping');
        return prev;
      });
      
      scrollToBottom();
    }
  };
  

  // Send message to community via WebSocket
  // Add this function to communities.tsx as a fallback
const sendCommunityMessageViaRest = async () => {
  try {
    const response = await fetch(`${BASE_URL}/api/messages/community/${selectedCommunity?.id}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: newMessage.trim(),
      }),
    });

    if (response.ok) {
      console.log('✅ Message sent via REST API');
      // Refresh messages after a short delay
      setTimeout(() => {
        if (selectedCommunity) {
          fetchCommunityMessages(selectedCommunity.id);
        }
      }, 500);
      return true;
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    console.error('❌ REST API failed:', error);
    return false;
  }
};

// Then modify your sendCommunityMessage function:
const sendCommunityMessage = async () => {
  if (!newMessage.trim() || !selectedCommunity) return;

  setSending(true);
  
  // Create optimistic message
  const optimisticMessage: CommunityMessage = {
    senderEmail: userEmail || 'current-user',
    communityId: selectedCommunity.id,
    content: newMessage.trim(),
    timestamp: new Date().toISOString(),
    isOptimistic: true,
  };
  
  try {
    console.log('🔄 Sending message to community:', selectedCommunity.name);
    
    // Add optimistic message immediately
    setCommunityMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');
    scrollToBottom();
    
    // Try WebSocket first
    webSocketService.sendDirectMessage('', newMessage.trim(), selectedCommunity.id);
    
    // If WebSocket fails, try REST after 2 seconds
    setTimeout(async () => {
      const messagesAfterSend = communityMessages;
      const messageStillOptimistic = messagesAfterSend.some(msg => 
        msg.isOptimistic && msg.content === optimisticMessage.content
      );
      
      if (messageStillOptimistic) {
        console.log('🔄 WebSocket might have failed, trying REST API');
        await sendCommunityMessageViaRest();
      }
    }, 2000);
    
  } catch (error) {
    console.error('❌ Error sending community message:', error);
    // Try REST API as fallback
    const restSuccess = await sendCommunityMessageViaRest();
    if (!restSuccess) {
      Alert.alert('Error', 'Failed to send message');
      // Remove optimistic message
      setCommunityMessages(prev => prev.filter(msg => 
        !msg.isOptimistic || msg.content !== optimisticMessage.content
      ));
    }
  } finally {
    setSending(false);
  }
};

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Select community and load its messages
  const selectCommunity = (community: Community) => {
    setSelectedCommunity(community);
    fetchCommunityMessages(community.id);
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchCommunities();
    }
  }, [isAuthenticated]);

  // Safe key extractor for communities
  const communityKeyExtractor = (item: Community, index: number) => {
    return item.id ? item.id.toString() : `community-${index}`;
  };

  // Safe key extractor for messages
  const messageKeyExtractor = (item: CommunityMessage, index: number) => {
    return item.id ? item.id.toString() : `message-${index}-${item.timestamp}`;
  };

  const renderCommunityItem = ({ item, index }: { item: Community; index: number }) => (
    <TouchableOpacity
      style={styles.communityItem}
      onPress={() => selectCommunity(item)}
    >
      <View style={styles.communityAvatar}>
        <Text style={styles.communityAvatarText}>
          {item.name?.charAt(0).toUpperCase() || 'C'}
        </Text>
      </View>
      <View style={styles.communityInfo}>
        <Text style={styles.communityName}>{item.name || 'Unnamed Community'}</Text>
        <Text style={styles.communityDescription} numberOfLines={2}>
          {item.description || 'No description available'}
        </Text>
        <View style={styles.communityMeta}>
          <View style={styles.communityType}>
            <Ionicons 
              name={item.isAnonymous ? "eye-off-outline" : "eye-outline"} 
              size={14} 
              color="#666" 
            />
            <Text style={styles.communityTypeText}>
              {item.isAnonymous ? 'Anonymous' : 'Public'}
            </Text>
          </View>
          <Text style={styles.createdDate}>
            {item.createdAt ? `Created ${new Date(item.createdAt).toLocaleDateString()}` : ''}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
    </TouchableOpacity>
  );

  const renderMessageItem = ({ item, index }: { item: CommunityMessage; index: number }) => {
    const isCurrentUser = item.senderEmail === userEmail;
    const isOptimistic = item.isOptimistic;
    
    return (
      <View style={[
        styles.messageContainer,
        isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage,
      ]}>
        <View style={styles.messageHeader}>
          <Text style={styles.senderName}>
            {selectedCommunity?.isAnonymous && !isCurrentUser 
              ? 'Anonymous' 
              : (item.senderName || item.senderEmail || 'Unknown User')
            }
          </Text>
          <Text style={styles.messageTime}>
            {item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { 
              hour: '2-digit', minute: '2-digit' 
            }) : 'Unknown time'}
          </Text>
        </View>
        <View style={[
          styles.messageBubble,
          isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
          isOptimistic && styles.optimisticMessage,
        ]}>
          <Text style={[
            styles.messageText,
            isCurrentUser ? styles.currentUserText : styles.otherUserText,
            isOptimistic && styles.optimisticText,
          ]}>
            {item.content || ''}
            {isOptimistic && ' ⏳'}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#EF4444" />
        <Text style={styles.loadingText}>Loading communities...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!selectedCommunity ? (
        // Communities List View
        <View style={styles.communitiesContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Communities</Text>
            <View style={styles.connectionStatus}>
              <View style={[
                styles.statusDot,
                connectionStatus ? styles.connected : styles.disconnected,
              ]} />
              <Text style={styles.statusText}>
                {connectionStatus ? 'Connected' : 'Disconnected'}
              </Text>
            </View>
          </View>

          {/* Communities List */}
          {communities.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color="#CCCCCC" />
              <Text style={styles.emptyText}>No communities available</Text>
              <Text style={styles.emptySubtext}>
                Check back later for new communities
              </Text>
            </View>
          ) : (
            <FlatList
              data={communities}
              renderItem={renderCommunityItem}
              keyExtractor={communityKeyExtractor}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      ) : (
        // Community Chat View
        <KeyboardAvoidingView 
          style={styles.chatContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Chat Header */}
          <View style={styles.chatHeader}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => setSelectedCommunity(null)}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <View style={styles.chatCommunityInfo}>
              <View style={styles.chatCommunityAvatar}>
                <Text style={styles.chatCommunityAvatarText}>
                  {selectedCommunity.name?.charAt(0).toUpperCase() || 'C'}
                </Text>
              </View>
              <View>
                <Text style={styles.chatCommunityName}>{selectedCommunity.name || 'Community'}</Text>
                <Text style={styles.chatCommunityType}>
                  {selectedCommunity.isAnonymous ? 'Anonymous Community' : 'Public Community'}
                </Text>
              </View>
            </View>
            <View style={styles.connectionStatus}>
              <View style={[
                styles.statusDot,
                connectionStatus ? styles.connected : styles.disconnected,
              ]} />
              <Text style={styles.statusText}>
                {connectionStatus ? 'Online' : 'Offline'}
              </Text>
            </View>
          </View>

          {/* Anonymous Notice */}
          {selectedCommunity.isAnonymous && (
            <View style={styles.anonymousNotice}>
              <Ionicons name="eye-off-outline" size={16} color="#666" />
              <Text style={styles.anonymousNoticeText}>
                This is an anonymous community. Other users' identities are hidden.
              </Text>
            </View>
          )}

          {/* Messages List */}
          <FlatList
            ref={flatListRef}
            data={communityMessages}
            renderItem={renderMessageItem}
            keyExtractor={messageKeyExtractor}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContent}
            onContentSizeChange={scrollToBottom}
            showsVerticalScrollIndicator={false}
          />

          {/* Message Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder={`Message ${selectedCommunity.name || 'community'}...`}
              placeholderTextColor="#999"
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!newMessage.trim() || sending) && styles.sendButtonDisabled,
              ]}
              onPress={sendCommunityMessage}
              disabled={!newMessage.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  communitiesContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connected: {
    backgroundColor: '#10B981',
  },
  disconnected: {
    backgroundColor: '#EF4444',
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  listContent: {
    paddingVertical: 8,
  },
  communityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  communityAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  communityAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  communityInfo: {
    flex: 1,
  },
  communityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  communityDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 18,
  },
  communityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  communityType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  communityTypeText: {
    fontSize: 12,
    color: '#666',
  },
  createdDate: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
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
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  chatCommunityInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatCommunityAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chatCommunityAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  chatCommunityName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  chatCommunityType: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  anonymousNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  anonymousNoticeText: {
    fontSize: 14,
    color: '#92400E',
    textAlign: 'center',
  },
  messagesList: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  messagesContent: {
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  messageContainer: {
    marginVertical: 4,
    paddingHorizontal: 12,
  },
  currentUserMessage: {
    alignItems: 'flex-end',
  },
  otherUserMessage: {
    alignItems: 'flex-start',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    paddingHorizontal: 8,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginRight: 8,
  },
  messageTime: {
    fontSize: 11,
    color: '#999',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  currentUserBubble: {
    backgroundColor: '#EF4444',
    borderBottomRightRadius: 4,
  },
  otherUserBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  optimisticMessage: {
    opacity: 0.7,
    backgroundColor: '#F59E0B',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  currentUserText: {
    color: '#FFFFFF',
  },
  otherUserText: {
    color: '#000000',
  },
  optimisticText: {
    color: '#FFFFFF',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
});