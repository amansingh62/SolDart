'use client';

import { useEffect, useState, useRef } from 'react';
import { Icon } from '@iconify/react';

interface Token {
  name: string;
  symbol: string;
  address: string;
  logo: string;
  liquidity: number;
  fullyDilutedValuation: number;
}

export default function SolanaTrendingSection() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const previousLiquidity = useRef<Record<string, number>>({});
  const [liquidityChanges, setLiquidityChanges] = useState<Record<string, 'up' | 'down' | null>>({});
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchTokens = async (isFirstLoad = false) => {
    try {
      if (isFirstLoad) {
        setIsLoading(true);
      } else {
        setIsUpdating(true);
      }
      
      const response = await fetch('/api/tokens');
      const data = await response.json();
  
      // Track liquidity changes
      const changes: Record<string, 'up' | 'down' | null> = {};
      data.forEach((token: Token) => {
        const previous = previousLiquidity.current[token.address];
        if (previous !== undefined) {
          if (token.liquidity > previous) changes[token.address] = 'up';
          else if (token.liquidity < previous) changes[token.address] = 'down';
        }
        previousLiquidity.current[token.address] = token.liquidity;
      });
  
      setLiquidityChanges(changes);
      setTokens(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching tokens:', err);
      setError('Failed to load tokens');
    } finally {
      if (isFirstLoad) setIsLoading(false);
      setIsUpdating(false);
    }
  };
  
  useEffect(() => {
    fetchTokens(true); // first load, show spinner
  
    const interval = setInterval(() => {
      fetchTokens(); // future updates, no spinner but track update state
    }, 5000);
  
    return () => clearInterval(interval);
  }, []);
  
  const formatNumber = (num: number) => {
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + 'B';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(2) + 'K';
    return num.toFixed(2);
  };

  return (
    <div className="max-w-full text-xl font-medium rounded-lg space-y-2 p-3 bg-[rgba(243,144,236,0.21)] border border-white shadow-[0_4px_30px_rgba(0,0,0,0.1)] backdrop-blur-[11.1px]">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-lg font-bold">Graduated Tokens</h3>
        <div className="flex items-center gap-2">
          {isUpdating && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
          )}
          
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

      {!isLoading && !error && tokens.length === 0 && (
        <div className="text-gray-500 text-sm p-2">No tokens available</div>
      )}

      <div className="max-h-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        {!isLoading && tokens.map((token, idx) => (
          <div
            key={token.address} // Using address as key instead of index for better React reconciliation
            className="p-2 rounded-lg bg-[#f3f3f3] transition duration-200 hover:bg-gray-200 cursor-pointer mb-2"
            onClick={() => window.open(`https://dexscreener.com/solana/${token.address}`, '_blank')}
          >
            <div className="flex items-center">
              <div className="mr-3 text-center">
                <span className="text-xs font-bold">{idx + 1}</span>
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden text-xs font-bold">
                  {token.logo ? (
                    <img
                      src={token.logo}
                      alt={`${token.name} logo`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
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
                  <p className={`text-sm font-medium ${
                    liquidityChanges[token.address] === 'up' ? 'text-green-500' :
                    liquidityChanges[token.address] === 'down' ? 'text-red-500' : ''
                  }`}>
                    {token.liquidity ? `$${formatNumber(token.liquidity)}` : 'N/A'}
                  </p>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <p className="text-xs text-gray-500">{token.name}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    FDV:
                    <span className="text-gray-700">{token.fullyDilutedValuation ? `$${formatNumber(token.fullyDilutedValuation)}` : 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}