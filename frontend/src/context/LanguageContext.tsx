"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define available languages
export type Language = 'en' | 'ja' | 'zh';

// Define the context shape
type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
};

// Create the context with default values
const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key: string) => key,
});

// Define translations
const translations: Record<Language, Record<string, string>> = {
  en: {
    // English is default, no translations needed
  },
  ja: {
    // Navigation
    'home': 'ホーム',
    'profile': 'プロフィール',
    'notifications': '通知',
    'messages': 'メッセージ',
    'advertise': '広告',
    'newDart': '新規ダート',
    'language': '言語',
    
    // Common
    'loading': '読み込み中...',
    'error': 'エラーが発生しました',
    'success': '成功！',
    'connectWallet': 'ウォレットを接続',
    'signIn': 'サインイン',
    'searchUsers': 'ユーザーを検索',
    'search': '検索',
  },
  zh: {
    // Navigation
    'home': '首页',
    'profile': '个人资料',
    'notifications': '通知',
    'messages': '消息',
    'advertise': '广告',
    'newDart': '新建Dart',
    'language': '语言',
    
    // Common
    'loading': '加载中...',
    'error': '发生错误',
    'success': '成功！',
    'connectWallet': '连接钱包',
    'signIn': '登录',
    'searchUsers': '搜索用户',
    'search': '搜索',
  },
};

// Provider component
interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  // Initialize language from localStorage or default to 'en'
  const [language, setLanguageState] = useState<Language>('en');

  // Load saved language preference on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') as Language;
    if (savedLanguage && ['en', 'ja', 'zh'].includes(savedLanguage)) {
      setLanguageState(savedLanguage);
    }
  }, []);

  // Update language and save to localStorage
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  // Translation function
  const t = (key: string): string => {
    // For English, just return the key as it's the default language
    if (language === 'en') return key;
    // For other languages, look up in translations
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Custom hook to use the language context
export const useLanguage = () => useContext(LanguageContext);