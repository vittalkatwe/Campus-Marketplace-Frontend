"use client"

import { View, StyleSheet, TouchableOpacity, FlatList, Image } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { ThemedText } from "./themed-text"
import { useState } from "react"

const INBOX_DATA = [
  {
    id: "1",
    name: "Billy Green",
    message: "Sorry about that...",
    time: "09:11",
    avatar: require("@/assets/images/partial-react-logo.png"),
    unread: 3,
  },
  {
    id: "2",
    name: "Isabel Stephens",
    message: "Me. Okay!",
    time: "09:11",
    avatar: require("@/assets/images/partial-react-logo.png"),
    unread: 0,
  },
  {
    id: "3",
    name: "Jessi Libby",
    message: "The unseen of spending three years at P...",
    time: "09:11",
    avatar: require("@/assets/images/partial-react-logo.png"),
    unread: 0,
  },
  {
    id: "4",
    name: "Ralph Lewis",
    message: "Traveling as a way of self-discovery and...",
    time: "09:11",
    avatar: require("@/assets/images/partial-react-logo.png"),
    unread: 0,
  },
  {
    id: "5",
    name: "Alberto Brooks",
    message: "Thank you!",
    time: "09:11",
    avatar: require("@/assets/images/partial-react-logo.png"),
    unread: 0,
  },
  {
    id: "6",
    name: "Andre Flores",
    message: "Me. No. I mean we must submit the paper",
    time: "09:11",
    avatar: require("@/assets/images/partial-react-logo.png"),
    unread: 0,
  },
  {
    id: "7",
    name: "Sandra James",
    message: "Tomorrow morning, are you ready?",
    time: "09:11",
    avatar: require("@/assets/images/partial-react-logo.png"),
    unread: 0,
  },
  {
    id: "8",
    name: "Amanda Harris",
    message: "Sorry about that...",
    time: "09:11",
    avatar: require("@/assets/images/partial-react-logo.png"),
    unread: 0,
  },
]

interface InboxScreenProps {
  onSelectChat: (chat: any) => void
}

export default function InboxScreen({ onSelectChat }: InboxScreenProps) {
  const [activeTab, setActiveTab] = useState<"private" | "group">("private")

  const renderChatItem = ({ item }: { item: (typeof INBOX_DATA)[0] }) => (
    <TouchableOpacity style={styles.chatItem} onPress={() => onSelectChat(item)}>
      <Image source={item.avatar} style={styles.avatar} />
      <View style={styles.chatContent}>
        <ThemedText style={styles.chatName}>{item.name}</ThemedText>
        <ThemedText style={styles.chatMessage} numberOfLines={1}>
          {item.message}
        </ThemedText>
      </View>
      <View style={styles.chatMeta}>
        <ThemedText style={styles.chatTime}>{item.time}</ThemedText>
        {item.unread > 0 && (
          <View style={styles.unreadBadge}>
            <ThemedText style={styles.unreadText}>{item.unread}</ThemedText>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <ThemedText style={styles.headerTitle}>Inbox</ThemedText>
          <TouchableOpacity>
            <Ionicons name="search" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "private" && styles.activeTab]}
            onPress={() => setActiveTab("private")}
          >
            <ThemedText style={[styles.tabText, activeTab === "private" && styles.activeTabText]}>Private</ThemedText>
            {activeTab === "private" && (
              <View style={styles.badge}>
                <ThemedText style={styles.badgeText}>10</ThemedText>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === "group" && styles.activeTab]}
            onPress={() => setActiveTab("group")}
          >
            <ThemedText style={[styles.tabText, activeTab === "group" && styles.activeTabText]}>Group</ThemedText>
            {activeTab === "group" && (
              <View style={styles.badge}>
                <ThemedText style={styles.badgeText}>2</ThemedText>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Chat List */}
      <FlatList
        data={INBOX_DATA}
        renderItem={renderChatItem}
        keyExtractor={(item) => item.id}
        scrollEnabled={true}
        contentContainerStyle={styles.listContent}
      />

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#000",
    fontFamily: "Outfit-Bold",
  },
  tabsContainer: {
    flexDirection: "row",
    gap: 12,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
  },
  activeTab: {
    backgroundColor: "#10B981",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    fontFamily: "Outfit-SemiBold",
  },
  activeTabText: {
    color: "#fff",
  },
  badge: {
    backgroundColor: "#FF4757",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: "center",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
    fontFamily: "Outfit-Bold",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#E5E7EB",
  },
  chatContent: {
    flex: 1,
  },
  chatName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    fontFamily: "Outfit-SemiBold",
    marginBottom: 4,
  },
  chatMessage: {
    fontSize: 14,
    fontWeight: "400",
    color: "#999",
    fontFamily: "Outfit-Regular",
  },
  chatMeta: {
    alignItems: "flex-end",
    gap: 8,
  },
  chatTime: {
    fontSize: 12,
    fontWeight: "400",
    color: "#999",
    fontFamily: "Outfit-Regular",
  },
  unreadBadge: {
    backgroundColor: "#10B981",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  unreadText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
    fontFamily: "Outfit-Bold",
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
})
