'use client';

import React, { useState, useEffect, useRef } from 'react';
import { fetchGraduatedTokens, TrendingCoin } from '@/lib/coinMarketCapApi';
import { Icon } from '@iconify/react';
import { subscribeToCryptoUpdates } from '@/lib/cryptoWebSocket';

export function TrendingSection() {
  const [graduatedTokens, setGraduatedTokens] = useState<TrendingCoin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [priceChanges, setPriceChanges] = useState<Record<number, 'up' | 'down' | null>>({});
  const previousPrices = useRef<Record<number, number>>({});
  const initialLoadRef = useRef<boolean>(true);

  // Function to fetch graduated tokens
  const getGraduatedTokens = async () => {
    try {
      setIsLoading(true);
      // Fetch graduated tokens
      const tokens = await fetchGraduatedTokens();
      
      // Store initial prices for comparison
      const initialPrices: Record<number, number> = {};
      tokens.forEach(token => {
        initialPrices[token.id] = token.price;
      });
      previousPrices.current = initialPrices;
      
      // Save to localStorage for future error recovery only
      localStorage.setItem('graduatedTokensData', JSON.stringify(tokens));
      
      setGraduatedTokens(tokens);
      initialLoadRef.current = false;
      setError(null);
    } catch (err) {
      console.error('Failed to fetch graduated tokens:', err);
      setError('Failed to load graduated tokens');
      
      // If error and we have cached data, use it
      const cachedData = localStorage.getItem('graduatedTokensData');
      if (cachedData) {
        setGraduatedTokens(JSON.parse(cachedData));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch graduated tokens when the component mounts
  useEffect(() => {
    getGraduatedTokens();
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToCryptoUpdates((updatedCoins) => {
      if (updatedCoins && updatedCoins.length > 0) {
        // Filter for graduated tokens only
        const updatedGraduatedTokens = updatedCoins.filter(coin => coin.isGraduated);
        
        if (updatedGraduatedTokens.length > 0) {
          // Calculate price changes
          const changes: Record<number, 'up' | 'down' | null> = {};
          
          updatedGraduatedTokens.forEach(token => {
            const previousPrice = previousPrices.current[token.id];
            if (previousPrice) {
              if (token.price > previousPrice) {
                changes[token.id] = 'up';
              } else if (token.price < previousPrice) {
                changes[token.id] = 'down';
              }
            }
            // Update previous prices for next comparison
            previousPrices.current[token.id] = token.price;
          });
          
          setPriceChanges(changes);
          setGraduatedTokens(updatedGraduatedTokens);
          
          // Reset price change indicators after 2 seconds
          setTimeout(() => {
            setPriceChanges({});
          }, 2000);
        }
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, []);

  // Format price with appropriate precision
  const formatPrice = (price: number): string => {
    if (price < 0.01) return '$' + price.toFixed(6);
    if (price < 1) return '$' + price.toFixed(4);
    if (price < 10) return '$' + price.toFixed(2);
    if (price < 1000) return '$' + price.toFixed(2);
    return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 2 });
  };
  
  // Format market cap in millions/billions
  const formatMarketCap = (marketCap: number): string => {
    if (marketCap >= 1000000000) {
      return '$' + (marketCap / 1000000000).toFixed(2) + 'B';
    } else if (marketCap >= 1000000) {
      return '$' + (marketCap / 1000000).toFixed(2) + 'M';
    } else {
      return '$' + marketCap.toLocaleString('en-US', { maximumFractionDigits: 0 });
    }
  };

  // Format volume
  const formatVolume = (volume: number): string => {
    if (volume >= 1000000000) {
      return '$' + (volume / 1000000000).toFixed(2) + 'B';
    } else if (volume >= 1000000) {
      return '$' + (volume / 1000000).toFixed(2) + 'M';
    } else if (volume >= 1000) {
      return '$' + (volume / 1000).toFixed(2) + 'K';
    } else {
      return '$' + volume.toLocaleString('en-US', { maximumFractionDigits: 0 });
    }
  };

  // Format percent change with color
  const renderPercentChange = (percentChange: number) => {
    const isPositive = percentChange >= 0;
    const color = isPositive ? 'text-green-500' : 'text-red-500';
    const icon = isPositive ? 'lucide:trending-up' : 'lucide:trending-down';
    
    return (
      <div className={`flex items-center ${color}`}>
        <Icon icon={icon} className="mr-1 text-xs" />
        <span>{Math.abs(percentChange).toFixed(2)}%</span>
      </div>
    );
  };

  // Format time since graduation
  const formatTimeSinceGraduation = (hours: number): string => {
    return `${hours}h`;
  };

  return (
    <div className="max-w-full text-xl font-medium rounded-lg space-y-2 p-3 bg-[rgba(243,144,236,0.21)] border border-white shadow-[0_4px_30px_rgba(0,0,0,0.1)] backdrop-blur-[11.1px]">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center">
          <h3 className="text-lg font-bold">Graduated Tokens</h3>
        </div>
        <div className="flex items-center gap-2">
          <a 
            href="https://coinmarketcap.com/dexscan/meme/pump.fun"
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-blue-500 hover:underline"
          >
            View All
          </a>
        </div>
      </div>
      
      {isLoading && (
        <div className="flex justify-center items-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
        </div>
      )}
      
      {error && (
        <div className="text-red-500 text-sm p-2">{error}</div>
      )}
      
      {!isLoading && !error && graduatedTokens.length === 0 && (
        <div className="text-gray-500 text-sm p-2">No graduated tokens available</div>
      )}
      
      <div className="max-h-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        {!isLoading && graduatedTokens.map((token, index) => (
          <div 
            key={token.id} 
            className="p-2 rounded-lg bg-[#f3f3f3] transition duration-200 hover:bg-gray-200 cursor-pointer mb-2"
            onClick={() => window.open(`https://coinmarketcap.com/dexscan/meme/pump.fun`, '_blank')}
          >
            <div className="flex items-center">
              <div className="mr-3 text-center">
                <span className="text-xs font-bold">{index + 1}</span>
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden text-xs font-bold">
                  {token.image ? (
                    <img 
                      src={token.image} 
                      alt={`${token.name} logo`} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to symbol if image fails to load
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement!.innerText = token.symbol.substring(0, 2);
                      }}
                    />
                  ) : (
                    token.symbol.substring(0, 2)
                  )}
                </div>
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <p className="font-medium text-sm">{token.symbol}</p>
                  <p className={`text-sm font-medium ${priceChanges[token.id] === 'up' ? 'text-green-500' : priceChanges[token.id] === 'down' ? 'text-red-500' : ''}`}>
                    {formatPrice(token.price)}
                  </p>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <p className="text-xs text-gray-500">{token.name}</p>
                    <span className="ml-1 px-1 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-medium rounded">
                      {token.graduationTime ? formatTimeSinceGraduation(token.graduationTime) : '1h'}
                    </span>
                  </div>
                  <div>
                    {renderPercentChange(token.percent_change_24h)}
                  </div>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-xs text-gray-500">Volume:</p>
                  <p className="text-xs text-gray-700">{formatVolume(token.volume_24h)}</p>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-xs text-gray-500">Market Cap:</p>
                  <p className="text-xs text-gray-700">{formatMarketCap(token.market_cap)}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
