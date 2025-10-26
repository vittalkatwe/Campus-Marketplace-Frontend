"use client"

import { StyleSheet, View, ScrollView, TouchableOpacity, SafeAreaView, TextInput, Alert } from "react-native"
import { useFonts } from "expo-font"
import * as SplashScreen from "expo-splash-screen"
import { useEffect, useState } from "react"
import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold } from "@expo-google-fonts/outfit"
import { useAuth } from "@/contexts/AuthContext"

SplashScreen.preventAutoHideAsync()

const BASE_URL = "http://192.168.1.7:8080/auth"

export default function RegisterScreen() {
  const router = useRouter()
  const { login, isAuthenticated, loading } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

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

  if (!fontsLoaded) return null

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields.")
      return
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.")
      return
    }
    if (!agreeToTerms) {
      Alert.alert("Error", "You must agree to the Terms of Service and Privacy Policy.")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`${BASE_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const textResponse = await response.text()

      if (response.ok) {
        Alert.alert("Success", textResponse)
        router.push({ pathname: "/verify", params: { email } })
      } else {
        Alert.alert("Registration Failed", textResponse || "Something went wrong.")
      }
    } catch (error) {
      console.error("Registration error:", error)
      Alert.alert("Error", "Network error or unable to connect to the server.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <ThemedView style={styles.headerSection}>
          <View style={styles.titleContainer}>
            <ThemedText style={styles.helloText}>Hello</ThemedText>
            <ThemedText style={styles.thereText}>there!</ThemedText>
          </View>
          <ThemedText style={styles.subtitle}>
            Create an account to access your package history and get real-time updates on all your shipments
          </ThemedText>
        </ThemedView>

        {/* Email */}
        <ThemedView style={styles.inputContainer}>
          <Ionicons name="mail" size={20} color="#999" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Enter your mail/phone number"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </ThemedView>

        {/* Password */}
        <ThemedView style={styles.inputContainer}>
          <Ionicons name="lock-closed" size={20} color="#999" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Create password"
            placeholderTextColor="#999"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 5 }}>
            <Ionicons name={showPassword ? "eye" : "eye-off"} size={20} color="#999" />
          </TouchableOpacity>
        </ThemedView>

        {/* Confirm Password */}
        <ThemedView style={styles.inputContainer}>
          <Ionicons name="lock-closed" size={20} color="#999" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Re-type your password"
            placeholderTextColor="#999"
            secureTextEntry={!showConfirmPassword}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={{ padding: 5 }}>
            <Ionicons name={showConfirmPassword ? "eye" : "eye-off"} size={20} color="#999" />
          </TouchableOpacity>
        </ThemedView>

        {/* Terms */}
        <ThemedView style={styles.termsContainer}>
          <TouchableOpacity style={styles.checkboxContainer} onPress={() => setAgreeToTerms(!agreeToTerms)}>
            <View style={[styles.checkbox, agreeToTerms && styles.checkboxChecked]}>
              {agreeToTerms && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
          </TouchableOpacity>
          <View style={styles.termsTextContainer}>
            <ThemedText style={styles.termsText}>By signing up, you agree to our </ThemedText>
            <TouchableOpacity>
              <ThemedText style={styles.termsLink}>Terms of Service</ThemedText>
            </TouchableOpacity>
            <ThemedText style={styles.termsText}> and </ThemedText>
            <TouchableOpacity>
              <ThemedText style={styles.termsLink}>Privacy Policy</ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>

        {/* Sign Up */}
        <TouchableOpacity
          style={[styles.signUpButton, isLoading && { opacity: 0.7 }]}
          onPress={handleRegister}
          disabled={isLoading}
        >
          <ThemedText style={styles.signUpButtonText}>
            {isLoading ? "Signing Up..." : "Sign up"}
          </ThemedText>
        </TouchableOpacity>

        {/* Sign In */}
        <ThemedView style={styles.signInContainer}>
          <ThemedText style={styles.signInText}>Already have an account? </ThemedText>
          <TouchableOpacity onPress={() => router.push("/login")}>
            <ThemedText style={styles.signInLink}>Sign in</ThemedText>
          </TouchableOpacity>
        </ThemedView>
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
  helloText: {
    fontSize: 36,
    fontWeight: "700",
    color: "#EF4444",
    lineHeight: 44,
    fontFamily: "Outfit-Bold",
  },
  thereText: {
    fontSize: 28,
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
  termsContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 24,
    backgroundColor: "#fff",
    gap: 12,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#EF4444",
    borderColor: "#EF4444",
  },
  termsTextContainer: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  termsText: {
    fontSize: 12,
    color: "#666",
    fontFamily: "Outfit-Regular",
  },
  termsLink: {
    fontSize: 12,
    color: "#EF4444",
    fontWeight: "600",
    fontFamily: "Outfit-SemiBold",
  },
  signUpButton: {
    backgroundColor: "#EF4444",
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: "center",
    marginBottom: 24,
  },
  signUpButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    fontFamily: "Outfit-SemiBold",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    backgroundColor: "#fff",
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E5E5",
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 14,
    color: "#999",
    fontFamily: "Outfit-Regular",
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9F9F9",
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    gap: 8,
  },
  googleButtonText: {
    fontSize: 14,
    color: "#000",
    fontFamily: "Outfit-Regular",
  },
  signInContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
    backgroundColor: "#fff",
  },
  signInText: {
    fontSize: 14,
    color: "#666",
    fontFamily: "Outfit-Regular",
  },
  signInLink: {
    fontSize: 14,
    color: "#EF4444",
    fontWeight: "600",
    fontFamily: "Outfit-SemiBold",
  },
})