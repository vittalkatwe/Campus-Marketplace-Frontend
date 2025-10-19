import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
} from "react";
import { Client, IMessage, StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { useAuth } from "./AuthContext";
import { Message } from "../types";

interface WebSocketContextType {
  isConnected: boolean;
  sendMessage: (message: Message) => void;
  subscribeToTopic: (
    topic: string,
    callback: (message: Message) => void
  ) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(
  undefined
);

export const WebSocketProvider = ({ children }: { children: ReactNode }) => {
  const { token, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const clientRef = useRef<Client | null>(null);
  const subscriptionsRef = useRef<Map<string, StompSubscription>>(new Map());

  useEffect(() => {
    if (!isAuthenticated || !token) {
      console.log("WebSocket: not authenticated, disconnecting...");
      if (clientRef.current?.active) clientRef.current.deactivate();
      setIsConnected(false);
      return;
    }

    const client = new Client({
      // ✅ Connect to your backend’s WebSocket endpoint
      webSocketFactory: () => new SockJS("http://localhost:8080/ws"),
      connectHeaders: {
        Authorization: `Bearer ${token}`, // ✅ send token in connect header
      },
      debug: (msg) => console.log("STOMP:", msg),
      reconnectDelay: 5000, // auto-reconnect after 5 seconds
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,

      // ✅ Connection established
      onConnect: (frame) => {
        console.log("✅ WebSocket Connected:", frame);
        setIsConnected(true);
      },

      // ✅ Connection lost
      onDisconnect: () => {
        console.log("⚠️ WebSocket Disconnected");
        setIsConnected(false);
      },

      // ✅ Authentication or broker error
      onStompError: (frame) => {
        console.error("❌ STOMP Error:", frame.headers["message"]);
        console.error("Details:", frame.body);
      },

      // ✅ When transport fails (network drop)
      onWebSocketClose: (event) => {
        console.warn("⚠️ WebSocket closed:", event.reason);
        setIsConnected(false);
      },
    });

    client.activate();
    clientRef.current = client;

    // cleanup
    return () => {
      subscriptionsRef.current.forEach((sub) => sub.unsubscribe());
      subscriptionsRef.current.clear();

      if (client.active) client.deactivate();
    };
  }, [isAuthenticated, token]);

  /**
   * ✅ Send message to backend
   */
  const sendMessage = (message: Message) => {
    if (!clientRef.current?.connected) {
      console.warn("⚠️ STOMP not connected yet, cannot send");
      return;
    }

    clientRef.current.publish({
      destination: "/app/chat.sendMessage",
      body: JSON.stringify(message),
      headers: {
        Authorization: `Bearer ${token}`, // ensure token present on send
      },
    });
  };

  /**
   * ✅ Subscribe to topic or personal queue
   */
  const subscribeToTopic = (
    topic: string,
    callback: (message: Message) => void
  ) => {
    if (!clientRef.current?.connected) {
      console.warn("⚠️ STOMP not yet connected. Subscription delayed:", topic);
      return () => {};
    }

    const subscription = clientRef.current.subscribe(
      topic,
      (msg: IMessage) => {
        try {
          const parsed = JSON.parse(msg.body);
          callback(parsed);
        } catch (e) {
          console.error("Error parsing message:", e, msg.body);
        }
      }
    );

    subscriptionsRef.current.set(topic, subscription);

    // return unsubscribe cleanup
    return () => {
      subscription.unsubscribe();
      subscriptionsRef.current.delete(topic);
    };
  };

  return (
    <WebSocketContext.Provider
      value={{ isConnected, sendMessage, subscribeToTopic }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context)
    throw new Error("useWebSocket must be used within WebSocketProvider");
  return context;
};
