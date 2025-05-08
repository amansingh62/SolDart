'use client';

import React from 'react';
import { Skeleton } from "@/components/ui/skeleton";

export function LayoutSkeleton() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar skeleton */}
      <div className="hidden md:flex md:w-64 flex-col fixed inset-y-0 border-r bg-white">
        <div className="p-4 border-b">
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Navigation items */}
          {[1, 2, 3, 4, 5, 6].map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <Skeleton className="h-6 w-6 rounded-md" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
          
          {/* Trending section */}
          <div className="pt-6 space-y-3">
            <Skeleton className="h-5 w-32" />
            {[1, 2, 3].map((_, i) => (
              <div key={i} className="flex items-center space-x-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 md:ml-64 p-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-8 w-32 md:hidden" />
          <div className="flex items-center space-x-3 ml-auto">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-10 w-32 rounded-md" />
          </div>
        </div>
        
        {/* Content placeholder */}
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}