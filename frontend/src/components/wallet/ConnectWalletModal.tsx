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

export function ConnectWalletModal({ isOpen, onClose, isFromUserProfile, isFromSignIn, onConnect, onDisconnect, connectedWalletInfo }: ConnectWalletModalProps) {
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
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/auth/user`, { withCredentials: true });
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

  // Check authentication status and fetch wallet info on component mount and when modal opens
  useEffect(() => {
    const checkAuth = async () => {
      if (!isOpen) return;

      try {
        const response = await axios.get("http://localhost:5000/auth/user", { withCredentials: true });

        if (response.data) {
          setToken("authenticated"); // Set a dummy value to indicate login state

          // Check if user has wallet information
          if (response.data.wallet) {
            setUserWallet(response.data.wallet);
            setSelectedChain(response.data.wallet.type);
            setConnectedWallet(response.data.wallet.address);
            // Set active tab to wallet if we have wallet info
            setActiveTab("wallet");
          } else if (response.data.email) {
            // If no wallet found in the user data, check if there's any wallet associated with this email
            try {
              const emailCheckResponse = await axios.post(
                "http://localhost:5000/auth/check-wallets-by-email",
                { email: response.data.email },
                { withCredentials: true }
              );

              if (emailCheckResponse.data.defaultWallet) {
                setUserWallet(emailCheckResponse.data.defaultWallet);
                setSelectedChain(emailCheckResponse.data.defaultWallet.type);
                setConnectedWallet(emailCheckResponse.data.defaultWallet.address);
                setActiveTab("wallet");

                // Link this wallet to the user account
                if (emailCheckResponse.data.defaultWallet.address) {
                  await connectWalletToAccount(
                    emailCheckResponse.data.defaultWallet.type,
                    emailCheckResponse.data.defaultWallet.address
                  );
                }
              }
            } catch (checkError) {
              console.error("Error checking wallets by email:", checkError);
            }
          }

          // Only call onConnect if we don't already have a connected wallet from parent
          if (!connectedWalletInfo) {
            onConnect?.(response.data.wallet?.address || "");
          }
        }
      } catch (error) {
        console.log("Not authenticated");
        setToken(null);
      }
    };

    if (isOpen) {
      checkAuth();
    }
  }, [isOpen, onConnect, connectedWalletInfo]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setError("");
    }
  }, [isOpen]);

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
        onConnect?.(walletAddress);
        onClose();

        // Update user profile with wallet address
        try {
          await api.put("/users/profile", { walletAddress });
          toast.success("Wallet connected successfully");
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

        console.log(`Attempting to connect to ${selectedChain} wallet...`);
        // Call the wallet connection function
        const walletAddress = await connectWallet(selectedChain);
        console.log(`Successfully connected to ${selectedChain} wallet:`, walletAddress);
        setConnectedWallet(walletAddress);

        // Show success toast
        toast.success(
          <div className="flex items-center gap-2">
            <span>Wallet connected successfully!</span>
          </div>,
          {
            duration: 4000,
            style: {
              background: '#1F2937',
              color: '#fff',
              border: '1px solid #374151',
              padding: '12px 16px',
              borderRadius: '8px',
            }
          }
        );

        // Get user email if authenticated
        let userEmail = null;
        if (token) {
          try {
            const userResponse = await axios.get("http://localhost:5000/auth/user", { withCredentials: true });
            if (userResponse.data && userResponse.data.email) {
              userEmail = userResponse.data.email;
            }
          } catch (error) {
            console.error("Error fetching user data:", error);
          }

          // Link wallet to account
          await connectWalletToAccount(selectedChain, walletAddress);
        }

        // Now pass the address to the parent component
        if (selectedChain === "phantom" && userEmail) {
          onConnect?.(walletAddress);
        } else {
          onConnect?.(walletAddress);
        }

        // Dispatch custom event for wallet connection
        window.dispatchEvent(new Event('walletConnected'));

        // Clear the walletModalSource flag if it exists
        if (typeof window !== 'undefined' && localStorage.getItem("walletModalSource") === "userProfile") {
          localStorage.removeItem("walletModalSource");
          if (!isFromUserProfile) {
            onClose();
          }
        }

      } else {
        if (isSignUp) {
          await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/auth/register`, { email, password, username, name });

          setError(null);
          setName("");
          setUsername("");
          setEmail("");
          setPassword("");
          setIsSignUp(false);
        } else {
          const response = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/auth/login`,
            { email, password },
            { withCredentials: true }
          );

          if (!response.data.token) {
            throw new Error("Token not received");
          }

          localStorage.setItem("token", response.data.token);
          setToken(response.data.token);
          setEmail("");
          setPassword("");
          setUsername("");
          setName("");

          if (response.data.user.wallet) {
            setUserWallet(response.data.user.wallet);
            setSelectedChain(response.data.user.wallet.type);
            setConnectedWallet(response.data.user.wallet.address);
            setActiveTab("wallet");


            onConnect?.(response.data.user.wallet.address);

          } else {
            // If no wallet found, check by email
            try {
              const emailCheckResponse = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/auth/check-wallets-by-email`,
                { email },
                { withCredentials: true }
              );

              if (emailCheckResponse.data.defaultWallet) {
                setUserWallet(emailCheckResponse.data.defaultWallet);
                setSelectedChain(emailCheckResponse.data.defaultWallet.type);
                setConnectedWallet(emailCheckResponse.data.defaultWallet.address);
                setActiveTab("wallet");

                // Link this wallet to the user account
                await connectWalletToAccount(
                  emailCheckResponse.data.defaultWallet.type,
                  emailCheckResponse.data.defaultWallet.address
                );
                onConnect?.(emailCheckResponse.data.defaultWallet.address);
              }
            } catch (checkError) {
              console.error("Error checking wallets by email:", checkError);
            }
          }

          onConnect?.(response.data.user.wallet?.address || "");
          onClose();
        }
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || "Something went wrong!";
      setError(errorMessage);
      toast.error(
        <div className="flex items-center gap-2">
          <Icon icon="mdi:alert-circle" className="text-red-500 text-xl" />
          <span>{errorMessage}</span>
        </div>,
        {
          duration: 4000,
          style: {
            background: '#1F2937',
            color: '#fff',
            border: '1px solid #374151',
            padding: '12px 16px',
            borderRadius: '8px',
          }
        }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    setError(null);

    try {
      // Handle wallet disconnection
      if (activeTab === "wallet" && connectedWallet && selectedChain) {
        // First try to disconnect from wallet extension
        try {
          await disconnectWallet(selectedChain);
          toast.success(
            <div className="flex items-center gap-2">
              <span>Wallet disconnected successfully!</span>
            </div>,
            {
              duration: 4000,
              style: {
                background: '#1F2937',
                color: '#fff',
                border: '1px solid #374151',
                padding: '12px 16px',
                borderRadius: '8px',
              }
            }
          );
        } catch (walletErr) {
          console.error("Error disconnecting from wallet extension:", walletErr);
          toast.error(
            <div className="flex items-center gap-2">
              <Icon icon="mdi:alert-circle" className="text-red-500 text-xl" />
              <span>Error disconnecting wallet</span>
            </div>,
            {
              duration: 4000,
              style: {
                background: '#1F2937',
                color: '#fff',
                border: '1px solid #374151',
                padding: '12px 16px',
                borderRadius: '8px',
              }
            }
          );
        }

        // If authenticated, update backend
        if (token) {
          try {
            await axios.post(
              `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/auth/disconnect-wallet`,
              { walletType: selectedChain, walletAddress: connectedWallet },
              { withCredentials: true }
            );
          } catch (backendErr) {
            console.error("Error disconnecting wallet on backend:", backendErr);
            // Continue anyway to maintain UI consistency
          }
        }

        // Clear local state
        setSelectedChain(null);
        setConnectedWallet(null);
        setUserWallet(null);

        // Dispatch custom event for wallet disconnection
        window.dispatchEvent(new Event('walletDisconnected'));

        // Inform parent component
        onDisconnect?.();
      }
      // Handle email logout
      else if (activeTab === "email" && token) {
        try {
          // Call logout endpoint to clear server-side session
          await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/auth/logout`, {}, { withCredentials: true });
        } catch (logoutErr) {
          console.error("Error logging out on backend:", logoutErr);
          // Continue anyway to maintain UI consistency
        }

        // Clear localStorage and cookies (if any)
        localStorage.removeItem("token");
        document.cookie = "auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

        // Reset state
        setToken(null);
        setSelectedChain(null);
        setConnectedWallet(null);
        setUserWallet(null);

        // Inform parent component
        onDisconnect?.();
      }

      // Don't close modal - let user connect another wallet or email if desired
    } catch (err: any) {
      console.error("Disconnect error:", err);
      const errorMessage = err.message || "Failed to disconnect";
      setError(errorMessage);
      toast.error(
        <div className="flex items-center gap-2">
          <Icon icon="mdi:alert-circle" className="text-red-500 text-xl" />
          <span>{errorMessage}</span>
        </div>,
        {
          duration: 4000,
          style: {
            background: '#1F2937',
            color: '#fff',
            border: '1px solid #374151',
            padding: '12px 16px',
            borderRadius: '8px',
          }
        }
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" placement="center" className="z-[100] modal">
      <ModalContent className="bg-gradient-to-br from-gray-900 to-black rounded-lg shadow-xl w-full max-w-md mx-auto p-4 sm:p-6 modal-content min-h-[400px] flex flex-col">
        {() => (
          <>
            <ModalHeader className="flex flex-col gap-1 text-center">
              <h3 className="text-xl font-bold text-white">
                {activeTab === "wallet" ? (connectedWallet ? "Wallet Connected" : "Connect Wallet") : isSignUp ? "Create Account" : "Sign In"}
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
                  connectedWallet ? (
                    <div className="space-y-3 flex-1 flex flex-col justify-center">
                      <Button
                        className="w-full rounded-lg bg-gradient-to-r from-[#B671FF] via-[#C577EE] to-[#E282CA] text-white font-semibold flex items-center justify-between px-4 py-3 shadow-lg hover:shadow-xl transition-all duration-200"
                        onPress={handleDisconnect}
                        isDisabled={loading}
                      >
                        {shortenWalletAddress(connectedWallet)}
                        <Icon icon="mdi:logout" className="text-lg" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3 flex-1 flex flex-col justify-center">
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
                      {connectedWallet ? (
                        <p className="w-full text-center text-lg font-semibold bg-gradient-to-r from-[#B671FF] via-[#C577EE] to-[#E282CA] text-white rounded-lg py-3 shadow-lg">
                          {shortenWalletAddress(connectedWallet)}
                        </p>
                      ) : (
                        <Button
                          className="w-full rounded-lg bg-gradient-to-r from-[#B671FF] via-[#C577EE] to-[#E282CA] text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 mt-4"
                          onPress={handleConnect}
                          isDisabled={loading || !selectedChain}
                        >
                          {loading ? "Connecting..." : "Connect Wallet"}
                        </Button>
                      )}
                    </div>
                  )
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
                      onPress={handleConnect}
                      isDisabled={loading}
                    >
                      {loading ? "Processing..." : isSignUp ? "Sign Up" : "Sign In"}
                    </Button>

                    {/* Toggle Between Sign In & Sign Up */}
                    <p className="text-center text-sm text-gray-400 mt-2">
                      {isSignUp ? "Already have an account? " : "Don't have an account? "}
                      <button
                        onClick={() => setIsSignUp(!isSignUp)}
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
                        window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/auth/google`;
                      }}
                    >
                      <Icon icon="logos:google-icon" className="text-lg" />
                      Continue with Google
                    </Button>
                  </div>
                )}
              </div>
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}