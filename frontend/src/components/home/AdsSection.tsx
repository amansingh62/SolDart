'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import api from '@/lib/apiUtils';
import Link from 'next/link';
import { Icon } from '@iconify/react';

interface Advertisement {
  _id: string;
  projectName: string;
  bannerImage: string;
  website: string;
  twitterHandle: string;
  telegramHandle: string;
  projectDetails: string;
  user: {
    name: string;
    username: string;
  };
}

type AdsSectionProps = {
  className?: string;
};

export function AdsSection({ className }: AdsSectionProps) {
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchActiveAds = async () => {
      try {
        setIsLoading(true);
        const response = await api.get('/advertisements/active');
        setAdvertisements(response.data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch advertisements:', err);
        setError('Failed to load advertisements');
      } finally {
        setIsLoading(false);
      }
    };

    fetchActiveAds();
  }, []);

  useEffect(() => {
    // Auto-rotate ads every 10 seconds if there are multiple ads
    if (advertisements.length > 1) {
      const interval = setInterval(() => {
        setCurrentAdIndex((prevIndex) => 
          prevIndex === advertisements.length - 1 ? 0 : prevIndex + 1
        );
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [advertisements.length]);

  const handlePrevAd = () => {
    setCurrentAdIndex((prevIndex) => 
      prevIndex === 0 ? advertisements.length - 1 : prevIndex - 1
    );
  };

  const handleNextAd = () => {
    setCurrentAdIndex((prevIndex) => 
      prevIndex === advertisements.length - 1 ? 0 : prevIndex + 1
    );
  };

  if (isLoading) {
    return (
      <Card className={`max-w-full bg-white rounded-lg shadow-[0px_4px_15px_rgba(128,128,128,0.4)] ${className}`}>
        <CardContent className="flex items-center justify-center py-8">
          <span className="text-xl font-bold text-gray-400">Loading advertisements...</span>
        </CardContent>
      </Card>
    );
  }

  if (error || advertisements.length === 0) {
    return (
      <Card className={`max-w-full bg-white rounded-lg shadow-[0px_4px_15px_rgba(128,128,128,0.4)] ${className}`}>
        <CardContent className="flex items-center justify-center py-8">
          <Link href="/advertise-standalone" target="_blank" rel="noopener noreferrer">
            <Button variant="default" size="sm">
              Advertise Now
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const currentAd = advertisements[currentAdIndex];
  
  return (
    <Card className={`max-w-full bg-white rounded-lg shadow-[0px_4px_15px_rgba(128,128,128,0.4)] overflow-hidden ${className}`}>
      <div className="relative">
        {/* Banner Image */}
        <div className="w-full h-48 bg-gray-200 relative overflow-hidden">
          {currentAd.bannerImage ? (
            <img 
              src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${currentAd.bannerImage}`} 
              alt={currentAd.projectName} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <span className="text-gray-400">No banner image</span>
            </div>
          )}
          
          {/* Navigation arrows if multiple ads */}
          {advertisements.length > 1 && (
            <div className="absolute inset-0 flex items-center justify-between px-2">
              <Button 
                onClick={handlePrevAd} 
                variant="ghost" 
                size="icon" 
                className="bg-black/30 hover:bg-black/50 text-white rounded-full h-8 w-8"
              >
                <Icon icon="heroicons:chevron-left" className="h-5 w-5" />
              </Button>
              <Button 
                onClick={handleNextAd} 
                variant="ghost" 
                size="icon" 
                className="bg-black/30 hover:bg-black/50 text-white rounded-full h-8 w-8"
              >
                <Icon icon="heroicons:chevron-right" className="h-5 w-5" />
              </Button>
            </div>
          )}
          
          {/* Ad counter indicator */}
          {advertisements.length > 1 && (
            <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
              {currentAdIndex + 1}/{advertisements.length}
            </div>
          )}
        </div>
        
        <CardContent className="p-4">
          <div className="flex flex-col space-y-3">
            <h3 className="text-xl font-bold">{currentAd.projectName}</h3>
            
            <p className="text-sm text-gray-600 line-clamp-2">
              {currentAd.projectDetails}
            </p>
            
            <div className="flex flex-wrap gap-2 mt-2">
              {currentAd.website && (
                <Link 
                  href={currentAd.website.startsWith('http') ? currentAd.website : `https://${currentAd.website}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center text-sm text-blue-600 hover:underline"
                >
                  <Icon icon="heroicons:globe-alt" className="mr-1 h-4 w-4" />
                  Website
                </Link>
              )}
              
              {currentAd.twitterHandle && (
                <Link 
                  href={`https://twitter.com/${currentAd.twitterHandle.replace('@', '')}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center text-sm text-blue-600 hover:underline"
                >
                  <Icon icon="mdi:twitter" className="mr-1 h-4 w-4" />
                  Twitter
                </Link>
              )}
              
              {currentAd.telegramHandle && (
                <Link 
                  href={`https://t.me/${currentAd.telegramHandle.replace('@', '')}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center text-sm text-blue-600 hover:underline"
                >
                  <Icon icon="mdi:telegram" className="mr-1 h-4 w-4" />
                  Telegram
                </Link>
              )}
            </div>
            
            <div className="text-xs text-gray-500 mt-2">
              Posted by @{currentAd.user?.username || 'anonymous'}
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}