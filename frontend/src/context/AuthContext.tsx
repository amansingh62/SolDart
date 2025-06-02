'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/lib/apiUtils';

interface User {
  _id: string;
  username: string;
  email: string;
  profileImage?: string;
  // Add other user properties as needed
}

// Define registration data interface
interface RegisterData {
  username: string;
  email: string;
  password: string;
  confirmPassword?: string;
  profileImage?: string;
  [key: string]: unknown; // Allow additional properties if needed
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    const checkAuthStatus = async () => {
      console.log("AuthContext: Checking authentication status");
      try {
        const response = await api.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/auth/user`, { withCredentials: true });
        if (response.data) {
          console.log("AuthContext: User is authenticated:", response.data);
          setUser(response.data);
        } else {
          console.log("AuthContext: No user data returned from /auth/user");
        }
      } catch (error: any) {
        if (error.response && error.response.status === 401) {
          // Not authenticated, clear user state
          setUser(null);
        } else {
          console.error('Authentication check failed:', error);
        }
        // Clear any potentially invalid auth state
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      console.log("AuthContext: Attempting login");
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;

      // Store token in localStorage
      localStorage.setItem('token', token);

      // Update auth state
      console.log("AuthContext: Login successful, updating user state:", user);
      setUser(user);
      
      // Dispatch an event to notify other components about the auth state change
      if (typeof window !== 'undefined') {
        console.log("AuthContext: Dispatching authStateChanged event");
        window.dispatchEvent(new Event('authStateChanged'));
      }
      return user;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      console.log("AuthContext: Attempting registration");
      const response = await api.post('/auth/register', userData);
      const { token, user } = response.data;

      // Store token in localStorage
      localStorage.setItem('token', token);

      // Update auth state
      console.log("AuthContext: Registration successful, updating user state:", user);
      setUser(user);
      
      // Dispatch an event to notify other components about the auth state change
      if (typeof window !== 'undefined') {
        console.log("AuthContext: Dispatching authStateChanged event after registration");
        window.dispatchEvent(new Event('authStateChanged'));
      }
      return user;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    console.log("AuthContext: Logging out");
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Ignore errors, proceed to clear state
    }
    // Remove token from localStorage
    localStorage.removeItem('token');
    // Update auth state
    setUser(null);
    // Dispatch a custom event to notify components about logout
    if (typeof window !== 'undefined') {
      console.log("AuthContext: Dispatching userLoggedOut event");
      window.dispatchEvent(new Event('userLoggedOut'));
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    register,
    logout,
    updateUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}