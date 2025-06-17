"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { Modal, ModalContent, ModalHeader, ModalBody, Button } from "@heroui/react";
import { Icon } from "@iconify/react";
import { connectWallet, disconnectWallet, checkWalletInstalled } from "@/lib/walletUtils";
import { toast } from "react-hot-toast";

type Wallet = "phantom" | "solflare" | "backpack";

interface ConnectWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect?: (walletAddress: string) => void;
  onDisconnect?: () => void;
  connectedWalletInfo: {
    type: string;
    address?: string;
    data?: {
      blockchain?: string;
    };
    emoji?: string;
  } | null;
  isFromUserProfile: boolean;
}

// Update the API URL to use the proxy
const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export function ConnectWalletModal({
  isOpen,
  onClose,
  onConnect,
  onDisconnect,
  connectedWalletInfo
}: ConnectWalletModalProps) {
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);

  useEffect(() => {
    // Check URL query parameters for wallet info (from Google OAuth redirect)
    if (isOpen && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const walletConnected = urlParams.get('walletConnected');
      const walletAddress = urlParams.get('walletAddress');

      if (walletConnected === 'true' && walletAddress) {
        // Set the wallet state
        setConnectedWallet(walletAddress);

        // Notify parent component
        onConnect?.(walletAddress);

        // Clear the URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [isOpen, onConnect]);

  // Update the useEffect that handles wallet state changes
  useEffect(() => {
    // Only sync with parent component's connectedWalletInfo
    if (connectedWalletInfo?.address) {
      setConnectedWallet(connectedWalletInfo.address);
    } else {
      setConnectedWallet(null);
    }
  }, [connectedWalletInfo]);

  const blockchains = [
    { id: "phantom", name: "Phantom", icon: "cryptocurrency:phantom" },
    { id: "solflare", name: "Solflare", icon: "cryptocurrency:solflare" },
    { id: "backpack", name: "Backpack", icon: "cryptocurrency:backpack" }
  ];

  const handleWalletConnect = async (walletType: Wallet) => {
    try {
      const isInstalled = checkWalletInstalled(walletType);
      if (!isInstalled) {
        const walletUrls: Record<Wallet, string> = {
          phantom: "https://phantom.app/",
          solflare: "https://solflare.com/",
          backpack: "https://www.backpack.app/"
        };
        window.open(walletUrls[walletType], "_blank");
        return;
      }

      // Disconnect current wallet if any
      if (connectedWalletInfo) {
        await disconnectWallet(connectedWalletInfo.type);
        onDisconnect?.();
      }

      // Connect new wallet
      const walletAddress = await connectWallet(walletType);
      if (walletAddress) {
        try {
          // First check if user is already authenticated
          const authResponse = await axios.get(API_URL + "/auth/user", { withCredentials: true });

          if (authResponse.data) {
            // User is authenticated, check if they already have a registered wallet
            if (authResponse.data.walletAddress) {
              // If they have a registered wallet, validate it matches
              if (authResponse.data.walletAddress !== walletAddress) {
                toast.error("Please connect with your registered wallet");
                // Instead of disconnecting, just return
                return;
              }
            }
            // If wallet matches or no wallet registered, proceed with connection
            await axios.put(`${API_URL}/users/profile`, { walletAddress }, { withCredentials: true });
            toast.success("Wallet connected successfully");
          } else {
            // User is not authenticated, create new wallet-first account
            const signupResponse = await axios.post(API_URL + "/auth/register", {
              username: walletAddress, // Use wallet address as temporary username
              name: walletAddress, // Use wallet address as temporary name
              email: `${walletAddress}@temp.com`, // Temporary email
              password: "", // Empty password for wallet-first users
              walletType,
              walletAddress
            }, { withCredentials: true });

            if (signupResponse.data.statusCode === 201) {
              // Store token in localStorage
              localStorage.setItem('token', signupResponse.data.data.token);
              toast.success("Wallet connected successfully");
            } else {
              throw new Error(signupResponse.data.message || "Failed to connect wallet");
            }
          }

          // Update local state and notify parent
          setConnectedWallet(walletAddress);
          onConnect?.(walletAddress);
          onClose();
        } catch (error) {
          console.error("Error in wallet connection flow:", error);
          const errorMessage = error instanceof Error ? error.message : "Failed to connect wallet";
          toast.error(errorMessage);
          // Disconnect wallet on error
          await disconnectWallet(walletType);
        }
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to connect wallet";
      toast.error(errorMessage);
    }
  };

  const handleDisconnect = async () => {
    try {
      // Clear wallet info from localStorage
      localStorage.removeItem('connectedWalletInfo');
      localStorage.removeItem('walletModalSource');

      // Reset all state variables
      setConnectedWallet(null);

      // Close the modal
      onClose();

      // Show success message
      toast.success("Wallet disconnected successfully");

      // Dispatch custom event for wallet disconnection
      window.dispatchEvent(new Event('walletDisconnected'));

      // Call onDisconnect to update parent component
      onDisconnect?.();
    } catch (error) {
      console.error("Error disconnecting wallet:", error);
      toast.error("Failed to disconnect wallet");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" placement="center" className="z-[100] modal">
      <ModalContent className="bg-gradient-to-br from-gray-900 to-black rounded-lg shadow-xl w-full max-w-md mx-auto p-4 sm:p-6 modal-content">
        {() => (
          <>
            <ModalHeader className="flex flex-col gap-1 text-center">
              <h3 className="text-xl font-bold text-white">
                {connectedWallet ? "Connected Wallet" : "Connect Wallet"}
              </h3>
            </ModalHeader>
            <ModalBody className="px-2 sm:px-4 py-4">
              {connectedWallet ? (
                <div className="space-y-4">
                  <div className="bg-gray-800 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{connectedWalletInfo?.emoji}</span>
                      <span className="text-white">
                        {connectedWallet.substring(0, 4)}...{connectedWallet.substring(connectedWallet.length - 4)}
                      </span>
                    </div>
                  </div>
                  <Button
                    className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-lg"
                    onPress={handleDisconnect}
                  >
                    Disconnect Wallet
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {blockchains.map((chain) => (
                    <Button
                      key={chain.id}
                      className="w-full bg-gray-800 hover:bg-gray-700 text-white px-4 py-3 rounded-lg flex items-center justify-between"
                      onPress={() => handleWalletConnect(chain.id as Wallet)}
                    >
                      <div className="flex items-center gap-3">
                        <Icon icon={chain.icon} className="text-2xl" />
                        <span>{chain.name}</span>
                      </div>
                      <Icon icon="mdi:chevron-right" className="text-xl" />
                    </Button>
                  ))}
                </div>
              )}
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}