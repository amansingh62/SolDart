'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface HashtagContextType {
  selectedHashtag: string | null;
  setSelectedHashtag: (hashtag: string | null) => void;
}

const HashtagContext = createContext<HashtagContextType | undefined>(undefined);

export function useHashtag() {
  const context = useContext(HashtagContext);
  if (context === undefined) {
    throw new Error('useHashtag must be used within a HashtagProvider');
  }
  return context;
}

interface HashtagProviderProps {
  children: ReactNode;
}

export function HashtagProvider({ children }: HashtagProviderProps) {
  const [selectedHashtag, setSelectedHashtag] = useState<string | null>(null);

  return (
    <HashtagContext.Provider value={{ selectedHashtag, setSelectedHashtag }}>
      {children}
    </HashtagContext.Provider>
  );
}