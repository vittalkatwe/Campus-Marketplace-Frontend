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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const BASE_URL = 'http://192.168.1.7:8080';

interface Contact {
  email: string;
  lastMessage?: string;
  timestamp?: string;
}

interface Message {
  senderEmail: string;
  receiverEmail?: string;
  content: string;
  timestamp: string;
}

export default function DirectMessagesScreen() {
  const { token, userEmail } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  
  const stompClientRef = useRef<Client | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const selectedContactRef = useRef<string | null>(null); // ✅ Store current selected contact

  // ✅ Update ref whenever selectedContact changes
  useEffect(() => {
    selectedContactRef.current = selectedContact;
    console.log('📝 Selected contact updated to:', selectedContact);
  }, [selectedContact]);

  // Fetch contacts on mount
  useEffect(() => {
    if (token) {
      fetchContacts();
    }
  }, [token]);

  // Setup WebSocket connection
  useEffect(() => {
    if (!token || !userEmail) {
      console.log('⚠️ WebSocket: not authenticated, skipping...');
      return;
    }

    console.log('🔌 Setting up WebSocket connection...');
    console.log('📧 User email:', userEmail);

    // ✅ Pass token in URL query param AND email for React Native
    const socketUrl = `${BASE_URL}/ws?token=${encodeURIComponent(token)}&email=${encodeURIComponent(userEmail)}`;
    
    const client = new Client({
      webSocketFactory: () => {
        const socket = new SockJS(socketUrl);
        return socket;
      },
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      debug: (msg) => console.log('STOMP:', msg),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,

      onConnect: (frame) => {
        console.log('✅ WebSocket Connected:', frame);
        setConnected(true);

        // ✅ Subscribe to personal queue
        client.subscribe(
          `/user/${userEmail}/queue/messages`,
          (message) => {
            try {
              const receivedMessage: Message = JSON.parse(message.body);
              console.log('📨 Received DM:', receivedMessage);

              // ✅ CRITICAL: Use ref to get current selected contact
              const currentContact = selectedContactRef.current;
              console.log('🔍 Current selected contact from ref:', currentContact);

              if (currentContact) {
                // Check if message is for currently open chat
                const isRelevantMessage =
                  (receivedMessage.senderEmail === currentContact &&
                    receivedMessage.receiverEmail === userEmail) ||
                  (receivedMessage.senderEmail === userEmail &&
                    receivedMessage.receiverEmail === currentContact);

                console.log('🔍 Is message relevant?', isRelevantMessage);

                if (isRelevantMessage) {
                  console.log('✅ Message is for current chat, adding to UI');
                  setMessages((prevMessages) => {
                    // Prevent duplicates
                    const exists = prevMessages.some(
                      (m) =>
                        m.content === receivedMessage.content &&
                        m.timestamp === receivedMessage.timestamp &&
                        m.senderEmail === receivedMessage.senderEmail
                    );
                    
                    if (exists) {
                      console.log('⚠️ Duplicate message, skipping');
                      return prevMessages;
                    }
                    
                    console.log('✅ Adding new message to UI');
                    return [...prevMessages, receivedMessage];
                  });

                  // Scroll to bottom after adding message
                  setTimeout(() => {
                    flatListRef.current?.scrollToEnd({ animated: true });
                  }, 100);
                } else {
                  console.log('ℹ️ Message is for different chat, not adding to UI');
                }
              } else {
                console.log('ℹ️ No chat open, message received but not displayed');
              }

              // Always refresh contacts list
              fetchContacts();
            } catch (error) {
              console.error('❌ Error parsing message:', error);
            }
          }
        );

        console.log(`✅ Subscribed to /user/${userEmail}/queue/messages`);
      },

      onDisconnect: () => {
        console.log('⚠️ WebSocket Disconnected');
        setConnected(false);
      },

      onStompError: (frame) => {
        console.error('❌ STOMP Error:', frame.headers['message']);
        console.error('Details:', frame.body);
        setConnected(false);
      },

      onWebSocketClose: (event) => {
        console.warn('⚠️ WebSocket closed:', event.reason);
        setConnected(false);
      },
    });

    client.activate();
    stompClientRef.current = client;

    return () => {
      console.log('🧹 Cleaning up WebSocket connection');
      if (client.active) {
        client.deactivate();
      }
    };
  }, [token, userEmail]); // Don't include selectedContact here

  // Fetch messages when contact is selected
  useEffect(() => {
    if (selectedContact && token) {
      fetchMessages(selectedContact);
    }
  }, [selectedContact, token]);

  const fetchContacts = async () => {
    if (!token) return;

    try {
      console.log('📋 Fetching contacts...');
      const response = await fetch(`${BASE_URL}/api/messages/dm/contacts`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const contactEmails: string[] = await response.json();
        console.log('✅ Fetched contacts:', contactEmails);
        setContacts(contactEmails.map((email) => ({ email })));
      } else {
        console.error('❌ Failed to fetch contacts:', response.status);
      }
    } catch (error) {
      console.error('❌ Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (otherUserEmail: string) => {
    if (!token) return;

    try {
      console.log('💬 Fetching messages with:', otherUserEmail);
      const response = await fetch(
        `${BASE_URL}/api/messages/dm/${encodeURIComponent(otherUserEmail)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const msgs: Message[] = await response.json();
        console.log(`✅ Fetched ${msgs.length} messages`);
        setMessages(msgs);

        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        console.error('❌ Failed to fetch messages:', response.status);
      }
    } catch (error) {
      console.error('❌ Error fetching messages:', error);
    }
  };

  const sendMessage = () => {
    if (!messageInput.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    if (!selectedContact) {
      Alert.alert('Error', 'No contact selected');
      return;
    }

    if (!stompClientRef.current?.connected || !connected) {
      Alert.alert('Error', 'Not connected to chat server. Please wait...');
      return;
    }

    if (!userEmail) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    const message: Message = {
      senderEmail: userEmail,
      receiverEmail: selectedContact,
      content: messageInput.trim(),
      timestamp: new Date().toISOString(),
    };

    console.log('📤 Sending DM:', message);

    try {
      setSending(true);

      stompClientRef.current.publish({
        destination: '/app/chat.sendMessage',
        body: JSON.stringify(message),
      });

      console.log('✅ Message published to /app/chat.sendMessage');
      setMessageInput('');
    } catch (error) {
      console.error('❌ Error sending message:', error);
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

  const renderContactItem = ({ item }: { item: Contact }) => (
    <TouchableOpacity
      style={[
        styles.contactItem,
        selectedContact === item.email && styles.contactItemSelected,
      ]}
      onPress={() => {
        console.log('👤 Selected contact:', item.email);
        setSelectedContact(item.email);
      }}
    >
      <View style={styles.contactAvatar}>
        <Text style={styles.contactAvatarText}>
          {item.email[0].toUpperCase()}
        </Text>
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactEmail} numberOfLines={1}>
          {item.email}
        </Text>
        {item.lastMessage && (
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#999" />
    </TouchableOpacity>
  );

  const renderMessageItem = ({ item }: { item: Message }) => {
    const isOwn = item.senderEmail === userEmail;

    return (
      <View
        style={[
          styles.messageContainer,
          isOwn ? styles.myMessage : styles.theirMessage,
        ]}
      >
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
          <Text style={styles.headerTitle}>Direct Messages</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EF4444" />
          <Text style={styles.loadingText}>Loading conversations...</Text>
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
        <Text style={styles.headerTitle}>Direct Messages</Text>
        {connected && (
          <View style={styles.connectedIndicator}>
            <View style={styles.connectedDot} />
            <Text style={styles.connectedText}>Connected</Text>
          </View>
        )}
      </View>

      {!selectedContact ? (
        <View style={styles.content}>
          {contacts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No conversations yet</Text>
              <Text style={styles.emptySubtext}>
                Start a conversation from a user's profile
              </Text>
            </View>
          ) : (
            <FlatList
              data={contacts}
              renderItem={renderContactItem}
              keyExtractor={(item) => item.email}
              contentContainerStyle={styles.contactsList}
            />
          )}
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.chatContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <View style={styles.chatHeader}>
            <TouchableOpacity
              onPress={() => {
                setSelectedContact(null);
                setMessages([]);
              }}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <View style={styles.chatHeaderAvatar}>
              <Text style={styles.chatHeaderAvatarText}>
                {selectedContact[0].toUpperCase()}
              </Text>
            </View>
            <View style={styles.chatHeaderInfo}>
              <Text style={styles.chatHeaderTitle} numberOfLines={1}>
                {selectedContact}
              </Text>
              <Text style={styles.chatHeaderStatus}>Direct message</Text>
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
                <Ionicons name="mail-outline" size={48} color="#ccc" />
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
              placeholder="Type a message..."
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
  );
}

const styles = StyleSheet.create({
  container: {
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
  contactsList: {
    paddingVertical: 8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  contactItemSelected: {
    backgroundColor: '#FEF2F2',
  },
  contactAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactAvatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  contactInfo: {
    flex: 1,
  },
  contactEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chatHeaderAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  chatHeaderInfo: {
    flex: 1,
  },
  chatHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
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
    marginBottom: 12,
    maxWidth: '75%',
  },
  myMessage: {
    alignSelf: 'flex-end',
  },
  theirMessage: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  myMessageBubble: {
    backgroundColor: '#3B82F6',
    borderBottomRightRadius: 4,
  },
  theirMessageBubble: {
    backgroundColor: '#F1F5F9',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
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
    color: '#DBEAFE',
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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 15,
    color: '#000',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#F1F5F9',
  },
});