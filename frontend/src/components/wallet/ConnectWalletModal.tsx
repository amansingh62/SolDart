"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { Modal, ModalContent, ModalHeader, ModalBody, Button, Input } from "@heroui/react";
import { Icon } from "@iconify/react";
import { connectWallet, disconnectWallet, checkWalletInstalled, connectWalletToAccount, shortenWalletAddress } from "@/lib/walletUtils";

interface ConnectWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (type: "wallet" | "email", data: any) => void;
  onDisconnect: () => void;
  connectedWalletInfo?: {
    type: "wallet" | "email";
    data: any;
    emoji: string;
    address?: string;
  } | null;
}

// Add wallet interface
interface WalletInfo {
  type: string;
  address: string;
}

export function ConnectWalletModal({ isOpen, onClose, onConnect, onDisconnect, connectedWalletInfo }: ConnectWalletModalProps) {
  // Default to email tab for sign-in experience
  const [activeTab, setActiveTab] = useState<"wallet" | "email">("email");
  // Track if modal is opened from sign-in button or profile modal
  const [isFromSignIn, setIsFromSignIn] = useState(false);
  // Check if this modal is being opened from the user profile (after login)
  const [isFromUserProfile, setIsFromUserProfile] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [selectedChain, setSelectedChain] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
        onConnect("wallet", {
          blockchain: walletType,
          address: walletAddress
        });

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
        setIsFromUserProfile(true);
        setIsFromSignIn(false);
        setActiveTab("wallet"); // Default to wallet tab when opened from user profile
        // Don't remove the flag immediately to prevent modal from closing too soon
        // We'll remove it after the user completes an action or manually closes the modal
        return;
      }

      // Check if the modal was opened from sign-in button
      if (walletModalSource === "signIn") {
        setIsFromUserProfile(false);
        setIsFromSignIn(true);
        setActiveTab("email"); // Force email tab when opened from sign-in button
        return;
      }

      try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/auth/user`, { withCredentials: true });
        if (response.data) {
          setIsFromUserProfile(true);
          setIsFromSignIn(false);
          setActiveTab("wallet"); // Default to wallet tab when opened from user profile
        } else {
          setIsFromUserProfile(false);
          setIsFromSignIn(true);
          setActiveTab("email"); // Default to email tab for initial sign in
        }
      } catch (error) {
        // Not authenticated, so not from user profile
        setIsFromUserProfile(false);
        setIsFromSignIn(true);
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
            onConnect("email", response.data);
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
      setError(null);
    }
  }, [isOpen]);

  const blockchains = [
    { id: "phantom", name: "Phantom", icon: "cryptocurrency:phantom" },
    { id: "solflare", name: "Solflare", icon: "cryptocurrency:solflare" },
    { id: "backpack", name: "Backpack", icon: "cryptocurrency:backpack" }
  ];

  const handleConnect = async () => {
    setLoading(true);
    setError(null);

    try {
      if (activeTab === "wallet" && selectedChain) {
        // Check if wallet extension is installed
        const isInstalled = checkWalletInstalled(selectedChain);

        if (!isInstalled) {
          setError(`${selectedChain} wallet is not installed. Please install the extension first.`);
          setLoading(false);
          return;
        }

        console.log(`Attempting to connect to ${selectedChain} wallet...`);
        // Call the wallet connection function
        const walletAddress = await connectWallet(selectedChain);
        console.log(`Successfully connected to ${selectedChain} wallet:`, walletAddress);
        setConnectedWallet(walletAddress);

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
        // Include email if available for Phantom wallet
        if (selectedChain === "phantom" && userEmail) {
          onConnect("wallet", {
            blockchain: selectedChain,
            address: walletAddress,
            email: userEmail
          });
        } else {
          onConnect("wallet", {
            blockchain: selectedChain,
            address: walletAddress
          });
        }

        // Clear the walletModalSource flag if it exists
        if (typeof window !== 'undefined' && localStorage.getItem("walletModalSource") === "userProfile") {
          localStorage.removeItem("walletModalSource");
          // Don't close the modal automatically when coming from user profile
          // Let the parent component handle it
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


            onConnect("wallet", {
              blockchain: response.data.user.wallet.type,
              address: response.data.user.wallet.address
            });

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
                onConnect("wallet", {
                  blockchain: emailCheckResponse.data.defaultWallet.type,
                  address: emailCheckResponse.data.defaultWallet.address
                });
              }
            } catch (checkError) {
              console.error("Error checking wallets by email:", checkError);
            }
          }

          onConnect("email", response.data);
          onClose();
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Something went wrong!");
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
        } catch (walletErr) {
          console.error("Error disconnecting from wallet extension:", walletErr);
          // Continue anyway, as we want to clear the state
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

        // Inform parent component
        onDisconnect();
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
        onDisconnect();
      }

      // Don't close modal - let user connect another wallet or email if desired
    } catch (err: any) {
      console.error("Disconnect error:", err);
      setError(err.message || "Failed to disconnect");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" placement="center" className="z-[100] modal">
      <ModalContent className="bg-white rounded-lg shadow-lg w-full max-w-xs sm:max-w-sm md:max-w-md mx-auto p-4 sm:p-6 modal-content">
        {() => (
          <>
            <ModalHeader className="flex flex-col gap-1 text-center">
              <h3 className="text-lg font-bold">
                {activeTab === "wallet" ? (connectedWallet ? "Wallet Connected" : "Connect Wallet") : isSignUp ? "Create Account" : "Sign In"}
              </h3>
            </ModalHeader>
            <ModalBody className="px-2 sm:px-4 py-4">
              {/* Only show tab selection if not opened from user profile and not from sign-in button */}
              {!isFromUserProfile && !isFromSignIn && (
                <div className="flex gap-2 mb-4">
                  <Button
                    className={`flex-1 rounded-lg px-3 py-2 bg-black text-white ${activeTab === "wallet" ? "border-2 border-[#9dfc3f]" : ""
                      }`}
                    onPress={() => setActiveTab("wallet")}
                  >
                    Blockchain
                  </Button>
                  <Button
                    className={`flex-1 rounded-lg px-3 py-2 bg-black text-white ${activeTab === "email" ? "border-2 border-[#9dfc3f]" : ""
                      }`}
                    onPress={() => setActiveTab("email")}
                  >
                    Email
                  </Button>
                </div>
              )}

              {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

              {activeTab === "wallet" ? (
                connectedWallet ? (
                  <div className="space-y-3">
                    <Button
                      className="w-full rounded-lg bg-[#9dfc3f] text-black font-semibold flex items-center justify-between px-4 py-3"
                      onPress={handleDisconnect}
                      isDisabled={loading}
                    >
                      {shortenWalletAddress(connectedWallet)}
                      <Icon icon="mdi:logout" className="text-lg" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {blockchains.map((chain) => (
                      <Button
                        key={chain.id}
                        variant="flat"
                        className={`w-full justify-start gap-2 h-12 rounded-lg transition ${selectedChain === chain.id ? "bg-[#9dfc3f] text-black" : "bg-gray-100 hover:bg-[#e0ffa3]"
                          }`}
                        onPress={() => setSelectedChain(chain.id)}
                      >
                        <Icon icon={chain.icon} className="text-xl" />
                        {chain.name}
                        {selectedChain === chain.id && <Icon icon="mdi:check" className="ml-auto text-black text-lg" />}
                      </Button>
                    ))}
                    {connectedWallet ? (
                      <p className="w-full text-center text-lg font-semibold bg-gradient-to-r from-[#B671FF] via-[#C577EE] to-[#E282CA] 
             text-black hover:!bg-black hover:!from-black hover:!via-black hover:!to-black 
             hover:text-white rounded-lg py-3 shadow-xl mt-4">
                        {shortenWalletAddress(connectedWallet)}
                      </p>
                    ) : (
                      <Button
                        className="w-full rounded-lg bg-gradient-to-r from-[#B671FF] via-[#C577EE] to-[#E282CA] 
             text-black hover:!bg-black hover:!from-black hover:!via-black hover:!to-black 
             hover:text-white shadow-xl mt-4"
                        onPress={handleConnect}
                        isDisabled={loading || !selectedChain}
                      >
                        {loading ? "Connecting..." : "Connect Wallet"}
                      </Button>
                    )}
                  </div>
                )
              ) :
                (
                  <div className="space-y-4 sm:space-y-6 mt-4">
                    {isSignUp && (
                      <>
                        <Input
                          placeholder="Full Name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          isRequired
                          className="w-full"
                        />
                        <Input
                          placeholder="Username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          isRequired
                          className="w-full"
                        />
                      </>
                    )}
                    <Input
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      isRequired
                      className="w-full"
                    />
                    <Input
                      placeholder="Password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      isRequired
                      className="w-full"
                    />
                    <Button
                      className="w-full rounded-lg mt-4 sm:mt-6 shadow-xl bg-gradient-to-r from-[#B671FF] via-[#C577EE] to-[#E282CA] 
             text-black hover:!bg-black hover:!from-black hover:!via-black hover:!to-black 
             hover:text-white"
                      onPress={handleConnect}
                      isDisabled={loading}
                    >
                      {loading ? "Processing..." : isSignUp ? "Sign Up" : "Sign In"}
                    </Button>

                    {/* Toggle Between Sign In & Sign Up */}
                    <p className="text-center text-sm text-gray-600 mt-2">
                      {isSignUp ? "Already have an account? " : "Don't have an account? "}
                      <button
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-blue-500 hover:underline"
                      >
                        {isSignUp ? "Sign In" : "Sign Up"}
                      </button>
                    </p>

                    {/* "Continue with Google" Button */}
                    <Button
                      className="w-full rounded-lg border-lime-400 border-1 text-black font-light mt-4 flex items-center justify-center gap-2 google-auth-button"
                      onPress={() => {
                        // Store current location to redirect back after Google auth
                        localStorage.setItem("redirectAfterAuth", window.location.href);
                        window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/auth/google`;
                      }}
                    >
                      <Icon icon="logos:google-icon" className="text-lg" />
                      Continue with Google
                    </Button>
                  </div>

                )}
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}