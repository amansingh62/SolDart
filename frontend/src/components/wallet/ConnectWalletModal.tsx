"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { Modal, ModalContent, ModalHeader, ModalBody, Button, Input } from "@heroui/react";
import { Icon } from "@iconify/react";
import { connectWallet, disconnectWallet, checkWalletInstalled, connectWalletToAccount, shortenWalletAddress } from "@/lib/walletUtils";
import { toast } from "react-hot-toast";
import api from "@/lib/apiUtils";

type Wallet = "phantom" | "solflare" | "backpack";

interface ConnectWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  isFromUserProfile?: boolean;
  isFromSignIn?: boolean;
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
}

// Add wallet interface
interface WalletInfo {
  type: string;
  address: string;
}

// Update the API URL to use the proxy
const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export function ConnectWalletModal({ 
  isOpen, 
  onClose, 
  isFromUserProfile = false,
  isFromSignIn = false,
  onConnect,
  onDisconnect,
  connectedWalletInfo 
}: ConnectWalletModalProps) {
  // Default to wallet tab for sign-in experience
  const [activeTab, setActiveTab] = useState<"wallet" | "email">("wallet");
  const [isSignUp, setIsSignUp] = useState(false);
  const [selectedChain, setSelectedChain] = useState<string | null | undefined>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | React.ReactNode>("");
  const [token, setToken] = useState<string | null>(null);
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);
  // Add userWallet state
  const [userWallet, setUserWallet] = useState<WalletInfo | null>(null);


  useEffect(() => {
    // Check URL query parameters for wallet info (from Google OAuth redirect)
    if (isOpen && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const walletConnected = urlParams.get('walletConnected');
      const walletType = urlParams.get('walletType');
      const walletAddress = urlParams.get('walletAddress');

      if (walletConnected === 'true' && walletType && walletAddress) {
        // Set the wallet state
        setSelectedChain(walletType);
        setConnectedWallet(walletAddress);
        setActiveTab('wallet');

        // Notify parent component
        onConnect?.(walletAddress);

        // Clear the URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [isOpen, onConnect]);

  // Sync state with parent component's connectedWalletInfo
  useEffect(() => {
    if (connectedWalletInfo?.address) {
      setConnectedWallet(connectedWalletInfo.address);
      setSelectedChain(connectedWalletInfo.type === "wallet" ? connectedWalletInfo.data?.blockchain : null);
    }

    // Determine if this modal is being opened from user profile or sign-in button
    const checkModalSource = async () => {
      if (!isOpen) return;

      // Check if the modal was opened from user profile using localStorage flag
      const walletModalSource = typeof window !== 'undefined' ? localStorage.getItem("walletModalSource") : null;
      if (walletModalSource === "userProfile") {
        setActiveTab("wallet"); // Default to wallet tab when opened from user profile
        return;
      }

      // Check if the modal was opened from sign-in button
      if (walletModalSource === "signIn") {
        setActiveTab("email"); // Force email tab when opened from sign-in button
        return;
      }

      try {
        const response = await axios.get(`${API_URL}/auth/user`, { withCredentials: true });
        if (response.data) {
          setActiveTab("wallet"); // Default to wallet tab when opened from user profile
        } else {
          setActiveTab("email"); // Default to email tab for initial sign in
        }
      } catch (error) {
        // Not authenticated, so not from user profile
        setActiveTab("email");
      }
    };

    checkModalSource();
  }, [isOpen, connectedWalletInfo]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setError("");
    }
  }, [isOpen]);

  // Update the useEffect that handles wallet state changes
  useEffect(() => {
    // Only sync with parent component's connectedWalletInfo
    if (connectedWalletInfo?.address) {
      setConnectedWallet(connectedWalletInfo.address);
      setSelectedChain(connectedWalletInfo.type || null);
    } else {
      setConnectedWallet(null);
      setSelectedChain(null);
    }
  }, [connectedWalletInfo]);

  const blockchains = [
    { id: "phantom", name: "Phantom", icon: "cryptocurrency:phantom" },
    { id: "solflare", name: "Solflare", icon: "cryptocurrency:solflare" },
    { id: "backpack", name: "Backpack", icon: "cryptocurrency:backpack" }
  ];

  const handleWalletConnect = async (walletType: Wallet) => {
    try {
      setError("");
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
            await api.put("/users/profile", { walletAddress });
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
              setToken(signupResponse.data.data.token);
              toast.success("Wallet connected successfully");
            } else {
              throw new Error(signupResponse.data.message || "Failed to connect wallet");
            }
          }

          // Update local state and notify parent
          setConnectedWallet(walletAddress);
          setSelectedChain(walletType);
          onConnect?.(walletAddress);
          onClose();
        } catch (error: any) {
          console.error("Error in wallet connection flow:", error);
          toast.error(error.message || "Failed to connect wallet");
          // Disconnect wallet on error
          await disconnectWallet(walletType);
        }
      }
    } catch (error: any) {
      console.error("Error connecting wallet:", error);
      toast.error(error.message || "Failed to connect wallet");
    }
  };

  const handleEmailAuth = async (e: any) => {
    e?.preventDefault?.();
    setLoading(true);
    setError("");

    try {
      if (isSignUp) {
        console.log("Attempting signup with data:", { name, username, email, password });
        
        // First check if user exists with wallet address as username
        const checkUserResponse = await axios.get(`${API_URL}/auth/check-username/${username}`, {
          withCredentials: true
        });
        
        if (checkUserResponse.data.message === "Username is available") {
          // Regular email signup for new user
          const response = await axios.post(`${API_URL}/auth/register`, {
            name,
            username,
            email,
            password
          }, { 
            withCredentials: true,
            headers: {
              'Content-Type': 'application/json'
            }
          });

          console.log("Signup response:", response.data);

          if (response.data.statusCode === 201) {
            // Store token in localStorage
            localStorage.setItem('token', response.data.data.token);
            setToken(response.data.data.token);
            
            // Clear form fields
            setName("");
            setUsername("");
            setEmail("");
            setPassword("");
            setIsSignUp(false);
            
            toast.success(response.data.message || "Account created successfully");
            onClose();
            return;
          } else {
            throw new Error(response.data.message || "Registration failed");
          }
        } else {
          // User exists with wallet address, update with email details
          const updateResponse = await axios.put(`${API_URL}/auth/update-wallet-user`, {
            username,
            name,
            email,
            password
          }, {
            withCredentials: true,
            headers: {
              'Content-Type': 'application/json'
            }
          });

          if (updateResponse.data.success) {
            // Store token in localStorage
            localStorage.setItem('token', updateResponse.data.token);
            setToken(updateResponse.data.token);
            
            // Clear form fields
            setName("");
            setUsername("");
            setEmail("");
            setPassword("");
            setIsSignUp(false);
            
            toast.success("Account updated successfully");
            onClose();
            return;
          } else {
            throw new Error(updateResponse.data.message || "Failed to update account");
          }
        }
      } else {
        // Login logic
        console.log("Attempting login with data:", { email, password });
        
        const response = await axios.post(`${API_URL}/auth/login`, {
          email,
          password
        }, { 
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json'
          }
        });

        console.log("Login response:", response.data);

        if (response.data.success) {
          // Store token in localStorage
          localStorage.setItem('token', response.data.token);
          setToken(response.data.token);
          
          // Clear form fields
          setEmail("");
          setPassword("");
          
          toast.success("Logged in successfully");
          onClose();
          
          // Reload the page to update the UI state
          window.location.reload();
          return;
        } else {
          throw new Error(response.data.message || "Login failed");
        }
      }
    } catch (error: any) {
      // More robust error handling
      let errorMessage = "An error occurred during authentication";
      
      if (error.response) {
        errorMessage = error.response.data?.message || errorMessage;
      } else if (error.request) {
        errorMessage = "No response from server. Please try again.";
      } else {
        errorMessage = error.message || errorMessage;
      }

      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    setError(null);

    try {
      if (activeTab === "wallet" && selectedChain) {
        // Check if wallet extension is installed
        const isInstalled = checkWalletInstalled(selectedChain);

        if (!isInstalled) {
          const walletLinks = {
            phantom: "https://phantom.app/download",
            solflare: "https://solflare.com/download",
            backpack: "https://www.backpack.app/download"
          };
          
          setError(
            <div className="text-red-400 text-sm">
              {`${selectedChain} wallet is not installed. `}
              <a 
                href={walletLinks[selectedChain as keyof typeof walletLinks]} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#B671FF] hover:text-[#E282CA] underline font-medium"
              >
                Download {selectedChain} wallet
              </a>
            </div>
          );
          toast.error(`${selectedChain} wallet is not installed. Please install it first.`);
          setLoading(false);
          return;
        }

        // Connect wallet
        const walletAddress = await connectWallet(selectedChain);
        if (walletAddress) {
          setConnectedWallet(walletAddress);
          
          // Show success toast
          toast.success("Wallet connected successfully");

          // Pass the address to the parent component
          onConnect?.(walletAddress);

          // Dispatch custom event for wallet connection
          window.dispatchEvent(new Event('walletConnected'));

          // Close the modal
          onClose();
        }
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || "Something went wrong!";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      // Clear wallet info from localStorage
      localStorage.removeItem('connectedWalletInfo');
      localStorage.removeItem('walletModalSource');
      
      // Reset all state variables
      setConnectedWallet(null);
      setUserWallet(null);
      setSelectedChain(null);
      
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