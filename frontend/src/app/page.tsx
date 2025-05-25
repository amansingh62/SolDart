'use client';

import { HomePage } from "@/components/home/HomePage";
import { useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { useHashtag } from '@/context/HashtagContext';

// Component that handles search params
function HomeContent() {
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

  return <HomePage />;
}

// Loading fallback component
function HomeLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B671FF]"></div>
    </div>
  );
}

// Main component with Suspense wrapper
export default function Home() {
  return (
    <Suspense fallback={<HomeLoading />}>
      <HomeContent />
    </Suspense>
  );
}