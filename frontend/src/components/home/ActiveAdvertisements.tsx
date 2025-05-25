'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import api from '@/lib/apiUtils';
import Link from 'next/link';
import Image from 'next/image';
import { Icon } from '@iconify/react';

interface Advertisement {
  _id: string;
  projectName: string;
  bannerImage: string;
  website: string;
  twitterHandle: string;
  telegramHandle: string;
  user: {
    name: string;
    username: string;
  };
}

export function ActiveAdvertisements() {
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
        setCurrentAdIndex((prevIndex) => (prevIndex + 1) % advertisements.length);
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
      (prevIndex + 1) % advertisements.length
    );
  };

  if (isLoading) {
    return (
      <Card className="max-w-full bg-white rounded-lg shadow-[0px_4px_15px_rgba(128,128,128,0.4)] mb-4">
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="max-w-full bg-white rounded-lg shadow-[0px_4px_15px_rgba(128,128,128,0.4)] mb-4">
        <CardContent className="p-4">
          <p className="text-red-500">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (advertisements.length === 0) {
    return (
      <Card className="max-w-full bg-white rounded-lg shadow-[0px_4px_15px_rgba(128,128,128,0.4)] mb-4">
        <CardContent className="p-4">
          <div className="flex flex-col items-center justify-center py-4">
            <p className="text-gray-500 mb-3">Want to advertise your project here?</p>
            <Link href="/advertise-standalone" target="_blank" rel="noopener noreferrer">
              <Button className="bg-gradient-to-r from-[#B671FF] via-[#C577EE] to-[#E282CA] text-black hover:bg-black hover:text-white transition-colors">
                Advertise Now
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentAd = advertisements[currentAdIndex];

  return (
    <Card className="max-w-full bg-white rounded-lg shadow-[0px_4px_15px_rgba(128,128,128,0.4)] mb-4 overflow-hidden">
      <CardContent className="p-0 relative">
        {/* Ad Banner */}
        <div className="relative">
          <a
            href={currentAd.website}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Image
              src={currentAd.bannerImage.startsWith('http') ? currentAd.bannerImage : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${currentAd.bannerImage}`}
              alt={currentAd.projectName}
              width={800}
              height={120}
              className="w-full h-[120px] object-cover"
              priority={currentAdIndex === 0}
            />
          </a>

          {/* Sponsored Tag */}
          <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            Sponsored
          </div>

          {/* Navigation Controls (only show if multiple ads) */}
          {advertisements.length > 1 && (
            <div className="absolute inset-y-0 left-0 right-0 flex justify-between items-center px-2">
              <button
                onClick={handlePrevAd}
                className="bg-black/30 hover:bg-black/50 text-white rounded-full p-1"
                aria-label="Previous advertisement"
              >
                <Icon icon="lucide:chevron-left" className="h-4 w-4" />
              </button>
              <button
                onClick={handleNextAd}
                className="bg-black/30 hover:bg-black/50 text-white rounded-full p-1"
                aria-label="Next advertisement"
              >
                <Icon icon="lucide:chevron-right" className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Ad Info */}
        <div className="p-3">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-sm">{currentAd.projectName}</h3>
            <div className="flex space-x-2">
              {currentAd.twitterHandle && (
                <a
                  href={`https://twitter.com/${currentAd.twitterHandle.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-700"
                >
                  <Icon icon="lucide:twitter" className="h-4 w-4" />
                </a>
              )}
              {currentAd.telegramHandle && (
                <a
                  href={`https://t.me/${currentAd.telegramHandle.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-700"
                >
                  <Icon icon="lucide:send" className="h-4 w-4" />
                </a>
              )}
              {currentAd.website && (
                <a
                  href={currentAd.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-700"
                >
                  <Icon icon="lucide:globe" className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center mt-2">
            <Link
              href="/advertise-standalone"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
            >
              <Icon icon="lucide:external-link" className="h-3 w-3" />
              Advertise Your Project
            </Link>
            <div className="text-xs text-gray-500">
              {advertisements.length > 1 && (
                <span>{currentAdIndex + 1}/{advertisements.length}</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ActiveAdvertisements;