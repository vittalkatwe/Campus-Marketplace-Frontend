"use client"

import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { ThemedText } from "./themed-text"
import { useState } from "react"

const MESSAGES = [
  {
    id: "1",
    text: "Hi Andrew. Long time no see. How are you?",
    sender: "other",
    time: "10:29",
  },
  {
    id: "2",
    text: "Hello Emma!",
    sender: "user",
    time: "10:29",
  },
  {
    id: "3",
    text: "I'm good. How's life?",
    sender: "user",
    time: "10:29",
  },
  {
    id: "4",
    text: "By the way how is the golf activity last sunday? I never forget how you can make that awesome! 😊",
    sender: "other",
    time: "10:29",
  },
  {
    id: "5",
    text: "Haha, it's just accidentally happen.",
    sender: "other",
    time: "10:29",
  },
  {
    id: "6",
    text: "What happen em...",
    sender: "other",
    time: "10:29",
  },
]

interface ChatScreenProps {
  chat: any
  onBack: () => void
}

export default function ChatScreen({ chat, onBack }: ChatScreenProps) {
  const [message, setMessage] = useState("")

  const renderMessage = (msg: (typeof MESSAGES)[0]) => {
    const isUser = msg.sender === "user"
    return (
      <View key={msg.id} style={[styles.messageRow, isUser && styles.userMessageRow]}>
        {!isUser && <Image source={chat.avatar} style={styles.messageAvatar} />}
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.otherBubble]}>
          <ThemedText style={[styles.messageText, isUser && styles.userMessageText]}>{msg.text}</ThemedText>
        </View>
        {isUser && <View style={styles.messageAvatarPlaceholder} />}
      </View>
    )
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={onBack}>
            <Ionicons name="chevron-back" size={28} color="#000" />
          </TouchableOpacity>
          <Image source={chat.avatar} style={styles.headerAvatar} />
          <View>
            <ThemedText style={styles.headerName}>{chat.name}</ThemedText>
            <ThemedText style={styles.headerStatus}>Online</ThemedText>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity>
            <Ionicons name="search" size={24} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity>
            <Ionicons name="ellipsis-vertical" size={24} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <ScrollView style={styles.messagesContainer} showsVerticalScrollIndicator={false}>
        {MESSAGES.map((msg) => renderMessage(msg))}
      </ScrollView>

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <View style={styles.inputRow}>
          <TouchableOpacity>
            <Ionicons name="attach" size={24} color="#999" />
          </TouchableOpacity>
          <TouchableOpacity>
            <Ionicons name="camera" size={24} color="#999" />
          </TouchableOpacity>
          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            value={message}
            onChangeText={setMessage}
          />
          <TouchableOpacity>
            <Ionicons name="send" size={24} color="#10B981" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.micButton}>
          <Ionicons name="mic" size={24} color="#999" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E5E7EB",
  },
  headerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    fontFamily: "Outfit-SemiBold",
  },
  headerStatus: {
    fontSize: 12,
    fontWeight: "400",
    color: "#999",
    fontFamily: "Outfit-Regular",
  },
  headerRight: {
    flexDirection: "row",
    gap: 16,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 12,
    gap: 8,
  },
  userMessageRow: {
    justifyContent: "flex-end",
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E5E7EB",
  },
  messageAvatarPlaceholder: {
    width: 32,
    height: 32,
  },
  messageBubble: {
    maxWidth: "70%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  otherBubble: {
    backgroundColor: "#E5E7EB",
  },
  userBubble: {
    backgroundColor: "#10B981",
  },
  messageText: {
    fontSize: 14,
    fontWeight: "400",
    color: "#000",
    fontFamily: "Outfit-Regular",
  },
  userMessageText: {
    color: "#fff",
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    backgroundColor: "#fff",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "400",
    color: "#000",
    fontFamily: "Outfit-Regular",
    paddingVertical: 8,
  },
  micButton: {
    alignSelf: "flex-end",
    paddingRight: 4,
  },
})
