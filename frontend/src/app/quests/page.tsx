"use client";

import React from 'react';
import { Icon } from "@iconify/react";
import { useLanguage } from '../../context/LanguageContext';

const QuestsPage = () => {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] bg-gray-50">
      <div className="text-center max-w-md mx-auto p-8 bg-white rounded-xl shadow-lg">
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center">
            <Icon icon="lucide:trophy" className="text-[#B671FF] w-10 h-10" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold mb-4">{t('Quests Coming Soon')}</h1>
        
        <p className="text-gray-600 mb-6">
          {t('We\'re working on exciting challenges and rewards for our community. Stay tuned for updates!')}
        </p>
        
        <div className="flex justify-center">
          <div className="bg-black text-[#B671FF] px-6 py-3 rounded-lg font-medium inline-flex items-center gap-2">
            <Icon icon="lucide:bell" />
            {t('Get Notified')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestsPage;