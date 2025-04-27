'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Icon } from "@iconify/react";
import { fetchFearGreedIndex, FearGreedData } from '@/lib/coinMarketCapApi';

export function FearGreedIndex() {
  const [fearGreedData, setFearGreedData] = useState<FearGreedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to determine color based on fear/greed value
  const getColorClass = (value: number): string => {
    if (value >= 75) return "text-green-600"; // Extreme Greed
    if (value >= 55) return "text-green-500"; // Greed
    if (value >= 45) return "text-yellow-500"; // Neutral
    if (value >= 25) return "text-red-500"; // Fear
    return "text-red-600"; // Extreme Fear
  };

  // Function to get background color for the gauge
  const getBackgroundStyle = (value: number) => {
    // Create a gradient that represents the fear/greed spectrum
    return {
      background: `conic-gradient(
        #ff4d4d 0deg, 
        #ff4d4d ${Math.min(25, value) * 3.6}deg, 
        #ffa500 ${Math.min(25, value) * 3.6}deg, 
        #ffa500 ${Math.min(45, value) * 3.6}deg, 
        #ffff00 ${Math.min(45, value) * 3.6}deg, 
        #ffff00 ${Math.min(55, value) * 3.6}deg, 
        #00cc00 ${Math.min(55, value) * 3.6}deg, 
        #00cc00 ${Math.min(75, value) * 3.6}deg, 
        #009900 ${Math.min(75, value) * 3.6}deg, 
        #009900 360deg
      )`,
    };
  };

  // Fetch fear and greed index data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await fetchFearGreedIndex();
        setFearGreedData(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch Fear & Greed Index:', err);
        setError('Failed to load Fear & Greed Index');
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchData();

    // Set up real-time updates every 5 minutes
    const intervalId = setInterval(fetchData, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, []);

  // Fallback data in case API fails
  const fallbackData: FearGreedData = {
    value: 45,
    value_classification: 'Neutral',
    timestamp: new Date().toISOString(),
    time_until_update: '05:00:00'
  };

  // Use API data or fallback
  const displayData = fearGreedData || fallbackData;
  const colorClass = getColorClass(displayData.value);

  return (
    <div className="flex items-center">
      <div
        className="bg-white rounded-lg text-xs font-extrabold shadow-xl flex items-center gap-1 overflow-hidden px-2"
        style={{ boxShadow: '6px 6px 15px rgba(128, 128, 128, 0.5)' }}>

        {/* Fear & Greed Badge */}
        <Badge variant="outline" className="flex items-center bg-black gap-1 px-4 py-3 rounded-l-lg rounded-tr-none rounded-br-none z-10">
          <Icon icon="mdi:gauge" className="text-[#B671FF]" />
          <span className="text-md text-white whitespace-nowrap">Fear & Greed</span>
        </Badge>

        {/* Fear & Greed Value */}
        {loading ? (
          <div className="px-4 py-3">Loading...</div>
        ) : error ? (
          <div className="px-4 py-3 text-red-500">{error}</div>
        ) : (
          <div className="flex items-center px-4 py-3 gap-2">
            <div
              className="w-8 h-8 rounded-full relative flex items-center justify-center"
              style={getBackgroundStyle(displayData.value)}
            >
              <div className="absolute w-5 h-5 bg-white rounded-full flex items-center justify-center">
                <span className={`text-xs font-bold ${colorClass}`}>{displayData.value}</span>
              </div>
            </div>
            <span className={`font-medium ${colorClass}`}>
              {displayData.value_classification}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}