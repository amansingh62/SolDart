"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Popover, PopoverTrigger, PopoverContent, Button } from "@heroui/react";
import { Icon } from "@iconify/react";
import { initializeSocket, getSocket } from "../../lib/socketUtils";
import api from "../../lib/apiUtils";

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  type: string;
  senderUsername?: string;
}

interface NotificationPopupProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  children: React.ReactNode;
  onUnreadCountChange?: (count: number) => void;
}

export const NotificationPopup: React.FC<NotificationPopupProps> = ({ isOpen, setIsOpen, children, onUnreadCountChange }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Memoize the onUnreadCountChange callback to prevent unnecessary re-renders
  const memoizedOnUnreadCountChange = useCallback((count: number) => {
    if (onUnreadCountChange) {
      onUnreadCountChange(count);
    }
  }, [onUnreadCountChange]);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await api.get('/notifications');
      if (response.data.success) {
        interface ApiNotification {
          _id: string;
          type: string;
          message: string;
          createdAt: string;
          isRead: boolean;
          sender?: {
            username: string;
          };
        }

        const apiNotifications = response.data.notifications.map((notification: ApiNotification) => ({
          id: notification._id,
          title: getNotificationTitle(notification.type),
          message: notification.message,
          time: formatTimeAgo(new Date(notification.createdAt)),
          isRead: notification.isRead,
          type: notification.type,
          senderUsername: notification.sender?.username
        }));
        const newUnreadCount = apiNotifications.filter((n: Notification) => !n.isRead).length;
        setNotifications(apiNotifications);
        setUnreadCount(newUnreadCount);

        // Update parent component's unread count
        memoizedOnUnreadCountChange(newUnreadCount);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [memoizedOnUnreadCountChange]);

  // Get notification title based on type
  const getNotificationTitle = (type: string) => {
    switch (type) {
      case 'like': return 'New Like';
      case 'comment': return 'New Comment';
      case 'follow': return 'New Follower';
      case 'mention': return 'New Mention';
      default: return 'Notification';
    }
  };

  // Format time ago
  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
  };

  // Initialize socket and fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await api.get('/auth/current-user');
        if (response.data.user) {
          // Initialize socket with user ID
          const socket = initializeSocket(response.data.user._id);

          // Listen for real-time notifications
          interface SocketNotification {
            _id: string;
            type: string;
            message: string;
            createdAt: string;
            isRead: boolean;
            sender?: {
              username: string;
            };
          }

          socket.on('notification', (newNotification: SocketNotification) => {
            const formattedNotification = {
              id: newNotification._id,
              title: getNotificationTitle(newNotification.type),
              message: newNotification.message,
              time: 'Just now',
              isRead: false,
              type: newNotification.type,
              senderUsername: newNotification.sender?.username
            };

            setNotifications(prev => [formattedNotification, ...prev]);
            setUnreadCount(prevCount => {
              const newCount = prevCount + 1;
              // Update parent component's unread count
              memoizedOnUnreadCountChange(newCount);
              return newCount;
            });
          });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
    fetchNotifications();

    return () => {
      const socket = getSocket();
      if (socket) {
        socket.off('notification');
      }
    };
  }, [fetchNotifications, memoizedOnUnreadCountChange]);

  const [activeTab, setActiveTab] = useState("all");
  // Modified filtering logic to ensure read notifications only appear in the 'Read' tab
  // and unread notifications only appear in the 'All' tab
  const filteredNotifications = activeTab === "read"
    ? notifications.filter(n => n.isRead)
    : notifications.filter(n => !n.isRead);

  const handleClearAll = async () => {
    try {
      const response = await api.delete('/notifications/delete-all');
      if (response.data.success) {
        setNotifications([]);
        setUnreadCount(0);

        // Update parent component's unread count
        memoizedOnUnreadCountChange(0);
      }
    } catch (error) {
      console.error('Error deleting all notifications:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await api.put('/notifications/read-all');
      if (response.data.success) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, isRead: true }))
        );
        setUnreadCount(0);

        // Update parent component's unread count
        memoizedOnUnreadCountChange(0);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      const response = await api.put(`/notifications/read/${id}`);
      if (response.data.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount(prevCount => {
          const newCount = Math.max(0, prevCount - 1);
          // Update parent component's unread count
          memoizedOnUnreadCountChange(newCount);
          return newCount;
        });
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const NotificationItem = ({ notification }: { notification: Notification }) => (
    <div
      className="p-3 sm:p-4 border-b border-gray-200 hover:bg-gray-100 cursor-pointer transition-all duration-200 rounded-lg shadow-md flex items-start gap-3"
      onClick={() => handleMarkAsRead(notification.id)}
    >
      <div className="p-2 rounded-full bg-primary-100">
        <Icon icon="lucide:bell" className="text-primary-500 text-lg" />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-gray-900 text-xs sm:text-sm">{notification.title}</p>
          <span className="text-xs text-gray-500">{notification.time}</span>
        </div>
        <p className="text-xs sm:text-sm text-gray-600 mt-1 leading-relaxed">
          {notification.senderUsername ? <span className="font-semibold">{notification.senderUsername}</span> : ''} {notification.message}
        </p>
      </div>
    </div>
  );

  return (
    <Popover isOpen={isOpen} onOpenChange={setIsOpen} placement="bottom-start">
      <PopoverTrigger><div>{children}</div></PopoverTrigger>
      <PopoverContent className="w-full max-w-[400px] p-4 shadow-2xl rounded-lg mt-3 z-50 relative bg-white border border-gray-200">
        <div className="px-3 sm:px-5 py-2 sm:py-3 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-sm sm:text-lg font-semibold text-gray-900">Notifications</h3>
          {notifications.length > 0 && (
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Button size="sm" variant="ghost" color="primary" onPress={handleMarkAllAsRead}>
                  Mark all read
                </Button>
              )}
              <Button size="sm" variant="ghost" color="danger" onPress={handleClearAll}>
                Clear all
              </Button>
            </div>
          )}
        </div>
        <div className="flex justify-center gap-2 sm:gap-4 my-2 sm:my-3">
          <button
            className={`px-3 py-1 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 shadow-md ${activeTab === "all" ? "bg-gradient-to-r from-[#32CD32] via-[#7CFC00] to-[#90EE90] text-black rounded-lg font-medium hover:opacity-90 transition-opacity w-full sm:w-auto" : "bg-gray-200 text-gray-700"
              }`}
            onClick={() => setActiveTab("all")}
          >
            All
          </button>
          <button
            className={`px-3 py-1 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 shadow-md ${activeTab === "read" ? "bg-gradient-to-r from-[#32CD32] via-[#7CFC00] to-[#90EE90] text-black rounded-lg font-medium hover:opacity-90 transition-opacity w-full sm:w-auto" : "bg-gray-200 text-gray-700"
              }`}
            onClick={() => setActiveTab("read")}
          >
            Read
          </button>
        </div>
        <div className="max-h-[300px] sm:max-h-[400px] overflow-y-auto p-3 sm:p-4">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => <NotificationItem key={notification.id} notification={notification} />)
          ) : (
            <div className="flex flex-col items-center justify-center py-6 sm:py-10 text-gray-500">
              <Icon icon="lucide:bell-off" className="text-3xl sm:text-4xl mb-2" />
              <p className="text-xs sm:text-sm">No notifications</p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};