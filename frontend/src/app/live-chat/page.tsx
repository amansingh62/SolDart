"use client";

import React, { useState, useEffect, useRef } from 'react';
import { LiveChatSkeleton } from '@/components/ui/skeletons/LiveChatSkeleton';
import { Button } from "@heroui/react";
import { Icon } from "@iconify/react";
import { Avatar } from "@heroui/react";
import { Input } from "@heroui/react";
import { useLanguage } from '../../context/LanguageContext';
import api from '../../lib/apiUtils';
import { initializeSocket } from '../../lib/socketUtils';
import { formatDistanceToNow } from 'date-fns';

interface LiveChatMessage {
  _id: string;
  sender: {
    _id: string;
    username: string;
    profileImage: string;
  };
  text?: string;
  createdAt: string;
  seenBy: string[];
  hiddenFor?: string[]; // Add the missing hiddenFor property
  replyTo?: {
    _id: string;
    text?: string;
    sender: {
      username: string;
    }
  };
}

const LiveChatPage = () => {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<{ [key: string]: string }>({});
  const [onlineUsers, setOnlineUsers] = useState<{ [key: string]: boolean }>({});
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number, y: number } | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<LiveChatMessage | null>(null);
  const [replyingTo, setReplyingTo] = useState<LiveChatMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const socketRef = useRef<any>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const currentUserId = useRef<string | null>(null);

  // Initialize socket and fetch messages
  useEffect(() => {
    const socket = initializeSocket();
    socketRef.current = socket;
    currentUserId.current = localStorage.getItem('userId');

    if (socket) {
      // Set current user as online immediately
      if (currentUserId.current) {
        setOnlineUsers(prev => ({
          ...prev,
          [currentUserId.current!]: true
        }));
      }

      // Listen for new messages
      socket.on('newLiveChatMessage', (message: LiveChatMessage) => {
        setMessages(prev => [...prev, message]);
      });

      // Listen for typing indicators
      socket.on('liveChatUserTyping', (data: { senderId: string, username: string, isTyping: boolean }) => {
        setTypingUsers(prev => {
          if (data.isTyping) {
            return { ...prev, [data.senderId]: data.username };
          } else {
            const newTypingUsers = { ...prev };
            delete newTypingUsers[data.senderId];
            return newTypingUsers;
          }
        });
      });

      // Listen for user status changes
      socket.on('userStatusChange', (data: { userId: string, isOnline: boolean }) => {
        setOnlineUsers(prev => ({
          ...prev,
          [data.userId]: data.isOnline
        }));
      });

      // Listen for initial online users list
      socket.on('onlineUsersList', (users: { [key: string]: boolean }) => {
        setOnlineUsers(prev => ({
          ...prev,
          ...users,
          [currentUserId.current!]: true // Ensure current user is always online
        }));
      });

      // Emit user online status when connected
      const userId = currentUserId.current;
      const username = localStorage.getItem('username');
      if (userId && username) {
        socket.emit('userOnline', { userId, username });
      }

      // Request initial online users list
      socket.emit('getOnlineUsers');
    }

    // Fetch recent messages
    const fetchMessages = async () => {
      try {
        const response = await api.get('/live-chat');
        if (response.data.success) {
          setMessages(response.data.messages);
        }
      } catch (error) {
        console.error('Error fetching live chat messages:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    return () => {
      if (socket) {
        // Emit user offline status when disconnecting
        const userId = currentUserId.current;
        if (userId) {
          socket.emit('userOffline', { userId });
        }

        socket.off('newLiveChatMessage');
        socket.off('liveChatUserTyping');
        socket.off('userStatusChange');
        socket.off('onlineUsersList');
      }
    };
  }, []);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenuPosition(null);
        setSelectedMessage(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle typing indicator
  useEffect(() => {
    if (!socketRef.current) return;

    if (newMessage.trim() !== '') {
      if (!isTyping) {
        setIsTyping(true);
        socketRef.current.emit('liveChatTyping', {
          senderId: localStorage.getItem('userId'),
          username: localStorage.getItem('username'),
          isTyping: true
        });
      }

      // Reset typing timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        setIsTyping(false);
        socketRef.current.emit('liveChatTyping', {
          senderId: localStorage.getItem('userId'),
          username: localStorage.getItem('username'),
          isTyping: false
        });
      }, 1000);
    } else if (isTyping) {
      setIsTyping(false);
      socketRef.current.emit('liveChatTyping', {
        senderId: localStorage.getItem('userId'),
        username: localStorage.getItem('username'),
        isTyping: false
      });
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [newMessage, isTyping]);

  // Show skeleton loading when messages are loading
  if (loading) {
    return <LiveChatSkeleton />;
  }

  // No audio or recording functionality needed

  const handleSendMessage = async () => {
    if (newMessage.trim() === '') return;

    try {
      const payload: any = { text: newMessage };

      // Add reply information if replying to a message
      if (replyingTo) {
        payload.replyTo = replyingTo._id;
      }

      await api.post('/live-chat/text', payload);
      setNewMessage('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Reply to message functionality
  const handleReplyToMessage = (message: LiveChatMessage) => {
    setReplyingTo(message);
    setContextMenuPosition(null);
    setSelectedMessage(null);
  };

  // Context menu component
  const MessageContextMenu = () => {
    if (!contextMenuPosition || !selectedMessage) return null;

    return (
      <div
        ref={contextMenuRef}
        className="absolute bg-white rounded-lg shadow-lg z-50 py-1 w-40"
        style={{ top: contextMenuPosition.y, left: contextMenuPosition.x }}
      >
        <button
          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
          onClick={() => handleReplyToMessage(selectedMessage)}
        >
          <Icon icon="lucide:reply" width={14} />
          {t('Reply')}
        </button>
      </div>
    );
  };

  // Audio recording functionality has been removed

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-h-screen bg-gray-50">
      <div className="py-3 px-4 border-b bg-black text-white flex justify-between items-center shadow-md">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Icon icon="lucide:message-circle" className="text-[#B671FF]" />
          {t('Global Chat')}
        </h1>
        <div className="flex items-center gap-2">
          <span className="text-sm bg-gradient-to-r from-[#B671FF] via-[#C577EE] to-[#E282CA] text-black px-3 py-1 rounded-full font-medium flex items-center gap-1.5 shadow-sm">
            <span className="w-2 h-2 bg-black rounded-full animate-pulse"></span>
            <span className="font-bold text-sm">
              {Object.keys(onlineUsers).filter(id => onlineUsers[id]).length || 1}
            </span> {t('online')}
          </span>
        </div>
      </div>

      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto py-2 px-3 space-y-2 bg-gray-50"
        style={{ maxHeight: 'calc(100vh - 10rem)' }}
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            {t('No messages yet. Start the conversation!')}
          </div>
        ) : (
          messages.map((message) => {
            // Skip messages that are hidden for current user
            const userId = localStorage.getItem('userId');
            if (message.hiddenFor?.includes(userId || '')) return null;

            // Determine if message is from current user (to display on right side)
            const isOwnMessage = message.sender._id === userId;

            return (
              <div
                key={message._id}
                className={`flex items-start gap-1.5 animate-fadeIn w-full mb-1.5 group ${isOwnMessage ? 'flex-row-reverse !justify-start' : ''}`}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenuPosition({ x: e.clientX, y: e.clientY });
                  setSelectedMessage(message);
                }}
                onTouchStart={(e) => {
                  const touchTimeout = setTimeout(() => {
                    const touch = e.touches[0];
                    setContextMenuPosition({ x: touch.clientX, y: touch.clientY });
                    setSelectedMessage(message);
                  }, 500);

                  const touchEndHandler = () => {
                    clearTimeout(touchTimeout);
                    document.removeEventListener('touchend', touchEndHandler);
                  };

                  document.addEventListener('touchend', touchEndHandler);
                }}
              >
                <Avatar
                  src={message.sender.profileImage || '/svg.png'}
                  alt={message.sender.username}
                  className={`w-7 h-7 mt-1 flex-shrink-0 ${isOwnMessage ? 'order-2' : 'order-1'}`}
                />
                <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} max-w-[75%] ${isOwnMessage ? 'order-1' : 'order-2'}`}>
                  {/* Username and timestamp */}
                  <div className={`flex items-center gap-1 mb-0.5 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                    <span className="font-semibold text-xs">{message.sender.username}</span>
                    <span className="text-[10px] text-gray-500">
                      {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                    </span>
                    {onlineUsers[message.sender._id] && (
                      <span className="w-1.5 h-1.5 bg-gradient-to-r from-[#B671FF] via-[#C577EE] to-[#E282CA] text-black rounded-full"></span>
                    )}
                  </div>

                  {/* Reply indicator */}
                  {message.replyTo && (
                    <div className={`text-xs text-gray-500 mb-0.5 flex items-center gap-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                      <Icon icon="lucide:reply" width={10} />
                      <span>Replying to {message.replyTo.sender.username}</span>
                    </div>
                  )}

                  {/* Message content */}
                  <div className="relative">
                    <p className={`text-sm break-words bg-white py-1.5 px-2.5 rounded-lg shadow-sm hover:shadow-md transition-shadow inline-block ${isOwnMessage ? 'border-r-2 border-[#B671FF]' : 'border-l-2 border-[#B671FF]'}`}>
                      {message.text}
                    </p>

                    {/* Message actions on hover */}
                    <div className={`absolute ${isOwnMessage ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1`}>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        className="bg-white shadow-sm"
                        onPress={() => handleReplyToMessage(message)}
                      >
                        <Icon icon="lucide:reply" width={14} />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Context Menu */}
        <MessageContextMenu />

        {/* Typing indicators */}
        {Object.keys(typingUsers).length > 0 && (
          <div className="fixed bottom-16 left-4 flex items-center gap-1 text-xs bg-gradient-to-r from-[#B671FF] via-[#C577EE] to-[#E282CA] text-black bg-opacity-90 py-1.5 px-4 rounded-full shadow-md z-10 w-fit animate-pulse">
            <span className="font-medium text-black">{Object.values(typingUsers).join(', ')}</span>
            <span className="text-black font-medium">{t('typing')}</span>
            <div className="flex gap-0.5">
              <span className="animate-bounce text-black">.</span>
              <span className="animate-bounce text-black" style={{ animationDelay: '0.2s' }}>.</span>
              <span className="animate-bounce text-black" style={{ animationDelay: '0.4s' }}>.</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="py-2 px-3 border-t bg-white shadow-inner sticky bottom-0">
        {/* Reply indicator */}
        {replyingTo && (
          <div className="bg-gray-100 p-2 mb-2 rounded-lg flex justify-between items-center text-sm">
            <div className="flex items-center gap-1">
              <Icon icon="lucide:reply" width={14} className="text-gray-500" />
              <span className="text-gray-600">Replying to <span className="font-medium">{replyingTo.sender.username}</span></span>
              <span className="text-gray-400 text-xs truncate max-w-[200px]">{replyingTo.text}</span>
            </div>
            <Button
              isIconOnly
              size="sm"
              variant="light"
              onPress={() => setReplyingTo(null)}
              className="text-gray-500"
            >
              <Icon icon="lucide:x" width={14} />
            </Button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Input
            placeholder={t('Type a message...')}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1 text-sm"
            size="sm"
          />
          <Button
            isIconOnly
            className="bg-gradient-to-r from-[#B671FF] via-[#C577EE] to-[#E282CA] 
             text-black hover:!bg-black hover:!from-black hover:!via-black hover:!to-black 
             hover:text-white rounded transition-colors shadow-sm"
            onPress={handleSendMessage}
            isDisabled={newMessage.trim() === ''}
          >
            <Icon icon="lucide:send" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LiveChatPage;