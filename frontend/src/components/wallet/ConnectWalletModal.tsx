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
  connectedWalletInfo?: {
    type: string;
    address?: string;
    data?: {
      blockchain?: string;
    };
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
            // User is authenticated, link wallet to existing account
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

          onConnect?.(walletAddress);
          onClose();
        } catch (error) {
          console.error("Failed to update profile:", error);
          toast.error("Wallet connected but failed to update profile");
          // Disconnect wallet if profile update fails
          await disconnectWallet(walletType);
          onDisconnect?.();
        }
      }
    } catch (error) {
      console.error("Wallet connection error:", error);
      setError("Failed to connect wallet. Please try again.");
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
      <ModalContent className="bg-gradient-to-br from-gray-900 to-black rounded-lg shadow-xl w-full max-w-md mx-auto p-4 sm:p-6 modal-content min-h-[400px] flex flex-col">
        {() => (
          <>
            <ModalHeader className="flex flex-col gap-1 text-center">
              <h3 className="text-xl font-bold text-white">
                {isFromUserProfile ? "Connect Wallet to Access Profile" : 
                 isFromSignIn ? "Sign In to Continue" : 
                 "Connect Your Wallet"}
              </h3>
            </ModalHeader>
            <ModalBody className="px-2 sm:px-4 py-4 flex-1 flex flex-col">
              {/* Always show tab selection */}
              <div className="flex gap-2 mb-6">
                <Button
                  className={`flex-1 rounded-lg px-3 py-2 font-medium transition-all duration-200 ${
                    activeTab === "wallet" 
                      ? "bg-gradient-to-r from-[#B671FF] via-[#C577EE] to-[#E282CA] text-white shadow-lg" 
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                  onPress={() => setActiveTab("wallet")}
                >
                  Wallet Connect
                </Button>
                <Button
                  className={`flex-1 rounded-lg px-3 py-2 font-medium transition-all duration-200 ${
                    activeTab === "email" 
                      ? "bg-gradient-to-r from-[#B671FF] via-[#C577EE] to-[#E282CA] text-white shadow-lg" 
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                  onPress={() => setActiveTab("email")}
                >
                  Email
                </Button>
              </div>

              {error && <p className="text-red-400 text-sm mb-4 font-medium">{error}</p>}

              <div className="flex-1 flex flex-col">
                {activeTab === "wallet" ? (
                  <div className="space-y-3 flex-1 flex flex-col justify-center">
                    {connectedWallet ? (
                      <Button
                        className="w-full rounded-lg bg-gradient-to-r from-[#B671FF] via-[#C577EE] to-[#E282CA] text-white font-semibold flex items-center justify-between px-4 py-3 shadow-lg hover:shadow-xl transition-all duration-200"
                        onPress={handleDisconnect}
                        isDisabled={loading}
                      >
                        {shortenWalletAddress(connectedWallet)}
                        <Icon icon="mdi:logout" className="text-lg" />
                      </Button>
                    ) : (
                      <>
                        {blockchains.map((chain) => (
                          <Button
                            key={chain.id}
                            variant="flat"
                            className={`w-full justify-start gap-2 h-12 rounded-lg transition-all duration-200 font-medium ${
                              selectedChain === chain.id 
                                ? "bg-gradient-to-r from-[#B671FF] via-[#C577EE] to-[#E282CA] text-white shadow-lg" 
                                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                            }`}
                            onPress={() => setSelectedChain(chain.id)}
                          >
                            <Icon icon={chain.icon} className="text-xl" />
                            {chain.name}
                            {selectedChain === chain.id && <Icon icon="mdi:check" className="ml-auto text-white text-lg" />}
                          </Button>
                        ))}
                        <Button
                          className="w-full rounded-lg bg-gradient-to-r from-[#B671FF] via-[#C577EE] to-[#E282CA] text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 mt-4"
                          onPress={handleConnect}
                          isDisabled={loading || !selectedChain}
                        >
                          {loading ? "Connecting..." : "Connect Wallet"}
                        </Button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4 sm:space-y-6 mt-4 flex-1 flex flex-col justify-center">
                    {isSignUp && (
                      <>
                        <Input
                          placeholder="Full Name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          isRequired
                          className="w-full bg-gray-800 text-white placeholder-gray-400 border-gray-700 focus:border-[#B671FF]"
                        />
                        <Input
                          placeholder="Username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          isRequired
                          className="w-full bg-gray-800 text-white placeholder-gray-400 border-gray-700 focus:border-[#B671FF]"
                        />
                      </>
                    )}
                    <Input
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      isRequired
                      className="w-full bg-gray-800 text-white placeholder-gray-400 border-gray-700 focus:border-[#B671FF]"
                    />
                    <Input
                      placeholder="Password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      isRequired
                      className="w-full bg-gray-800 text-white placeholder-gray-400 border-gray-700 focus:border-[#B671FF]"
                    />
                    <Button
                      className="w-full rounded-lg mt-4 sm:mt-6 shadow-lg bg-gradient-to-r from-[#B671FF] via-[#C577EE] to-[#E282CA] text-white font-semibold hover:shadow-xl transition-all duration-200"
                      onPress={handleEmailAuth}
                      isDisabled={loading || (isSignUp && (!name || !username))}
                    >
                      {loading ? "Processing..." : isSignUp ? "Sign Up" : "Sign In"}
                    </Button>

                    {/* Toggle Between Sign In & Sign Up */}
                    <p className="text-center text-sm text-gray-400 mt-2">
                      {isSignUp ? "Already have an account? " : "Don't have an account? "}
                      <button
                        onClick={() => {
                          setIsSignUp(!isSignUp);
                          // Clear form fields when switching modes
                          setName("");
                          setUsername("");
                          setEmail("");
                          setPassword("");
                        }}
                        className="text-[#B671FF] hover:text-[#E282CA] font-medium transition-colors duration-200"
                      >
                        {isSignUp ? "Sign In" : "Sign Up"}
                      </button>
                    </p>

                    {/* "Continue with Google" Button */}
                    <Button
                      className="w-full rounded-lg bg-white text-gray-800 font-medium mt-4 flex items-center justify-center gap-2 hover:bg-gray-100 transition-all duration-200 shadow-lg"
                      onPress={() => {
                        localStorage.setItem("redirectAfterAuth", window.location.href);
                        window.location.href = `${API_URL}/auth/google`;
                      }}
                    >
                      <Icon icon="logos:google-icon" className="text-lg" />
                      Continue with Google
                    </Button>
                  </div>
                )}
              </div>

              {isFromUserProfile && (
                <div className="text-center text-sm text-gray-400 mt-4">
                  <p>Connect your wallet to access your profile and start sharing content.</p>
                  <p className="mt-2">You can also sign in with email after connecting your wallet.</p>
                </div>
              )}
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}