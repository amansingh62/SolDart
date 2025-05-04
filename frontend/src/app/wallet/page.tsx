"use client";

import React, { useState, useEffect } from 'react';
import { Card, Button, Tooltip } from "@heroui/react";
import { Icon } from "@iconify/react";
import { ConnectWalletModal } from "@/components/wallet/ConnectWalletModal";
import api from '@/lib/apiUtils';
import { toast } from 'react-hot-toast';

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

const WALLET_ADDRESS = "oQPnhXAbLbMuKHESaGrbXT17CyvWCpLyERSJA9HCYd7";

export default function WalletPage() {
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [portfolio, setPortfolio] = useState<Token[]>([]);
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>("");

  // Listen for wallet connection changes
  useEffect(() => {
    function getConnectedWallet() {
      const storedWalletInfo = localStorage.getItem('connectedWalletInfo');
      if (storedWalletInfo) {
        try {
          const walletInfo = JSON.parse(storedWalletInfo);
          if (walletInfo && walletInfo.type === "wallet" && walletInfo.data?.address) {
            return walletInfo.data.address;
          }
        } catch {}
      }
      return "";
    }

    function updateWallet() {
      const address = getConnectedWallet();
      setWalletAddress(address);
      if (address) fetchWalletPortfolio(address);
      else setPortfolio([]);
    }

    updateWallet();
    window.addEventListener('storage', updateWallet);
    window.addEventListener('walletConnected', updateWallet);
    window.addEventListener('walletDisconnected', updateWallet);
    return () => {
      window.removeEventListener('storage', updateWallet);
      window.removeEventListener('walletConnected', updateWallet);
      window.removeEventListener('walletDisconnected', updateWallet);
    };
  }, []);

  const fetchWalletPortfolio = async (address: string) => {
    if (!address) return;
    try {
      setIsLoadingPortfolio(true);
      const response = await api.get(`/wallet/portfolio/${address}`);
      if (response.data.success) {
        setPortfolio(response.data.portfolio);
      } else {
        setPortfolio([]);
        toast.error('Failed to fetch wallet portfolio');
      }
    } catch (error) {
      setPortfolio([]);
      toast.error('Failed to fetch wallet portfolio');
    } finally {
      setIsLoadingPortfolio(false);
    }
  };

  function shortenAddress(address: string) {
    if (!address) return "";
    return address.slice(0, 4) + "..." + address.slice(-4);
  }

  // Only show tokens with a real name
  const filteredPortfolio = portfolio.filter(token => token.name && token.name !== 'Unknown Token');

  return (
    <div className="max-w-full md:max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Card className="shadow-lg rounded-lg overflow-hidden text-black border border-shadow-lg p-6 bg-[#181c1f]">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">Wallet</h1>
        </div>
        <div className="flex items-center gap-2 bg-[#1a1a1a] px-3 py-2 rounded-lg border border-[#2a2a2a] shadow-lg mb-6">
          <Icon icon="lucide:wallet" className="text-[#B671FF]" />
          <span className="text-white font-medium">{walletAddress ? shortenAddress(walletAddress) : "No wallet connected"}</span>
          {walletAddress && (
            <Tooltip content="Copy to clipboard" className="bg-black text-white px-2 py-1 rounded">
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(walletAddress);
                  toast.success('Wallet address copied to clipboard!');
                }}
                className="text-gray-400 hover:text-[#B671FF] transition-colors"
              >
                <Icon icon="lucide:copy" className="text-sm" />
              </button>
            </Tooltip>
          )}
          {walletAddress && <Icon icon="lucide:check-circle" className="text-green-500 text-sm" />}
        </div>
        {!walletAddress ? (
          <div className="text-center py-8 text-white">Connect your wallet to view your portfolio.</div>
        ) : isLoadingPortfolio ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-400">Loading portfolio...</p>
          </div>
        ) : filteredPortfolio.length === 0 ? (
          <div className="text-center py-8 text-white">No known tokens found in this wallet.</div>
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
                            <img src={token.logo} alt={token.symbol} className="w-7 h-7 rounded-full border border-gray-700" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white font-bold">
                              {(token.symbol && token.symbol !== token.address) ? token.symbol[0] : token.address[0]}
                            </div>
                          )}
                          <span className="font-semibold text-white truncate max-w-[120px]">{token.name || "Unknown Token"}</span>
                          {token.symbol && token.symbol !== token.address && (
                            <span className="text-xs text-gray-400">({token.symbol})</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap align-middle text-xs text-gray-400 font-mono">
                        <span title={token.address} className="truncate block max-w-[100px] align-middle">{shortenAddress(token.address)}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(token.address);
                            toast.success("Address copied!");
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
      />
    </div>
  );
} 