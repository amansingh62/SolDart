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

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
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
        const response = await api.get('/auth/me');
        if (response.data) {
          console.log("AuthContext: User is authenticated:", response.data);
          setUser(response.data);
        } else {
          console.log("AuthContext: No user data returned from /auth/me");
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        // Clear any potentially invalid auth state
        localStorage.removeItem('token');
        setUser(null);
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

  const register = async (userData: any) => {
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

  const logout = () => {
    console.log("AuthContext: Logging out");
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