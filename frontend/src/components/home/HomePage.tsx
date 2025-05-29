'use client';

import React, { useState, useEffect, useRef } from 'react';
import CreateDartForm from "@/components/home/CreateDartForm";
import { DynamicPostCard } from "@/components/home/DynamicPostCard";
import { FeaturedProfiles } from "@/components/home/FeaturedProfiles";
import api from '@/lib/apiUtils';
import { toast } from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';
import { useHashtag } from '@/context/HashtagContext';
import { Icon } from "@iconify/react";

interface Post {
  _id: string;
  user: {
    _id: string;
    username: string;
    profileImage: string;
  };
  content: string;
  hashtags?: string[];
  media?: Array<{
    type: 'image' | 'video' | 'gif';
    url: string;
  }>;
  poll?: {
    question: string;
    options: Array<{
      text: string;
      votes: number;
      voters: string[];
    }>;
    expiresAt: string;
  };
  likes: string[];
  comments: Array<{
    _id: string;
    user: {
      _id: string;
      username: string;
      profileImage: string;
    };
    text: string;
    date: string;
    isPinned?: boolean;
  }>;
  createdAt: string;
  isPinned: boolean;
}

export function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const [socket, setSocket] = useState<Socket | undefined>(undefined);
  const { selectedHashtag, setSelectedHashtag } = useHashtag();
  const postsContainerRef = useRef<HTMLDivElement>(null);

  // Fetch posts on component mount
  useEffect(() => {
    fetchPosts();
    fetchCurrentUser();

    // Connect to socket server
    const socketInstance = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000');
    setSocket(socketInstance);

    // Socket event listeners
    socketInstance.on('newPost', (newPost) => {
      console.log('New post received:', newPost);
      setPosts(prevPosts => [newPost, ...prevPosts]);
      toast.success('New post created!');
    });

    socketInstance.on('postUpdated', (updatedPost) => {
      console.log('Post updated:', updatedPost);
      setPosts(prevPosts => {
        // Map through the posts and update the one that matches
        const updatedPosts = prevPosts.map(post => {
          // If this is the updated post
          if (post._id === updatedPost._id) {
            // If we received a full post object
            if (typeof updatedPost === 'object' && updatedPost !== null) {
              // Always preserve the complete post data
              // Merge the updated post data with the existing post to ensure no data is lost
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
          }
          return post;
        });

        // Return the updated posts array without sorting in the home page
        return updatedPosts;
      });
    });

    socketInstance.on('postDeleted', (postId) => {
      console.log('Post deleted:', postId);
      setPosts(prevPosts =>
        prevPosts.filter(post => post._id !== postId)
      );
      toast.success('Post deleted');
    });

    // Cleanup on unmount
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // Refresh posts when user logs in or out
  useEffect(() => {
    fetchPosts();
  }, [currentUserId]);

  // Filter posts when selectedHashtag changes
  useEffect(() => {
    if (selectedHashtag) {
      // Filter posts that contain the selected hashtag
      const filtered = posts.filter(post => {
        // Check if post has hashtags array
        if (post.hashtags && post.hashtags.includes(selectedHashtag)) {
          return true;
        }
        // Check if post content contains the hashtag
        if (post.content && post.content.includes(selectedHashtag)) {
          return true;
        }
        return false;
      });

      setFilteredPosts(filtered);

      // Scroll to the posts container
      if (postsContainerRef.current) {
        postsContainerRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // If no hashtag is selected, show all posts
      setFilteredPosts(posts);
    }
  }, [selectedHashtag, posts]);

  // Fetch posts from API
  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/posts/feed');

      if (response.data.success) {
        setPosts(response.data.posts);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  // Fetch current user info
  const fetchCurrentUser = async () => {
    try {
      // Using the correct endpoint directly
      const response = await api.get('/auth/user');

      if (response.data) {
        setCurrentUserId(response.data.id);
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
      // Clear currentUserId if there's an error (user is not authenticated)
      setCurrentUserId(undefined);
    }
  };

  // Handle post creation
  const handlePostCreated = () => {
    fetchPosts();
  };

  // Handle post like
  const handlePostLike = async (postId: string) => {
    try {
      // Find the post in the current state
      const postIndex = posts.findIndex(post => post._id === postId);
      if (postIndex === -1) return;

      // Make a complete copy of the posts array
      const updatedPosts = [...posts];

      // Get current post and create a complete copy
      const post = { ...updatedPosts[postIndex] };

      // Update only the likes array
      const isLiked = post.likes.includes(currentUserId || '');
      post.likes = isLiked
        ? post.likes.filter(id => id !== currentUserId)
        : [...post.likes, currentUserId || ''];

      // Put the updated post back in the array
      updatedPosts[postIndex] = post;

      // Update state with the new array
      setPosts(updatedPosts);

      console.log("Post updated:", post);

      // Socket event if needed
      if (socket) {
        socket.emit('updatePost', post);
      }
    } catch (error) {
      console.error('Error updating post like state:', error);
    }
  };

  // Handle post comment
  const handleComment = async (postId: string, commentText: string) => {
    try {
      await api.post(`/posts/comment/${postId}`, {
        text: commentText
      });

      // Socket will handle the update
    } catch (error) {
      console.error('Error commenting on post:', error);
      toast.error('Failed to add comment');
    }
  };

  // Handle post deletion
  const handleDelete = async (postId: string) => {
    try {
      // The actual deletion happens in DynamicPostCard component
      // This is just for updating our local state if needed
      // The socket will also handle this update, but we update locally for a faster UI response
      setPosts(prevPosts => prevPosts.filter(post => post._id !== postId));
    } catch (error) {
      console.error('Error handling post deletion:', error);
    }
  };

  // Handle comment deletion
const handleCommentDelete = async (postId: string, commentId: string) => {
  try {
    await api.delete(`/posts/comment/${postId}/${commentId}`);

    // Update local state after successful API call - only filter out the deleted comment
    // This preserves all existing user data in remaining comments
    setPosts(prevPosts =>
      prevPosts.map(post => {
        if (post._id === postId) {
          // Create a shallow copy of the post and filter comments
          const updatedPost = { ...post };
          updatedPost.comments = post.comments.filter(comment => comment._id !== commentId);
          return updatedPost;
        }
        return post;
      })
    );
  } catch (error) {
    console.error('Error deleting comment:', error);
    // Re-throw the error so the child component knows the operation failed
    throw error;
  }
};

  // Handle comment pin/unpin
  const handleCommentPin = async (postId: string, commentId: string) => {
    try {
      await api.post(`/posts/comment/pin/${postId}/${commentId}`);

      // Update local state for immediate UI feedback
      setPosts(prevPosts =>
        prevPosts.map(post => {
          if (post._id === postId) {
            return {
              ...post,
              comments: post.comments.map(comment => {
                if (comment._id === commentId) {
                  return { ...comment, isPinned: !comment.isPinned };
                }
                // Unpin other comments if this one is being pinned
                if (!comment.isPinned && comment._id !== commentId) {
                  return comment;
                }
                return { ...comment, isPinned: false };
              })
            };
          }
          return post;
        })
      );
    } catch (error) {
      console.error('Error pinning comment:', error);
      toast.error('Failed to pin comment');
    }
  };

  return (
    <div className="space-y-4">
      <CreateDartForm onPostCreated={handlePostCreated} />

      {selectedHashtag && (
        <div className="flex items-center justify-between bg-gray-100 p-3 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="font-medium">Showing posts with hashtag:</span>
            <span className="font-semibold text-[#CD7BE4]">{selectedHashtag}</span>
          </div>
          <button
            onClick={() => setSelectedHashtag(null)}
            className="text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <span>Clear</span>
            <Icon icon="lucide:x" className="w-4 h-4" />
          </button>
        </div>
      )}

      <div ref={postsContainerRef}>
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-8">
            {selectedHashtag ? (
              <p className="text-gray-500">No posts found with hashtag {selectedHashtag}.</p>
            ) : (
              <p className="text-gray-500">No posts yet. Be the first to create a post!</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPosts.map((post, index) => (
              <React.Fragment key={post._id}>
                <DynamicPostCard
                  {...post}
                  currentUserId={currentUserId}
                  onLike={handlePostLike}
                  onComment={handleComment}
                  onDelete={handleDelete}
                  onCommentDelete={handleCommentDelete}
                  onCommentPin={handleCommentPin}
                  isHomePage={true}
                  socket={socket}
                />
                {/* Insert FeaturedProfiles after 4 posts */}
                {index === 3 && <FeaturedProfiles />}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}