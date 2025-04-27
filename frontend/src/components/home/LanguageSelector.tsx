"use client";

import React, { useState } from 'react';
import { Popover, PopoverTrigger, PopoverContent } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useLanguage, Language } from '@/context/LanguageContext';

interface LanguageSelectorProps {
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ className }) => {
  const { language, setLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  
  const languages = [
    { code: 'en', name: 'English', flag: 'emojione:flag-for-united-states' },
    { code: 'ja', name: '日本語', flag: 'emojione:flag-for-japan' },
    { code: 'zh', name: '中文', flag: 'emojione:flag-for-china' },
  ];

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    setIsOpen(false);
  };

  // Get current language display info
  const currentLanguage = languages.find(lang => lang.code === language) || languages[0];

  return (
    <Popover isOpen={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger>
        <div 
          className={`flex items-center gap-1 cursor-pointer ${className}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          <Icon icon={currentLanguage.flag} className="text-xl" />
          <span>{t('language')}</span>
        </div>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-40">
        <div className="py-2">
          {languages.map((lang) => (
            <div
              key={lang.code}
              className={`px-4 py-2 flex items-center gap-2 hover:bg-gray-100 cursor-pointer ${language === lang.code ? 'bg-gray-50' : ''}`}
              onClick={() => handleLanguageChange(lang.code as Language)}
            >
              <Icon icon={lang.flag} className="text-xl" />
              <span>{lang.name}</span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};