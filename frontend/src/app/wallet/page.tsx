"use client";

import React, { useState, useEffect } from 'react';
import { Card, Tooltip } from "@heroui/react";
import { Icon } from "@iconify/react";
import Image from 'next/image';
import { ConnectWalletModal } from "@/components/wallet/ConnectWalletModal";
import api from '@/lib/apiUtils';
import { toast, ToastPosition } from 'react-hot-toast';

// Add toast configuration
const TOAST_CONFIG = {
  duration: 1000, // 1 second
  position: 'top-right' as ToastPosition,
};

interface Token {
  name: string;
  symbol: string;
  mintAddress: string;
  amount: number;
  decimals: number;
  price: number;
  value: number;
  logo: string | null;
  address: string;
}

interface WalletInfo {
  type: string;
  data?: {
    address: string;
  };
}

interface ApiResponse {
  success: boolean;
  portfolio?: Token[];
  data?: Token[];
  message?: string;
}

export default function WalletPage() {
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [portfolio, setPortfolio] = useState<Token[]>([]);
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [searchAddress, setSearchAddress] = useState<string>("");
  const [hasFetchedPortfolio, setHasFetchedPortfolio] = useState(false);

  // Load portfolio from localStorage on component mount
  useEffect(() => {
    const savedPortfolio = localStorage.getItem('walletPortfolio');
    if (savedPortfolio) {
      try {
        const parsedPortfolio = JSON.parse(savedPortfolio) as Token[];
        setPortfolio(parsedPortfolio);
      } catch (error) {
        console.error('Error parsing saved portfolio:', error);
        localStorage.removeItem('walletPortfolio');
      }
    }
  }, []);

  // Listen for wallet connection changes
  useEffect(() => {
    const handleWalletChange = () => {
      const storedWalletInfo = localStorage.getItem('connectedWalletInfo');
      if (storedWalletInfo) {
        try {
          const walletInfo = JSON.parse(storedWalletInfo) as WalletInfo;
          if (walletInfo && walletInfo.type === "wallet" && walletInfo.data?.address) {
            // Only set wallet address if no search address is present
            if (!searchAddress) {
              setWalletAddress(walletInfo.data.address);
              // Reset hasFetchedPortfolio to trigger a new fetch
              setHasFetchedPortfolio(false);
            }
          }
        } catch (error) {
          console.error("Error parsing wallet info:", error);
        }
      } else {
        // Only reset wallet address if no search address is present
        if (!searchAddress) {
          setWalletAddress("");
          setHasFetchedPortfolio(false);
        }
      }
    };

    const handleWalletDisconnected = () => {
      // Only reset wallet address if no search address is present
      if (!searchAddress) {
        setWalletAddress("");
        setHasFetchedPortfolio(false);
      }
    };

    // Initial check
    handleWalletChange();

    // Add event listeners
    window.addEventListener('storage', handleWalletChange);
    window.addEventListener('walletConnected', handleWalletChange);
    window.addEventListener('walletDisconnected', handleWalletDisconnected);

    return () => {
      window.removeEventListener('storage', handleWalletChange);
      window.removeEventListener('walletConnected', handleWalletChange);
      window.removeEventListener('walletDisconnected', handleWalletDisconnected);
    };
  }, [searchAddress]); // Add searchAddress to dependency array

  // Fetch portfolio when wallet address changes
  useEffect(() => {
    if (!hasFetchedPortfolio && walletAddress) {
      fetchWalletPortfolio(walletAddress);
      setHasFetchedPortfolio(true);
    }
  }, [walletAddress, hasFetchedPortfolio]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchAddress) return;

    // Validate Solana address format
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(searchAddress)) {
      toast.error('Invalid Solana address format', TOAST_CONFIG);
      return;
    }

    try {
      await fetchWalletPortfolio(searchAddress);
      // Update wallet address to show the searched address
      setWalletAddress(searchAddress);
    } catch (error) {
      console.error('Error searching wallet:', error);
      toast.error('Failed to fetch wallet portfolio', TOAST_CONFIG);
    }
  };

  const fetchWalletPortfolio = async (address: string) => {
    if (!address) return;
    try {
      setIsLoadingPortfolio(true);
      console.log('Fetching portfolio for address:', address);
      const response = await api.get(`/wallet/portfolio/${address}`);
      console.log('Raw API Response:', response);

      if (response.data.success) {
        const apiData = response.data as ApiResponse;

        // Log the exact structure of the response
        console.log('Response data structure:', {
          success: apiData.success,
          hasPortfolio: !!apiData.portfolio,
          hasData: !!apiData.data,
          portfolioType: typeof apiData.portfolio,
          dataType: typeof apiData.data
        });

        // Get the portfolio data from either location
        const portfolioData = apiData.portfolio || apiData.data || [];
        console.log('Raw portfolio data:', portfolioData);

        // Validate each token has required fields
        const validPortfolio = portfolioData.map((token: Partial<Token>) => {
          const processedToken: Token = {
            name: token.name || 'Unknown Token',
            symbol: token.symbol || '',
            mintAddress: token.mintAddress || token.address || '',
            amount: Number(token.amount) || 0,
            decimals: Number(token.decimals) || 0,
            price: Number(token.price) || 0,
            value: Number(token.value) || 0,
            logo: token.logo || null,
            address: token.address || token.mintAddress || ''
          };
          console.log('Processed token:', processedToken);
          return processedToken;
        });

        console.log('Final processed portfolio:', validPortfolio);
        setPortfolio(validPortfolio);

        // Save to localStorage
        localStorage.setItem('walletPortfolio', JSON.stringify(validPortfolio));
      } else {
        console.log('API call failed:', response.data);
        setPortfolio([]);
        localStorage.removeItem('walletPortfolio');
        toast.error(response.data.message || 'Failed to fetch wallet portfolio', TOAST_CONFIG);
      }
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      setPortfolio([]);
      localStorage.removeItem('walletPortfolio');
      toast.error('Failed to fetch wallet portfolio', TOAST_CONFIG);
    } finally {
      setIsLoadingPortfolio(false);
    }
  };

  // Only show tokens with non-zero balance
  const filteredPortfolio = portfolio.filter(token => {
    const isValid = token.amount > 0;
    console.log('Token filter check:', {
      token,
      isValid,
      hasAmount: token.amount > 0
    });
    return isValid;
  });
  console.log('Final filtered portfolio:', filteredPortfolio);

  return (
    <div className="max-w-full md:max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Card className="shadow-lg rounded-lg overflow-hidden text-black border border-shadow-lg p-6 bg-[#181c1f]">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">Wallet</h1>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-6 w-full">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
              placeholder="Enter Solana wallet address to search"
              className="flex-1 px-4 py-2 rounded-lg bg-[#1a1a1a] text-white border border-[#2a2a2a] focus:outline-none focus:border-[#B671FF] w-full"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-gradient-to-r from-[#32CD32] via-[#7CFC00] to-[#90EE90] text-black rounded-lg font-medium hover:opacity-90 transition-opacity w-full sm:w-auto"
            >
              Search
            </button>
          </div>
        </form>


        <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-[#1a1a1a] px-3 py-2 rounded-lg border border-[#2a2a2a] shadow-lg mb-6 w-full max-w-full overflow-hidden">
          <div className="flex items-center gap-2">
            <Icon icon="lucide:wallet" className="text-[#32CD32] text-base sm:text-lg" />
            <span className="text-white font-medium truncate max-w-[200px] sm:max-w-[250px]">
              {walletAddress ? walletAddress : "No wallet connected"}
            </span>
          </div>

          {walletAddress && (
            <div className="flex items-center gap-2">
              <Tooltip content="Copy to clipboard" className="bg-black text-white px-2 py-1 rounded">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(walletAddress);
                    toast.success('Wallet address copied to clipboard!', TOAST_CONFIG);
                  }}
                  className="text-gray-400 hover:text-[#B671FF] transition-colors"
                >
                  <Icon icon="lucide:copy" className="text-sm" />
                </button>
              </Tooltip>
              <Icon icon="lucide:check-circle" className="text-green-500 text-sm" />
            </div>
          )}
        </div>

        {!walletAddress ? (
          <div className="text-center py-8 text-white">Connect your wallet to view your portfolio.</div>
        ) : isLoadingPortfolio ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-400">Loading portfolio...</p>
          </div>
        ) : filteredPortfolio.length === 0 ? (
          <div className="text-center py-8 text-white">No tokens found in this wallet.</div>
        ) : (
          <>
            <div className="overflow-x-auto w-full">
              <table className="min-w-[700px] divide-y divide-gray-700">
                <thead>
                  <tr className="bg-[#23272a]">
                    <th className="px-4 py-2 text-left text-xs font-bold text-white uppercase tracking-wider">Asset</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-white uppercase tracking-wider">Address</th>
                    <th className="px-4 py-2 text-right text-xs font-bold text-white uppercase tracking-wider">Balance</th>
                    <th className="px-4 py-2 text-right text-xs font-bold text-white uppercase tracking-wider">Price</th>
                    <th className="px-4 py-2 text-right text-xs font-bold text-white uppercase tracking-wider">Value</th>
                  </tr>
                </thead>
                <tbody className="bg-[#181c1f] divide-y divide-gray-800">
                  {filteredPortfolio.map((token, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3 whitespace-nowrap align-middle">
                        <div className="inline-flex items-center gap-2">
                          {token.logo ? (
                            <Image
                              src={token.logo}
                              alt={token.symbol}
                              width={28}
                              height={28}
                              className="rounded-full border border-gray-700"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white font-bold">
                              {token.symbol ? token.symbol[0] : token.address[0]}
                            </div>
                          )}
                          <span className="font-semibold text-white truncate max-w-[120px]">{token.symbol || token.address}</span>
                          {token.symbol && token.symbol !== token.address && (
                            <span className="text-xs text-gray-400">({token.address})</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap align-middle text-xs text-gray-400 font-mono">
                        <span title={token.address} className="truncate block max-w-[100px] align-middle">{token.address}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(token.address);
                            toast.success("Address copied!", TOAST_CONFIG);
                          }}
                          className="ml-2 text-gray-400 hover:text-[#B671FF] transition-colors align-middle"
                          title="Copy address"
                        >
                          <Icon icon="lucide:copy" className="text-base" />
                        </button>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap align-middle text-right text-white font-mono">
                        {typeof token.amount === "number" ? token.amount.toLocaleString() : "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap align-middle text-right text-white font-mono">
                        {typeof token.price === "number" ? `$${token.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}` : "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap align-middle text-right text-white font-mono">
                        {typeof token.value === "number" ? `$${token.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
      <ConnectWalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        isFromUserProfile={false}
        connectedWalletInfo={null}
      />
    </div>
  );
}