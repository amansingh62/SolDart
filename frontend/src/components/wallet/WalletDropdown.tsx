import React, { useState } from 'react';
import { Icon } from "@iconify/react";
import { connectWallet, disconnectWallet, checkWalletInstalled } from "@/lib/walletUtils";
import { toast } from "react-hot-toast";

// Define a proper type for wallet data
interface WalletData {
  blockchain?: string;
  address?: string;
  [key: string]: unknown; // Allow additional properties if needed
}

interface WalletDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  connectedWallet: {
    type: "wallet" | "email";
    data: WalletData;
    emoji: string;
    address?: string;
  } | null;
  onConnect: (type: "wallet" | "email", data: WalletData) => void;
  onDisconnect: () => void;
}

export function WalletDropdown({ isOpen, onClose, connectedWallet, onConnect, onDisconnect }: WalletDropdownProps) {
  const [isConnecting, setIsConnecting] = useState(false);

  if (!isOpen) return null;

  const handleInstallPhantom = () => {
    window.open('https://phantom.app/', '_blank');
  };

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      
      // Check if Phantom is installed
      if (!checkWalletInstalled("phantom")) {
        // Show installation prompt
        if (window.confirm("Phantom wallet is not installed. Would you like to install it now?")) {
          handleInstallPhantom();
        }
        return;
      }

      // This will trigger the Phantom wallet UI popup
      const walletAddress = await connectWallet("phantom");
      
      if (walletAddress) {
        // Store wallet info in localStorage
        const walletInfo = {
          type: "wallet" as const,
          data: {
            blockchain: "phantom",
            address: walletAddress
          },
          emoji: "👻"
        };
        localStorage.setItem('connectedWalletInfo', JSON.stringify(walletInfo));

        // Update parent component
        onConnect("wallet", walletInfo.data);
        onClose();
      }
    } catch (error) {
      console.error("Error connecting to Phantom wallet:", error);
      toast.error(error instanceof Error ? error.message : "Failed to connect to Phantom wallet");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectWallet("phantom");
      // Remove wallet info from localStorage
      localStorage.removeItem('connectedWalletInfo');
      onDisconnect();
      onClose();
    } catch (error) {
      console.error("Error disconnecting from Phantom wallet:", error);
      toast.error("Failed to disconnect from Phantom wallet");
    }
  };

  return (
    <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg py-1 z-50 border border-gray-700">
      {connectedWallet ? (
        <>
          <div className="px-4 py-2 text-sm text-white border-b border-gray-700">
            <div className="flex items-center gap-2">
              <span>{connectedWallet.emoji}</span>
              <span className="truncate">
                {connectedWallet.address?.substring(0, 4)}...{connectedWallet.address?.substring(connectedWallet.address.length - 4)}
              </span>
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700"
          >
            <div className="flex items-center gap-2">
              <Icon icon="mdi:logout" />
              <span>Disconnect</span>
            </div>
          </button>
        </>
      ) : (
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700 disabled:opacity-50"
        >
          <div className="flex items-center gap-2">
            <Icon icon="cryptocurrency:phantom" />
            <span>{isConnecting ? "Connecting..." : "Connect Phantom"}</span>
          </div>
        </button>
      )}
    </div>
  );
}