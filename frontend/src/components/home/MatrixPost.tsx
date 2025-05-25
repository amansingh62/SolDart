'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Icon } from "@iconify/react";
import api from '@/lib/apiUtils';

// Define socket interface for better type safety
interface SocketData {
  postId: string;
  views: number;
  [key: string]: unknown;
}

interface Socket {
  on: (event: string, callback: (data: SocketData) => void) => void;
  off: (event: string) => void;
}

interface MatrixPostProps {
  postId?: string;
  currentUserId?: string;
  initialViews?: number;
  socket?: Socket;
  onDelete?: (postId: string, event: React.MouseEvent<HTMLButtonElement>) => void;
}

export function MatrixPost({ 
  postId = 'matrix-post-1', 
  currentUserId,
  initialViews = 0,
  socket
}: MatrixPostProps) {
  const [localViews, setLocalViews] = useState<number>(initialViews);
  
  // Track view when component mounts - only once per user ID
  useEffect(() => {
    // Always track the view for each user session
    const trackView = async () => {
      try {
        // Track view regardless of whether the user is the creator
        // This ensures all views are counted, including the post creator's view
        const response = await api.post(`/posts/view/${postId}`);
        if (response.data && response.data.success) {
          setLocalViews(response.data.views);
        }
      } catch (error) {
        console.error('Error tracking view:', error);
      }
    };
    
    // Only track view if we have a valid post ID
    if (postId) {
      trackView();
    }
    
    // Listen for view updates via socket
    if (socket) {
      socket.on('postViewed', (data: { postId: string, views: number }) => {
        if (data.postId === postId) {
          setLocalViews(data.views);
        }
      });
      
      // Clean up socket listener
      return () => {
        socket.off('postViewed');
      };
    }
  }, [postId, currentUserId, socket]);

  return (
    <Card className="shadow-md rounded-lg w-full max-w-screen-md mx-auto">
      <CardContent className="space-y-4 p-4">
        {/* ✅ Top Section: Avatar & User Info */}
        <div className="flex gap-2 md:gap-3">
          <Avatar className="w-8 h-8 md:w-10 md:h-10">
            <AvatarImage src="https://i.pravatar.cc/150?u=matrix" alt="Matrix" />
            <AvatarFallback>M</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            {/* ✅ Username with Verification Badge */}
            <div className="flex items-center gap-1 md:gap-2">
              <span className="font-semibold flex items-center gap-1 text-sm md:text-md">
                Matrix
                <Icon icon="lucide:badge-check" className="text-blue-500 text-xs md:text-sm" />
              </span>
            </div>
 
            {/* ✅ Address & Views in the Same Line (Prevent Overflow) */}
            <div className="flex flex-wrap items-center gap-3 md:gap-6 text-gray-500 text-xs md:text-sm">
              <span className="truncate max-w-full md:max-w-[120px]">@matrix_1234 <span className="text-gray-600">• {localViews > 999 ? `${(localViews / 1000).toFixed(1)}k` : localViews} {localViews === 1 ? 'view' : 'views'}</span></span>
            </div>

            {/* ✅ Post Content */}
            <p className="mt-2 text-sm md:text-base">Good Morning Fam, What are your plans?</p>
          </div>
        </div>

        {/* ✅ Bottom Actions - Responsive Alignment */}
        <div className="flex items-center gap-4 md:gap-6 text-gray-600 text-xs md:text-sm">
          <span>1hr</span>
          <div className="flex items-center gap-1">
            <Icon icon="lucide:heart" className="text-base md:text-lg" />
            <span>43</span>
          </div>
          <div className="flex items-center gap-1">
            <Icon icon="lucide:message-circle" className="text-base md:text-lg" />
            <span>43</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}