// services/WebSocketService.ts
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

class WebSocketService {
  private client: Client | null = null;
  private messageCallbacks: ((message: any) => void)[] = [];
  private connectionCallbacks: ((connected: boolean) => void)[] = [];
  private isConnected = false;
  private currentToken: string | null = null;
  private currentUserEmail: string | null = null;
  private userSubscription: any = null;
  private communitySubscription: any = null;

  connect(token: string, userEmail: string) {
    if (this.client && this.isConnected) {
      console.log('✅ WebSocket already connected');
      return;
    }

    this.disconnect();

    this.currentToken = token;
    this.currentUserEmail = userEmail;
    
    console.log('🔌 Connecting to WebSocket for user:', userEmail);

    this.client = new Client({
      webSocketFactory: () => new SockJS('http://192.168.1.7:8080/ws'),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      debug: (str) => {
        if (str.includes('ERROR') || str.includes('Broker') || str.includes('Connected')) {
          console.log('🔧 STOMP:', str);
        }
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.client.onConnect = (frame) => {
      console.log('✅ Successfully connected to WebSocket');
      this.isConnected = true;
      this.connectionCallbacks.forEach(callback => callback(true));

      // Subscribe to user's personal queue for direct messages
      const userQueue = `/user/${userEmail}/queue/messages`;
      console.log('📝 Subscribing to user queue:', userQueue);
      
      this.userSubscription = this.client?.subscribe(userQueue, (message) => {
        console.log('📨 Received message from user queue:', message.body);
        try {
          const receivedMessage = JSON.parse(message.body);
          // Mark this as a direct message
          receivedMessage._type = 'direct';
          this.messageCallbacks.forEach(callback => callback(receivedMessage));
        } catch (error) {
          console.error('❌ Error parsing message:', error);
        }
      });

      // Subscribe to community topic
      const communityTopic = `/topic/community/*`;
      console.log('📝 Subscribing to community topic:', communityTopic);
      
      this.communitySubscription = this.client?.subscribe(communityTopic, (message) => {
        console.log('📨 Received message from community topic:', message.body);
        try {
          const receivedMessage = JSON.parse(message.body);
          // Mark this as a community message
          receivedMessage._type = 'community';
          this.messageCallbacks.forEach(callback => callback(receivedMessage));
        } catch (error) {
          console.error('❌ Error parsing community message:', error);
        }
      });

      console.log('✅ Subscribed to both queues');
    };

    this.client.onStompError = (frame) => {
      console.error('❌ STOMP error:', frame.headers['message']);
      this.isConnected = false;
      this.connectionCallbacks.forEach(callback => callback(false));
    };

    this.client.onWebSocketError = (error) => {
      console.error('❌ WebSocket error:', error);
      this.isConnected = false;
      this.connectionCallbacks.forEach(callback => callback(false));
    };

    this.client.onDisconnect = () => {
      console.log('🔌 Disconnected from WebSocket');
      this.isConnected = false;
      this.connectionCallbacks.forEach(callback => callback(false));
    };

    this.client.activate();
  }

  disconnect() {
    console.log('🔌 Disconnecting WebSocket...');
    
    // Unsubscribe from user queue
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
      this.userSubscription = null;
      console.log('✅ Unsubscribed from user queue');
    }
    
    // Unsubscribe from community topic
    if (this.communitySubscription) {
      this.communitySubscription.unsubscribe();
      this.communitySubscription = null;
      console.log('✅ Unsubscribed from community topic');
    }
    
    // Deactivate client
    if (this.client) {
      this.client.deactivate();
      this.client = null;
      console.log('✅ Client deactivated');
    }
    
    this.isConnected = false;
    this.currentToken = null;
    this.currentUserEmail = null;
    console.log('🔌 WebSocket fully disconnected');
  }

  sendDirectMessage(receiverEmail: string, content: string, communityId?: number) {
    if (!this.client || !this.isConnected) {
      console.error('❌ WebSocket not connected');
      return false;
    }

    if (!this.currentToken) {
      console.error('❌ No token available');
      return false;
    }

    const messageData: any = {
      content: content,
      timestamp: new Date().toISOString()
    };

    if (communityId) {
      messageData.communityId = communityId;
      console.log(`📤 Sending community message to ${communityId}:`, content);
    } else {
      messageData.receiverEmail = receiverEmail;
      console.log(`📤 Sending direct message to ${receiverEmail}:`, content);
    }
    
    try {
      this.client.publish({
        destination: '/app/chat.sendMessage',
        body: JSON.stringify(messageData),
        headers: {
          'Authorization': `Bearer ${this.currentToken}`,
          'content-type': 'application/json'
        }
      });
      console.log('✅ Message sent successfully');
      return true;
    } catch (error) {
      console.error('❌ Error sending message:', error);
      return false;
    }
  }

  sendCommunityMessage(communityId: number, content: string) {
    return this.sendDirectMessage('', content, communityId);
  }

  onMessage(callback: (message: any) => void) {
    this.messageCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.messageCallbacks.indexOf(callback);
      if (index > -1) {
        this.messageCallbacks.splice(index, 1);
        console.log('✅ Removed message callback');
      }
    };
  }

  onConnectionChange(callback: (connected: boolean) => void) {
    this.connectionCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.connectionCallbacks.indexOf(callback);
      if (index > -1) {
        this.connectionCallbacks.splice(index, 1);
        console.log('✅ Removed connection callback');
      }
    };
  }

  getConnectionStatus() {
    return this.isConnected;
  }

  // Get subscription status for debugging
  getSubscriptionStatus() {
    return {
      userSubscription: !!this.userSubscription,
      communitySubscription: !!this.communitySubscription,
      isConnected: this.isConnected
    };
  }
}

export const webSocketService = new WebSocketService();