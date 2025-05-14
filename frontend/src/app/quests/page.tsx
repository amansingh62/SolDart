'use client';

import { useEffect, useState } from 'react';
import QuestSection from '@/components/quests/QuestSection';

export default function QuestsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  
  useEffect(() => {
    // Get userId from localStorage if available
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      setUserId(storedUserId);
    } else {
      // Generate a temporary ID if none exists
      const tempId = 'user_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('userId', tempId);
      setUserId(tempId);
    }
  }, []);

  return (
    <QuestSection userId={userId ?? undefined} />
  );
}