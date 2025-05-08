'use client';

import React from 'react';
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      {/* Cover image */}
      <Skeleton className="h-48 w-full rounded-md" />
      
      {/* Profile header with avatar and basic info */}
      <div className="relative px-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between">
          {/* Avatar - positioned to overlap cover image */}
          <div className="flex items-end -mt-16 sm:-mt-20 mb-4 sm:mb-0">
            <Skeleton className="h-24 w-24 sm:h-32 sm:w-32 rounded-full border-4 border-white" />
            <div className="ml-4 space-y-1">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex space-x-2">
            <Skeleton className="h-10 w-28 rounded-full" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </div>
        
        {/* Bio */}
        <div className="mt-4 space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        
        {/* Stats */}
        <div className="flex justify-between mt-6">
          <Skeleton className="h-12 w-20" />
          <Skeleton className="h-12 w-20" />
          <Skeleton className="h-12 w-20" />
          <Skeleton className="h-12 w-20" />
        </div>
        
        {/* Social links */}
        <div className="flex mt-4 space-x-3">
          {[1, 2, 3, 4].map((_, i) => (
            <Skeleton key={i} className="h-8 w-8 rounded-full" />
          ))}
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b">
        <Skeleton className="h-10 w-24 mx-2" />
        <Skeleton className="h-10 w-24 mx-2" />
        <Skeleton className="h-10 w-24 mx-2" />
      </div>
    </div>
  );
}