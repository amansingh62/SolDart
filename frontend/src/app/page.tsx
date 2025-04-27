'use client';

import { HomePage } from "@/components/home/HomePage";
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useHashtag } from '@/context/HashtagContext';

export default function Home() {
  const searchParams = useSearchParams();
  const { setSelectedHashtag } = useHashtag();
  
  // Check for hashtag in URL query parameters
  useEffect(() => {
    const hashtag = searchParams.get('hashtag');
    if (hashtag) {
      // Set the selected hashtag in the context
      setSelectedHashtag(hashtag);
    }
  }, [searchParams, setSelectedHashtag]);

  return (
    <HomePage />
  );
}
