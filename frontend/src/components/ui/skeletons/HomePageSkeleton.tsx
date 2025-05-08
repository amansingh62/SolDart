'use client';

import React from 'react';
import { PostCardSkeleton } from './PostCardSkeleton';
import { Skeleton } from "@/components/ui/skeleton";

export function HomePageSkeleton() {
  return (
    <div className="space-y-4">
      {/* Create post form skeleton */}
      <div className="p-4 border rounded-lg bg-white shadow-sm">
        <div className="flex items-center space-x-3 mb-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-10 flex-1 rounded-lg" />
        </div>
        <div className="flex justify-between pt-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
      
      {/* Post cards */}
      <div className="space-y-4">
        {[1, 2, 3, 4].map((_, i) => (
          <React.Fragment key={i}>
            <PostCardSkeleton withComments={i === 0} />
            {/* Insert featured profiles after the 3rd post */}
            {i === 2 && (
              <div className="p-4 border rounded-lg bg-white shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="flex space-x-4 overflow-x-auto py-2">
                  {[1, 2, 3, 4].map((_, j) => (
                    <div key={j} className="flex-shrink-0 w-24 flex flex-col items-center space-y-2">
                      <Skeleton className="h-16 w-16 rounded-full" />
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}