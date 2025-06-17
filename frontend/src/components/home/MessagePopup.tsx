"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button, Input, Popover, PopoverTrigger, PopoverContent, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Icon } from "@iconify/react";
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { initializeSocket, getSocket } from '@/lib/socketUtils';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { useClickOutside } from '@/lib/hooks';

type MessageContextMenuProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  position: { x: number; y: number };
  messageId: string;
  isOwnMessage: boolean;
  onDelete: (messageId: string) => void;
};

type Message = {
  _id: string;
  sender: string;
  recipient: string;
  text: string;
  isRead: boolean;
  createdAt: string;
  senderInfo?: {
    username: string;
    profileImage: string;
  };
  recipientInfo?: {
    username: string;
    profileImage: string;
  };
};

type Contact = {
  _id: string;
  username: string;
  profileImage: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  isOnline?: boolean;
};

type MessagePopupProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  children?: React.ReactNode;
  initialContactId?: string | null;
  initialContactUsername?: string;
  initialContactProfileImage?: string;
  initialMessage?: string;
  onUnreadCountChange?: (count: number) => void;
  fromUserProfile?: boolean; // Flag to indicate if opened from user profile
};

const MessagePopup = ({
  isOpen,
  setIsOpen,
  children,
  initialContactId,
  initialContactUsername,
  initialContactProfileImage,
  initialMessage = '',
  onUnreadCountChange,
  fromUserProfile = false
}: MessagePopupProps) => {
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState(initialMessage);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Contact[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [, setUnreadTotal] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState({
    isOpen: false,
    position: { x: 0, y: 0 },
    messageId: '',
    isOwnMessage: false
  });

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize socket connection
  useEffect(() => {
    if (isOpen) {
      const socket = initializeSocket();

      // Listen for new messages
      socket.on('message', (newMessage: Message) => {
        // If the message is from the active contact, add it to the messages
        if (activeContact &&
          ((newMessage.sender === activeContact._id && newMessage.recipient === 'me') ||
            (newMessage.recipient === activeContact._id && newMessage.sender === 'me'))) {
          setMessages(prev => [...prev, newMessage]);

          // Mark message as read if it's from the active contact
          if (newMessage.sender === activeContact._id && !newMessage.isRead) {
            markMessageAsRead(newMessage._id);
          }
        }

        // Update contacts list with the new message
        updateContactWithMessage(newMessage);

        // Update unread count
        fetchUnreadCount();
      });

      // Listen for typing indicators
      socket.on('userTyping', (data: { senderId: string, isTyping: boolean }) => {
        if (activeContact && data.senderId === activeContact._id) {
          setIsTyping(data.isTyping);
        }
      });

      // Listen for online status changes
      socket.on('userOnline', (userId: string) => {
        setContacts(prev => prev.map(contact =>
          contact._id === userId ? { ...contact, isOnline: true } : contact
        ));
        if (activeContact && activeContact._id === userId) {
          setActiveContact(prev => prev ? { ...prev, isOnline: true } : null);
        }
      });

      socket.on('userOffline', (userId: string) => {
        setContacts(prev => prev.map(contact =>
          contact._id === userId ? { ...contact, isOnline: false } : contact
        ));
        if (activeContact && activeContact._id === userId) {
          setActiveContact(prev => prev ? { ...prev, isOnline: false } : null);
        }
      });

      // Request initial online status for all contacts
      socket.emit('getOnlineStatus', contacts.map(contact => contact._id));

      return () => {
        socket.off('message');
        socket.off('userTyping');
        socket.off('userOnline');
        socket.off('userOffline');
      };
    }
  }, [isOpen, activeContact, contacts]);

  // Update online status when contacts change
  useEffect(() => {
    if (isOpen && contacts.length > 0) {
      const socket = getSocket();
      if (socket) {
        socket.emit('getOnlineStatus', contacts.map(contact => contact._id));
      }
    }
  }, [contacts, isOpen]);

  // Reset activeContact when popup is closed (only when opened from sidebar)
  useEffect(() => {
    if (!isOpen && !fromUserProfile && !initialContactId) {
      setActiveContact(null);
    }
  }, [isOpen, fromUserProfile, initialContactId]);

  // Fetch contacts when popup opens
  useEffect(() => {
    if (isOpen) {
      fetchContacts();
      // Don't fetch unread count here as it will be updated after messages are marked as read

      // If initialContactId is provided, set it as active contact
      if (initialContactId && initialContactUsername) {
        setActiveContact({
          _id: initialContactId,
          username: initialContactUsername,
          profileImage: initialContactProfileImage || '/svg.png'
        });
        fetchMessages(initialContactId);
        setMessageText(initialMessage);
      }
    }
  }, [isOpen, initialContactId, initialContactUsername, initialContactProfileImage, initialMessage]);

  // Focus on message input when active contact changes
  useEffect(() => {
    if (activeContact && messageInputRef.current) {
      messageInputRef.current.focus();
    }
  }, [activeContact]);

  // Close context menu when clicking outside
  const handleClickOutside = useCallback(() => {
    if (contextMenu.isOpen) {
      setContextMenu(prev => ({ ...prev, isOpen: false }));
    }
  }, [contextMenu.isOpen]);

  useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [handleClickOutside]);

  // Close emoji picker when clicking outside
  useClickOutside(emojiPickerRef as React.RefObject<HTMLElement>, () => {
    if (showEmojiPicker) setShowEmojiPicker(false);
  });

  // Fetch contacts
  const fetchContacts = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/messages/contacts`, { withCredentials: true });
      if (response.data.success) {
        setContacts(response.data.contacts);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Failed to load contacts');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch messages for a contact
  const fetchMessages = async (contactId: string) => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/messages/${contactId}`, { withCredentials: true });
      if (response.data.success) {
        setMessages(response.data.messages);

        // Mark all unread messages as read
        const unreadMessages = response.data.messages.filter(
          (msg: Message) => msg.sender === contactId && !msg.isRead
        );

        if (unreadMessages.length > 0) {
          markAllMessagesAsRead(contactId);
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  };

  // Mark a message as read
  const markMessageAsRead = async (messageId: string) => {
    try {
      await axios.put(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/messages/read/${messageId}`, {}, { withCredentials: true });
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  // Mark all messages from a contact as read
  const markAllMessagesAsRead = async (contactId: string) => {
    try {
      await axios.put(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/messages/read-all/${contactId}`, {}, { withCredentials: true });
      // Update contacts list to reflect read messages
      setContacts(prev =>
        prev.map(contact =>
          contact._id === contactId ? { ...contact, unreadCount: 0 } : contact
        )
      );
      // Fetch unread count after marking messages as read
      fetchUnreadCount();
    } catch (error) {
      console.error('Error marking all messages as read:', error);
    }
  };

  // Fetch unread message count
  const fetchUnreadCount = async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/messages/unread-count`, { withCredentials: true });
      if (response.data.success) {
        setUnreadTotal(response.data.count);
        if (onUnreadCountChange) {
          onUnreadCountChange(response.data.count);
        }
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  // Update contact list with new message
  const updateContactWithMessage = (message: Message) => {
    if (!message || !message.sender || !message.recipient) return;

    const contactId = message.sender === 'me' ? message.recipient : message.sender;
    if (!contactId) return;

    const isFromMe = message.sender === 'me';

    // Check if this message is from the active contact and popup is open
    // If so, we don't need to increment the unread count as it will be marked as read
    const isFromActiveContact = activeContact && contactId === activeContact._id && isOpen;

    setContacts(prev => {
      // Check if contact already exists
      const contactIndex = prev.findIndex(c => c && c._id === contactId);

      if (contactIndex >= 0) {
        // Update existing contact
        const updatedContacts = [...prev];
        const contact = updatedContacts[contactIndex];

        updatedContacts[contactIndex] = {
          ...contact,
          lastMessage: message.text,
          lastMessageTime: message.createdAt,
          // Only increment unread count if not from me and not from active contact when popup is open
          unreadCount: isFromMe ? (contact?.unreadCount ?? 0) :
            isFromActiveContact ? (contact?.unreadCount ?? 0) :
              (contact?.unreadCount ?? 0) + 1
        };

        // Move this contact to the top
        updatedContacts.splice(contactIndex, 1);
        updatedContacts.unshift(updatedContacts[contactIndex]);

        return updatedContacts;
      } else {
        // Add new contact
        const newContact: Contact = {
          _id: contactId,
          username: isFromMe ? message.recipientInfo?.username || 'User' : message.senderInfo?.username || 'User',
          profileImage: isFromMe ? message.recipientInfo?.profileImage || '/svg.png' : message.senderInfo?.profileImage || '/svg.png',
          lastMessage: message.text,
          lastMessageTime: message.createdAt,
          // Only set unread count to 1 if not from me and not from active contact when popup is open
          unreadCount: isFromMe ? 0 : (isFromActiveContact ? 0 : 1)
        };

        return [newContact, ...prev];
      }
    });
  };

  // Send message
  const sendMessage = async () => {
    if (!messageText.trim() || !activeContact) return;

    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/messages/send`, {
        recipient: activeContact._id,
        text: messageText.trim()
      }, { withCredentials: true });

      if (response.data.success) {
        // Add message to the list
        const newMessage: Message = {
          ...response.data.message,
          sender: 'me',
          recipient: activeContact._id
        };

        setMessages(prev => [...prev, newMessage]);
        setMessageText('');

        // Update contacts list
        updateContactWithMessage(newMessage);

        // Emit socket event for real-time updates
        const socket = getSocket();
        if (socket) {
          socket.emit('newMessage', newMessage);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  // Search users
  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      setIsSearching(true);
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/messages/search/${searchQuery}`, { withCredentials: true });
      if (response.data.success) {
        setSearchResults(response.data.users);
        setShowSearchResults(true);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Failed to search users');
    } finally {
      setIsSearching(false);
    }
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    // If search query is empty, hide results
    if (!value.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    // Debounce search to avoid too many API calls
    const timeoutId = setTimeout(() => {
      searchUsers();
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  // Handle message input change
  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value);

    // Send typing indicator
    if (activeContact) {
      const socket = getSocket();
      if (socket) {
        socket.emit('typing', {
          senderId: 'me',
          recipientId: activeContact._id,
          isTyping: true
        });

        // Clear previous timeout
        if (typingTimeout) {
          clearTimeout(typingTimeout);
        }

        // Set timeout to stop typing indicator after 2 seconds
        const timeout = setTimeout(() => {
          socket.emit('typing', {
            senderId: 'me',
            recipientId: activeContact._id,
            isTyping: false
          });
        }, 2000);

        setTypingTimeout(timeout);
      }
    }
  };

  // Handle emoji selection
  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setMessageText(prev => prev + emojiData.emoji);
    if (messageInputRef.current) {
      messageInputRef.current.focus();
    }
  };

  // Toggle emoji picker
  const toggleEmojiPicker = () => {
    setShowEmojiPicker(prev => !prev);
  };

  // Select a contact to chat with
  const selectContact = (contact: Contact) => {
    setActiveContact(contact);
    fetchMessages(contact._id);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      // Today: show time
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      // Yesterday
      return 'Yesterday';
    } else if (diffDays < 7) {
      // This week: show day name
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      // Older: show date
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  // Delete a message
  const deleteMessage = async (messageId: string) => {
    try {
      const response = await axios.delete(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/messages/${messageId}`, { withCredentials: true });
      if (response.data.success) {
        // Remove message from the list
        setMessages(prev => prev.filter(msg => msg._id !== messageId));
        toast.success('Message deleted');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };

  // Clear all messages with a contact
  const clearChat = async () => {
    if (!activeContact) return;

    try {
      const response = await axios.delete(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/messages/clear/${activeContact._id}`, { withCredentials: true });
      if (response.data.success) {
        setMessages([]);
        toast.success('Chat cleared');
      }
    } catch (error) {
      console.error('Error clearing chat:', error);
      toast.error('Failed to clear chat');
    }
  };

  // Back to contacts list
  const backToContacts = () => {
    setActiveContact(null);
    setMessages([]);
    setMessageText('');
  };

  // Message context menu component - using directly in the component where needed
  const renderMessageContextMenu = ({
    isOpen,
    setIsOpen,
    position,
    messageId,
    onDelete
  }: MessageContextMenuProps) => {
    if (!isOpen) return null;

    return (
      <div
        className="absolute bg-white rounded-lg shadow-lg z-50 py-1"
        style={{ top: position.y, left: position.x }}
      >
        <button
          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
          onClick={() => {
            onDelete(messageId);
            setIsOpen(false);
          }}
        >
          Delete
        </button>
      </div>
    );
  };

  return (
    <Popover
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      placement={fromUserProfile ? "left-start" : "top-start"}
      showArrow={false}
      offset={fromUserProfile ? 20 : 10}
    >
      <PopoverTrigger>{children}</PopoverTrigger>
      <PopoverContent className="p-0 w-[300px] sm:w-[350px] md:w-[350px] lg:w-[350px] max-w-[90vw] bg-white rounded-lg shadow-xl">
        <div className="flex flex-col h-[450px] sm:h-[500px] max-h-[80vh]">        {/* Header */}
          <div className="p-2 sm:p-3 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
            <div className="flex items-center min-w-0 flex-1">
              {activeContact ? (
                <div className="flex items-center min-w-0 flex-1">
                  <button
                    onClick={backToContacts}
                    className="mr-1 sm:mr-2 text-gray-500 hover:text-black flex-shrink-0"
                  >
                    <Icon icon="lucide:chevron-left" className="w-5 h-5" />
                  </button>
                  <div className="relative mr-2 sm:mr-3 flex-shrink-0">
                    <Avatar className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-gray-200 shadow-sm">
                      <AvatarImage src={activeContact.profileImage ? (activeContact.profileImage.startsWith('http') ? activeContact.profileImage : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${activeContact.profileImage}`) : '/svg.png'} alt={activeContact.username} className="object-cover" />
                      <AvatarFallback className="text-xs sm:text-sm">{activeContact.username.charAt(0)}</AvatarFallback>
                    </Avatar>
                    {activeContact.isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 border-white bg-gradient-to-r from-[#32CD32] via-[#7CFC00] to-[#90EE90] text-black"></div>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-semibold text-sm sm:text-base truncate">{activeContact.username}</span>
                    <span className={`text-xs ${activeContact.isOnline ? 'text-[#32CD32]' : 'text-gray-500'}`}>
                      {activeContact.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              ) : (
                <h3 className="font-semibold text-base sm:text-lg">Messages</h3>
              )}
            </div>
            <div className="flex items-center flex-shrink-0">
              {activeContact && (
                <Dropdown>
                  <DropdownTrigger>
                    <button className="mr-1 sm:mr-2 text-gray-500 hover:text-black p-1">
                      <Icon icon="lucide:more-vertical" className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </DropdownTrigger>
                  <DropdownMenu>
                    <DropdownItem key="clear-chat" onPress={clearChat} className="text-red-600">
                      Clear Chat
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-black p-1"
              >
                <Icon icon="lucide:x" className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          {!activeContact ? (
            // Contacts List View
            <div className="flex-1 overflow-hidden flex flex-col">
              {/* Search Box */}
              <div className="p-2 sm:p-3 border-b relative">
                <div className="relative search-container">
                  <Input
                    placeholder="Search users"
                    className="pl-8 sm:pl-9 pr-4 w-full bg-gray-100 text-black rounded-lg text-sm sm:text-base"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onFocus={() => searchQuery.trim() && setShowSearchResults(true)}
                  />
                  <div className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2">
                    <Icon icon="lucide:search" className="text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                </div>

                {/* Search Results */}
                {showSearchResults && (
                  <div className="absolute top-full left-0 w-full mt-1 bg-white rounded-lg shadow-lg z-10 max-h-48 sm:max-h-60 overflow-y-auto mx-2 sm:mx-0" style={{ width: 'calc(100% - 1rem)' }}>
                    {isSearching ? (
                      <div className="flex justify-center items-center p-3 sm:p-4">
                        <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-[#B671FF]"></div>
                      </div>
                    ) : searchResults.length > 0 ? (
                      <div className="p-1 sm:p-2">
                        {searchResults.map(user => (
                          <div
                            key={user._id}
                            className="flex items-center p-2 hover:bg-gray-100 rounded-md cursor-pointer"
                            onClick={() => selectContact(user)}
                          >
                            <Avatar className="w-8 h-8 sm:w-10 sm:h-10 rounded-full mr-2 sm:mr-3 border border-gray-200">
                              <AvatarImage src={user.profileImage ? (user.profileImage.startsWith('http') ? user.profileImage : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${user.profileImage}`) : '/svg.png'} alt={user.username} className="object-cover" />
                              <AvatarFallback className="text-xs sm:text-sm">{user.username.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-sm sm:text-base truncate">{user.username}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 sm:p-4 text-center text-gray-500 text-sm sm:text-base">
                        No users found
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Contacts List */}
              <div className="flex-1 overflow-y-auto">
                {isLoading && contacts.length === 0 ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-[#B671FF]"></div>
                  </div>
                ) : contacts.length > 0 ? (
                  contacts.map(contact => (
                    <div
                      key={contact._id}
                      className="flex items-center p-2 sm:p-3 hover:bg-gray-100 cursor-pointer border-b"
                      onClick={() => selectContact(contact)}
                    >
                      <div className="relative flex-shrink-0">
                        <Avatar className="w-10 h-10 sm:w-12 sm:h-12 rounded-full mr-2 sm:mr-3 border border-gray-200">
                          <AvatarImage src={contact.profileImage ? (contact.profileImage.startsWith('http') ? contact.profileImage : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${contact.profileImage}`) : '/svg.png'} alt={contact.username} className="object-cover" />
                          <AvatarFallback className="text-xs sm:text-sm">{contact.username.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {(contact?.unreadCount ?? 0) > 0 && (
                          <div className="absolute -top-1 -right-0 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center">
                            {(contact?.unreadCount ?? 0) > 9 ? '9+' : contact?.unreadCount}
                          </div>
                        )}
                        {contact.isOnline && (
                          <div className="absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 border-white bg-gradient-to-r from-[#32CD32] via-[#7CFC00] to-[#90EE90]"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium truncate text-sm sm:text-base">{contact.username}</h4>
                          {contact.lastMessageTime && (
                            <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                              {formatTime(contact.lastMessageTime)}
                            </span>
                          )}
                        </div>
                        {contact.lastMessage && (
                          <p className="text-xs sm:text-sm text-gray-500 truncate max-w-full overflow-hidden text-ellipsis whitespace-nowrap w-full" style={{ maxWidth: '140px' }}>
                            {contact.lastMessage.length > 20 ? `${contact.lastMessage.substring(0, 20)}...` : contact.lastMessage}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col justify-center items-center h-full p-3 sm:p-4 text-center text-gray-500">
                    <Icon icon="lucide:message-square" className="text-3xl sm:text-4xl mb-2" />
                    <p className="text-sm sm:text-base">No messages yet</p>
                    <p className="text-xs sm:text-sm">Search for users to start a conversation</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Chat View
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-2 sm:p-3">
                {isLoading ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-[#B671FF]"></div>
                  </div>
                ) : messages.length > 0 ? (
                  <div className="space-y-2 sm:space-y-3">
                    {messages.map((message, index) => {
                      const isMe = message.sender === 'me';
                      return (
                        <div
                          key={message._id || index}
                          className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1 sm:mb-2 relative`}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setContextMenu({
                              isOpen: true,
                              position: { x: e.clientX, y: e.clientY },
                              messageId: message._id,
                              isOwnMessage: isMe
                            });
                          }}
                          onTouchStart={(e) => {
                            const touchTimeout = setTimeout(() => {
                              const touch = e.touches[0];
                              setContextMenu({
                                isOpen: true,
                                position: { x: touch.clientX, y: touch.clientY },
                                messageId: message._id,
                                isOwnMessage: isMe
                              });
                            }, 500);

                            const touchEndHandler = () => {
                              clearTimeout(touchTimeout);
                              document.removeEventListener('touchend', touchEndHandler);
                            };

                            document.addEventListener('touchend', touchEndHandler);
                          }}
                        >
                          {!isMe && (
                            <Avatar className="w-6 h-6 sm:w-10 sm:h-10 rounded-full mr-1 sm:mr-2 self-end border border-gray-200 flex-shrink-0">
                              <AvatarImage src={message.senderInfo?.profileImage ? (message.senderInfo.profileImage.startsWith('http') ? message.senderInfo.profileImage : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${message.senderInfo.profileImage}`) : (activeContact.profileImage ? (activeContact.profileImage.startsWith('http') ? activeContact.profileImage : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${activeContact.profileImage}`) : '/svg.png')} alt={message.senderInfo?.username || activeContact.username} className="object-cover" />
                              <AvatarFallback className="text-xs">{(message.senderInfo?.username || activeContact.username || 'User').charAt(0)}</AvatarFallback>
                            </Avatar>
                          )}
                          <div
                            className={`max-w-[85%] sm:max-w-[70%] min-w-0 ${isMe ? 'bg-gradient-to-r from-[#32CD32] via-[#7CFC00] to-[#90EE90] text-black' : 'bg-gray-200 text-black'} rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 ${isMe ? 'rounded-tr-none' : 'rounded-tl-none'} overflow-hidden group relative`}
                          >
                            <div className="text-xs sm:text-sm whitespace-pre-wrap break-words overflow-hidden" style={{ wordBreak: 'break-word' }}>{message.text}</div>

                            <div className="text-xs text-gray-500 text-right mt-1 flex justify-end items-center">
                              <button
                                className="opacity-0 group-hover:opacity-100 mr-1 sm:mr-2 text-gray-400 hover:text-gray-600 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteMessage(message._id);
                                }}
                              >
                                <Icon icon="lucide:trash-2" width={10} className="sm:w-3 sm:h-3" />
                              </button>
                              <span className="text-xs">{formatTime(message.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {isTyping && (
                      <div className="flex justify-start">
                        <div className="bg-gray-200 text-black p-2 sm:p-3 rounded-lg">
                          <div className="flex space-x-1">
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-500 rounded-full animate-bounce"></div>
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                ) : (
                  <div className="flex justify-center items-center h-full text-gray-500">
                    <p className="text-sm sm:text-base">No messages yet. Start a conversation!</p>
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="border-t">
                {/* Input Area */}
                <div className="p-1.5 sm:p-2 flex items-center">
                  <div className="flex-1 relative mx-1 sm:mx-2">
                    <Input
                      ref={messageInputRef}
                      placeholder="Type a message"
                      className="w-full bg-gray-100 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 pr-8 sm:pr-10 text-sm sm:text-base"
                      value={messageText}
                      onChange={handleMessageChange}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    />
                    <button
                      className="absolute right-1.5 sm:right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      onClick={toggleEmojiPicker}
                    >
                      <Icon icon="lucide:smile" className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>

                    {/* Emoji Picker */}
                    {showEmojiPicker && (
                      <div
                        ref={emojiPickerRef}
                        className="absolute bottom-full right-0 mb-2 z-50"
                      >
                        <EmojiPicker
                          onEmojiClick={handleEmojiClick}
                          width={200}
                          height={250}
                          previewConfig={{ showPreview: false }}
                          lazyLoadEmojis
                          className="sm:!w-[250px] sm:!h-[300px]"
                        />
                      </div>
                    )}
                  </div>

                  <Button
                    className="bg-gradient-to-r from-[#32CD32] via-[#7CFC00] to-[#90EE90] text-black px-3 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
                    onPress={sendMessage}
                    isDisabled={!messageText.trim()}
                  >
                    <Icon icon="lucide:send" className="w-4 h-4 sm:w-5 sm:h-5" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Context Menu */}
        {renderMessageContextMenu({
          isOpen: contextMenu.isOpen,
          setIsOpen: (isOpen) => setContextMenu(prev => ({ ...prev, isOpen })),
          position: contextMenu.position,
          messageId: contextMenu.messageId,
          isOwnMessage: contextMenu.isOwnMessage,
          onDelete: deleteMessage
        })}
      </PopoverContent>
    </Popover>
  );
};

export default MessagePopup;


