'use client';

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Icon } from "@iconify/react";

// Generate random percentages for poll options
const pollOptions = [
  { name: "Bitcoin", percentage: Math.floor(Math.random() * 100) + 1 },
  { name: "Polygon", percentage: Math.floor(Math.random() * 100) + 1 },
  { name: "Solana", percentage: Math.floor(Math.random() * 100) + 1 },
];

export function PostCard() {
  return (
    <Card className="shadow-md rounded-lg w-full max-w-screen-md mx-auto">
      <CardContent className="space-y-4 p-4">
        {/* ✅ Top Section: Avatar & User Info */}
        <div className="flex gap-2 md:gap-3">
          <Avatar className="w-10 h-10 md:w-12 md:h-12">
            <AvatarImage src="https://i.pravatar.cc/150?u=a042581f4e29026024d" alt="Jesica Alba" />
            <AvatarFallback>J</AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <div className="flex items-center gap-1 md:gap-2">
              <span className="font-semibold text-black text-sm md:text-md">Jesica Alba</span>
              {/* ✅ Green Verified Check */}
              <span className="rounded-full p-1 flex items-center shrink-0">
                <Icon icon="lucide:badge-check" className="bg-[#9dfc3f] text-white rounded-sm text-xs" />
              </span>
            </div>

            {/* ✅ Wallet Address & Views in One Line */}
            <div className="flex items-center gap-4 md:gap-6 text-gray-500 text-xs md:text-sm">
              <span className="truncate max-w-full md:max-w-[120px]">0x73Hr5...fg58g</span>
              <span className="text-gray-600">• 1.3k Views</span>
            </div>
          </div>
        </div>

        {/* ✅ Poll Box with Shadow (Contains Options) */}
        <div className="bg-white shadow-md rounded-lg p-4 space-y-3 w-full">
          <h4 className="font-semibold text-sm md:text-lg flex items-center gap-2">
            <Icon icon="lucide:bar-chart-2" className="text-black text-lg md:text-xl" />
            Which coin will you be holding for the bull run?
            <span className="text-gray-600 text-xs md:text-sm">• 77 votes</span>
          </h4>

          {/* ✅ Poll Options (Inside Box, No Shadow on Options) */}
          <div className="space-y-2">
            {pollOptions.map((option) => (
              <div key={option.name} className="rounded-lg p-2 relative bg-gray-200">
                <div
                  className="absolute left-0 top-0 h-full bg-[#9dfc3f] rounded-lg"
                  style={{ width: `${option.percentage}%` }}
                />
                <div className="relative flex justify-between font-medium px-2 text-black text-xs md:text-sm">
                  <span>{option.name}</span>
                  <span>{option.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ✅ Bottom Actions (Like & Comment Stay Left-Aligned) */}
        <div className="flex items-center gap-4 md:gap-6 text-gray-600 text-xs md:text-sm">
          <span>1hr</span>
          <div className="flex items-center gap-1">
            <Icon icon="lucide:heart" className="text-lg" />
            <span>43</span>
          </div>
          <div className="flex items-center gap-1">
            <Icon icon="lucide:message-circle" className="text-lg" />
            <span>12</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
