"use client"

import { Image } from "expo-image"
import {
  StyleSheet,
  View,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Animated,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  RefreshControl,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { useFonts } from "expo-font"
import * as SplashScreen from "expo-splash-screen"
import { useEffect, useRef, useState, useCallback } from "react"
import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { Ionicons } from "@expo/vector-icons"
import { Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold } from "@expo-google-fonts/outfit"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "expo-router"
import { webSocketService } from '@/services/WebSocketService'

SplashScreen.preventAutoHideAsync()

// Define interfaces for our data
interface UserProfile {
  email: string
  bio: string | null
  profilePicUrl: string | null
  enabled: boolean
  createdAt: string | null
  lastLoginAt: string | null
  verifiedAt: string | null
}

interface Item {
  id: number
  title: string
  description: string
  price: number
  image: string
  category: string
  seller: string
  sellerName: string
  status: boolean
  views: number
  quantity: number
  createdAt: string
}

interface Message {
  id?: number;
  senderEmail: string;
  receiverEmail: string;
  content: string;
  timestamp: string;
  isOptimistic?: boolean;
}

const API_BASE_URL = "http://192.168.1.7:8080"

// Helper function to validate JWT token format
const isValidJWT = (token: string | null): boolean => {
  if (!token) return false;
  const parts = token.split('.');
  return parts.length === 3 && parts.every(part => part.length > 0);
}

export default function ProfileScreen() {
  const [fontsLoaded] = useFonts({
    "Outfit-Regular": Outfit_400Regular,
    "Outfit-Medium": Outfit_500Medium,
    "Outfit-SemiBold": Outfit_600SemiBold,
    "Outfit-Bold": Outfit_700Bold,
  })

  const scrollY = useRef(new Animated.Value(0)).current
  const [isCompactHeader, setIsCompactHeader] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [userItems, setUserItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [connectionStatus, setConnectionStatus] = useState(false)
  const { token, userEmail, logout } = useAuth()
  const router = useRouter()
  const flatListRef = useRef<FlatList>(null)
  
  // Track mounted state and message listeners
  const isMounted = useRef(true)
  const messageListenerRef = useRef<(() => void) | null>(null)
  const connectionListenerRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
      // Clean up listeners when component unmounts
      if (messageListenerRef.current) {
        messageListenerRef.current()
        messageListenerRef.current = null
      }
      if (connectionListenerRef.current) {
        connectionListenerRef.current()
        connectionListenerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync()
      fetchProfileData()
    }
  }, [fontsLoaded, token])

  // WebSocket setup for real-time messaging - FIXED with proper cleanup
  useEffect(() => {
    if (!isMounted.current) return;
    
    if (showChat && userProfile && token && userEmail) {
      console.log('🔄 Setting up WebSocket for direct messaging...');
      
      // Clean up any existing listeners first
      if (messageListenerRef.current) {
        messageListenerRef.current();
        messageListenerRef.current = null;
      }
      if (connectionListenerRef.current) {
        connectionListenerRef.current();
        connectionListenerRef.current = null;
      }
      
      // Always try to connect when chat opens
      webSocketService.connect(token, userEmail);
      
      // Listen for connection changes
      connectionListenerRef.current = webSocketService.onConnectionChange((connected) => {
        if (!isMounted.current) return;
        console.log('🔄 WebSocket connection status changed:', connected);
        setConnectionStatus(connected);
      });

      // Listen for direct messages with improved duplicate prevention
      messageListenerRef.current = webSocketService.onMessage((message: any) => {
        if (!isMounted.current) return;
        
        console.log('📨 Message received in profile chat:', message);
        
        // Only process direct messages for the current chat
        if (message._type === 'direct' && 
            (message.senderEmail === userProfile.email || message.receiverEmail === userProfile.email)) {
          
          console.log('✅ Processing message for current chat');
          
          setMessages(prev => {
            // More robust duplicate detection
            const messageExists = prev.some(msg => {
              // If both have database IDs and they match
              if (msg.id && message.id && msg.id === message.id) {
                console.log('⚠️ Duplicate detected by ID:', msg.id);
                return true;
              }
              
              // If both are optimistic and have same content + timestamp
              if (msg.isOptimistic && message.isOptimistic && 
                  msg.content === message.content && 
                  msg.senderEmail === message.senderEmail &&
                  msg.timestamp === message.timestamp) {
                console.log('⚠️ Duplicate optimistic message detected');
                return true;
              }
              
              // Check if it's the same content from same sender within a short time window
              const timeDiff = Math.abs(new Date(msg.timestamp).getTime() - new Date(message.timestamp).getTime());
              if (msg.content === message.content && 
                  msg.senderEmail === message.senderEmail &&
                  timeDiff < 1000) {
                console.log('⚠️ Duplicate detected by content and timing');
                return true;
              }
              
              return false;
            });
            
            if (!messageExists) {
              console.log('✅ Adding new message to chat');
              return [...prev, message];
            } else {
              console.log('⚠️ Duplicate message detected, skipping');
              return prev;
            }
          });
          
          scrollToBottom();
        }
      });

      // Cleanup function for this specific effect
      return () => {
        console.log('🧹 Cleaning up WebSocket listeners in profile effect...');
        if (messageListenerRef.current) {
          messageListenerRef.current();
          messageListenerRef.current = null;
        }
        if (connectionListenerRef.current) {
          connectionListenerRef.current();
          connectionListenerRef.current = null;
        }
      };
    }
  }, [showChat, userProfile, token, userEmail]);

  const fetchProfileData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        fetchUserProfile(),
        fetchUserItems()
      ])
    } catch (error) {
      console.error('Error fetching profile data:', error)
      Alert.alert('Error', 'Failed to load profile data')
    } finally {
      setLoading(false)
    }
  }

  const fetchUserProfile = async () => {
    try {
      if (!isValidJWT(token)) {
        console.error('❌ Invalid token format, cannot fetch profile');
        Alert.alert('Authentication Error', 'Please login again');
        await logout();
        router.replace('/login');
        return;
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      console.log('🔄 Fetching user profile...');

      const response = await fetch(`${API_BASE_URL}/api/profile`, {
        method: 'GET',
        headers: headers,
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch profile: ${response.status}`)
      }
      
      const profileData: UserProfile = await response.json()
      setUserProfile(profileData)
    } catch (error) {
      console.error('Error fetching user profile:', error)
      throw error
    }
  }

  const fetchUserItems = async () => {
    try {
      if (!isValidJWT(token)) {
        console.error('❌ Invalid token format, cannot fetch user items');
        return;
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(`${API_BASE_URL}/api/items/user/me`, {
        method: 'GET',
        headers: headers,
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch user items: ${response.status}`)
      }
      
      const itemsData: Item[] = await response.json()
      setUserItems(itemsData)
    } catch (error) {
      console.error('Error fetching user items:', error)
      throw error
    }
  }

  const fetchDirectMessages = async (contactEmail: string) => {
    try {
      if (!isValidJWT(token)) {
        console.error('❌ Invalid token format, cannot fetch messages');
        Alert.alert('Authentication Error', 'Please login again');
        await logout();
        router.replace('/login');
        return;
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      console.log('🔄 Fetching messages for:', contactEmail);

      const response = await fetch(`${API_BASE_URL}/api/messages/dm/${contactEmail}`, {
        method: 'GET',
        headers: headers,
      })

      if (response.ok) {
        const fetchedMessages: Message[] = await response.json()
        console.log('📥 Fetched', fetchedMessages.length, 'messages from server');
        
        // Replace the messages instead of appending
        setMessages(fetchedMessages);
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to load messages:', response.status, errorText);
        Alert.alert('Error', 'Failed to load messages')
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
      Alert.alert('Error', 'Failed to load messages')
    }
  }

  const sendDirectMessage = async () => {
    if (!newMessage.trim() || !userProfile?.email) return;

    console.log('🔄 Attempting to send direct message via WebSocket...');
    console.log('📧 Receiver email:', userProfile.email);

    setSending(true);
    
    // Store the optimistic message timestamp for cleanup
    const optimisticTimestamp = new Date().toISOString();
    
    try {
      // Create optimistic message with unique timestamp
      const optimisticMessage: Message = {
        senderEmail: userEmail || 'current-user',
        receiverEmail: userProfile.email,
        content: newMessage.trim(),
        timestamp: optimisticTimestamp,
        isOptimistic: true,
      };
      
      // Add optimistic message immediately
      setMessages(prev => [...prev, optimisticMessage]);
      setNewMessage('');
      scrollToBottom();
      
      // Check if WebSocket is connected, if not try to reconnect
      if (!webSocketService.getConnectionStatus()) {
        console.log('🔄 WebSocket not connected, attempting to reconnect...');
        webSocketService.connect(token!, userEmail!);
        
        // Wait a bit for connection to establish
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Send via WebSocket
      const success = webSocketService.sendDirectMessage(userProfile.email, newMessage.trim());
      
      if (success) {
        console.log('✅ WebSocket send successful');
      } else {
        console.error('❌ WebSocket send failed');
        
        // Try one more time after a short delay
        console.log('🔄 Retrying WebSocket send...');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const retrySuccess = webSocketService.sendDirectMessage(userProfile.email, newMessage.trim());
        
        if (!retrySuccess) {
          Alert.alert('Error', 'Failed to send message. Please check your connection and try again.');
          
          // Remove optimistic message on error using the stored timestamp
          setMessages(prev => prev.filter(msg => 
            !msg.isOptimistic || msg.timestamp !== optimisticTimestamp
          ));
        }
      }
      
    } catch (error) {
      console.error('❌ Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
      // Remove optimistic message on error using the stored timestamp
      setMessages(prev => prev.filter(msg => 
        !msg.isOptimistic || msg.timestamp !== optimisticTimestamp
      ));
    } finally {
      setSending(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true)
    try {
      await fetchProfileData()
    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      setRefreshing(false)
    }
  }

  const handleMessagePress = () => {
    if (userProfile?.email) {
      setShowChat(true)
      fetchDirectMessages(userProfile.email)
    }
  }

  const handleCloseChat = () => {
    console.log('🧹 Closing chat and clearing messages');
    setShowChat(false)
    setMessages([])
    setNewMessage('')
  }

  const handleLogout = async () => {
    try {
      await logout()
      router.replace('/login')
    } catch (error) {
      console.error('Error logging out:', error)
      Alert.alert('Error', 'Failed to logout')
    }
  }

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y
    setIsCompactHeader(offsetY > 300)
    Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
      useNativeDriver: false,
    })(event)
  }

  const profileImageHeight = scrollY.interpolate({
    inputRange: [0, 350],
    outputRange: [380, 0],
    extrapolate: "clamp",
  })

  const profileImageOpacity = scrollY.interpolate({
    inputRange: [0, 300],
    outputRange: [1, 0],
    extrapolate: "clamp",
  })

  const compactHeaderOpacity = scrollY.interpolate({
    inputRange: [250, 350],
    outputRange: [0, 1],
    extrapolate: "clamp",
  })

  const backArrowOpacity = scrollY.interpolate({
    inputRange: [0, 300],
    outputRange: [0, 1],
    extrapolate: "clamp",
  })

  const headerBackArrowOpacity = scrollY.interpolate({
    inputRange: [0, 300],
    outputRange: [1, 0],
    extrapolate: "clamp",
  })

  const renderPostItem = ({ item }: { item: Item }) => (
    <TouchableOpacity style={styles.postItem}>
      <Image 
        source={item.image ? { uri: item.image } : require("@/assets/images/partial-react-logo.png")} 
        style={styles.postImage} 
        contentFit="cover" 
      />
      {!item.status && (
        <View style={styles.soldOverlay}>
          <ThemedText style={styles.soldText}>Sold</ThemedText>
        </View>
      )}
    </TouchableOpacity>
  )

  const renderMessageItem = ({ item }: { item: Message }) => {
    const isCurrentUser = item.senderEmail === userEmail;
    const isOptimistic = item.isOptimistic;
    
    return (
      <View style={[
        styles.messageContainer,
        isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage,
      ]}>
        <View style={[
          styles.messageBubble,
          isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
          isOptimistic && styles.optimisticMessage,
        ]}>
          <ThemedText style={[
            styles.messageText,
            isCurrentUser ? styles.currentUserText : styles.otherUserText,
          ]}>
            {item.content}
            {isOptimistic && ' ⏳'}
          </ThemedText>
          <ThemedText style={styles.messageTime}>
            {new Date(item.timestamp).toLocaleTimeString([], { 
              hour: '2-digit', minute: '2-digit' 
            })}
          </ThemedText>
        </View>
      </View>
    );
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A'
    
    const date = new Date(dateString)
    return isNaN(date.getTime()) 
      ? 'N/A' 
      : date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
  }

  if (!fontsLoaded) {
    return null
  }

  if (loading && !userProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ThemedText>Loading profile...</ThemedText>
        </View>
      </SafeAreaView>
    )
  }

  const displayName = userProfile?.email?.split('@')[0] || 'User'
  const listingsCount = userItems.length
  const activeListings = userItems.filter(item => item.status).length

  // If chat is open, show chat interface
  if (showChat && userProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          style={styles.chatContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.chatHeader}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={handleCloseChat}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <View style={styles.chatContactInfo}>
              <Image
                source={
                  userProfile?.profilePicUrl 
                    ? { uri: userProfile.profilePicUrl }
                    : require("@/assets/images/partial-react-logo.png")
                }
                style={styles.chatAvatar}
                contentFit="cover"
              />
              <View>
                <ThemedText style={styles.chatContactName}>{displayName}</ThemedText>
                <ThemedText style={styles.chatContactEmail}>{userProfile.email}</ThemedText>
              </View>
            </View>
            <View style={styles.connectionStatus}>
              <View style={[
                styles.statusDot,
                connectionStatus ? styles.connected : styles.disconnected,
              ]} />
              <ThemedText style={styles.statusText}>
                {connectionStatus ? 'Connected' : 'Disconnected'}
              </ThemedText>
              {!connectionStatus && (
                <TouchableOpacity 
                  style={styles.reconnectButton}
                  onPress={() => webSocketService.connect(token!, userEmail!)}
                >
                  <Ionicons name="refresh" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessageItem}
            keyExtractor={(item, index) => 
              item.id ? item.id.toString() : `msg-${index}-${item.timestamp}`
            }
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContent}
            onContentSizeChange={scrollToBottom}
            showsVerticalScrollIndicator={false}
          />

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Type a message..."
              placeholderTextColor="#999"
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!newMessage.trim() || sending) && styles.sendButtonDisabled,
              ]}
              onPress={sendDirectMessage}
              disabled={!newMessage.trim() || sending}
            >
              {sending ? (
                <Ionicons name="time-outline" size={20} color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    )
  }

  // Main profile view
  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.stickyHeader, { opacity: compactHeaderOpacity }]}>
        <View style={styles.stickyHeaderContent}>
          <Animated.View style={{ opacity: backArrowOpacity }}>
            <TouchableOpacity>
              <Ionicons name="chevron-back" size={28} color="#000" />
            </TouchableOpacity>
          </Animated.View>
          <Image
            source={
              userProfile?.profilePicUrl 
                ? { uri: userProfile.profilePicUrl }
                : require("@/assets/images/partial-react-logo.png")
            }
            style={styles.stickyProfileImage}
            contentFit="cover"
          />
          <View style={styles.stickyNameSection}>
            <View style={styles.stickyNameRow}>
              <ThemedText style={styles.stickyProfileName}>{displayName}</ThemedText>
              {userProfile?.enabled && (
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              )}
            </View>
          </View>
          <View style={styles.stickyActions}>
            <TouchableOpacity onPress={handleMessagePress}>
              <Ionicons name="chatbubble-outline" size={24} color="#000" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={24} color="#000" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <Animated.View style={[styles.header, { opacity: headerBackArrowOpacity }]}>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={28} color="#000" />
        </TouchableOpacity>
      </Animated.View>

      <Animated.ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#FF5722"]}
            tintColor="#FF5722"
          />
        }
      >
        <Animated.View
          style={[styles.profileImageContainer, { height: profileImageHeight, opacity: profileImageOpacity }]}
        >
          <Image
            source={
              userProfile?.profilePicUrl 
                ? { uri: userProfile.profilePicUrl }
                : require("@/assets/images/partial-react-logo.png")
            }
            style={styles.profileImageLarge}
            contentFit="cover"
          />
        </Animated.View>

        <ThemedView style={styles.profileInfoContainer}>
          <View style={styles.nameRow}>
            <ThemedText style={styles.profileName}>{displayName}</ThemedText>
            {userProfile?.enabled && (
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            )}
          </View>

          {userProfile?.email && (
            <ThemedText style={styles.email}>{userProfile.email}</ThemedText>
          )}

          <ThemedText style={styles.bio}>
            {userProfile?.bio || "No bio yet"}
          </ThemedText>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <ThemedText style={styles.statNumber}>{listingsCount}</ThemedText>
              <ThemedText style={styles.statLabel}>Listings</ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText style={styles.statNumber}>{activeListings}</ThemedText>
              <ThemedText style={styles.statLabel}>Active</ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText style={styles.statNumber}>
                {userItems.reduce((total, item) => total + item.views, 0)}
              </ThemedText>
              <ThemedText style={styles.statLabel}>Total Views</ThemedText>
            </View>
          </View>

          <TouchableOpacity style={styles.messageButton} onPress={handleMessagePress}>
            <Ionicons name="chatbubble-outline" size={20} color="#000" />
            <ThemedText style={styles.messageButtonText}>Message</ThemedText>
          </TouchableOpacity>

          {/* Account Info Section */}
          <View style={styles.accountInfoSection}>
            <ThemedText style={styles.sectionTitle}>Account Info</ThemedText>
            <View style={styles.infoRow}>
              <ThemedText style={styles.infoLabel}>Member Since:</ThemedText>
              <ThemedText style={styles.infoValue}>
                {formatDate(userProfile?.createdAt)}
              </ThemedText>
            </View>
            <View style={styles.infoRow}>
              <ThemedText style={styles.infoLabel}>Last Login:</ThemedText>
              <ThemedText style={styles.infoValue}>
                {formatDate(userProfile?.lastLoginAt)}
              </ThemedText>
            </View>
            <View style={styles.infoRow}>
              <ThemedText style={styles.infoLabel}>Status:</ThemedText>
              <ThemedText style={[
                styles.infoValue,
                userProfile?.enabled ? styles.verifiedText : styles.pendingText
              ]}>
                {userProfile?.enabled ? 'Verified' : 'Pending Verification'}
              </ThemedText>
            </View>
          </View>
        </ThemedView>

        <ThemedView style={styles.postsSection}>
          <View style={styles.postsHeader}>
            <ThemedText style={styles.postsSectionTitle}>My Listings</ThemedText>
            <ThemedText style={styles.postsCount}>({listingsCount})</ThemedText>
          </View>

          {userItems.length === 0 ? (
            <View style={styles.emptyListings}>
              <Ionicons name="cube-outline" size={64} color="#CCCCCC" />
              <ThemedText style={styles.emptyListingsText}>No listings yet</ThemedText>
              <ThemedText style={styles.emptyListingsSubtext}>
                Start selling by creating your first listing
              </ThemedText>
            </View>
          ) : (
            <FlatList
              data={userItems}
              renderItem={renderPostItem}
              keyExtractor={(item) => item.id.toString()}
              numColumns={3}
              scrollEnabled={false}
              columnWrapperStyle={styles.postRow}
              contentContainerStyle={styles.postsGrid}
            />
          )}
        </ThemedView>
      </Animated.ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stickyHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  stickyHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  stickyProfileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E5E7EB",
  },
  stickyNameSection: {
    flex: 1,
  },
  stickyNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stickyProfileName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    fontFamily: "Outfit-SemiBold",
  },
  stickyActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  profileImageContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  profileImageLarge: {
    width: "100%",
    height: 380,
    borderRadius: 24,
    backgroundColor: "#E5E7EB",
  },
  profileInfoContainer: {
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    marginBottom: 32,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  profileName: {
    fontSize: 28,
    fontWeight: "700",
    color: "#000",
    fontFamily: "Outfit-Bold",
  },
  email: {
    fontSize: 16,
    color: "#666",
    marginBottom: 12,
    fontFamily: "Outfit-Regular",
  },
  bio: {
    fontSize: 16,
    fontWeight: "400",
    color: "#666",
    lineHeight: 24,
    marginBottom: 20,
    fontFamily: "Outfit-Regular",
  },
  statsRow: {
    flexDirection: "row",
    gap: 32,
    marginBottom: 24,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    fontFamily: "Outfit-Bold",
  },
  statLabel: {
    fontSize: 14,
    fontWeight: "400",
    color: "#666",
    fontFamily: "Outfit-Regular",
  },
  messageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#E5E7EB",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    marginBottom: 32,
  },
  messageButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    fontFamily: "Outfit-SemiBold",
  },
  accountInfoSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginBottom: 16,
    fontFamily: "Outfit-SemiBold",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "400",
    color: "#666",
    fontFamily: "Outfit-Regular",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000",
    fontFamily: "Outfit-Medium",
  },
  verifiedText: {
    color: "#10B981",
  },
  pendingText: {
    color: "#EF4444",
  },
  postsSection: {
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    marginBottom: 32,
  },
  postsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  postsSectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    fontFamily: "Outfit-SemiBold",
  },
  postsCount: {
    fontSize: 16,
    color: "#666",
    fontFamily: "Outfit-Regular",
  },
  postsGrid: {
    paddingBottom: 16,
  },
  postRow: {
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 12,
  },
  postItem: {
    flex: 1,
    aspectRatio: 1,
    position: 'relative',
  },
  postImage: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    backgroundColor: "#E5E7EB",
  },
  soldOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  soldText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#fff",
    fontFamily: "Outfit-SemiBold",
  },
  emptyListings: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyListingsText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginTop: 12,
    marginBottom: 4,
  },
  emptyListingsSubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  // Chat Styles
  chatContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    backgroundColor: "#FFFFFF",
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  chatContactInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  chatAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E5E7EB",
  },
  chatContactName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    fontFamily: "Outfit-SemiBold",
  },
  chatContactEmail: {
    fontSize: 14,
    color: "#666",
    fontFamily: "Outfit-Regular",
  },
  // Connection Status Styles
  connectionStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connected: {
    backgroundColor: "#10B981",
  },
  disconnected: {
    backgroundColor: "#EF4444",
  },
  statusText: {
    fontSize: 12,
    color: "#666",
  },
  reconnectButton: {
    backgroundColor: '#3B82F6',
    padding: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  messagesList: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },
  messagesContent: {
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  messageContainer: {
    flexDirection: "row",
    marginVertical: 4,
    paddingHorizontal: 12,
  },
  currentUserMessage: {
    justifyContent: "flex-end",
  },
  otherUserMessage: {
    justifyContent: "flex-start",
  },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  currentUserBubble: {
    backgroundColor: "#EF4444",
    borderBottomRightRadius: 4,
  },
  otherUserBubble: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  optimisticMessage: {
    opacity: 0.7,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  currentUserText: {
    color: "#FFFFFF",
  },
  otherUserText: {
    color: "#000000",
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.7,
    color: "#FFFFFF",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  textInput: {
    flex: 1,
    backgroundColor: "#F5F5F5",
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
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#CCCCCC",
  },
})