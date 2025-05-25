"use client";

import React from 'react';
import { Icon } from "@iconify/react";

interface RecentSearchesProps {
  searches: string[];
  onSelectSearch: (search: string) => void;
  onClearSearch: (search: string) => void;
  onClearAll: () => void;
}

export const RecentSearches: React.FC<RecentSearchesProps> = ({
  searches,
  onSelectSearch,
  onClearSearch,
  onClearAll
}) => {
  if (searches.length === 0) return null;

  return (
    <div className="absolute top-full left-0 w-full mt-1 bg-white rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto scrollbar-hide">
      <div className="flex justify-between items-center p-2 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-700">Recent Searches</h3>
        <button
          onClick={onClearAll}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Clear All
        </button>
      </div>
      <div className="p-2">
        {searches.map((search, index) => (
          <div
            key={`${search}-${index}`}
            className="flex items-center justify-between p-2 hover:bg-gray-100 rounded-md cursor-pointer"
          >
            <div
              className="flex items-center flex-grow"
              onClick={() => onSelectSearch(search)}
            >
              <Icon icon="lucide:clock" className="text-gray-400 mr-2" />
              <span className="text-sm">{search}</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClearSearch(search);
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <Icon icon="lucide:x" className="text-sm" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};