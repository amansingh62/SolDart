"use client";

import React, { useState } from 'react';
import { Icon } from "@iconify/react";
import SupportChat from './SupportChat';

interface DartAIButtonProps {
  className?: string;
}

const DartAIButton: React.FC<DartAIButtonProps> = ({ className }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating button - only visible on mobile */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-r from-[#B671FF] via-[#C577EE] to-[#E282CA] text-black shadow-lg flex items-center justify-center z-50 md:hidden ${className}`}
        aria-label="Open DarAI"
      >
        <Icon icon="lucide:bot" className="text-2xl" />
      </button>

      {/* DartAI Chat Interface */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center md:hidden">
          <div className="relative w-full max-w-[90%] h-auto max-h-[80%] bg-white rounded-lg overflow-hidden">
            {/* Close button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-3 right-3 z-10 text-black hover:text-gray-600"
              aria-label="Close DartAI"
            >
              <Icon icon="lucide:x" className="text-xl" />
            </button>

            {/* Support Chat Component */}
            <div className="h-full w-full">
              <SupportChat />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DartAIButton;