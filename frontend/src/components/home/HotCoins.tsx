'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Badge } from "@/components/ui/badge";
import { Icon } from "@iconify/react";
import clsx from "clsx";
import Image from 'next/image';
import { fetchTrendingCoins, TrendingCoin } from '@/lib/coinMarketCapApi';
import { subscribeToCryptoUpdates } from '@/lib/cryptoWebSocket';

interface CoinDisplay {
  symbol: string;
  number: number;
  percentChange: number;
  color: string;
  image?: string; // URL to the coin's image/logo
  price?: number; // Price of the coin in USD
}

export function HotCoins() {
  const [trendingCoins, setTrendingCoins] = useState<CoinDisplay[]>([]);
  const [displayCoins, setDisplayCoins] = useState<CoinDisplay[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialLoadRef = useRef<boolean>(true);

  // Function to determine text color based on percent change
  const getColorClass = (percentChange: number): string => {
    if (percentChange > 20) return "text-green-600";
    if (percentChange > 5) return "text-green-500";
    if (percentChange > 0) return "text-green-400";
    if (percentChange < -20) return "text-red-600";
    if (percentChange < -5) return "text-red-500";
    if (percentChange < 0) return "text-red-400";
    return "text-gray-600";
  };

  // Fetch trending coins on component mount
  useEffect(() => {
    const loadTrendingCoins = async () => {
      try {
        // Check if we have cached data in localStorage
        const cachedData = typeof window !== 'undefined' ? localStorage.getItem('hotCoinsData') : null;
        
        if (cachedData && initialLoadRef.current) {
          // Use cached data for initial render to prevent flickering
          const parsedData = JSON.parse(cachedData);
          setTrendingCoins(parsedData);
        }
        
        // Always fetch fresh data from API
        const coins = await fetchTrendingCoins();

        // Map API response to our display format
        const formattedCoins = coins.map((coin, index) => ({
          symbol: coin.symbol,
          number: index + 1,
          percentChange: coin.percent_change_24h,
          color: getColorClass(coin.percent_change_24h),
          image: coin.image, // Include the coin image URL
          price: coin.price // Include the coin price
        }));

        // Save to localStorage for future page loads
        if (typeof window !== 'undefined') {
          localStorage.setItem('hotCoinsData', JSON.stringify(formattedCoins));
        }
        
        setTrendingCoins(formattedCoins);
        initialLoadRef.current = false;
      } catch (error) {
        console.error('Error loading trending coins:', error);
        
        // If error and we have cached data, use it
        const cachedData = typeof window !== 'undefined' ? localStorage.getItem('hotCoinsData') : null;
        if (cachedData) {
          setTrendingCoins(JSON.parse(cachedData));
        }
      }
    };

    loadTrendingCoins();

    // Subscribe to real-time updates
    const unsubscribe = subscribeToCryptoUpdates((updatedCoins: TrendingCoin[]) => {
      const formattedCoins = updatedCoins.map((coin, index) => ({
        symbol: coin.symbol,
        number: index + 1,
        percentChange: coin.percent_change_24h,
        color: getColorClass(coin.percent_change_24h),
        image: coin.image,
        price: coin.price
      }));

      setTrendingCoins(formattedCoins);
    });

    return () => {
      // Clean up subscription on component unmount
      unsubscribe();
    };
  }, []);

  // Set up the scrolling animation
  useEffect(() => {
    if (!scrollRef.current || trendingCoins.length === 0) return;

    const scrollContainer = scrollRef.current;
    let animationId: number;
    let scrollPosition = 0;

    const scroll = () => {
      scrollPosition += 0.2; // Adjust speed here

      // Reset position when we've scrolled through all items
      if (scrollPosition >= scrollContainer.scrollWidth / 2) {
        scrollPosition = 0;
      }

      scrollContainer.scrollLeft = scrollPosition;
      animationId = requestAnimationFrame(scroll);
    };

    // Start the animation
    animationId = requestAnimationFrame(scroll);

    // Clean up animation on unmount
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [trendingCoins]);

  // Fallback data in case API fails
  const fallbackCoins: CoinDisplay[] = [
    { symbol: "BTC", number: 1, percentChange: 2.5, color: "text-green-500", image: "https://s2.coinmarketcap.com/static/img/coins/64x64/1.png", price: 65432.10 },
    { symbol: "ETH", number: 2, percentChange: 1.8, color: "text-green-400", image: "https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png", price: 3456.78 },
    { symbol: "SOL", number: 3, percentChange: 5.2, color: "text-green-500", image: "https://s2.coinmarketcap.com/static/img/coins/64x64/5426.png", price: 123.45 },
    { symbol: "DOGE", number: 4, percentChange: -1.3, color: "text-red-400", image: "https://s2.coinmarketcap.com/static/img/coins/64x64/74.png", price: 0.12 },
    { symbol: "SHIB", number: 5, percentChange: -2.7, color: "text-red-500", image: "https://s2.coinmarketcap.com/static/img/coins/64x64/5994.png", price: 0.00002 },
    { symbol: "ADA", number: 6, percentChange: 0.5, color: "text-green-400", image: "https://s2.coinmarketcap.com/static/img/coins/64x64/2010.png", price: 0.45 },
    { symbol: "DOT", number: 7, percentChange: -0.8, color: "text-red-400", image: "https://s2.coinmarketcap.com/static/img/coins/64x64/6636.png", price: 7.89 },
    { symbol: "AVAX", number: 8, percentChange: 3.2, color: "text-green-500", image: "https://s2.coinmarketcap.com/static/img/coins/64x64/5805.png", price: 34.56 },
    { symbol: "MATIC", number: 9, percentChange: 1.1, color: "text-green-400", image: "https://s2.coinmarketcap.com/static/img/coins/64x64/3890.png", price: 0.78 },
    { symbol: "LINK", number: 10, percentChange: 4.3, color: "text-green-500", image: "https://s2.coinmarketcap.com/static/img/coins/64x64/1975.png", price: 15.67 },
  ];

  // Set displayCoins after mount to avoid SSR/CSR mismatch
  useEffect(() => {
    if (trendingCoins.length > 0) {
      setDisplayCoins(trendingCoins);
    } else {
      // Try to load from localStorage if available
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('hotCoinsData');
        if (cached) {
          setDisplayCoins(JSON.parse(cached));
          return;
        }
      }
      setDisplayCoins(fallbackCoins);
    }
  }, [trendingCoins]);

  return (
    <div className="flex justify-center items-center w-6/12 mx-auto">
      <div
        className="bg-[rgba(243,144,236,0.21)] rounded-2xl text-xs font-extrabold shadow-[0_8px_32px_rgba(0,0,0,0.1)] flex items-center gap-1 w-fit mx-auto overflow-hidden border border-white/30 backdrop-blur-[12px] transition-all duration-300 hover:shadow-[0_8px_32px_rgba(182,113,255,0.15)]"
      >
        {/* Add coin logo/image display to the CoinDisplay interface */}

        {/* Hot Coins Badge - Only left side rounded */}
        <Badge variant="outline" className="flex items-center bg-black gap-1 px-4 py-3 rounded-l-2xl rounded-tr-none rounded-br-none z-10 text-white">
          <Icon icon="lucide:flame" className="text-white" />
          <span className="text-md font-semibold whitespace-nowrap">Hot Coins</span>
        </Badge>

        {/* Coins List with Infinite Scroll Animation */}
        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto whitespace-nowrap px-4 py-3 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* Display coins twice to create seamless infinite scroll effect */}
          {[...displayCoins, ...displayCoins].map((coin, index) => (
            <span
              key={`${coin.symbol}-${index}-${index < displayCoins.length ? 'first' : 'second'}`}
              className={clsx("font-medium px-3 py-1.5 flex items-center bg-white/20 rounded-lg hover:bg-white/30 transition-all duration-300", coin.color)}
            >
              {coin.image && (
                <Image 
                  src={coin.image} 
                  alt={coin.symbol} 
                  width={16}
                  height={16}
                  className="mr-1.5 rounded-full" 
                />
              )}
              <span className="text-xs font-bold mr-1">#{coin.number}</span> {coin.symbol}
              <span className={clsx("ml-1.5 text-xs font-bold flex items-center", coin.color)}>
                {coin.percentChange > 0 ? (
                  <Icon icon="lucide:trending-up" className="mr-0.5" />
                ) : (
                  <Icon icon="lucide:trending-down" className="mr-0.5" />
                )}
                {Math.abs(coin.percentChange).toFixed(1)}%
              </span>
              {coin.price !== undefined && (
                <span className="ml-1.5 text-xs font-bold text-white bg-black/30 px-1.5 py-0.5 rounded">
                  ${coin.price < 0.01 ? coin.price.toFixed(6) : coin.price < 1 ? coin.price.toFixed(4) : coin.price < 1000 ? coin.price.toFixed(2) : coin.price.toLocaleString(undefined, {maximumFractionDigits: 2})}
                </span>
              )}
            </span>
          ))}
        </div>

      </div>
    </div>
  );
}