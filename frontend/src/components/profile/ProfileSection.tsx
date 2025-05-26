"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button, Card, Badge, Tooltip } from "@heroui/react";
import { Icon } from "@iconify/react";
import { DynamicPostCard } from "@/components/home/DynamicPostCard";
import EditProfileModal from "@/components/profile/EditProfileModal";
import MessagePopup from "@/components/home/MessagePopup";
import api from '@/lib/apiUtils';
import { toast } from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';
import { AuthModal } from "../auth/AuthModal";
import Image from 'next/image';

interface ProfileData {
  _id?: string;
  name: string;
  username: string;
  bio: string;
  walletAddress: string;
  followers: number;
  following: number;
  darts: number;
  events: number;
  isVerified: boolean;
  coverImage: string;
  profileImage: string;
  socialLinks: {
    website: string;
    telegram: string;
    twitter: string;
    discord: string;
  };
}

interface Post {
  _id: string;
  user: {
    _id: string;
    username: string;
    profileImage: string;
  };
  content: string;
  media?: Array<{
    type: 'image' | 'video' | 'gif';
    url: string;
  }>;
  poll?: {
    question: string;
    options: Array<{
      text: string;
      votes: number;
    }>;
    expiresAt: string;
  };
  likes: string[];
  comments: Array<{
    _id: string; // Adding the missing _id property
    user: {
      _id: string;
      username: string;
      profileImage: string;
    };
    text: string;
    date: string;
  }>;
  createdAt: string;
  isPinned: boolean;
}

// We're now using DynamicPostCard directly, so we don't need the PostCard wrapper component

interface ProfileSectionProps {
  userId?: string; // Optional userId parameter for viewing other profiles
  username?: string; // Optional username parameter for viewing profiles by username
}

const ProfileSection: React.FC<ProfileSectionProps> = ({ userId, username }) => {
  const [isOwnProfile, setIsOwnProfile] = useState(true); // Track if viewing own profile
  const [isFollowing, setIsFollowing] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [activeTab, setActiveTab] = useState("Darts"); // Add state for active tab
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null); // Track authentication status
  const [isMessageOpen, setIsMessageOpen] = useState(false); // State for message popup
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [profileData, setProfileData] = useState<ProfileData>({
    _id: "",
    name: "",
    username: "",
    bio: "",
    walletAddress: "",
    followers: 0,
    following: 0,
    darts: 0,
    events: 0,
    isVerified: false,
    coverImage: "",
    profileImage: "",
    socialLinks: {
      website: "",
      telegram: "",
      twitter: "",
      discord: "",
    },
  });


  const socialIcons: { [key: string]: string } = {
    website: "mdi:web",
    telegram: "mdi:telegram",
    twitter: "mdi:twitter",
    discord: "mdi:discord",
    ethereum: "mdi:ethereum"
  };

  // Initialize socket connections
  useEffect(() => {
    // Setup real-time socket connection
    const socketInstance = io(process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000");
    setSocket(socketInstance);

    // Listen for new posts
    socketInstance.on("newPost", (newPost: Post) => {
      // Only add posts from this user to the profile page
      if (newPost.user._id === profileData._id) {
        setPosts(prevPosts => [newPost, ...prevPosts]);
        // Update the dart count in the profile data
        setProfileData(prevData => ({
          ...prevData,
          darts: prevData.darts + 1
        }));
        toast.success("New post created!");
      }
    });

    // Listen for post updates
    socketInstance.on("postUpdated", (updatedPost: Post) => {
      setPosts(prevPosts =>
        prevPosts.map(post => {
          if (post._id === updatedPost._id) {
            // Merge the updated post with the existing post to preserve all data
            return {
              ...post,
              ...updatedPost,
              // Ensure user data is preserved
              user: updatedPost.user ? {
                ...post.user,
                ...updatedPost.user
              } : post.user
            };
          }
          return post;
        })
      );
    });

    // Listen for post deletions
    socketInstance.on("postDeleted", (postId: string) => {
      setPosts(prevPosts => {
        const wasUserPost = prevPosts.some(post => post._id === postId && post.user._id === profileData._id);
        const updatedPosts = prevPosts.filter(post => post._id !== postId);

        // If it was the user's post, update the dart count
        if (wasUserPost) {
          setProfileData(prevData => ({
            ...prevData,
            darts: updatedPosts.length
          }));
        }

        return updatedPosts;
      });
      toast.success("Post removed");
    });

    // Cleanup on unmount
    return () => {
      socketInstance.disconnect();
    };

  }, [profileData._id, profileData.profileImage, profileData.username]);

  // Function to fetch profile data from API
  const fetchProfileData = useCallback(async () => {
    try {
      let response;
      let currentUserData;

      // First, get the current user's data to compare
      try {
        const currentUserResponse = await api.get("/users/profile");
        currentUserData = currentUserResponse.data.user;
      } catch (error) {
        console.error("Error fetching current user data:", error);
      }

      if (username === 'me') {
        // Fetch current user's profile
        response = await api.get("/users/profile");
        setIsOwnProfile(true);
      } else if (username) {
        // Fetch user profile by username
        response = await api.get(`/users/profile/${username}`);
        // Check if this is the current user's profile by comparing usernames
        setIsOwnProfile(currentUserData && currentUserData.username === username);
      } else if (userId) {
        // For backward compatibility - fetch by userId if provided
        response = await api.get(`/users/profile/${userId}`);
        // Check if this is the current user's profile by comparing IDs
        setIsOwnProfile(currentUserData && currentUserData._id === userId);
      } else {
        // Fetch current user's profile as fallback
        response = await api.get("/users/profile");
        setIsOwnProfile(true);
      }

      console.log("Fetched profile data:", response.data);

      if (response.data && response.data.user) {
        const userData = response.data.user;
        setProfileData((prevState) => ({
          ...prevState,
          _id: userData._id,
          name: userData.name || prevState.name,
          username: userData.username,
          bio: userData.bio || prevState.bio,
          walletAddress: userData.walletAddress || prevState.walletAddress,
          profileImage: userData.profileImage || prevState.profileImage,
          coverImage: userData.coverImage || prevState.coverImage,
          followers: userData.followers || prevState.followers,
          following: userData.following || prevState.following,
          darts: userData.darts !== undefined ? userData.darts : prevState.darts,
          events: userData.events || prevState.events,
          isVerified: userData.isVerified || prevState.isVerified,
          socialLinks: userData.socialLinks || prevState.socialLinks,
        }));

        // Check if user is following this profile
        if (!isOwnProfile && userData.followers) {
          setIsFollowing(userData.isFollowing || false);
        }

        // User is authenticated
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error("Error fetching profile data:", error);

      // Fallback to auth/user endpoint if the profile endpoint fails
      try {
        const authResponse = await api.get("/auth/user");
        if (authResponse.data) {
          setProfileData((prevState) => ({
            ...prevState,
            _id: authResponse.data.id,
            name: authResponse.data.name || prevState.name,
            username: authResponse.data.username,
            bio: authResponse.data.bio || prevState.bio,
            walletAddress: authResponse.data.walletAddress || prevState.walletAddress,
          }));

          // User is authenticated
          setIsAuthenticated(true);
        }
      } catch (fallbackError) {
        console.error("Fallback auth fetch also failed:", fallbackError);
        // User is not authenticated
        setIsAuthenticated(false);
        setLoading(false);
      }
    }
  }, [userId, username]);

  // Function to fetch user posts
  const fetchUserPosts = useCallback(async () => {
    try {
      setLoading(true);
      // Use the api utility instead of axios directly to ensure authentication token is sent
      const response = await api.get(`/posts/user/${profileData._id}`);

      if (response.data.success) {
        const fetchedPosts = response.data.posts;

        // Sort posts to show pinned posts at the top
        const sortedPosts = [...fetchedPosts].sort((a, b) => {
          // First sort by pinned status (pinned posts first)
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          // Then sort by date (newest first)
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        setPosts(sortedPosts);

        // Update the dart count based on the actual number of posts ONLY for own profile
        // For other users' profiles, we trust the dart count from their profile data
        // which is now being updated correctly on the backend
        if (isOwnProfile) {
          setProfileData(prevData => ({
            ...prevData,
            darts: fetchedPosts.length
          }));
        }
      } else {
        // Fallback to empty array if no posts
        setPosts([]);

        // If no posts and it's own profile, set dart count to 0
        // For other users, keep their original dart count
        if (isOwnProfile) {
          setProfileData(prevData => ({
            ...prevData,
            darts: 0
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching user posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [profileData._id, isOwnProfile, setProfileData, setPosts, setLoading]);

  // Function to fetch saved posts
  const fetchSavedPosts = useCallback(async (showLoading = false) => {
    try {
      // Only show loading indicator if explicitly requested
      if (showLoading) {
        setLoading(true);
      }

      // Use the api utility to fetch saved posts
      const response = await api.get('/posts/saved');

      if (response.data.success) {
        setSavedPosts(response.data.posts);
      } else {
        // Fallback to empty array if no saved posts
        setSavedPosts([]);
      }
    } catch (error) {
      console.error('Error fetching saved posts:', error);
      toast.error('Failed to load saved posts');
    } finally {
      // Only update loading state if we set it to true earlier
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [setSavedPosts, setLoading]);

  // Load data on component mount or when userId/username changes
  useEffect(() => {
    // Load profile data when component mounts or userId/username changes
    fetchProfileData();
    // We'll fetch posts after profile data is loaded and authentication is confirmed
  }, [userId, username, fetchProfileData]);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  // Fetch posts whenever profile data changes
  useEffect(() => {
    if (profileData._id) {
      fetchUserPosts();
    }
  }, [profileData._id, fetchUserPosts]);

  // Fetch saved posts when the Saved tab is clicked
  useEffect(() => {
    if (activeTab === "Saved" && profileData._id) {
      // Only show loading on initial load (when savedPosts is empty)
      const showLoading = savedPosts.length === 0;
      fetchSavedPosts(showLoading);
    }
  }, [activeTab, profileData._id, savedPosts.length, fetchSavedPosts]);

  // Pre-fetch saved posts when profile data is loaded
  useEffect(() => {
    if (isOwnProfile && profileData._id) {
      // Silently fetch saved posts in the background without showing loading state
      fetchSavedPosts(false);
    }
  }, [isOwnProfile, profileData._id, fetchSavedPosts]);

  const handleFollow = async () => {
    try {
      // Use the follow endpoint for both follow and unfollow actions
      // The backend will handle toggling the follow state
      const response = await api.post(`/users/follow/${profileData._id}`, {});

      // Update state based on the response from the server
      if (response.data.success) {
        setIsFollowing(response.data.isFollowing);
        toast.success(response.data.message || (response.data.isFollowing ? 'Following successfully' : 'Unfollowed successfully'));

        // Update follower count based on the new follow state
        setProfileData(prev => ({
          ...prev,
          followers: prev.followers + (response.data.isFollowing ? 1 : -1)
        }));
      }
    } catch (error) {
      console.error(`Error ${isFollowing ? 'unfollowing' : 'following'} user:`, error);
      toast.error(`Failed to ${isFollowing ? 'unfollow' : 'follow'} user`);
    }
  };

  const handleEditProfile = async (newData: Partial<ProfileData>) => {
    try {
      const formData = new FormData();

      if (newData.name) formData.append("name", newData.name);
      formData.append("username", newData.username || profileData.username);

      if (newData.bio) formData.append("bio", newData.bio);
      if (newData.walletAddress) formData.append("walletAddress", newData.walletAddress);

      // ✅ Fix: Always include socialLinks to ensure they're saved properly
      const socialLinksToSave = newData.socialLinks || profileData.socialLinks || {};
      formData.append("socialLinks", JSON.stringify(socialLinksToSave));

      // Handle profile image if it's a data URL (from file input)
      if (newData.profileImage && newData.profileImage.startsWith("data:image")) {
        const profileImageBlob = await fetch(newData.profileImage).then((r) => r.blob());
        formData.append("profileImage", profileImageBlob, "profile-image.jpg");
      }

      // Handle cover image if it's a data URL (from file input)
      if (newData.coverImage && newData.coverImage.startsWith("data:image")) {
        const coverImageBlob = await fetch(newData.coverImage).then((r) => r.blob());
        formData.append("coverImage", coverImageBlob, "cover-image.jpg");
      }

      const response = await api.put("/users/profile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.success) {
        // Update local state with the response data
        const updatedUser = response.data.user;
        setProfileData((prev) => ({
          ...prev,
          ...updatedUser,
          socialLinks: {
            ...prev.socialLinks,
            ...(updatedUser.socialLinks || {}),
          },
        }));

        // Close the modal
        setIsEditModalOpen(false);

        toast.success("Profile updated successfully");

        // Reload the page to ensure all changes are reflected
        window.location.reload();
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    }
  };

  const handleEditProfileModalSave = async (updatedData: Partial<ProfileData>) => {
    await handleEditProfile(updatedData);
    setProfileData((prev) => ({ ...prev, ...updatedData })); // ✅ Update state
  };

  // Handle share profile functionality
  const handleShareProfile = async () => {
    try {
      // Get the current URL for sharing
      const profileUrl = window.location.href;

      // Copy to clipboard
      await navigator.clipboard.writeText(profileUrl);
      toast.success('Profile link copied to clipboard! You can now share it anywhere.');

      // If Web Share API is available, offer additional sharing options
      if (navigator.share) {
        try {
          await navigator.share({
            title: `${profileData.name || profileData.username}'s Profile on CoinDart`,
            text: `Check out ${profileData.name || profileData.username}'s profile on CoinDart!`,
            url: profileUrl,
          });
        } catch {
          // User likely canceled the share operation, no need to show error
          console.log('Share canceled or not supported');
        }
      }
    } catch (error) {
      console.error('Error sharing profile:', error);
      toast.error('Failed to share profile');
    }
  };

  // Handle post like
  // In ProfileSection.tsx, update the handleLikePost function:

  const handleLikePost = async (postId: string) => {
    try {
      // Find the post in the current state
      const postIndex = posts.findIndex(post => post._id === postId);
      if (postIndex === -1) return;

      // Make a COMPLETE copy of the post we want to update
      const postToUpdate = { ...posts[postIndex] };

      // Check if the current user has already liked this post
      const isLiked = postToUpdate.likes.includes(profileData._id || '');

      // Update the likes array based on whether the user has already liked it
      if (isLiked) {
        // Remove the like
        postToUpdate.likes = postToUpdate.likes.filter(id => id !== profileData._id);
      } else {
        // Add the like
        postToUpdate.likes = [...postToUpdate.likes, profileData._id || ''];
      }

      // Create a new posts array with the updated post
      const updatedPosts = [...posts];
      updatedPosts[postIndex] = postToUpdate;

      // Update state with the new array
      setPosts(updatedPosts);

      // Send API request to update like status on the server
      await api.post(`/posts/like/${postId}`);

      // Emit socket event for real-time updates
      if (socket) {
        socket.emit('updatePost', postToUpdate);
      }
    } catch (error) {
      console.error('Error updating post like state:', error);
      toast.error('Failed to update like');
    }
  };

  // Handle post comment
  const handleCommentPost = async (postId: string, commentText: string) => {
    try {
      const response = await api.post(`/posts/comment/${postId}`, {
        text: commentText
      });

      if (response.data) {
        setPosts(prevPosts =>
          prevPosts.map(post => {
            if (post._id === postId) {
              return {
                ...post,
                comments: [
                  ...post.comments,
                  {
                    _id: response.data.comment._id || `temp-${Date.now()}`, // Add the _id property
                    user: {
                      _id: profileData._id || '',
                      username: profileData.username,
                      profileImage: profileData.profileImage
                    },
                    text: commentText,
                    date: new Date().toISOString()
                  }
                ]
              };
            }
            return post;
          })
        );

        // Emit socket event for real-time updates
        if (socket) {
          socket.emit('updatePost', response.data);
        }
      }
    } catch (error) {
      console.error('Error commenting on post:', error);
      toast.error('Failed to add comment');
    }
  };

  // Function to create a new dart/post

  useEffect(() => {
    // Listen for wallet connection changes
    const handleWalletChange = () => {
      const storedWalletInfo = localStorage.getItem('connectedWalletInfo');
      if (storedWalletInfo) {
        try {
          const walletInfo = JSON.parse(storedWalletInfo);
          if (walletInfo && walletInfo.type === "wallet" && walletInfo.data?.address) {
            setProfileData(prev => ({
              ...prev,
              walletAddress: walletInfo.data.address
            }));
          }
        } catch (error) {
          console.error("Error parsing wallet info:", error);
        }
      }
    };

    // Initial check
    handleWalletChange();

    // Add event listeners
    window.addEventListener('storage', handleWalletChange);
    window.addEventListener('walletConnected', handleWalletChange);
    window.addEventListener('walletDisconnected', () => {
      setProfileData(prev => ({
        ...prev,
        walletAddress: ""
      }));
    });

    return () => {
      window.removeEventListener('storage', handleWalletChange);
      window.removeEventListener('walletConnected', handleWalletChange);
      window.removeEventListener('walletDisconnected', () => { });
    };
  }, []);

  return (
    <div className="max-w-full md:max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8">
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <Card className="shadow-lg rounded-lg overflow-hidden text-black border border-shadow-lg">
          <div className="relative h-[150px] md:h-[200px] shadow-[0px_4px_15px_rgba(128,128,128,0.4)] w-full">
            {isAuthenticated === false ? (
              <div className="w-full h-full bg-gray-800 rounded-t-xl flex items-center justify-center">
                <Icon icon="lucide:image" className="text-4xl text-gray-600" />
              </div>
            ) : profileData.coverImage ? (
              <Image
                src={
                  profileData.coverImage.startsWith('http')
                    ? profileData.coverImage
                    : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${profileData.coverImage}`
                }
                alt="Cover"
                fill
                className="object-cover rounded-t-xl"
                style={{ objectFit: 'cover' }}
                sizes="100vw"
              />
            ) : (
              <div className="w-full h-full bg-gray-800 rounded-t-xl flex items-center justify-center">
                <Icon icon="lucide:image" className="text-4xl text-gray-600" />
              </div>
            )}
            <div className="absolute -bottom-12 md:-bottom-16 left-4 md:left-6">
              {isAuthenticated === false ? (
                <div className="w-24 h-24 md:w-32 md:h-32 bg-gray-700 rounded-full ring-4 ring-white flex items-center justify-center">
                  <Icon icon="lucide:user" className="text-4xl text-gray-500" />
                </div>
              ) : profileData.profileImage ? (
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full ring-4 ring-white overflow-hidden relative">
                  <Image
                    src={
                      profileData.profileImage.startsWith('http')
                        ? profileData.profileImage
                        : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${profileData.profileImage}`
                    }
                    alt="Profile"
                    fill
                    className="object-cover rounded-full"
                    sizes="(max-width: 768px) 96px, 128px"
                  />
                </div>
              ) : (
                <div className="w-24 h-24 md:w-32 md:h-32 bg-gray-700 rounded-full ring-4 ring-white flex items-center justify-center">
                  <Icon icon="lucide:user" className="text-4xl text-gray-500" />
                </div>
              )}
            </div>
          </div>

          <div className="px-4 md:px-6 pt-16 md:pt-20 pb-6 text-black">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
              <div>
                <div className="flex items-center gap-2">
                  {isAuthenticated === false ? (
                    <h1 className="text-xl md:text-2xl font-bold text-black"><span className="text-gray-400">User Name</span></h1>
                  ) : (
                    <h1 className="text-xl md:text-2xl font-bold text-black">{profileData.name || <span className="text-gray-400">Your Name</span>}</h1>
                  )}
                  {isAuthenticated !== false && profileData.isVerified && <Badge color="primary" variant="flat"><Icon icon="lucide:check" className="text-lg" /></Badge>}
                </div>
                {isAuthenticated === false ? (
                  <p className="text-[#B671FF] text-sm md:text-base"><span className="text-[#B671FF]">@username</span></p>
                ) : (
                  <p className="text-[#B671FF] text-sm md:text-base">
                    {profileData.username ? `@${profileData.username}` : <span className="text-[#B671FF]">@username</span>}
                  </p>
                )}

                <div className="flex flex-wrap gap-3 mt-4">
                  {isAuthenticated !== false && Object.entries(profileData.socialLinks || {})
                    .filter(([key, link]) =>
                      link &&
                      link.trim() !== '' &&
                      socialIcons[key]
                    )
                    .map(([key, link]) => (
                      <Tooltip
                        key={key}
                        content={key.charAt(0).toUpperCase() + key.slice(1)}
                        className="bg-white text-black shadow-lg rounded-lg p-2"
                      >
                        <a
                          href={
                            link.startsWith('http://') || link.startsWith('https://')
                              ? link
                              : `https://${link}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-black hover:text-primary transition-colors duration-2 rounded-full flex items-center justify-center shadow-md border border-gray-300"
                        >
                          <Icon icon={socialIcons[key]} className="text-xl md:text-xl" />
                        </a>
                      </Tooltip>
                    ))}
                </div>
              </div>

              {isAuthenticated !== false ? (
                <div className="flex flex-col sm:flex-row gap-2 mt-4 sm:mt-0">
                  {!isOwnProfile && (
                    <>
                      <Button
                        className="bg-gradient-to-r from-[#B671FF] via-[#C577EE] to-[#E282CA] 
             text-black hover:!bg-black hover:!from-black hover:!via-black hover:!to-black 
             hover:text-white font-semibold rounded-md px-3 py-2 md:px-4 md:py-2 transition-all shadow-lg"
                        onPress={handleFollow}
                        startContent={<Icon icon={isFollowing ? "lucide:check" : "lucide:plus"} />}
                      >
                        {isFollowing ? "Following" : "Follow"}
                      </Button>

                      <Button
                        className="bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-md px-3 py-2 md:px-4 md:py-2 transition-all shadow-lg"
                        onPress={() => setIsMessageOpen(true)}
                        startContent={<Icon icon="lucide:mail" />}
                      >
                        Message
                      </Button>

                      <Button
                        className="bg-green-500 hover:bg-green-600 text-white font-semibold rounded-md px-3 py-2 md:px-4 md:py-2 transition-all shadow-lg"
                        onPress={handleShareProfile}
                        startContent={<Icon icon="lucide:share" />}
                      >
                        Share
                      </Button>
                    </>
                  )}

                  {isOwnProfile && (
                    <>
                      <Button
                        className="bg-green-500 hover:bg-green-600 text-white font-semibold rounded-md px-3 py-2 md:px-4 md:py-2 transition-all shadow-lg"
                        onPress={handleShareProfile}
                        startContent={<Icon icon="lucide:share" />}
                      >
                        Share
                      </Button>
                      <Button
                        className="bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-md px-3 py-2 md:px-4 md:py-2 transition-all shadow-lg"
                        onPress={() => setIsEditModalOpen(true)}
                      >
                        Edit Profile
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2 mt-4 sm:mt-0">
                  <Button
                    className="bg-gradient-to-r from-[#B671FF] via-[#C577EE] to-[#E282CA] 
             text-black hover:!bg-black hover:!from-black hover:!via-black hover:!to-black 
             hover:text-white font-semibold rounded-md px-6 py-2 transition-all shadow-lg"
                    onClick={() => setIsAuthModalOpen(true)}
                  >
                    Sign In
                  </Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:flex sm:gap-6 mb-4 text-sm md:text-base">
              {isAuthenticated === false ? (
                <>
                  <div><span className="font-bold">0</span> <span className="text-default-500">Followers</span></div>
                  <div><span className="font-bold">0</span> <span className="text-default-500">Following</span></div>
                  <div><span className="font-bold">0</span> <span className="text-default-500">Echos</span></div>
                  <div><span className="font-bold">0</span> <span className="text-default-500">Events</span></div>
                </>
              ) : (
                <>
                  <div><span className="font-bold">{profileData.followers.toLocaleString()}</span> <span className="text-default-500">Followers</span></div>
                  <div><span className="font-bold">{profileData.following}</span> <span className="text-default-500">Following</span></div>
                  <div><span className="font-bold">{profileData.darts}</span> <span className="text-default-500">Echos</span></div>
                </>
              )}
            </div>

            {isAuthenticated === false ? (
              <p className="mb-4 text-black text-sm md:text-base"><span className="text-gray-400"></span></p>
            ) : (
              <p className="mb-4 text-black text-sm md:text-base">{profileData.bio || <span className="text-gray-400"></span>}</p>
            )}

            <div className="flex items-center gap-2 text-white text-xs md:text-sm">
              <div className="flex items-center gap-2 bg-[#1a1a1a] px-3 py-2 rounded-lg border border-[#2a2a2a] shadow-lg">
                <Icon icon="lucide:wallet" className="text-[#B671FF]" />
                {profileData.walletAddress ? (
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{profileData.walletAddress}</span>
                    <Tooltip content="Copy to clipboard" className="bg-black text-white px-2 py-1 rounded">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(profileData.walletAddress);
                          toast.success('Wallet address copied to clipboard!');
                        }}
                        className="text-gray-400 hover:text-[#B671FF] transition-colors"
                      >
                        <Icon icon="lucide:copy" className="text-sm" />
                      </button>
                    </Tooltip>
                    <Icon icon="lucide:check-circle" className="text-green-500 text-sm" />
                  </div>
                ) : (
                  <span className="text-gray-400">No wallet connected</span>
                )}
              </div>
            </div>

            <div className="flex w-full rounded-lg border-b mt-10 border-default-200 shadow-[0px_4px_15px_rgba(128,128,128,0.4)]">
              <Button
                variant="light"
                className={`transition rounded-lg duration-200 w-1/2 ${activeTab === "Darts" ? 'bg-black text-[#B671FF] hover:bg-black hover:text-[#B671FF]' : 'bg-white text-black hover:bg-[#f3f3f3]'}`}
                onClick={() => setActiveTab("Darts")}
              >
                Echos
              </Button>
              {isOwnProfile ? (
                <Button
                  variant="light"
                  className={`transition rounded-lg duration-200 w-1/2 ${activeTab === "Saved" ? 'bg-black text-[#B671FF] hover:bg-black hover:text-[#B671FF]' : 'bg-white text-black hover:bg-[#f3f3f3]'}`}
                  onClick={() => setActiveTab("Saved")}
                >
                  Saved
                </Button>
              ) : null}
            </div>

            {/* Content based on active tab */}
            {activeTab === "Darts" && (
              <>
                {/* Posts section header */}
                <div className="mt-4 mb-4">
                  <h2 className="text-xl font-bold text-black">All Posts</h2>
                </div>

                <div className="mt-4">
                  {loading ? (
                    <div className="text-center py-8 text-black">Loading posts...</div>
                  ) : posts.length === 0 ? (
                    isOwnProfile ? (
                      <div className="text-center py-8 text-black">No posts yet. Check out the home page to create your first dart!</div>
                    ) : (
                      <div className="text-center py-8 text-black">No posts yet.</div>
                    )
                  ) : (
                    posts.map((post) => (
                      <DynamicPostCard
                        key={post._id}
                        _id={post._id}
                        user={post.user}
                        content={post.content}
                        media={post.media}
                        poll={post.poll ? {
                          question: post.poll.question,
                          options: post.poll.options.map(opt => ({
                            text: opt.text,
                            votes: opt.votes,
                            voters: [] // Add missing voters array
                          })),
                          expiresAt: post.poll.expiresAt
                        } : undefined}
                        likes={post.likes}
                        comments={post.comments}
                        createdAt={post.createdAt}
                        isPinned={post.isPinned}
                        currentUserId={profileData._id}
                        onLike={() => handleLikePost(post._id)}
                        onComment={(postId, comment) => handleCommentPost(postId, comment)}
                        isHomePage={false}
                      />
                    ))
                  )}
                </div>
              </>
            )}

            {activeTab === "Saved" && (
              <>
                {/* Saved posts section header */}
                <div className="mt-4 mb-4">
                  <h2 className="text-xl font-bold text-black">Saved Posts</h2>
                </div>

                <div className="mt-4">
                  {loading ? (
                    <div className="text-center py-8 text-black">Loading saved posts...</div>
                  ) : savedPosts.length === 0 ? (
                    <div className="text-center py-8 text-black">No saved posts yet. Save posts from the home feed to see them here!</div>
                  ) : (
                    savedPosts.map((post) => (
                      <DynamicPostCard
                        key={post._id}
                        _id={post._id}
                        user={post.user}
                        content={post.content}
                        media={post.media}
                        poll={post.poll ? {
                          question: post.poll.question,
                          options: post.poll.options.map(opt => ({
                            text: opt.text,
                            votes: opt.votes,
                            voters: [] // Add required voters property
                          })),
                          expiresAt: post.poll.expiresAt
                        } : undefined}
                        likes={post.likes}
                        comments={post.comments}
                        createdAt={post.createdAt}
                        isPinned={post.isPinned}
                        currentUserId={profileData._id}
                        onLike={() => handleLikePost(post._id)}
                        onComment={(postId, comment) => handleCommentPost(postId, comment)}
                        isSaved={true}
                        onDelete={() => fetchSavedPosts()} // Refresh saved posts when a post is unsaved
                        isHomePage={false}
                      />
                    ))
                  )}
                </div>
              </>
            )}

            <EditProfileModal
              isOpen={isEditModalOpen}
              onClose={() => setIsEditModalOpen(false)}
              profileData={profileData}
              setProfileData={setProfileData}
              fetchProfileData={fetchProfileData}
              onSave={handleEditProfileModalSave}
            />

            {/* Add MessagePopup component for messaging functionality */}
            {!isOwnProfile && (
              <MessagePopup
                isOpen={isMessageOpen}
                setIsOpen={setIsMessageOpen}
                initialContactId={profileData._id}
                initialContactUsername={profileData.username}
                initialContactProfileImage={profileData.profileImage}
                fromUserProfile={true}
              >
                {/* PopoverTrigger requires a child element */}
                <div></div>
              </MessagePopup>
            )}

            <AuthModal
              isOpen={isAuthModalOpen}
              onClose={() => setIsAuthModalOpen(false)}
              onSuccess={async () => {
                setIsAuthModalOpen(false);
                // Fetch profile data after successful login
                await fetchProfileData();
                // Then reload the page to ensure all state is updated
                window.location.reload();
              }}
            />

          </div>
        </Card>
      )}
    </div>
  );
};

export default ProfileSection;