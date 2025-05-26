'use client';

import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Icon } from "@iconify/react";
import api from '@/lib/apiUtils';
import { toast } from 'react-hot-toast';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { verifyRegisteredWallet } from '@/lib/walletUtils';
import { trackPostComment } from '@/lib/questUtils';
import { Socket } from 'socket.io-client';
import Image from 'next/image';

interface PollOption {
  text: string;
  votes: number;
  voters: string[];
}

interface Poll {
  question: string;
  options: PollOption[];
  expiresAt: string;
}

interface Media {
  type: 'image' | 'video' | 'gif';
  url: string;
}

interface PostUser {
  _id: string;
  username: string;
  name?: string;
  profileImage?: string | undefined;
  walletAddress?: string;
}

interface Comment {
  _id: string;
  user: PostUser;
  text: string;
  date: string;
  isPinned?: boolean;
  likes?: string[];
  replies?: Comment[];
}

interface PostProps {
  _id: string;
  user: PostUser;
  content: string;
  media?: Media[];
  poll?: Poll;
  likes: string[];
  comments: Comment[];
  createdAt: string;
  isPinned?: boolean;
  currentUserId?: string;
  onLike?: (postId: string) => void;
  onComment?: (postId: string, comment: string) => void;
  onDelete?: (postId: string) => void;
  onCommentDelete?: (postId: string, commentId: string) => void;
  onCommentPin?: (postId: string, commentId: string) => void;
  isHomePage?: boolean;
  isSaved?: boolean;
  views?: number;
  socket?: Socket; // Socket.io instance for real-time updates
}

export function DynamicPostCard({
  _id,
  user,
  content,
  media,
  poll,
  likes,
  comments,
  createdAt,
  isPinned,
  currentUserId,
  onLike,
  onComment,
  onDelete,
  onCommentDelete,
  onCommentPin,
  isSaved = false,
  views = 0,
  socket,
  isHomePage
}: PostProps) {
  const router = useRouter();
  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(false);
  // Initialize selectedPollOption based on whether the user has already voted
  const [selectedPollOption, setSelectedPollOption] = useState<number | null>(() => {
    if (poll && currentUserId) {
      // Check if user has already voted on any option
      for (let i = 0; i < poll.options.length; i++) {
        if (poll.options[i].voters && poll.options[i].voters.includes(currentUserId)) {
          return i;
        }
      }
    }
    return null;
  });
  const [localLikes, setLocalLikes] = useState<string[]>(likes);
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [localComments, setLocalComments] = useState<Comment[]>(comments.map(comment => ({
    ...comment,
    likes: comment.likes || [],
    replies: comment.replies || []
  })));
  const [activeCommentMenu, setActiveCommentMenu] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [isSavedState, setIsSavedState] = useState<boolean>(isSaved);
  const [localViews, setLocalViews] = useState<number>(views);
  const [visibleReplies, setVisibleReplies] = useState<{ [key: string]: boolean }>({});

  // Track view when component mounts - only once per user ID
  React.useEffect(() => {
    // Always track the view for each user session
    const trackView = async () => {
      try {
        // Track view regardless of whether the user is the creator
        // This ensures all views are counted, including the post creator's view
        const response = await api.post(`/posts/view/${_id}`);
        if (response.data && response.data.success) {
          setLocalViews(response.data.views);
        }
      } catch (error) {
        console.error('Error tracking view:', error);
      }
    };

    // Only track view if we have a valid post ID
    if (_id) {
      trackView();
    }

    // Listen for view updates via socket
    if (socket) {
      socket.on('postViewed', (data: { postId: string, views: number }) => {
        if (data.postId === _id) {
          setLocalViews(data.views);
        }
      });

      // Clean up socket listener
      return () => {
        socket.off('postViewed');
      };
    }
  }, [_id, socket, currentUserId]);

  // Add this useEffect at the top of the component
  React.useEffect(() => {
    const handleAccountChange = async () => {
      try {
        // If the wallet changes, disconnect from our app
        const wallet = (window as any).solana;
        if (wallet) {
          await wallet.disconnect();
          // Clear the stored wallet info
          localStorage.removeItem('connectedWalletInfo');
          // Show message to user
          toast.error('Wallet disconnected. Please reconnect with your registered wallet.');
          // Reload the page to reset the app state
          window.location.reload();
        }
      } catch (error) {
        console.error('Error handling wallet change:', error);
      }
    };

    // Add the event listener
    if (typeof window !== 'undefined' && (window as any).solana) {
      (window as any).solana.on('accountChanged', handleAccountChange);
    }

    // Cleanup
    return () => {
      if (typeof window !== 'undefined' && (window as any).solana) {
        (window as any).solana.off('accountChanged', handleAccountChange);
      }
    };
  }, []);

  // Format the date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;

    // For dates older than a week, display as Month name, date and year
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
  };

  // Calculate total votes for poll
  const totalVotes = poll?.options.reduce((sum, option) => sum + option.votes, 0) || 0;

  // Handle like
  const handleLike = async (e?: React.MouseEvent<HTMLElement>) => {
    // Prevent event propagation if needed
    if (e) e.stopPropagation();

    try {
      // Check if wallet is connected
      const storedWalletInfo = localStorage.getItem('connectedWalletInfo');
      if (!storedWalletInfo) {
        toast.error('Please connect your wallet to like');
        return;
      }

      // Verify if the connected wallet is registered
      const isRegisteredWallet = await verifyRegisteredWallet();
      if (!isRegisteredWallet) {
        toast.error('Please connect with your registered wallet to like');
        return;
      }

      // Sign a non-gas transaction message
      const message = `Sign this message to like post: ${_id}`;
      const wallet = (window as any).solana; // Assuming Phantom wallet is used
      if (!wallet) {
        toast.error('Wallet not found');
        return;
      }

      const signature = await wallet.signMessage(new TextEncoder().encode(message));
      console.log('Like transaction signed:', signature);

      // Make a copy of the current likes array
      const isCurrentlyLiked = localLikes.includes(currentUserId || '');
      const updatedLikes = isCurrentlyLiked
        ? localLikes.filter(id => id !== currentUserId)
        : [...localLikes, currentUserId || ''];

      // Update local state first
      setLocalLikes(updatedLikes);

      // Make the API call directly
      const response = await api.post(`/posts/like/${_id}`, {
        signature
      });

      // Track like for quest system
      try {
        const { trackPostLike } = await import('@/lib/questUtils');
        await trackPostLike(_id);
      } catch (trackingError) {
        console.error('Error tracking like for quest:', trackingError);
        // Don't fail if tracking fails
      }

      // Only call onLike after successful API call
      if (response.data && onLike) {
        // Pass minimal information to prevent parent from over-updating
        onLike(_id);
      }
    } catch (error) {
      // Revert local state if API call fails
      setLocalLikes(likes);
      console.error('Error liking post:', error);
      toast.error('Failed to like post');
    }
  };

  // Handle comment submission
  const handleCommentSubmit = async () => {
    if (!commentText.trim()) return;

    // If replying to a comment, handle it differently
    if (replyingTo) {
      handleReplySubmit();
      return;
    }

    try {
      // Check if wallet is connected
      const storedWalletInfo = localStorage.getItem('connectedWalletInfo');
      if (!storedWalletInfo) {
        toast.error('Please connect your wallet to comment');
        return;
      }

      // Verify if the connected wallet is registered
      const isRegisteredWallet = await verifyRegisteredWallet();
      if (!isRegisteredWallet) {
        toast.error('Please connect with your registered wallet to comment');
        return;
      }

      // Sign a non-gas transaction message
      const message = `Sign this message to comment on post: ${_id}`;
      const wallet = (window as any).solana; // Assuming Phantom wallet is used
      if (!wallet) {
        toast.error('Wallet not found');
        return;
      }

      const signature = await wallet.signMessage(new TextEncoder().encode(message));
      console.log('Comment transaction signed:', signature);

      // Get current user data from API first
      let currentUserData;
      try {
        const userResponse = await api.get('/users/profile');
        if (userResponse.data && userResponse.data.user) {
          currentUserData = userResponse.data.user;
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }

      // Create the new comment with proper user data
      const newComment: Comment = {
        _id: Date.now().toString(), // Temporary ID until real one from server
        user: {
          _id: currentUserData?._id || currentUserId || '',
          username: currentUserData?.username || 'Anonymous',
          profileImage: currentUserData?.profileImage,
          walletAddress: currentUserData?.walletAddress
        },
        text: commentText,
        date: new Date().toISOString(),
        isPinned: false,
        likes: []
      };

      // Update local state first for immediate UI feedback
      setLocalComments([...localComments, newComment]);
      setShowComments(true);

      if (onComment) {
        // Call the parent callback if available
        onComment(_id, commentText);
      } else {
        // Otherwise, call the API directly
        const response = await api.post(`/posts/comment/${_id}`, {
          text: commentText,
          signature
        });

        // Track comment for quest system
        try {
          // Get the comment ID from the response
          const newCommentId = response.data?.comments ?
            response.data.comments[response.data.comments.length - 1]._id :
            newComment._id;

          // Call the tracking function
          await trackPostComment(_id, newCommentId);
        } catch (trackingError) {
          console.error('Error tracking comment for quest:', trackingError);
          // Don't fail if tracking fails
        }

        // Update the comment with the real ID from the API response
        if (response.data?.comments) {
          const newCommentFromApi = response.data.comments[response.data.comments.length - 1];
          if (newCommentFromApi) {
            // Make sure the user data is preserved
            const updatedComment = {
              ...newCommentFromApi,
              user: {
                _id: currentUserData?._id || currentUserId || '',
                username: currentUserData?.username || 'Anonymous',
                profileImage: currentUserData?.profileImage,
                walletAddress: currentUserData?.walletAddress
              }
            };

            console.log('Updated comment from API:', updatedComment);

            // Replace the temporary comment with the one from the API
            setLocalComments(prevComments => {
              const updatedComments = [...prevComments];
              const tempIndex = updatedComments.findIndex(c => c._id === newComment._id);
              if (tempIndex !== -1) {
                updatedComments[tempIndex] = updatedComment;
              }
              return updatedComments;
            });
          }
        }
      }

      setCommentText('');
      toast.success('Comment added');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
  };

  // Handle comment like
  const handleCommentLike = async (commentId: string) => {
    try {
      // Check if wallet is connected
      const storedWalletInfo = localStorage.getItem('connectedWalletInfo');
      if (!storedWalletInfo) {
        toast.error('Please connect your wallet to like comments');
        return;
      }

      // Verify if the connected wallet is registered
      const isRegisteredWallet = await verifyRegisteredWallet();
      if (!isRegisteredWallet) {
        toast.error('Please connect with your registered wallet to like comments');
        return;
      }

      // Sign a non-gas transaction message
      const message = `Sign this message to like comment: ${commentId}`;
      const wallet = (window as any).solana; // Assuming Phantom wallet is used
      if (!wallet) {
        toast.error('Wallet not found');
        return;
      }

      const signature = await wallet.signMessage(new TextEncoder().encode(message));
      console.log('Like transaction signed:', signature);

      // Update local state first for immediate UI feedback
      setLocalComments(prevComments =>
        prevComments.map(comment => {
          if (comment._id === commentId) {
            const isLiked = (comment.likes || []).includes(currentUserId || '');
            const newLikes = isLiked
              ? (comment.likes || []).filter(id => id !== currentUserId)
              : [...(comment.likes || []), currentUserId || ''];

            return {
              ...comment,
              likes: newLikes
            };
          }
          return comment;
        })
      );

      // Call API to save like with signature
      const response = await api.post(`/posts/comment/like/${_id}/${commentId}`, { signature });

      if (response.data.success) {
        // Update the comment with the real likes from the API response
        setLocalComments(prevComments =>
          prevComments.map(comment => {
            if (comment._id === commentId) {
              return {
                ...comment,
                likes: response.data.likes || []
              };
            }
            return comment;
          })
        );

        toast.success(response.data.isLiked ? 'Comment liked' : 'Comment unliked');
      }
    } catch (error) {
      console.error('Error liking comment:', error);
      toast.error('Failed to like comment');

      // Revert to original comments if the API call fails
      setLocalComments(comments);
    }
  };

  // Handle reply to comment
  const handleReply = (commentId: string) => {
    // Check if we're currently showing replies for this comment
    const isShowingReplies = visibleReplies[commentId];

    if (isShowingReplies) {
      // If we're hiding replies, also hide the reply input
      setReplyingTo(null);
      // Hide the replies
      setVisibleReplies(prev => ({
        ...prev,
        [commentId]: false
      }));
    } else {
      // If we're showing replies, show the reply input if clicked
      setReplyingTo(commentId);
      setReplyText('');
      // Show the replies
      setVisibleReplies(prev => ({
        ...prev,
        [commentId]: true
      }));
    }
  };

  // Handle reply submission
  const handleReplySubmit = async () => {
    if (!replyText.trim() || !replyingTo) return;

    try {
      // Check if wallet is connected
      const storedWalletInfo = localStorage.getItem('connectedWalletInfo');
      if (!storedWalletInfo) {
        toast.error('Please connect your wallet to reply');
        return;
      }

      // Verify if the connected wallet is registered
      const isRegisteredWallet = await verifyRegisteredWallet();
      if (!isRegisteredWallet) {
        toast.error('Please connect with your registered wallet to reply');
        return;
      }

      // Sign a non-gas transaction message
      const message = `Sign this message to reply to comment: ${replyingTo}`;
      const wallet = (window as any).solana; // Assuming Phantom wallet is used
      if (!wallet) {
        toast.error('Wallet not found');
        return;
      }

      const signature = await wallet.signMessage(new TextEncoder().encode(message));
      console.log('Reply transaction signed:', signature);

      // Get current user data similar to comment submission
      let currentUserData = {
        _id: currentUserId || '',
        username: '',
        profileImage: undefined as string | undefined,
        walletAddress: undefined as string | undefined
      };

      // Try to get user data from various sources
      if (user && user._id === currentUserId) {
        currentUserData = {
          _id: user._id,
          username: user.username,
          profileImage: user.profileImage,
          walletAddress: user.walletAddress
        };
      } else {
        const currentUserComment = localComments.find(comment => comment.user._id === currentUserId);
        if (currentUserComment?.user) {
          currentUserData = {
            _id: currentUserId || '',
            username: currentUserComment.user.username,
            profileImage: currentUserComment.user.profileImage,
            walletAddress: currentUserComment.user.walletAddress
          };
        }
      }

      // If still no user data, fetch from API
      if (!currentUserData.username) {
        try {
          const userResponse = await api.get('/auth/current-user');
          if (userResponse.data && userResponse.data.user) {
            currentUserData = {
              _id: userResponse.data.user._id,
              username: userResponse.data.user.username,
              profileImage: userResponse.data.user.profileImage,
              walletAddress: userResponse.data.user.walletAddress
            };
          }
        } catch (userError) {
          console.error('Error fetching user data from API:', userError);
        }
      }

      // Create the new reply
      const newReply: Comment = {
        _id: Date.now().toString(), // Temporary ID until real one from server
        user: {
          _id: currentUserData._id,
          username: currentUserData.username || 'Anonymous',
          profileImage: currentUserData.profileImage,
          walletAddress: currentUserData.walletAddress
        },
        text: replyText,
        date: new Date().toISOString(),
        likes: [],
        replies: []
      };

      // Update local state first for immediate UI feedback
      setLocalComments(prevComments =>
        prevComments.map(comment => {
          if (comment._id === replyingTo) {
            return {
              ...comment,
              replies: [...(comment.replies || []), newReply]
            };
          }
          return comment;
        })
      );

      // Reset reply state
      setReplyingTo(null);
      setReplyText('');

      // Call API to save reply with signature
      try {
        const response = await api.post(`/posts/comment/reply/${_id}/${replyingTo}`, {
          text: replyText,
          signature
        });

        // If the API call was successful, update the local state with the response data
        if (response.data && response.data.success) {
          // Update the comment with the real reply from the API response
          if (response.data.comments) {
            // Find the updated comment in the response
            const updatedComment = response.data.comments.find(
              (c: Comment) => c._id === replyingTo
            );

            if (updatedComment) {
              setLocalComments(prevComments =>
                prevComments.map(comment => {
                  if (comment._id === replyingTo) {
                    return updatedComment;
                  }
                  return comment;
                })
              );
            }
          }
        }
      } catch (apiError) {
        console.error('Error saving reply to database:', apiError);
        // Keep the local state as is, since we've already updated it for immediate feedback
        toast.error('Failed to save reply');
      }

      toast.success('Reply added');
    } catch (error) {
      console.error('Error adding reply:', error);
      toast.error('Failed to add reply');
    }
  };

  // Handle reply deletion
  const handleReplyDelete = async (commentId: string, replyId: string) => {
    try {
      // Update local state first for immediate UI feedback
      setLocalComments(prevComments =>
        prevComments.map(comment => {
          if (comment._id === commentId) {
            return {
              ...comment,
              replies: (comment.replies || []).filter(reply => reply._id !== replyId)
            };
          }
          return comment;
        })
      );

      // Call API to delete reply
      try {
        await api.delete(`/posts/comment/reply/${_id}/${commentId}/${replyId}`);
        toast.success('Reply deleted');
      } catch (apiError) {
        console.error('Error deleting reply from database:', apiError);
        // Keep the local state as is, since we've already updated it for immediate feedback
        toast.error('Failed to delete reply from server');
      }
    } catch (error) {
      console.error('Error deleting reply:', error);
      toast.error('Failed to delete reply');
    }
  };

  // Handle comment deletion
  const handleCommentDelete = async (commentId: string) => {
    try {
      // Update local state first for immediate UI feedback
      setLocalComments(prevComments =>
        prevComments.filter(comment => comment._id !== commentId)
      );

      // Call the parent callback if available
      if (onCommentDelete) {
        onCommentDelete(_id, commentId);
      } else {
        // Otherwise, call the API directly
        await api.delete(`/posts/comment/${_id}/${commentId}`);
      }

      toast.success('Comment deleted');
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');

      // Revert to original comments if the API call fails
      setLocalComments(comments);
    }
  };

  // Handle comment pin/unpin
  const handleCommentPin = async (commentId: string) => {
    try {
      // Find the comment to be pinned/unpinned
      const commentToUpdate = localComments.find(c => c._id === commentId);
      if (!commentToUpdate) return;

      // Get current pin status
      const wasAlreadyPinned = commentToUpdate.isPinned || false;

      // Update local state first
      setLocalComments(prevComments =>
        prevComments.map(comment => ({
          ...comment,
          // Only one comment can be pinned at a time
          isPinned: comment._id === commentId
            ? !wasAlreadyPinned
            : wasAlreadyPinned ? comment.isPinned : false
        }))
      );

      // Call the parent callback if available
      if (onCommentPin) {
        onCommentPin(_id, commentId);
      } else {
        // Otherwise, call the API directly
        await api.post(`/posts/comment/pin/${_id}/${commentId}`, {});
      }

      toast.success(wasAlreadyPinned ? 'Comment unpinned' : 'Comment pinned');
    } catch (error) {
      console.error('Error pinning comment:', error);
      toast.error('Failed to pin comment');

      // Revert to original comments if the API call fails
      setLocalComments(comments);
    }
  };

  // Handle poll vote
  const handlePollVote = async (optionIndex: number) => {
    // Store the previous selection to revert back if API call fails
    const previousSelection: number | null = selectedPollOption;

    try {
      // Update the selection immediately for better UI feedback
      // If clicking the same option, allow toggling the selection off (null)
      if (selectedPollOption === optionIndex) {
        // Toggle off the selection if clicking the same option
        setSelectedPollOption(null);
      } else {
        // Otherwise, select the new option
        setSelectedPollOption(optionIndex);
      }

      // Make the API call to record the vote or remove vote
      const isRemovingVote = previousSelection === optionIndex;
      const response = await api.post(`/posts/poll-vote/${_id}`, {
        optionIndex: isRemovingVote ? null : optionIndex
      });

      // Update the poll data with the response
      if (response.data && response.data.poll) {
        // Update the poll data in the parent component if needed
        if (socket) {
          socket.emit('pollUpdated', { postId: _id, poll: response.data.poll });
        }
      }

      toast.success(response.data.message || (isRemovingVote ? 'Vote removed' : 'Vote recorded'));
    } catch (error) {
      console.error('Error voting on poll:', error);
      toast.error('Failed to update vote');

      // Revert to previous selection if API call fails
      // This ensures the UI stays in sync with the server state
      setSelectedPollOption(previousSelection);
    }
  };

  // Shorten wallet address
  const shortenAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Handle delete post (if user is the owner)
  const handleDelete = async () => {
    if (user?._id !== currentUserId) return;

    try {
      setIsDeleting(true); // Set loading state
      setShowMenu(false); // Close the menu

      // Display loading toast
      const loadingToast = toast.loading('Deleting post...');

      const response = await api.delete(`/posts/${_id}`);

      // Clear loading toast
      toast.dismiss(loadingToast);

      if (response.data && response.data.success) {
        toast.success('Post deleted successfully');

        // Always use the onDelete callback to update parent state without page refresh
        if (onDelete) {
          onDelete(_id);
        }
        // No else clause with window.location.reload() to prevent page refresh
      } else {
        // Handle case where response is 200 but success is false
        toast.error(response.data?.message || 'Failed to delete post');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    } finally {
      setIsDeleting(false); // Reset loading state
    }
  };

  // Handle pin/unpin post (if user is the owner)
  const handlePin = async () => {
    if (user?._id !== currentUserId) return;

    try {
      const response = await api.post(`/posts/pin/${_id}`, {});
      if (response.data && response.status === 200) {
        // Update local state first for immediate UI feedback
        const newPinnedStatus = !isPinned;

        toast.success(isPinned ? 'Post unpinned' : 'Post pinned');

        // Emit a socket event for real-time updates
        if (socket) {
          // Send a complete post object with updated isPinned status to ensure all data is preserved
          socket.emit('postUpdated', {
            _id,
            isPinned: newPinnedStatus,
            user: {
              _id: user._id,
              username: user.username,
              name: user.name,
              profileImage: user.profileImage,
              walletAddress: user.walletAddress
            }, // Include the complete user object with all necessary fields
            content,
            media,
            poll,
            likes: localLikes,
            comments: localComments,
            createdAt
          });
        }
      }
    } catch (error) {
      console.error('Error pinning/unpinning post:', error);
      toast.error('Failed to pin/unpin post');
    }
  };

  // Handle share post
  const handleShare = async () => {
    try {
      // Copy post URL to clipboard
      const postUrl = `${window.location.origin}/post/${_id}`;
      await navigator.clipboard.writeText(postUrl);

      // Close the menu after sharing
      setShowMenu(false);

      // Show success message with more details
      toast.success('Post link copied to clipboard! You can now share it anywhere.');

      // If Web Share API is available, offer additional sharing options
      if (navigator.share) {
        try {
          await navigator.share({
            title: `Post by ${user.username}`,
            text: content?.substring(0, 50) + (content && content.length > 50 ? '...' : ''),
            url: postUrl
          });
        } catch {
          // User likely canceled the share operation, no need to show error
          console.log('Share canceled or not supported');
        }
      }
    } catch (error) {
      console.error('Error sharing post:', error);
      toast.error('Failed to share post');
    }
  };

  // Handle block user
  const handleBlock = async () => {
    try {
      if (!user?._id) return;

      const loadingToast = toast.loading('Blocking user...');

      // Call the API to block the user
      const response = await api.post(`/users/block/${user._id}`);

      toast.dismiss(loadingToast);

      if (response.data && response.data.success) {
        toast.success(`Blocked ${user.username}`);
        // Close the menu after blocking
        setShowMenu(false);
      } else {
        toast.error(response.data?.message || 'Failed to block user');
      }
    } catch (error) {
      console.error('Error blocking user:', error);
      toast.error('Failed to block user');
    }
  };

  // Handle follow user
  const handleFollow = async () => {
    try {
      if (!user?._id) return;

      const loadingToast = toast.loading('Processing...');

      // Call the API to follow/unfollow the user
      const response = await api.post(`/users/follow/${user._id}`);

      toast.dismiss(loadingToast);

      if (response.data && response.data.success) {
        toast.success(`Following ${user.username}`);
      } else {
        toast.error(response.data?.message || 'Failed to follow user');
      }
    } catch (error) {
      console.error('Error following user:', error);
      toast.error('Failed to follow user');
    }
  };

  // Handle save post
  const handleSavePost = async () => {
    try {
      // Store the current state before updating
      const currentSavedState = isSavedState;

      // Update local state first for immediate UI feedback
      setIsSavedState(!currentSavedState);

      // Call the API to save/unsave the post
      const response = await api.post(`/posts/save/${_id}`, {});

      if (response.data && response.data.success) {
        // Update state based on API response
        setIsSavedState(response.data.saved);
        toast.success(response.data.message);
      } else {
        // Revert local state if API call fails
        setIsSavedState(currentSavedState);
        toast.error(response.data?.message || 'Failed to save post');
      }
    } catch (error) {
      // Revert local state if API call fails
      setIsSavedState(isSavedState);
      console.error('Error saving post:', error);
      toast.error('Failed to save post');
    }
  };

  // Check if current user has liked the post
  const isLiked = currentUserId ? localLikes.includes(currentUserId) : false;

  // Sort comments so pinned comments appear first
  const sortedComments = [...localComments].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // If the post is being deleted, you can optionally show a loading state or return null
  if (isDeleting) {
    return (
      <Card className="shadow-md rounded-lg w-full max-w-screen-md mx-auto mb-4 text-black border border-shadow-lg">
        <CardContent className="p-4 flex justify-center items-center">
          <div className="text-gray-500">Deleting post...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md rounded-lg bg-white w-full max-w-screen-md mx-auto mb-4 text-black border border-shadow-lg">
      <CardContent className="space-y-4 p-4">
        {/* Top Section: Avatar & User Info */}
        <div className="flex gap-2 md:gap-3 ">
          <div className="relative group">
            <Avatar
              className="w-10 h-10 md:w-12 md:h-12 cursor-pointer"
              onClick={() => {
                if (user?._id) {
                  try {
                    // Try using Next.js router first
                    router.push(`/profile/${user.username}`);

                    // Add a fallback with direct navigation
                    setTimeout(() => {
                      window.location.href = `/profile/${user.username}`;
                    }, 100);
                  } catch (error) {
                    console.error('Navigation error:', error);
                    // Fallback to direct navigation
                    window.location.href = `/profile/${user.username}`;
                  }
                }
              }}
            >
              <AvatarImage src={user?.profileImage ? (user.profileImage.startsWith('http') ? user.profileImage : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${user.profileImage}`) : undefined} alt={user?.username || 'User'} />
              <AvatarFallback>{user?.username ? user.username.charAt(0).toUpperCase() : '?'}</AvatarFallback>
            </Avatar>
            {/* Follow button that appears on hover */}
            {currentUserId && user && currentUserId !== user._id && (
              <button
                className="absolute -top-2 -right-2 bg-gradient-to-r from-[#B671FF] via-[#C577EE] to-[#E282CA] text-black rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md"
                onClick={() => handleFollow()}
              >
                <Icon icon="lucide:user-plus" className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-1 md:gap-2">
              <div className="relative group flex items-center gap-2">
                <span
                  className="font-semibold hover:text-purple-400 text-black text-sm md:text-md cursor-pointer hover:textgradient-to-r from-[#B671FF] via-[#C577EE] to-[#E282CA"
                  onClick={() => {
                    if (user?._id) {
                      try {
                        // Try using Next.js router first
                        router.push(`/profile/${user.username}`);

                        // Add a fallback with direct navigation
                        setTimeout(() => {
                          window.location.href = `/profile/${user.username}`;
                        }, 100);
                      } catch (error) {
                        console.error('Navigation error:', error);
                        // Fallback to direct navigation
                        window.location.href = `/profile/${user.username}`;
                      }
                    }
                  }}
                >
                  {user?.username || 'Anonymous'}
                </span>
                {/* Follow button that appears on hover */}
                {currentUserId && user && currentUserId !== user._id && (
                  <button
                    className=" text-black rounded-full p-1 opacity-70 hover:opacity-100 transition-opacity duration-200 shadow-md flex items-center justify-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFollow();
                    }}
                    title="Follow user"
                  >

                  </button>
                )}
              </div>
              {/* View count removed from here */}
              {/* Verified Check */}
              <span className="rounded-full p-1 flex items-center shrink-0">
              </span>
              {isPinned && !isHomePage && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Icon icon="lucide:pin" className="text-xs" /> Pinned
                </span>
              )}
            </div>

            {/* Wallet Address with Views */}
            <div className="flex items-center gap-4 md:gap-6 text-gray-500 text-xs md:text-sm">
              <span className="truncate max-w-full md:max-w-[120px]">{shortenAddress(user?.walletAddress || '')}</span>
              {/* View count display */}
              <span className="text-xs text-gray-500 flex items-center">
                <svg
                  className="w-3 h-3 mr-1"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg> {localViews > 999 ? `${(localViews / 1000).toFixed(1)}k` : localViews} {localViews === 1 ? 'view' : 'views'}
              </span>
              {/* Removed the timestamp from here */}
            </div>
          </div>

          {/* Three-dot menu - show for all posts */}
          {currentUserId && (
            <div className="relative">
              <Popover open={showMenu} onOpenChange={setShowMenu}>
                <PopoverTrigger asChild>
                  <button className="p-1 rounded-full hover:bg-gray-700 focus:outline-none">
                    <Icon icon="lucide:more-vertical" className="text-lg text-gray-400" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-40 p-0 bg-white">
                  <div className="py-1">
                    {/* Show Pin/Delete only if user is the owner */}
                    {currentUserId === user?._id ? (
                      <>
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-sm px-3 py-2 hover:bg-gray-100"
                          onClick={handlePin}
                        >
                          <Icon icon="lucide:pin" className="mr-2 h-4 w-4" />
                          {isPinned ? 'Unpin' : 'Pin'}
                        </Button>
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-sm px-3 py-2 hover:bg-gray-100"
                          onClick={() => handleShare()}
                        >
                          <Icon icon="lucide:share" className="mr-2 h-4 w-4" />
                          Share
                        </Button>
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-sm px-3 py-2 text-red-500 hover:bg-gray-100 hover:text-red-600"
                          onClick={handleDelete}
                          disabled={isDeleting}
                        >
                          <Icon icon="lucide:trash-2" className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-sm px-3 py-2 hover:bg-gray-100"
                          onClick={() => handleShare()}
                        >
                          <Icon icon="lucide:share" className="mr-2 h-4 w-4" />
                          Share
                        </Button>
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-sm px-3 py-2 text-red-500 hover:bg-gray-100 hover:text-red-600"
                          onClick={() => handleBlock()}
                        >
                          <Icon icon="lucide:shield-ban" className="mr-2 h-4 w-4" />
                          Block
                        </Button>
                      </>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>

        {/* Post Content */}
        {content && (
          <p className="text-sm md:text-base break-words overflow-wrap-anywhere whitespace-pre-wrap">
            {content.split('\n').map((line, lineIndex) => (
              <React.Fragment key={lineIndex}>
                {line.split(' ').map((word, wordIndex) => {
                  if (word.startsWith('#') && word.length > 1) {
                    return (
                      <span
                        key={wordIndex}
                        className="text-blue-500 font-medium hover:underline cursor-pointer break-all"
                        onClick={() => {
                          try {
                            router.push(`/hashtag/${word.substring(1)}`);
                          } catch (error) {
                            console.error('Navigation error:', error);
                          }
                        }}
                      >
                        {word}{wordIndex < line.split(' ').length - 1 ? ' ' : ''}
                      </span>
                    );
                  }
                  return (
                    <span key={wordIndex}>
                      {word}{wordIndex < line.split(' ').length - 1 ? ' ' : ''}
                    </span>
                  );
                })}
                {lineIndex < content.split('\n').length - 1 && '\n'}
              </React.Fragment>
            ))}
          </p>
        )}

        {/* Media Content */}
        {media && media.length > 0 && (
          <div className={`grid ${media.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
            {media.map((item, index) => (
              <div key={index} className="rounded-lg overflow-hidden pb-5 pt-4 shadow-md">
                {item.type === 'image' && (
                  <div className="relative w-full max-h-96 mx-auto">
                    <Image
                      src={item.url.startsWith('http') ? item.url : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${item.url}`}
                      alt="Post media"
                      width={400}
                      height={384}
                      className="w-auto mx-auto max-h-96 rounded-xl object-contain"
                      style={{ maxHeight: '384px' }}
                      priority={index === 0} // Prioritize first image for LCP
                    />
                  </div>
                )}
                {item.type === 'video' && (
                  <video controls className="w-full h-auto" preload="metadata">
                    <source
                      src={item.url.startsWith('http') ? item.url : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${item.url}`}
                      type="video/mp4"
                    />
                    Your browser does not support the video tag.
                  </video>
                )}
                {item.type === 'gif' && (
                  <div className="relative w-full max-h-96">
                    <Image
                      src={item.url.startsWith('http') ? item.url : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${item.url}`}
                      alt="Post GIF"
                      width={400}
                      height={384}
                      className="w-auto max-h-96 object-contain"
                      style={{ maxHeight: '384px' }}
                      unoptimized // GIFs should remain unoptimized to preserve animation
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Poll Content */}
        {poll && (
          <div className="bg-white shadow-md rounded-lg p-4 space-y-3 w-full">
            <h4 className="font-semibold text-sm md:text-lg flex items-center gap-2">
              <Icon icon="lucide:bar-chart-2" className="text-black text-lg md:text-xl" />
              {poll.question}
              <span className="text-gray-600 text-xs md:text-sm">• {totalVotes} votes</span>
            </h4>

            {/* Poll Options */}
            <div className="space-y-2">
              {poll.options.map((option, index) => {
                const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
                return (
                  <div
                    key={index}
                    className={`rounded-lg p-2 relative ${selectedPollOption === index ? 'bg-gray-200' : 'bg-gray-100 hover:bg-gray-200 cursor-pointer'}`}
                    onClick={() => handlePollVote(index)}
                  >
                    <div
                      className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#B671FF] via-[#C577EE] to-[#E282CA] text-black rounded-lg"
                      style={{ width: `${percentage}%` }}
                    />
                    <div className="relative flex justify-between font-medium px-2 text-black text-xs md:text-sm">
                      <span>{option.text}</span>
                      <span>{percentage}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 md:gap-6 text-gray-600 text-xs md:text-sm">
            <div
              className="flex items-center gap-1 cursor-pointer"
              onClick={handleLike}
            >
              {/* Use direct SVG instead of Icon component */}
              {isLiked ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-[#B671FF]"
                >
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                </svg>
              )}
              <span className={isLiked ? "text-[#B671FF]" : ""}>{localLikes.length}</span>
            </div>
            <div
              className="flex items-center gap-1 cursor-pointer"
              onClick={() => setShowComments(!showComments)}
            >
              <Icon icon="lucide:message-circle" className="text-lg" />
              <span>{localComments.length}</span>
            </div>
            {/* Removed view counter from here */}
            {/* Save button */}
            {currentUserId && (
              <div
                className="flex items-center gap-1 cursor-pointer"
                onClick={handleSavePost}
              >
                <Icon
                  icon={isSavedState ? "lucide:bookmark" : "lucide:bookmark-plus"}
                  className={`text-lg ${isSavedState ? "text-[#B671FF]" : ""}`}
                  style={{ color: isSavedState ? "#B671FF" : "" }}
                />
                <span className={isSavedState ? "text-[#B671FF]" : ""} style={{ color: isSavedState ? "#B671FF" : "" }}>Save</span>
              </div>
            )}
            {/* Timestamp moved to right side */}
            <div className="text-gray-500 text-xs md:text-sm">
              {formatDate(createdAt)}
            </div>
          </div>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="space-y-3 pt-2 border-t border-gray-200">
            {sortedComments.map((comment) => (
              <div key={comment._id} className="flex gap-2">
                <Avatar
                  className="w-8 h-8 cursor-pointer"
                  onClick={() => {
                    if (comment.user?._id) {
                      try {
                        // Try using Next.js router first
                        router.push(`/profile/${comment.user.username}`);

                        // Add a fallback with direct navigation
                        setTimeout(() => {
                          window.location.href = `/profile/${comment.user.username}`;
                        }, 100);
                      } catch (error) {
                        console.error('Navigation error:', error);
                        // Fallback to direct navigation
                        window.location.href = `/profile/${comment.user.username}`;
                      }
                    }
                  }}
                >
                  <AvatarImage
                    src={comment.user?.profileImage ? (comment.user.profileImage.startsWith('http') ? comment.user.profileImage : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${comment.user.profileImage}`) : undefined}
                    alt={comment.user?.username || 'User'}
                  />
                  <AvatarFallback>{comment.user?.username ? comment.user.username.charAt(0).toUpperCase() : '?'}</AvatarFallback>
                </Avatar>
                <div className="bg-gray-100  p-2 rounded-lg flex-1">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1">
                      <span
                        className="font-semibold text-sm cursor-pointer hover:underline"
                        onClick={() => {
                          if (comment.user?._id) {
                            try {
                              // Try using Next.js router first
                              router.push(`/profile/${comment.user.username}`);

                              // Add a fallback with direct navigation
                              setTimeout(() => {
                                window.location.href = `/profile/${comment.user.username}`;
                              }, 100);
                            } catch (error) {
                              console.error('Navigation error:', error);
                              // Fallback to direct navigation
                              window.location.href = `/profile/${comment.user.username}`;
                            }
                          }
                        }}
                      >
                        {comment.user?.username || 'Anonymous'}
                      </span>
                      {comment.isPinned && (
                        <span className="text-xs text-gray-600 flex items-center gap-1">
                          <Icon icon="lucide:pin" className="h-3 w-3" /> Pinned
                        </span>
                      )}
                    </div>

                    {/* Three-dot menu - only show if user is post owner or comment owner */}
                    {((comment.user && currentUserId === comment.user._id) || (user && currentUserId === user._id)) && (
                      <div className="relative">
                        <Popover open={activeCommentMenu === comment._id} onOpenChange={(open) => setActiveCommentMenu(open ? comment._id : null)}>
                          <PopoverTrigger asChild>
                            <button className="p-1 rounded-full hover:bg-gray-200 focus:outline-none">
                              <Icon icon="lucide:more-horizontal" className="text-sm text-gray-500" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-40 p-0">
                            <div className="py-1">
                              {/* Pin option only visible to post owner */}
                              {currentUserId === user._id && (
                                <Button
                                  variant="ghost"
                                  className="w-full justify-start text-xs px-3 py-2 hover:bg-gray-100"
                                  onClick={() => {
                                    handleCommentPin(comment._id);
                                    setActiveCommentMenu(null);
                                  }}
                                >
                                  <Icon icon="lucide:pin" className="mr-2 h-3 w-3" />
                                  {comment.isPinned ? 'Unpin' : 'Pin'}
                                </Button>
                              )}
                              {/* Delete option visible to both comment owner and post owner */}
                              <Button
                                variant="ghost"
                                className="w-full justify-start text-xs px-3 py-2 text-red-500 hover:bg-gray-100 hover:text-red-600"
                                onClick={() => {
                                  handleCommentDelete(comment._id);
                                  setActiveCommentMenu(null);
                                }}
                              >
                                <Icon icon="lucide:trash-2" className="mr-2 h-3 w-3" />
                                Delete
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}
                  </div>

                  <p className="text-sm mb-2 break-words whitespace-pre-wrap break-all">{comment.text}</p>


                  {/* Comment actions - Like, Reply, and Time */}
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    {/* Like button */}
                    <button
                      onClick={() => handleCommentLike(comment._id)}
                      className={`flex items-center gap-1 hover:text-gray-700 ${(comment.likes || []).includes(currentUserId || '') ? 'text-[#B671FF]' : ''}`}
                    >
                      <Icon
                        icon={(comment.likes || []).includes(currentUserId || '') ? "lucide:heart" : "lucide:heart"}
                        className="h-3 w-3"
                      />
                      {(comment.likes || []).length > 0 && (comment.likes || []).length}
                      {(comment.likes || []).length === 0 ? 'Like' : ''}
                    </button>

                    {/* Reply button */}
                    <button
                      onClick={() => handleReply(comment._id)}
                      className="flex items-center gap-1 hover:text-gray-700"
                    >
                      <Icon icon="lucide:message-circle" className="h-3 w-3" />
                      {visibleReplies[comment._id] ? 'Hide Replies' : 'Reply'}
                    </button>

                    {/* Time */}
                    <span className="text-xs text-gray-500">{formatDate(comment.date)}</span>
                  </div>

                  {/* Reply input if replying to this comment and replies are visible */}
                  {replyingTo === comment._id && (
                    <div className="flex gap-2 items-center mt-2">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleReplySubmit();
                          }
                        }}
                        placeholder="Write a reply..."
                        className="flex-1 p-1 border rounded-lg text-xs"
                      />
                      <button
                        onClick={handleReplySubmit}
                        className="bg-gradient-to-r from-[#B671FF] via-[#C577EE] to-[#E282CA] text-black px-2 py-1 rounded-lg text-xs font-medium"
                      >
                        Reply
                      </button>
                      <button
                        onClick={() => setReplyingTo(null)}
                        className="text-gray-500 hover:text-gray-700 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {/* Display replies count if there are replies and they're not visible */}
                  {comment.replies && comment.replies.length > 0 && !visibleReplies[comment._id] && (
                    <div className="mt-1 text-xs text-gray-500">
                      {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                    </div>
                  )}

                  {/* Display replies only if they should be visible */}
                  {comment.replies && comment.replies.length > 0 && visibleReplies[comment._id] && (
                    <div className="mt-2 space-y-2 pl-4 border-l-2 border-gray-200">
                      {comment.replies.map((reply) => (
                        <div key={reply._id} className="flex gap-2">
                          <Avatar
                            className="w-6 h-6 cursor-pointer"
                            onClick={() => {
                              if (reply.user?._id) {
                                try {
                                  // Try using Next.js router first
                                  router.push(`/profile/${reply.user.username}`);

                                  // Add a fallback with direct navigation
                                  setTimeout(() => {
                                    window.location.href = `/profile/${reply.user.username}`;
                                  }, 100);
                                } catch (error) {
                                  console.error('Navigation error:', error);
                                  // Fallback to direct navigation
                                  window.location.href = `/profile/${reply.user.username}`;
                                }
                              }
                            }}
                          >
                            <AvatarImage
                              src={reply.user?.profileImage ? (reply.user.profileImage.startsWith('http') ? reply.user.profileImage : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${reply.user.profileImage}`) : undefined}
                              alt={reply.user?.username || 'User'}
                            />
                            <AvatarFallback>{reply.user?.username ? reply.user.username.charAt(0).toUpperCase() : '?'}</AvatarFallback>
                          </Avatar>
                          <div className="bg-gray-50 p-1 rounded-lg flex-1">
                            <div className="flex justify-between items-center">
                              <span
                                className="font-semibold text-xs cursor-pointer hover:underline"
                                onClick={() => {
                                  if (reply.user?._id) {
                                    try {
                                      // Try using Next.js router first
                                      router.push(`/profile/${reply.user.username}`);

                                      // Add a fallback with direct navigation
                                      setTimeout(() => {
                                        window.location.href = `/profile/${reply.user.username}`;
                                      }, 100);
                                    } catch (error) {
                                      console.error('Navigation error:', error);
                                      // Fallback to direct navigation
                                      window.location.href = `/profile/${reply.user.username}`;
                                    }
                                  }
                                }}
                              >
                                {reply.user?.username || 'Anonymous'}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">{formatDate(reply.date)}</span>
                                {/* Delete button - only show for current user's replies */}
                                {reply.user?._id === currentUserId && (
                                  <button
                                    onClick={() => handleReplyDelete(comment._id, reply._id)}
                                    className="text-gray-400 hover:text-gray-600"
                                    title="Delete reply"
                                  >
                                    <Icon icon="lucide:trash-2" className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className="text-xs break-words whitespace-pre-wrap break-all">{reply.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Add Comment */}
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleCommentSubmit();
                  }
                }}
                placeholder="Add a comment..."
                className="flex-1 p-2 border rounded-lg text-sm "
              />
              <button
                onClick={handleCommentSubmit}
                className="bg-gradient-to-r from-[#B671FF] via-[#C577EE] to-[#E282CA] text-black  px-3 py-1 rounded-lg text-sm font-medium"
              >
                Post
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}