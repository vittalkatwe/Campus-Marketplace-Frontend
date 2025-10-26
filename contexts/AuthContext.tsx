import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  userEmail: string | null;
  login: (token: string, email: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}



const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);


  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('authToken');
      const storedEmail = await AsyncStorage.getItem('userEmail');
      if (storedToken && storedEmail) {
        setToken(storedToken);
        setUserEmail(storedEmail); // Make sure this is set
        setIsAuthenticated(true);
        console.log('✅ Restored auth for user:', storedEmail);
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (newToken: string, email: string) => {
    try {
      await AsyncStorage.setItem('authToken', newToken);
      await AsyncStorage.setItem('userEmail', email);
      setToken(newToken);
      setUserEmail(email); // Make sure this is set
      setIsAuthenticated(true);
      console.log('✅ Login successful for user:', email);
    } catch (error) {
      console.error('Error saving token:', error);
      throw error;
    }
  };
  
  
  const logout = async () => {
    try {
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userEmail');
      setToken(null);
      setUserEmail(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error removing token:', error);
    }
  };
  
  const value: AuthContextType = {
    isAuthenticated,
    token,
    userEmail, // Include this
    login,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
