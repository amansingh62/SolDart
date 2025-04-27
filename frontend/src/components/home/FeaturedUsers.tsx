'use client';

import React, { useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";

interface User {
  name: string;
  handle: string;
  avatar: string;
}

export function FeaturedUsers() {
  const users: User[] = [
    { name: "Bnb Chain Super Long Name That Exceeds Width", handle: "@bnb_123", avatar: "https://i.pravatar.cc/150?u=a042581f4e29026024d" },
    { name: "WR Chain", handle: "@wr_chain", avatar: "https://i.pravatar.cc/150?u=a042581f4e29026025d" },
    { name: "Gecko Chain", handle: "@gecko_chain", avatar: "https://i.pravatar.cc/150?u=a042581f4e29026026d" },
  ];

  // State to track follow button for each user
  const [followedUsers, setFollowedUsers] = useState<Record<string, boolean>>({});

  // Toggle Follow State
  const toggleFollow = (handle: string) => {
    setFollowedUsers((prev) => ({ ...prev, [handle]: !prev[handle] }));
  };

  return (
    <div className="max-w-full text-xl font-medium bg-white rounded-lg space-y-2 p-3 shadow-none md:shadow-[0px_4px_15px_rgba(128,128,128,0.4)]">
      <h3 className="text-lg font-bold px-2">Featured</h3>
      {users.map((user) => (
        <div 
          key={user.handle} 
          className="flex items-center justify-between p-2 rounded-lg bg-[#f3f3f3] transition duration-200"
        >
          {/* Left Section: Avatar + Name + Tick */}
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="w-8 h-8">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-medium flex items-center gap-1 text-sm">
                <span className="truncate max-w-[100px] block overflow-hidden">{user.name}</span>
                {/* ✅ Added Tick Icon */}
                <span className="rounded-full p-1 flex items-center shrink-0">
                  <Icon icon="lucide:badge-check" className="text-blue-500 text-xs" />
                </span>
              </p>
              <p className="text-xs truncate max-w-[120px]">{user.handle}</p>
            </div>
          </div>

          {/* Follow Button (No Hover Effect) */}
          <Button
            size="sm"
            className={`px-3 py-1 font-medium rounded w-[85px] transition-none ${
              followedUsers[user.handle] ? "bg-black text-white" : "bg-gradient-to-r from-[#B671FF] via-[#C577EE] to-[#E282CA] text-black"
            } hover:bg-gradient-to-r hover:from-[#B671FF] hover:via-[#C577EE] hover:to-[#E282CA] hover:text-black`}
            onClick={() => toggleFollow(user.handle)}
          >
            {followedUsers[user.handle] ? "Unfollow" : "Follow+"}
          </Button>
        </div>
      ))}
    </div>
  );
}
