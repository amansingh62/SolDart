'use client';

import React from 'react';
import { Skeleton } from "@/components/ui/skeleton";

export function LiveChatSkeleton() {
  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Incoming messages */}
        {[1, 2, 3].map((_, i) => (
          <div key={`in-${i}`} className="flex items-start space-x-2 max-w-[80%]">
            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
            <div className="space-y-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-16 w-48 sm:w-64 rounded-lg" />
              <Skeleton className="h-2 w-16" />
            </div>
          </div>
        ))}
        
        {/* Outgoing messages */}
        {[1, 2].map((_, i) => (
          <div key={`out-${i}`} className="flex items-start space-x-2 max-w-[80%] ml-auto flex-row-reverse">
            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
            <div className="space-y-1 items-end flex flex-col">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-12 w-40 sm:w-56 rounded-lg" />
              <Skeleton className="h-2 w-16" />
            </div>
          </div>
        ))}
        
        {/* Typing indicator */}
        <div className="flex items-center space-x-2 max-w-[80%]">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>
      
      {/* Message input */}
      <div className="p-4 border-t">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-10 flex-1 rounded-full" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </div>
    </div>
  );
}