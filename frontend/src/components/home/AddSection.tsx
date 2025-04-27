'use client';

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";

type AdsSectionProps = {
  className?: string;
};

export function AdsSection({ className }: AdsSectionProps) {
  return (
    <Card className={`max-w-full bg-white rounded-lg shadow-[0px_4px_15px_rgba(128,128,128,0.4)] ${className}`}>
      <CardContent className="flex items-center justify-center py-8">
        <span className="text-xl font-bold text-black">Your Ads Here</span>
      </CardContent>
    </Card>
  );
}