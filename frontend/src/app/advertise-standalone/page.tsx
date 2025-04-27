'use client';

import React from 'react';
import AdvertiseForm from '@/components/home/AdvertiseForm';

export default function StandaloneAdvertisePage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-4xl mx-auto">
        <AdvertiseForm />
      </div>
    </div>
  );
}