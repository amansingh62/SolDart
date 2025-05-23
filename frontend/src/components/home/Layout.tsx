"use client";

import React, { ReactNode, useState, useEffect } from "react";
import { Button, Input } from "@heroui/react";
import { Icon } from "@iconify/react";
import { Sidebar } from "@/components/home/Sidebar";
import { HotCoins } from "@/components/home/HotCoins";
import { FearGreedIndex } from "@/components/home/FearGreedIndex";
import { TrendingHashtags } from "@/components/home/TrendingHashtags";
import SolanaTrendingSection from "@/components/home/SolanaTrendingSection";
import SupportChat from "@/components/home/SupportChat";
import { AdsSection } from "@/components/home/AdsSection";
import { ConnectWalletModal } from "@/components/wallet/ConnectWalletModal";
import { UserProfileModal } from "@/components/auth/UserProfileModal";
import { AuthModal } from "@/components/auth/AuthModal";
import axios from "axios";
import { toast } from "react-hot-toast";
import MessagePopup from "./MessagePopup";
import { usePathname, useRouter } from "next/navigation";
import DartAIButton from "@/components/home/DartAIButton";
import EventsPopup from "@/components/home/EventsPopUP";
import { LanguageSelector } from "@/components/home/LanguageSelector";
import { useLanguage } from "@/context/LanguageContext";
import { RecentSearches } from "@/components/home/RecentSearches";
import { WalletDropdown } from "@/components/wallet/WalletDropdown";
import api from '@/lib/apiUtils';

const EMOJIS = ["🦊", "🐼", "🐯", "🦁", "🐸", "🐙", "🦄", "🐳", "🦋", "🐝", "🦖", "🐢"];

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [isEventsOpen, setIsEventsOpen] = useState(false);
  const [messageUserId, setMessageUserId] = useState<string | null>(null);
  const [messageUsername, setMessageUsername] = useState<string>("");
  const [messageUserImage, setMessageUserImage] = useState<string>("");
  const [messageText, setMessageText] = useState<string>("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<{ _id: string; username: string; profileImage: string }[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showRecentSearches, setShowRecentSearches] = useState(false);
  const [isWalletDropdownOpen, setIsWalletDropdownOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();
  const [authState, setAuthState] = useState<{
    wallet: {
      type: "wallet" | "email";
      data: any;
      emoji: string;
      address?: string;
    } | null;
    user: {
      username?: string;
      email?: string;
      emoji?: string;
    } | null;
  }>({
    wallet: null,
    user: null
  });

  // Load recent searches from localStorage on component mount
  useEffect(() => {
    const savedSearches = localStorage.getItem('recentSearches');
    if (savedSearches) {
      try {
        const parsedSearches = JSON.parse(savedSearches);
        if (Array.isArray(parsedSearches)) {
          setRecentSearches(parsedSearches);
        }
      } catch (error) {
        console.error('Error parsing recent searches:', error);
        localStorage.removeItem('recentSearches');
      }
    }
  }, []);

  // Function to save a search to recent searches
  const saveToRecentSearches = (query: string) => {
    if (!query.trim()) return;

    setRecentSearches(prev => {
      // Remove the query if it already exists to avoid duplicates
      const filtered = prev.filter(item => item !== query);
      // Add the new query to the beginning of the array
      const updated = [query, ...filtered].slice(0, 5); // Keep only the 5 most recent searches

      // Save to localStorage
      localStorage.setItem('recentSearches', JSON.stringify(updated));

      return updated;
    });
  };

  // Function to clear a specific recent search
  const clearRecentSearch = (query: string) => {
    setRecentSearches(prev => {
      const updated = prev.filter(item => item !== query);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
      return updated;
    });
  };

  // Function to clear all recent searches
  const clearAllRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
    setShowRecentSearches(false);
  };

  // Function to select a recent search
  const selectRecentSearch = (query: string) => {
    setSearchQuery(query);
    setShowRecentSearches(false);
    // Trigger search with the selected query
    searchUsers(query);
  };

  // Function to check if an address is a token address
  const isTokenAddress = async (address: string) => {
    try {
      const response = await api.get(`/api/solana/token/${address}`);
      return response.data.success;
    } catch (error) {
      return false;
    }
  };

  // Function to search for users or hashtags
  const searchUsers = async (query?: string, isButtonClick: boolean = false) => {
    let searchTerm = query || searchQuery;
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      if (recentSearches.length > 0) {
        setShowRecentSearches(true);
      } else {
        setShowRecentSearches(false);
      }
      return;
    }

    try {
      setIsSearching(true);
      setShowRecentSearches(false);

      // Check if the search term looks like a Solana address
      const isSolanaAddress = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(searchTerm);

      if (isSolanaAddress) {
        // First check if it's a token address
        const isToken = await isTokenAddress(searchTerm);

        if (isToken) {
          // If it's a token address, navigate to token details
          router.push(`/token/${searchTerm}`);
          setSearchQuery('');
          setSearchResults([]);
          setShowSearchResults(false);
          setSearchOpen(false);
          saveToRecentSearches(searchTerm);
          setIsSearching(false);
          return;
        }

        // If not a token, check if it's a user's wallet
        try {
          const response = await api.get(`/users/wallet/${searchTerm}`);
          if (response.data.success && response.data.user) {
            // Navigate to user profile
            router.push(`/profile/${response.data.user.username}`);
            setSearchQuery('');
            setSearchResults([]);
            setShowSearchResults(false);
            setSearchOpen(false);
            saveToRecentSearches(searchTerm);
            setIsSearching(false);
            return;
          }
        } catch (error) {
          console.error('Error searching by wallet:', error);
          // Don't show error toast here as it's just one of the search methods
        }
      }

      // Check if the search term is a hashtag
      if (searchTerm.startsWith('#')) {
        if (searchTerm.length > 1) {
          saveToRecentSearches(searchTerm);
          setSearchResults([]);
          setShowSearchResults(false);
          setSearchOpen(false);
          setSearchQuery('');
          setIsSearching(false);
          const hashtag = encodeURIComponent(searchTerm);
          router.push(`/?hashtag=${hashtag}`);
          return;
        } else {
          setIsSearching(false);
          return;
        }
      }

      // Regular user search
      const termForSearch = searchTerm.startsWith('@') ? searchTerm.substring(1) : searchTerm;
      try {
        const response = await api.get(`/users/search/${termForSearch}`);

        if (response.data && response.data.success) {
          setSearchResults(response.data.users || []);
          setShowSearchResults(true);
          saveToRecentSearches(searchTerm);
        } else {
          setSearchResults([]);
          setShowSearchResults(false);
          // Only show error if the response indicates a failure
          if (response.data && !response.data.success) {
            toast.error(response.data.message || 'No users found');
          }
        }
      } catch (error: any) {
        console.error('Error searching users:', error);
        // Check if the error has a response with a message
        const errorMessage = error.response?.data?.message || 'Failed to search users';
        toast.error(errorMessage);
        setSearchResults([]);
        setShowSearchResults(false);
      }
    } catch (error: any) {
      console.error('Error in search process:', error);
      const errorMessage = error.response?.data?.message || 'An error occurred during search';
      toast.error(errorMessage);
      setSearchResults([]);
      setShowSearchResults(false);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    // If search query is empty, hide results and show recent searches if available
    if (!value.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      if (recentSearches.length > 0) {
        setShowRecentSearches(true);
      } else {
        setShowRecentSearches(false);
      }
      return;
    }

    // If there's a search query, hide recent searches and show search results
    setShowRecentSearches(false);

    // For hashtag searches, don't trigger search automatically while typing
    // Only trigger search for user searches
    if (!value.startsWith('#')) {
      // Debounce search to avoid too many API calls
      const timeoutId = setTimeout(() => {
        searchUsers();
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  };

  // Navigate to user profile
  const navigateToProfile = (username: string) => {
    router.push(`/profile/${username}`);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  // Function to open direct message with a user
  const openDirectMessage = (userId: string, username: string, profileImage: string, initialMessage: string = '') => {
    setMessageUserId(userId);
    setMessageUsername(username);
    setMessageUserImage(profileImage);
    setMessageText(initialMessage);
    setIsMessageOpen(true);
  };

  // Make the openDirectMessage function available globally
  useEffect(() => {
    // Add the function to the window object
    if (typeof window !== 'undefined') {
      (window as any).openDirectMessage = openDirectMessage;
    }

    return () => {
      // Clean up when component unmounts
      if (typeof window !== 'undefined') {
        delete (window as any).openDirectMessage;
      }
    };
  }, []);

  // Add click outside listener to close search results and recent searches
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.search-container')) {
        if (showSearchResults) setShowSearchResults(false);
        if (showRecentSearches) setShowRecentSearches(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSearchResults, showRecentSearches]);

  // Check if user is authenticated on component mount and restore wallet connection from localStorage
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/auth/user`, { withCredentials: true });
        if (response.data) {
          setAuthState(prev => ({
            ...prev,
            user: {
              username: response.data.username,
              email: response.data.email,
              emoji: response.data.emoji
            }
          }));
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
      }
    };

    checkAuth();

    // Restore wallet connection
    const storedWalletInfo = localStorage.getItem('connectedWalletInfo');
    if (storedWalletInfo) {
      try {
        const walletInfo = JSON.parse(storedWalletInfo);
        if (walletInfo?.address) {
          setAuthState(prev => ({ ...prev, wallet: walletInfo }));
        }
      } catch (error) {
        console.error('Error parsing stored wallet info:', error);
        localStorage.removeItem('connectedWalletInfo');
      }
    }
  }, []);

  const handleConnect = (walletAddress: string) => {
    const randomEmoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    const walletInfo = {
      type: "wallet" as const,
      data: { blockchain: "phantom", address: walletAddress },
      emoji: randomEmoji,
      address: walletAddress
    };
    setAuthState(prev => ({ ...prev, wallet: walletInfo }));
    localStorage.setItem('connectedWalletInfo', JSON.stringify(walletInfo));
    setIsWalletModalOpen(false);
  };

  const handleDisconnect = () => {
    setAuthState(prev => ({ ...prev, wallet: null }));
    localStorage.removeItem('connectedWalletInfo');
    localStorage.removeItem('walletModalSource');
  };

  const toggleWalletModal = () => {
    setIsWalletModalOpen(!isWalletModalOpen);
    // Close the menu when opening wallet modal from mobile
    if (!isWalletModalOpen && menuOpen) {
      setMenuOpen(false);
    }
  };

  const { t } = useLanguage();

  // Add click outside handler for the dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.wallet-dropdown-container')) {
        setIsWalletDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const renderAuthButton = () => {
    const { wallet, user } = authState;

    // If user is signed in and has wallet connected
    if (user && user.username && wallet && wallet.address) {
      return (
        <div className="flex gap-2">
          <Button
            className="bg-gradient-to-r from-[#B671FF] via-[#C577EE] to-[#E282CA] text-black hover:!bg-black hover:!from-black hover:!via-black hover:!to-black hover:text-white px-4 py-2 rounded-md border border-white shadow-md"
            onPress={() => setIsProfileModalOpen(true)}
            data-auth-allowed="true"
          >
            <div className="flex items-center justify-center gap-2">
              <span>{wallet.emoji}</span>
              <span className="text-xs truncate max-w-[100px] md:max-w-[150px] md:inline-block">
                {wallet.address.substring(0, 4)}...{wallet.address.substring(wallet.address.length - 4)}
              </span>
            </div>
          </Button>
          <Button
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md"
            onPress={handleLogout}
            data-auth-allowed="true"
          >
            Logout
          </Button>
        </div>
      );
    }

    // If user is signed in but no wallet connected
    if (user && user.username) {
      return (
        <div className="flex gap-2">
          <Button
            className="bg-gradient-to-r from-[#B671FF] via-[#C577EE] to-[#E282CA] text-black hover:!bg-black hover:!from-black hover:!via-black hover:!to-black hover:text-white px-4 py-2 rounded-md border border-white shadow-md"
            onPress={() => {
              localStorage.setItem("walletModalSource", "userProfile");
              setIsWalletModalOpen(true);
            }}
            data-auth-allowed="true"
          >
            Connect Wallet
          </Button>
          <Button
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md"
            onPress={handleLogout}
            data-auth-allowed="true"
          >
            Logout
          </Button>
        </div>
      );
    }

    // If not signed in, show Sign In button
    return (
      <Button
        className="w-full bg-gradient-to-r from-[#B671FF] via-[#C577EE] to-[#E282CA] text-black hover:!bg-black hover:!from-black hover:!via-black hover:!to-black hover:text-white px-4 py-2 rounded-md border border-white shadow-md"
        onPress={() => {
          setIsAuthModalOpen(true);
        }}
        data-auth-allowed="true"
      >
        Sign In
      </Button>
    );
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
      localStorage.removeItem('token');
      setToken(null);
      toast.success("Logged out successfully");

      // Clear any wallet info
      localStorage.removeItem('connectedWalletInfo');

      // Reload the page to clear all state
      window.location.reload();
    } catch (error: any) {
      console.error("Logout error:", error);
      toast.error(error.response?.data?.message || "Failed to logout");
    }
  };

  // Calculate the available height for the columns (viewport height minus navbar and HotCoins section)
  const columnHeight = "calc(105vh - 140px)";

  // Desktop search bar button
  const handleSearchButtonClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    const searchTerm = searchQuery.trim();

    if (!searchTerm) {
      return;
    }

    // Check if it's a Solana address
    const isSolanaAddress = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(searchTerm);
    if (isSolanaAddress) {
      try {
        // First check if it's a token address
        const isToken = await isTokenAddress(searchTerm);

        if (isToken) {
          // If it's a token address, navigate to token details
          router.push(`/token/${searchTerm}`);
          setSearchQuery('');
          setSearchResults([]);
          setShowSearchResults(false);
          setSearchOpen(false);
          saveToRecentSearches(searchTerm);
          return;
        }

        // If not a token, check if it's a user's wallet
        const response = await api.get(`/users/wallet/${searchTerm}`);
        if (response.data.success && response.data.user) {
          // Navigate to user profile
          router.push(`/profile/${response.data.user.username}`);
          setSearchQuery('');
          setSearchResults([]);
          setShowSearchResults(false);
          setSearchOpen(false);
          saveToRecentSearches(searchTerm);
          return;
        }
      } catch (error) {
        console.error('Error searching by wallet:', error);
      }
    }

    // If it's a hashtag
    if (searchTerm.startsWith('#')) {
      if (searchTerm.length > 1) {
        saveToRecentSearches(searchTerm);
        setSearchResults([]);
        setShowSearchResults(false);
        setSearchOpen(false);
        setSearchQuery('');
        const hashtag = encodeURIComponent(searchTerm);
        router.push(`/?hashtag=${hashtag}`);
        return;
      }
    }

    // Regular user search
    const termForSearch = searchTerm.startsWith('@') ? searchTerm.substring(1) : searchTerm;
    try {
      const response = await api.get(`/users/search/${termForSearch}`);
      if (response.data.success) {
        setSearchResults(response.data.users);
        setShowSearchResults(true);
        saveToRecentSearches(searchTerm);
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    } catch (error) {
      console.error('Error searching:', error);
      toast.error(t('errors.failedSearchUsers'));
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 w-full z-99 border-b border-[#ffffff]/30 backdrop-blur-md shadow-sm">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo on the left for both mobile and desktop */}
          <div className="flex items-center">
            <img src="/solecho_logo.png" alt="SolEcho Logo" className="w-10" />

            <h1 className="text-2xl font-bold">Sol<span className="bg-gradient-to-r from-[#B671FF] via-[#C577EE] to-[#E282C9] text-transparent bg-clip-text">
              Echo</span></h1>
          </div>

          <div className="fixed left-1/2 transform -translate-x-1/2 w-[30vw] search-container mt-2 hidden md:block">
            <Input
              placeholder={t('Search Users and Addresses')}
              className="pl-4 pr-10 w-full bg-white text-black rounded-2xl"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => {
                if (searchQuery.trim()) {
                  // If there's a search query, show search results
                  setShowSearchResults(true);
                  setShowRecentSearches(false);
                } else if (recentSearches.length > 0) {
                  // If there's no search query but there are recent searches, show recent searches
                  setShowRecentSearches(true);
                  setShowSearchResults(false);
                }
              }}
            />
            <div
              className="absolute right-0 top-0 h-full flex items-center px-3 bg-gradient-to-r from-[#B671FF] via-[#C577EE] to-[#E282CA] rounded-tr-2xl rounded-br-2xl cursor-pointer"
              onClick={handleSearchButtonClick}
            >
              <Icon icon="lucide:search" className="text-black" />
            </div>

            {/* Recent Searches Dropdown - Only show if there are recent searches and no search results */}
            {showRecentSearches && !showSearchResults && recentSearches.length > 0 && (
              <RecentSearches
                searches={recentSearches}
                onSelectSearch={selectRecentSearch}
                onClearSearch={clearRecentSearch}
                onClearAll={clearAllRecentSearches}
              />
            )}

            {/* Search Results Dropdown - Only show if there are search results */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 w-full mt-1 bg-white rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto scrollbar-hide">
                {isSearching ? (
                  <div className="flex justify-center items-center p-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#FEB4B0]"></div>
                  </div>
                ) : (
                  <div className="p-2">
                    {searchResults.map(user => (
                      <div
                        key={user._id}
                        className="flex items-center p-2 hover:bg-gray-100 rounded-md cursor-pointer"
                        onClick={() => navigateToProfile(user.username)}
                      >
                        <img
                          src={user.profileImage || '/svg.png'}
                          alt={user.username}
                          className="w-8 h-8 rounded-full mr-2"
                        />
                        <span className="text-sm">{user.username}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile Search Button */}




          {/* Mobile icons and menu button */}
          <div className="flex items-center gap-3 md:hidden">
            {/* Mobile Social Media and Check-in Icons */}
            <div className="flex items-center gap-3">
              {/* Search Icon */}
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="text-black hover:text-[#B671FF] transition-colors"
              >
                <Icon icon="lucide:search" className="text-xl" />
              </button>
              
              {/* Check-in (Calendar) Icon */}
              <button
                onClick={() => setIsEventsOpen(true)}
                className="text-black hover:text-[#B671FF] transition-colors"
              >
                <Icon icon="lucide:calendar" className="text-xl" />
              </button>
              
              {/* Twitter Icon */}
              <a href="https://x.com/SolEcho_io" target="_blank" rel="noopener noreferrer" className="text-black hover:text-[#B671FF] transition-colors">
                <Icon icon="mdi:twitter" className="text-xl" />
              </a>
              
              {/* Telegram Icon */}
              <a href="https://t.me/SolEcho" target="_blank" rel="noopener noreferrer" className="text-black hover:text-[#B671FF] transition-colors">
                <Icon icon="mdi:telegram" className="text-xl" />
              </a>
            </div>
            
            {/* Mobile Menu Button - now on the right */}
            <button className="text-black text-2xl" onClick={() => setMenuOpen(!menuOpen)}>
              <Icon icon="mdi:menu" />
            </button>
          </div>

          {/* Desktop icons and auth buttons */}
          <div className="relative items-center gap-6 md:flex hidden">
            {/* Language Selector */}

            {/* Events Icon */}
            <div className="relative mt-2">
              <button
                onClick={() => setIsEventsOpen(true)}
                className="text-black hover:text-[#B671FF] transition-colors"
              >
                <Icon icon="lucide:calendar" className="text-xl" />
              </button>
              <EventsPopup
                isOpen={isEventsOpen}
                setIsOpen={setIsEventsOpen}
                onClose={() => setIsEventsOpen(false)}
              >
                <div></div>
              </EventsPopup>
            </div>
            {/* Social Media Icons */}
            <a href="https://x.com/SolEcho_io" target="_blank" rel="noopener noreferrer" className="text-black hover:text-[#B671FF] transition-colors">
              <Icon icon="mdi:twitter" className="text-xl" />
            </a>
            <a href="https://t.me/SolEcho" target="_blank" rel="noopener noreferrer" className="text-black hover:text-[#B671FF] transition-colors">
              <Icon icon="mdi:telegram" className="text-xl" />
            </a>
            {renderAuthButton()}
          </div>
        </div>

        {/* Mobile Search Input */}
        {searchOpen && (
          <div className="absolute top-16 left-0 w-full bg-black p-3 z-50">
            <div className="relative search-container">
              <Input
                placeholder={t('Search Users and Addresses')}
                className="w-full bg-white text-black rounded-2xl p-2 pr-10"
                value={searchQuery}
                onChange={handleSearchChange}
                autoFocus
                onFocus={() => {
                  if (searchQuery.trim()) {
                    setShowSearchResults(true);
                    setShowRecentSearches(false);
                  } else if (recentSearches.length > 0) {
                    setShowRecentSearches(true);
                    setShowSearchResults(false);
                  }
                }}
              />
              <div
                className="absolute right-0 top-0 h-full flex items-center px-3 bg-gradient-to-r from-[#B671FF] via-[#C577EE] to-[#E282CA] rounded-tr-2xl rounded-br-2xl cursor-pointer"
                onClick={handleSearchButtonClick}
              >
                <Icon icon="lucide:search" className="text-black" />
              </div>

              {/* Mobile Recent Searches */}
              {showRecentSearches && !showSearchResults && (
                <RecentSearches
                  searches={recentSearches}
                  onSelectSearch={selectRecentSearch}
                  onClearSearch={clearRecentSearch}
                  onClearAll={clearAllRecentSearches}
                />
              )}

              {/* Mobile Search Results */}
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute top-full left-0 w-full mt-1 bg-white rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto scrollbar-hide">
                  {isSearching ? (
                    <div className="flex justify-center items-center p-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#FEB4B0]"></div>
                    </div>
                  ) : (
                    <div className="p-2">
                      {searchResults.map(user => (
                        <div
                          key={user._id}
                          className="flex items-center p-2 hover:bg-gray-100 rounded-md cursor-pointer"
                          onClick={() => navigateToProfile(user.username)}
                        >
                          <img
                            src={user.profileImage ? (user.profileImage.startsWith('http') ? user.profileImage : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${user.profileImage}`) : '/svg.png'}
                            alt={user.username}
                            className="w-10 h-10 rounded-full mr-3 border border-gray-200"
                          />
                          <span className="font-medium">@{user.username}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Mobile Sidebar */}
      {menuOpen && (
        <div className="fixed top-16 left-0 w-11/12 h-full bg-white flex flex-col justify-between p-6 z-[99]">
          {/* Sidebar Content */}
          <div className="overflow-auto flex-1 pb-12">
            <button className="text-black text-2xl mb-4" onClick={() => setMenuOpen(false)}>
              <Icon icon="mdi:close" />
            </button>
            <div className="space-y-6">
              <Sidebar />
              <TrendingHashtags />

              <SolanaTrendingSection />



            </div>
          </div>

          {/* Auth Button */}
          <div className="border-t pt-2 pb-4 mb-10">{renderAuthButton()}</div>
        </div>
      )}

      {/* Fixed HotCoins section */}
      <div className="fixed top-0 w-full">
        <div className="container mx-auto mt-16 px-6 pt-4 pb-2">
          <div className="flex items-center">
            <HotCoins />
          </div>
        </div>
      </div>

      {/* Desktop Search Bar */}


      <div className="container mx-auto px-6 pt-24">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left sidebar - fixed position with scrollable content */}
          <aside
            className="md:w-1/4 hidden md:block fixed left-6 right-auto overflow-y-auto"
            style={{
              width: 'calc(25% - 1.5rem)',
              height: columnHeight,
              top: '96px',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
          >
            <style jsx>{`
              aside::-webkit-scrollbar {
                display: none;
              }
            `}</style>
            <div className="space-y-6 pb-6">
              <Sidebar />
              <SupportChat />
            </div>
          </aside>

          {/* Main content - fixed position with scrollable content */}
          <main
            className="w-full px-4 pt-4 md:w-[calc(50%-1.5rem)] md:px-0 md:fixed md:left-1/2 md:transform md:-translate-x-1/2 md:top-[140px] overflow-y-auto"
            style={{
              height: columnHeight,
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            <style jsx>{`
              main::-webkit-scrollbar {
                display: none;
              }
            `}</style>
            <div className="space-y-6 pb-6">
              {children}
            </div>
          </main>

          {/* Right sidebar - fixed position with scrollable content */}
          <aside
            className="md:w-1/4 hidden md:block fixed right-6 left-auto overflow-y-auto"
            style={{
              width: 'calc(25% - 1.5rem)',
              height: columnHeight,
              top: '96px',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
          >
            <style jsx>{`
              aside::-webkit-scrollbar {
                display: none;
              }
            `}</style>
            <div className="space-y-6 pb-6">
              <TrendingHashtags />
              <div className="flex justify-center">
                <FearGreedIndex />
              </div>
              <SolanaTrendingSection />
            </div>
          </aside>
        </div>
      </div>

      {/* Wallet Modal */}
      <ConnectWalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        connectedWalletInfo={authState.wallet}
        isFromUserProfile={true}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(userData) => {
          console.log('Auth success with user data:', userData);
          setAuthState(prev => ({ ...prev, user: userData }));
          setIsAuthModalOpen(false);
        }}
      />

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userInfo={authState.user}
        onConnectWallet={() => {
          setIsProfileModalOpen(false);
          setIsWalletModalOpen(true);
        }}
        onLogout={handleLogout}
        connectedWalletInfo={authState.wallet}
      />

      {/* Direct Message Popup */}
      <MessagePopup
        isOpen={isMessageOpen}
        setIsOpen={setIsMessageOpen}
        initialContactId={messageUserId}
        initialContactUsername={messageUsername}
        initialContactProfileImage={messageUserImage}
        initialMessage={messageText}
        onUnreadCountChange={() => { }}
      >
        <div></div>
      </MessagePopup>

      {/* DartAI Button - Floating button for mobile */}
      <DartAIButton />
    </div>
  );
}