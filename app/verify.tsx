"use client"

import { StyleSheet, View, ScrollView, TouchableOpacity, SafeAreaView, TextInput, Alert } from "react-native"
import { useFonts } from "expo-font"
import * as SplashScreen from "expo-splash-screen"
import { useEffect, useState } from "react"
import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { Ionicons } from "@expo/vector-icons"
import { Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold } from "@expo-google-fonts/outfit"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useAuth } from "@/contexts/AuthContext"

SplashScreen.preventAutoHideAsync()

const BASE_URL = "http://192.168.1.7:8080/auth"

export default function VerifyEmailScreen() {
  const router = useRouter()
  const { login, isAuthenticated, loading } = useAuth()
  const { email } = useLocalSearchParams<{ email: string }>()
  const [otp, setOtp] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  // Redirect to index page if already authenticated
  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace("/(tabs)")
    }
  }, [isAuthenticated, loading, router])

  const [fontsLoaded] = useFonts({
    "Outfit-Regular": Outfit_400Regular,
    "Outfit-Medium": Outfit_500Medium,
    "Outfit-SemiBold": Outfit_600SemiBold,
    "Outfit-Bold": Outfit_700Bold,
  })

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync()
  }, [fontsLoaded])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [resendCooldown])

  if (!fontsLoaded) return null

  const handleVerify = async () => {
    if (!email) {
      Alert.alert("Error", "Email not provided. Please register again.")
      router.replace("/register")
      return
    }
    if (!otp) {
      Alert.alert("Error", "Please enter the OTP.")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`${BASE_URL}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      })

      const textResponse = await response.text()
      if (response.ok) {
        Alert.alert("Success", textResponse)
        // After successful verification, navigate to login
        router.replace("/login")
      } else {
        Alert.alert("Verification Failed", textResponse || "Invalid OTP or something went wrong.")
      }
    } catch (error) {
      console.error("Verification error:", error)
      Alert.alert("Error", "Network error or unable to connect to the server.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (!email) {
      Alert.alert("Error", "Email not provided to resend OTP.")
      router.replace("/register")
      return
    }

    if (resendCooldown > 0) return

    setIsResending(true)
    try {
      const response = await fetch(`${BASE_URL}/resend-otp?email=${email}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      const textResponse = await response.text()
      if (response.ok) {
        Alert.alert("Success", textResponse)
        setResendCooldown(30) // 30 sec cooldown
      } else {
        Alert.alert("Resend OTP Failed", textResponse || "Unable to resend OTP.")
      }
    } catch (error) {
      console.error("Resend OTP error:", error)
      Alert.alert("Error", "Network error or unable to connect to the server.")
    } finally {
      setIsResending(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <ThemedView style={styles.headerSection}>
          <View style={styles.titleContainer}>
            <ThemedText style={styles.verifyText}>Verify</ThemedText>
            <ThemedText style={styles.emailText}>email</ThemedText>
          </View>
          <ThemedText style={styles.subtitle}>
            Enter the OTP sent to your email ({email || "your email"}) to verify your account
          </ThemedText>
        </ThemedView>

        {/* OTP */}
        <ThemedView style={styles.inputContainer}>
          <Ionicons name="key" size={20} color="#999" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Enter OTP"
            placeholderTextColor="#999"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
          />
        </ThemedView>

        {/* Resend OTP */}
        <ThemedView style={styles.resendContainer}>
          <ThemedText style={styles.resendText}>Didn't receive the code? </ThemedText>
          <TouchableOpacity
            onPress={handleResendOtp}
            disabled={isResending || resendCooldown > 0}
          >
            <ThemedText style={styles.resendLink}>
              {isResending
                ? "Resending..."
                : resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : "Resend OTP"}
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>

        {/* Verify Button */}
        <TouchableOpacity
          style={[styles.verifyButton, isLoading && { opacity: 0.7 }]}
          onPress={handleVerify}
          disabled={isLoading}
        >
          <ThemedText style={styles.verifyButtonText}>
            {isLoading ? "Verifying..." : "Verify"}
          </ThemedText>
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
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  headerSection: {
    backgroundColor: "#fff",
    marginBottom: 32,
  },
  titleContainer: {
    marginBottom: 12,
  },
  verifyText: {
    fontSize: 36,
    fontWeight: "700",
    lineHeight: 44, 
    color: "#EF4444",
    fontFamily: "Outfit-Bold",
  },
  emailText: {
    fontSize: 28,
    lineHeight: 26,
    fontWeight: "400",
    color: "#000",
    fontFamily: "Outfit-Regular",
  },
  subtitle: {
    fontSize: 14,
    color: "#999",
    lineHeight: 20,
    fontFamily: "Outfit-Regular",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#000",
    fontFamily: "Outfit-Regular",
  },
  resendContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 32,
    backgroundColor: "#fff",
  },
  resendText: {
    fontSize: 14,
    color: "#666",
    fontFamily: "Outfit-Regular",
  },
  resendLink: {
    fontSize: 14,
    color: "#EF4444",
    fontWeight: "600",
    fontFamily: "Outfit-SemiBold",
  },
  verifyButton: {
    backgroundColor: "#EF4444",
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: "center",
    marginBottom: 24,
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    fontFamily: "Outfit-SemiBold",
  },
})