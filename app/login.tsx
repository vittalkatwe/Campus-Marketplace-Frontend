"use client"

import { StyleSheet, View, ScrollView, TouchableOpacity, SafeAreaView, TextInput, Alert } from "react-native" // Import Alert
import { useFonts } from "expo-font"
import * as SplashScreen from "expo-splash-screen"
import { useEffect, useState } from "react"
import { useRouter } from "expo-router"
import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { Ionicons } from "@expo/vector-icons"
import { Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold } from "@expo-google-fonts/outfit"
import { useAuth } from "@/contexts/AuthContext"

// import RegisterScreen from "./register" // No longer needed directly here
// import VerifyEmailScreen from "./verify" // No longer needed directly here

SplashScreen.preventAutoHideAsync()

const BASE_URL = "http://192.168.1.7:8080/auth" // Define BASE_URL

export default function LoginScreen() {
  const router = useRouter()
  const { login, isAuthenticated, loading } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false) // Add loading state

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
    if (fontsLoaded) {
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded])

  if (!fontsLoaded) {
    return null
  }

  // In your login.tsx - Update handleLogin
// In your login.tsx - Make sure email is passed correctly
const handleLogin = async () => {
  if (!email || !password) {
    Alert.alert("Error", "Please enter your email and password.");
    return;
  }

  setIsLoading(true);
  try {
    const response = await fetch(`${BASE_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const responseData = await response.json();

    if (response.ok) {
      const token = responseData.token;
      // FIX: Make sure to pass the email to login function
      await login(token, email); // Pass the email here
      Alert.alert("Success", "Logged in successfully!");
      router.replace("/(tabs)");
    } else {
      Alert.alert("Login Failed", responseData.message || "Invalid credentials.");
    }
  } catch (error) {
    console.error("Login error:", error);
    Alert.alert("Error", "Network error or unable to connect to the server.");
  } finally {
    setIsLoading(false);
  }
};

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <ThemedView style={styles.headerSection}>
          <View style={styles.titleContainer}>
            <ThemedText style={styles.welcomeText}>Welcome</ThemedText>
            <ThemedText style={styles.backText}>back!</ThemedText>
          </View>
          <ThemedText style={styles.subtitle}>
            Sign in to access your package history and get real-time updates on all your shipments
          </ThemedText>
        </ThemedView>

        {/* Email Input */}
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

        {/* Password Input */}
        <ThemedView style={styles.inputContainer}>
          <Ionicons name="lock-closed" size={20} color="#999" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor="#999"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 5 }}>
            <Ionicons name={showPassword ? "eye" : "eye-off"} size={20} color="#999" />
          </TouchableOpacity>
        </ThemedView>

        {/* Remember Me & Forgot Password */}
        <ThemedView style={styles.optionsContainer}>
          <TouchableOpacity style={styles.checkboxContainer} onPress={() => setRememberMe(!rememberMe)}>
            <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
              {rememberMe && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <ThemedText style={styles.rememberText}>Remember me</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Alert.alert("Forgot Password", "Feature not implemented yet.")}>
            <ThemedText style={styles.forgotPassword}>Forgot password</ThemedText>
          </TouchableOpacity>
        </ThemedView>

        {/* Sign In Button */}
        <TouchableOpacity style={styles.signInButton} onPress={handleLogin} disabled={isLoading}>
          <ThemedText style={styles.signInButtonText}>
            {isLoading ? "Signing In..." : "Sign in"}
          </ThemedText>
        </TouchableOpacity>

        {/* Sign Up Link */}
        <ThemedView style={styles.signUpContainer}>
          <ThemedText style={styles.signUpText}>Don't have an account? </ThemedText>
          <TouchableOpacity onPress={() => router.push("/register")}>
            <ThemedText style={styles.signUpLink}>Create an account</ThemedText>
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
  welcomeText: {
    fontSize: 36,
    fontWeight: "700",
    color: "#EF4444",
    fontFamily: "Outfit-Bold",
    lineHeight: 44, // adjust based on font size
  },  
  backText: {
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
  optionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    backgroundColor: "#fff",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
  rememberText: {
    fontSize: 14,
    color: "#666",
    fontFamily: "Outfit-Regular",
  },
  forgotPassword: {
    fontSize: 14,
    color: "#3B82F6",
    fontFamily: "Outfit-Regular",
  },
  signInButton: {
    backgroundColor: "#EF4444",
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: "center",
    marginBottom: 24,
  },
  signInButtonText: {
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
  signUpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
    backgroundColor: "#fff",
  },
  signUpText: {
    fontSize: 14,
    color: "#666",
    fontFamily: "Outfit-Regular",
  },
  signUpLink: {
    fontSize: 14,
    color: "#EF4444",
    fontWeight: "600",
    fontFamily: "Outfit-SemiBold",
  },
})