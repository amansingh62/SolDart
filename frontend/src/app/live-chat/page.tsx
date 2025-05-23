"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import { Button } from "@heroui/react";
import { Icon } from "@iconify/react";
import { Input } from "@heroui/react";
import { useLanguage } from '../../context/LanguageContext';
import api from '../../lib/apiUtils';
import { initializeSocket } from '../../lib/socketUtils';
import ChatMessage from './ChatMessage';

// Lazy load the MessageContextMenu component
const MessageContextMenu = lazy(() => import('./MessageContextMenu'));

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
    hiddenFor?: string[];
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
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const socketRef = useRef<any>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const contextMenuRef = useRef<HTMLDivElement>(null);

    // Memoize handlers with useCallback
    const handleReplyToMessage = useCallback((message: LiveChatMessage) => {
        setReplyingTo(message);
        setContextMenuPosition(null);
        setSelectedMessage(null);
    }, []);

    const handleSendMessage = useCallback(async () => {
        if (newMessage.trim() === '') return;

        try {
            const payload: any = { text: newMessage };

            if (replyingTo) {
                payload.replyTo = replyingTo._id;
            }

            await api.post('/live-chat/text', payload);
            setNewMessage('');
            setReplyingTo(null);
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }, [newMessage, replyingTo]);

    // Memoize the messages array
    const memoizedMessages = useMemo(() => messages, [messages]);

    // Memoize the online users object
    const memoizedOnlineUsers = useMemo(() => onlineUsers, [onlineUsers]);

    // Memoize the typing users object
    const memoizedTypingUsers = useMemo(() => typingUsers, [typingUsers]);

    // Memoize the online users count
    const onlineUsersCount = useMemo(() => {
        const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
        const otherOnlineUsers = Object.keys(onlineUsers).filter(id => id !== userId && onlineUsers[id]).length;
        return otherOnlineUsers + 1; // Always add 1 for the current user
    }, [onlineUsers]);

    // Memoize the message list
    const messageList = useMemo(() => {
        return memoizedMessages
            .filter(message => {
                const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
                return !message.hiddenFor?.includes(userId || '');
            })
            .map((message) => {
                const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
                const isOwnMessage = message.sender._id === userId;

                return (
                    <ChatMessage
                        key={message._id}
                        message={message}
                        isOwnMessage={isOwnMessage}
                        onlineUsers={memoizedOnlineUsers}
                        onReply={handleReplyToMessage}
                    />
                );
            });
    }, [memoizedMessages, memoizedOnlineUsers, handleReplyToMessage]);

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

    // Initialize socket and fetch messages
    useEffect(() => {
        const socket = initializeSocket();
        socketRef.current = socket;

        if (socket) {
            socket.on('newLiveChatMessage', (message: LiveChatMessage) => {
                setMessages(prev => [...prev, message]);
            });

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

            socket.on('userStatusChange', (data: { userId: string, isOnline: boolean }) => {
                setOnlineUsers(prev => ({
                    ...prev,
                    [data.userId]: data.isOnline
                }));
            });

            if (typeof window !== 'undefined') {
                const userId = localStorage.getItem('userId');
                const username = localStorage.getItem('username');
                if (userId && username) {
                    socket.emit('userOnline', { userId, username });
                    setOnlineUsers(prev => ({
                        ...prev,
                        [userId]: true
                    }));
                }
            }
        }

        const fetchMessages = async () => {
            try {
                const response = await api.get('/live-chat');
                if (response.data.success) {
                    setMessages(response.data.messages);
                }
            } catch (error) {
                console.error('Error fetching live chat messages:', error);
            }
        };

        fetchMessages();

        return () => {
            if (socket && typeof window !== 'undefined') {
                const userId = localStorage.getItem('userId');
                if (userId) {
                    socket.emit('userOffline', { userId });
                }

                socket.off('newLiveChatMessage');
                socket.off('liveChatUserTyping');
                socket.off('userStatusChange');
            }
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
                    senderId: typeof window !== 'undefined' ? localStorage.getItem('userId') : null,
                    username: typeof window !== 'undefined' ? localStorage.getItem('username') : null,
                    isTyping: true
                });
            }

            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }

            timerRef.current = setTimeout(() => {
                setIsTyping(false);
                socketRef.current.emit('liveChatTyping', {
                    senderId: typeof window !== 'undefined' ? localStorage.getItem('userId') : null,
                    username: typeof window !== 'undefined' ? localStorage.getItem('username') : null,
                    isTyping: false
                });
            }, 1000);
        } else if (isTyping) {
            setIsTyping(false);
            socketRef.current.emit('liveChatTyping', {
                senderId: typeof window !== 'undefined' ? localStorage.getItem('userId') : null,
                username: typeof window !== 'undefined' ? localStorage.getItem('username') : null,
                isTyping: false
            });
        }

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [newMessage, isTyping]);

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
                        <span className="font-bold text-sm">{onlineUsersCount}</span> {t('online')}
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
                    messageList
                )}

                <Suspense fallback={<div>Loading...</div>}>
                    <MessageContextMenu
                        contextMenuPosition={contextMenuPosition}
                        selectedMessage={selectedMessage}
                        onReply={handleReplyToMessage}
                        contextMenuRef={contextMenuRef}
                    />
                </Suspense>

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

export default React.memo(LiveChatPage);