"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from "@heroui/react";
import { Icon } from "@iconify/react";
import { NotificationPopup } from './NotificationPopup';
import MessagePopup from './MessagePopup';
import api from '../../lib/apiUtils';
import { initializeSocket } from '../../lib/socketUtils';
import { useLanguage } from '../../context/LanguageContext';

// Define types for notification and API response
interface Notification {
  id: string;
  isRead: boolean;
  // Add other notification properties as needed
}

interface NotificationResponse {
  success: boolean;
  notifications: Notification[];
}

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const { t } = useLanguage();

  // Fetch unread notification count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await api.get<NotificationResponse>('/notifications');
        if (response.data.success) {
          const unreadCount = response.data.notifications.filter((n: Notification) => !n.isRead).length;
          setUnreadNotifications(unreadCount);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchUnreadCount();

    // Set up socket listener for new notifications
    const socket = initializeSocket();
    if (socket) {
      socket.on('notification', () => {
        setUnreadNotifications(prev => prev + 1);
      });
    }

    return () => {
      if (socket) {
        socket.off('notification');
      }
    };
  }, []);

  // Fetch unread message count
  useEffect(() => {
    const fetchUnreadMessageCount = async () => {
      try {
        const response = await api.get('/messages/unread-count');
        if (response.data.success) {
          setUnreadMessages(response.data.count);
        }
      } catch (error) {
        if (error) {
          console.error('Error fetching unread message count:', error);
        }
        // else do nothing (silent fail)
      }
    };

    fetchUnreadMessageCount();

    // Set up socket listener for new messages
    const socket = initializeSocket();
    if (socket) {
      socket.on('message', () => {
        fetchUnreadMessageCount(); // Fetch updated count when new message arrives
      });
    }

    return () => {
      if (socket) {
        socket.off('message');
      }
    };
  }, []);

  // Define the type for menu items
  interface MenuItem {
    icon: string;
    label: string;
    path?: string;
    action?: () => void;
    newTab?: boolean;
    component?: React.ReactNode;
  }

  const menuItems: MenuItem[] = [
    { icon: "lucide:home", label: t('Home'), path: "/" },
    { icon: "lucide:user", label: t('Profile'), path: "/profile" },
    { icon: "lucide:wallet", label: t('Wallet'), path: "/wallet" },
    { icon: "lucide:bell", label: t('Notifications'), action: () => setIsNotificationOpen(true) },
    { icon: "lucide:mail", label: t('Messages'), action: () => setIsMessageOpen(true) },
    { icon: "lucide:message-circle", label: t('Live Chat'), path: "/live-chat" },
    { icon: "lucide:trophy", label: t('Quests'), path: "/quests" },
    { icon: "lucide:plus", label: t('Advertise'), path: "" },
  ];

  // Function to check if a menu item is active based on the current path or popup state
  const isActive = (item: MenuItem) => {
    // For items with paths
    if (item.path) {
      // For home path
      if (item.path === '/' && pathname === '/') return true;

      // For profile path - check if pathname starts with /profile
      if (item.path === '/profile' && pathname?.startsWith('/profile')) return true;

      // For wallet path - check if pathname starts with /wallet
      if (item.path === '/wallet' && pathname?.startsWith('/wallet')) return true;

      // For Live Chat path
      if (item.path === '/live-chat' && pathname?.startsWith('/live-chat')) return true;

      // For Quests path
      if (item.path === '/quests' && pathname?.startsWith('/quests')) return true;

      if (item.path === '/settings' && pathname?.startsWith('/settings')) return true;
    }

    // For popup items
    if (item.label === "Notifications" && isNotificationOpen) return true;
    if (item.label === "Messages" && isMessageOpen) return true;

    return false;
  };

  return (
    <div className="max-w-full text-xl font-medium rounded-2xl space-y-2 p-4 bg-[rgba(243,144,236,0.21)] border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.1)] backdrop-blur-[12px] transition-all duration-300 hover:shadow-[0_8px_32px_rgba(182,113,255,0.15)]"
    >
      {menuItems.map((item) => (
        <div key={item.label} className="relative">
          {item.component ? (
            // Render custom component if provided
            <div className="p-2">
              {item.component}
            </div>
          ) : (
            // Otherwise render standard button
            <Button
              variant="light"
              className={`w-full justify-start rounded-xl transition duration-300 relative ${isActive(item) ? 'text-white bg-black shadow-md' : 'hover:bg-white/20 hover:shadow-sm'}`}
              startContent={<Icon icon={item.icon} className={isActive(item) ? 'text-white' : 'text-[#B671FF]'} />}
              onPress={() => {
                if (item.action) {
                  item.action();
                } else if (item.path) {
                  if (item.newTab) {
                    window.open(item.path, '_blank');
                  } else {
                    router.push(item.path);
                  }
                }
              }}
            >
              <span className={`${isActive(item) ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
              {item.label === t('Notifications') && unreadNotifications > 0 && (
                <div className="absolute top-1/2 -translate-y-1/2 right-3 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </div>
              )}
              {item.label === t('Messages') && unreadMessages > 0 && (
                <div className="absolute top-1/2 -translate-y-1/2 right-3 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md">
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </div>
              )}
            </Button>
          )}

          {/* Notification Popup should be inside the relative div */}
          {item.label === t('Notifications') && (
            <NotificationPopup
              isOpen={isNotificationOpen}
              setIsOpen={setIsNotificationOpen}
              onUnreadCountChange={(count) => setUnreadNotifications(count)}
            >
              <Button variant="light" className="hidden" />
            </NotificationPopup>
          )}

          {/* Message Popup should be inside the relative div */}
          {item.label === t('Messages') && (
            <MessagePopup
              isOpen={isMessageOpen}
              setIsOpen={setIsMessageOpen}
              onUnreadCountChange={(count) => setUnreadMessages(count)}
            >
              <Button variant="light" className="hidden" />
            </MessagePopup>
          )}
        </div>
      ))}
    </div>
  );
}