'use client';

import React from 'react';
import AdvertiseForm from '@/components/home/AdvertiseForm';
import { Card, CardContent } from "@/components/ui/card";

export default function AdvertisePage() {  
  return ( 
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <AdvertiseForm />
        </div>
      </div>
  );
}