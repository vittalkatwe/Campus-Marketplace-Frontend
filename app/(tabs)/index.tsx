"use client"

import { Image } from "expo-image"
import { StyleSheet, View, ScrollView, TouchableOpacity, SafeAreaView } from "react-native"
import { useFonts } from "expo-font"
import * as SplashScreen from "expo-splash-screen"
import { useEffect } from "react"
import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { Ionicons } from "@expo/vector-icons"
import { Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'expo-router'
import { Alert } from 'react-native'

SplashScreen.preventAutoHideAsync()

export default function HomeScreen() {
  const { isAuthenticated, loading, logout } = useAuth()
  const router = useRouter()
  
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login')
    }
  }, [isAuthenticated, loading, router])

  if (loading || !isAuthenticated) {
    return null
  }

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: logout,
        },
      ]
    )
  }
  
  const [fontsLoaded] = useFonts({
    'Outfit-Regular': Outfit_400Regular,
    'Outfit-Medium': Outfit_500Medium,
    'Outfit-SemiBold': Outfit_600SemiBold,
    'Outfit-Bold': Outfit_700Bold,
  })


  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded])

  if (!fontsLoaded) {
    return null
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <ThemedView style={styles.header}>
        <TouchableOpacity>
          <Ionicons name="chevron-back" size={28} color="#000" />
        </TouchableOpacity>
      </ThemedView>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Header Section */}
        <ThemedView style={styles.profileHeaderContainer}>
          {/* Profile Image */}
          <Image source={require("@/assets/images/partial-react-logo.png")} style={styles.profileImage} />

          {/* Joined Info */}
          <ThemedView style={styles.joinedContainer}>
            <ThemedText style={styles.joinedLabel}>Joined</ThemedText>
            <ThemedText style={styles.joinedTime}>1 year ago</ThemedText>
          </ThemedView>
        </ThemedView>

        {/* Name Section */}
        <ThemedView style={styles.nameContainer}>
          <ThemedText style={styles.firstName}>David</ThemedText>
          <ThemedText style={styles.lastName}>Robinson</ThemedText>
        </ThemedView>

        {/* Profile Section */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Profile</ThemedText>

          <TouchableOpacity style={styles.menuItem}>
            <View style={[styles.iconContainer, styles.orangeIcon]}>
              <Ionicons name="person" size={20} color="#D97706" />
            </View>
            <ThemedText style={styles.menuItemText}>Manage user</ThemedText>
            <Ionicons name="chevron-forward" size={20} color="#999" style={styles.arrowBelowArrow} />
          </TouchableOpacity>
        </ThemedView>

        {/* Settings Section */}
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Settings</ThemedText>

          <TouchableOpacity style={styles.menuItem}>
            <View style={[styles.iconContainer, styles.purpleIcon]}>
              <Ionicons name="notifications" size={20} color="#7C3AED" />
            </View>
            <ThemedText style={styles.menuItemText}>Notifications</ThemedText>
            <Ionicons name="chevron-forward" size={20} color="#999" style={styles.arrowBelowArrow} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={[styles.iconContainer, styles.blueIcon]}>
              <Ionicons name="moon" size={20} color="#3B82F6" />
            </View>
            <ThemedText style={styles.menuItemText}>Dark Mode</ThemedText>
            <Ionicons name="chevron-forward" size={20} color="#999" style={styles.arrowBelowArrow} />
          </TouchableOpacity>
        </ThemedView>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleLogout}>
          <ThemedText style={styles.signOutText}>Sign Out</ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
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
    backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  profileHeaderContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 24,
    gap: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#E5E7EB",
  },
  joinedContainer: {
    flex: 1,
    backgroundColor: "#fff",
    marginLeft: 40,
    justifyContent: "center",
  },
  joinedLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
    fontFamily: "Outfit-Regular",
  },
  joinedTime: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    fontFamily: "Outfit-SemiBold",
  },
  nameContainer: {
    marginBottom: 32,
    backgroundColor: "#fff",
  },
  firstName: {
    fontSize: 32,
    fontWeight: "700",
    color: "#000",
    lineHeight: 38,
    fontFamily: "Outfit-Bold",
  },
  lastName: {
    fontSize: 24,
    fontWeight: "400",
    color: "#999",
    lineHeight: 30,
    fontFamily: "Outfit-Regular",
  },
  section: {
    backgroundColor: "#fff",
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginTop: 18,
    marginLeft: 1.5,
    marginBottom: 12,
    fontFamily: "Outfit-SemiBold",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  iconContainer: {
    width: 50,
    height: 50,
    marginLeft: -12,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  orangeIcon: {
    backgroundColor: "#FED7AA",
  },
  purpleIcon: {
    backgroundColor: "#E9D5FF",
  },
  blueIcon: {
    backgroundColor: "#DBEAFE",
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
    fontFamily: "Outfit-Medium",
  },
  signOutButton: {
    backgroundColor: "#F3F4F6",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    width: 140,
    alignItems: "center",
    marginVertical: 32,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3B82F6",
    fontFamily: "Outfit-SemiBold",
  },



  arrowBelowArrow: {
    backgroundColor: "#e6e6e6",
    padding: 4,
    borderRadius: 5
  }
})
