'use client';

import React, { useState, useEffect, useRef } from 'react';
import { fetchTrendingSolanaCoins, SolanaTrendingCoin, formatMarketCap, formatPrice, formatVolume, formatPriceChange } from '@/lib/solanaTrendingApi';
import { Icon } from '@iconify/react';

export function SolanaTrendingSection() {
  const [trendingCoins, setTrendingCoins] = useState<SolanaTrendingCoin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number>(30000); // 30 seconds by default
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadRef = useRef<boolean>(true);

  const fetchCoins = async () => {
    try {
      // Always fetch fresh data from API first
      const coins = await fetchTrendingSolanaCoins();
      
      // Save to localStorage for future error recovery only
      localStorage.setItem('solanaTrendingData', JSON.stringify(coins));
      
      setTrendingCoins(coins);
      initialLoadRef.current = false;
      setError(null);
    } catch (err) {
      console.error('Failed to fetch trending Solana coins:', err);
      setError('Failed to load trending Solana coins');
      
      // Only use cached data if there's an API error
      const cachedData = localStorage.getItem('solanaTrendingData');
      if (cachedData) {
        setTrendingCoins(JSON.parse(cachedData));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchCoins();

    // Set up periodic refresh
    refreshTimerRef.current = setInterval(fetchCoins, refreshInterval);

    return () => {
      // Clean up interval on component unmount
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [refreshInterval]);

  // Truncate long names
  const truncateName = (name: string, maxLength: number = 20) => {
    return name.length > maxLength ? name.substring(0, maxLength) + '...' : name;
  };

  // Get short address for display
  const getShortAddress = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
  };

  return (
    <div className="max-w-full text-xl font-medium bg-white rounded-lg space-y-2 p-3 shadow-none md:shadow-[0px_4px_15px_rgba(128,128,128,0.4)]">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <Icon icon="cryptocurrency:sol" className="text-xl" />
          <h3 className="text-lg font-bold">Trending Solana Coins</h3>
        </div>
        <button
          onClick={() => fetchCoins()}
          className="text-xs text-blue-500 hover:underline flex items-center gap-1"
        >
          <Icon icon="mdi:refresh" className="text-sm" />
          Refresh
        </button>
      </div>

      {isLoading && (
        <div className="flex justify-center items-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
        </div>
      )}

      {error && (
        <div className="text-red-500 text-sm p-2">{error}</div>
      )}

      {!isLoading && !error && trendingCoins.length === 0 && (
        <div className="text-gray-500 text-sm p-2">No trending Solana coins available</div>
      )}

      <div className="max-h-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        {!isLoading && trendingCoins.map((coin, index) => (
          <div
            key={coin.mintAddress}
            className="p-2 rounded-lg bg-[#f3f3f3] transition duration-200 hover:bg-gray-200 cursor-pointer mb-2"
            onClick={() => window.open(`https://solscan.io/token/${coin.mintAddress}`, '_blank')}
          >
            <div className="flex items-center">
              <div className="mr-3 text-center">
                <span className="text-xs font-bold">{index + 1}</span>
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden text-xs font-bold">
                  {coin.symbol.substring(0, 2)}
                </div>
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <p className="font-medium text-sm">{coin.symbol}</p>
                  <p className="text-sm font-medium">
                    {formatPrice(coin.price)}
                  </p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-xs text-gray-500" title={coin.name}>{truncateName(coin.name)}</p>
                  <p className={`text-xs ${coin.priceChange24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatPriceChange(coin.priceChange24h)}
                  </p>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-xs text-gray-500">Address:</p>
                  <p className="text-xs text-gray-700">{getShortAddress(coin.mintAddress)}</p>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-xs text-gray-500">Market Cap:</p>
                  <p className="text-xs text-gray-700">{formatMarketCap(coin.marketcap)}</p>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-xs text-gray-500">24h Volume:</p>
                  <p className="text-xs text-gray-700">{formatVolume(coin.volume24h)}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}