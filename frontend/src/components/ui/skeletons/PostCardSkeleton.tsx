'use client';

import React from 'react';
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface PostCardSkeletonProps {
  withComments?: boolean;
}

export function PostCardSkeleton({ withComments = false }: PostCardSkeletonProps) {
  return (
    <Card className="p-4 space-y-4 overflow-hidden">
      {/* Header with avatar and username */}
      <div className="flex items-center space-x-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-6 w-6 rounded-full" />
      </div>
      
      {/* Post content */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      
      {/* Media placeholder */}
      <Skeleton className="h-48 w-full rounded-md" />
      
      {/* Action buttons */}
      <div className="flex justify-between pt-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
      
      {/* Comments section if needed */}
      {withComments && (
        <div className="pt-3 space-y-3">
          <Skeleton className="h-px w-full bg-gray-200" />
          <div className="flex items-center space-x-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-10 flex-1 rounded-full" />
          </div>
          {/* Sample comments */}
          <div className="space-y-3 pt-2">
            {[1, 2].map((_, i) => (
              <div key={i} className="flex space-x-2">
                <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}