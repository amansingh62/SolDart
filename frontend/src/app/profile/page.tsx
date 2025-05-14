'use client';

import { useEffect, useState } from 'react';
import ProfileSection from "@/components/profile/ProfileSection";
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  useEffect(() => {
    // If authenticated, use the user ID from context
    if (isAuthenticated && user && user._id) {
      setCurrentUserId(user._id);
    } else {
      // Fallback to localStorage if context is not available
      const storedUserId = localStorage.getItem('userId');
      if (storedUserId) {
        setCurrentUserId(storedUserId);
      }
    }
  }, [isAuthenticated, user]);

    return (
      <ProfileSection userId={currentUserId ?? undefined} />
    );
  }
