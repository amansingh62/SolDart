"use client";

import React, { ReactNode, useState, useEffect } from "react";
import { Button, Input } from "@heroui/react";
import { Icon } from "@iconify/react";
import { Sidebar } from "@/components/home/Sidebar";
import { HotCoins } from "@/components/home/HotCoins";
import { FearGreedIndex } from "@/components/home/FearGreedIndex";
import { TrendingSection } from "@/components/home/TrendingSection";
import { TrendingHashtags } from "@/components/home/TrendingHashtags";
import { SolanaTrendingSection } from "@/components/home/SolanaTrendingSection";
import SupportChat from "@/components/home/SupportChat";
import { AdsSection } from "@/components/home/AdsSection";
import { ConnectWalletModal } from "@/components/wallet/ConnectWalletModal";
import { UserProfileModal } from "@/components/auth/UserProfileModal";
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

const EMOJIS = ["🦊", "🐼", "🐯", "🦁", "🐸", "🐙", "🦄", "🐳", "🦋", "🐝", "🦖", "🐢"];

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
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
  const [connectedWallet, setConnectedWallet] = useState<{
    type: "wallet" | "email";
    data: any;
    emoji: string;
    address?: string;
  } | null>(null);
  const [userInfo, setUserInfo] = useState<{
    username?: string;
    email?: string;
    emoji?: string;
  } | null>(null);
  const [isWalletDropdownOpen, setIsWalletDropdownOpen] = useState(false);

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

  // Function to search for users or hashtags
  const searchUsers = async (query?: string, isButtonClick: boolean = false) => {
    let searchTerm = query || searchQuery;
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      // Show recent searches if available
      if (recentSearches.length > 0) {
        setShowRecentSearches(true);
      } else {
        setShowRecentSearches(false);
      }
      return;
    }

    try {
      setIsSearching(true);
      // Hide recent searches when searching
      setShowRecentSearches(false);

      // Check if the search term is a hashtag (starts with #)
      if (searchTerm.startsWith('#')) {
        // Only process hashtag search if it has content after the # symbol
        if (searchTerm.length > 1) {
          // Save the hashtag search to recent searches
          saveToRecentSearches(searchTerm);

          // Clear search results and hide them
          setSearchResults([]);
          setShowSearchResults(false);

          // Close search on mobile
          setSearchOpen(false);
          setSearchQuery('');

          // Use the HashtagContext from the parent component
          setIsSearching(false);

          // Navigate to home page with the hashtag in the URL
          const hashtag = encodeURIComponent(searchTerm);
          window.location.href = `/?hashtag=${hashtag}`;
          return;
        } else {
          // If only # is typed, don't do anything yet
          setIsSearching(false);
          return;
        }
      }

      // For user searches, remove @ symbol if it's at the beginning of the search term
      // This ensures the backend search works correctly while the UI still shows the @ symbol
      const termForSearch = searchTerm.startsWith('@') ? searchTerm.substring(1) : searchTerm;

      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/messages/search/${termForSearch}`, { withCredentials: true });
      if (response.data.success) {
        setSearchResults(response.data.users);
        setShowSearchResults(true);
        // Save the successful search to recent searches (with @ if it was included)
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
    window.location.href = `/profile/${username}`;
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
    // First try to restore wallet connection from localStorage
    const storedWalletInfo = localStorage.getItem('connectedWalletInfo');
    if (storedWalletInfo) {
      try {
        const parsedWalletInfo = JSON.parse(storedWalletInfo);
        if (parsedWalletInfo && parsedWalletInfo.address) {
          console.log("Restored wallet connection from localStorage:", parsedWalletInfo);
          setConnectedWallet(parsedWalletInfo);

          // Verify wallet connection with provider if it's a blockchain wallet
          if (parsedWalletInfo.type === "wallet" && parsedWalletInfo.data?.blockchain) {
            const walletType = parsedWalletInfo.data.blockchain;
            console.log(`Verifying ${walletType} wallet connection...`);

            // Import dynamically to avoid circular dependencies
            import("@/lib/walletUtils").then(({ checkWalletInstalled, connectWallet }) => {
              const isInstalled = checkWalletInstalled(walletType);
              if (isInstalled) {
                console.log(`${walletType} wallet is installed, attempting to reconnect silently...`);
                // We don't need to await this, it's just a verification
                connectWallet(walletType).catch(err => {
                  console.log(`Silent reconnection failed, but keeping UI state: ${err.message}`);
                  // We still keep the UI state even if reconnection fails
                });
              } else {
                console.log(`${walletType} wallet is not installed, but keeping UI state`);
              }
            });
          }
        }
      } catch (error) {
        console.error("Error parsing stored wallet info:", error);
        // Clear invalid data
        localStorage.removeItem('connectedWalletInfo');
      }
    }

    const checkAuth = async () => {
      try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/auth/user`, { withCredentials: true });
        if (response.data) {
          // User is authenticated
          const randomEmoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
          setUserInfo({
            username: response.data.username || response.data.name,
            email: response.data.email,
            emoji: randomEmoji
          });

          // Check if user has a connected wallet
          if (response.data.wallet) {
            const walletInfo = {
              type: "wallet" as const,
              data: { blockchain: response.data.wallet.type },
              emoji: randomEmoji,
              address: response.data.wallet.address
            };
            setConnectedWallet(walletInfo);

            // Store wallet info in localStorage for persistence
            localStorage.setItem('connectedWalletInfo', JSON.stringify(walletInfo));
          }
        }
      } catch (error) {
        console.log("Not authenticated");
      }
    };

    checkAuth();
  }, []);

  const handleConnect = (walletAddress: string) => {
    const randomEmoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    const walletInfo = {
      type: "wallet" as const,
      data: { blockchain: "phantom", address: walletAddress },
      emoji: randomEmoji,
      address: walletAddress
    };

    setConnectedWallet(walletInfo);
    localStorage.setItem('connectedWalletInfo', JSON.stringify(walletInfo));
    
    // Close the wallet modal
    setIsWalletModalOpen(false);
  };

  const handleDisconnect = () => {
    setConnectedWallet(null);
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
    // If user is logged in, show profile button
    if (userInfo) {
      return (
        <Button
          className="w-full bg-gradient-to-r from-[#B671FF] via-[#C577EE] to-[#E282CA]
             text-black hover:!bg-black hover:!from-black hover:!via-black hover:!to-black
             hover:text-white px-4 py-2 rounded-md border border-white shadow-md"
          onPress={() => {
            // Set flag to indicate modal is opened from profile button
            localStorage.setItem("walletModalSource", "userProfile");
            setIsProfileModalOpen(true);
          }}
          data-auth-allowed="true"
        >
          {connectedWallet?.address ? (
            <div className="flex items-center justify-center gap-2">
              <span>{connectedWallet.emoji}</span>
              <span className="text-xs truncate max-w-[100px] md:max-w-[150px] md:inline-block">
                {connectedWallet.address.substring(0, 4)}...{connectedWallet.address.substring(connectedWallet.address.length - 4)}
              </span>
            </div>
          ) : (
            "Connect"
          )}
        </Button>
      );
    }

    // If user is not logged in, show Connect button
    return (
      <Button
        className="w-full bg-gradient-to-r from-[#B671FF] via-[#C577EE] to-[#E282CA]
           text-black hover:!bg-black hover:!from-black hover:!via-black hover:!to-black
           hover:text-white px-4 py-2 rounded-md border border-white shadow-md"
        onPress={() => {
          // Set flag to indicate modal is opened from connect button
          localStorage.setItem("walletModalSource", "connect");
          setIsWalletModalOpen(true);
        }}
        data-auth-allowed="true"
      >
        {connectedWallet?.address ? (
          <div className="flex items-center justify-center gap-2">
            <span>{connectedWallet.emoji}</span>
            <span className="text-xs truncate max-w-[100px] md:max-w-[150px] md:inline-block">
              {connectedWallet.address.substring(0, 4)}...{connectedWallet.address.substring(connectedWallet.address.length - 4)}
            </span>
          </div>
        ) : (
          "Connect"
        )}
      </Button>
    );
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/auth/logout`, {}, { withCredentials: true });
      setUserInfo(null);
      setConnectedWallet(null);
      // Remove wallet info from localStorage
      localStorage.removeItem('connectedWalletInfo');
      // Remove walletModalSource flag
      localStorage.removeItem('walletModalSource');
      setIsProfileModalOpen(false);
      // Reset wallet modal state
      setIsWalletModalOpen(false);
      toast.success(t('success.loggedOut'));
    } catch (error) {
      console.error("Logout error:", error);
      toast.error(t('errors.failedLogout'));
    }
  };

  // Calculate the available height for the columns (viewport height minus navbar and HotCoins section)
  const columnHeight = "calc(105vh - 140px)";

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 w-full z-99 border-b border-[#ffffff]/30 backdrop-blur-md shadow-sm">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          {/* Mobile Menu Button */}
          <button className="md:hidden text-white text-2xl" onClick={() => setMenuOpen(!menuOpen)}>
            <Icon icon="mdi:menu" />
          </button>

          <div className="flex items-center">
            <img src="/solecho_logo.png" alt="" className="w-10" />

            <h1 className="text-2xl font-bold">Sol<span className="bg-gradient-to-r from-[#B671FF] via-[#C577EE] to-[#E282C9] text-transparent bg-clip-text">
              Echo</span></h1>

          </div>

           <div className="fixed left-1/2 transform -translate-x-1/2 w-[40vw] search-container mt-2">
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
          onClick={(e) => {
            e.preventDefault();
            // When search button is clicked, immediately execute the search
            // This allows users to manually trigger hashtag search when they're done typing
            searchUsers(undefined, true);
          }}
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
          <button className="md:hidden text-white text-2xl" onClick={() => setSearchOpen(!searchOpen)}>
            <Icon icon="lucide:search" />
          </button>



          <div className="relative  items-center gap-6 md:flex hidden">
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
          <div className="absolute top-16 left-0 w-full bg-black p-3">
            <div className="relative search-container">
              <Input
                placeholder={t('search')}
                className="w-full bg-white text-black rounded-md p-2 pr-10"
                value={searchQuery}
                onChange={handleSearchChange}
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
                className="absolute right-2 top-1/2 transform -translate-y-1/2 cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  // When search button is clicked, immediately execute the search
                  // This allows users to manually trigger hashtag search when they're done typing
                  searchUsers(undefined, true);
                }}
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
                            src={user.profileImage || '/svg.png'}
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

              <TrendingSection />



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
              <TrendingSection />

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
        connectedWalletInfo={connectedWallet}
      />

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userInfo={userInfo}
        onConnectWallet={() => {
          setIsProfileModalOpen(false);
          setIsWalletModalOpen(true);
        }}
        onLogout={handleLogout}
        connectedWalletInfo={connectedWallet}
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