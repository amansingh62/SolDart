"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@heroui/react";
import { Icon } from "@iconify/react";
import { Avatar } from "@heroui/react";
import { Input } from "@heroui/react";
import { Popover, PopoverTrigger, PopoverContent } from "@heroui/react";
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
  audioMessage?: {
    url: string;
    duration: number;
  };
  createdAt: string;
  seenBy: string[];
}

interface LiveChatProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const LiveChat: React.FC<LiveChatProps> = ({ isOpen, setIsOpen }) => {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<{ [key: string]: string }>({});
  const [onlineUsers, setOnlineUsers] = useState<{ [key: string]: boolean }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const socketRef = useRef<any>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Initialize socket and fetch messages
  useEffect(() => {
    const socket = initializeSocket();
    socketRef.current = socket;

    if (socket) {
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
      }
    };

    if (isOpen) {
      fetchMessages();
    }

    return () => {
      if (socket) {
        socket.off('newLiveChatMessage');
        socket.off('liveChatUserTyping');
        socket.off('userStatusChange');
      }
    };
  }, [isOpen]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current && isOpen) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

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
      }, 2000);
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

  // Recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRecording]);

  const handleSendMessage = async () => {
    if (newMessage.trim() === '') return;

    try {
      await api.post('/live-chat/text', { text: newMessage });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        // Create form data to send audio
        const formData = new FormData();
        formData.append('audioMessage', audioBlob, 'recording.webm');
        formData.append('duration', recordingTime.toString());

        try {
          await api.post('/live-chat/audio', formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });
        } catch (error) {
          console.error('Error sending audio message:', error);
        }

        // Stop all audio tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      // We don't send the recording when canceling
      audioChunksRef.current = [];
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <Popover isOpen={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger>
        <div className="hidden">Trigger</div>
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-96 md:w-[450px] p-0 max-h-[500px] flex flex-col">
        <div className="p-3 border-b flex justify-between items-center bg-black text-white">
          <h3 className="font-bold text-lg">{t('Global Chat')}</h3>
          <Button
            isIconOnly
            variant="light"
            className="text-white"
            onPress={() => setIsOpen(false)}
          >
            <Icon icon="lucide:x" />
          </Button>
        </div>

        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[300px] max-h-[350px]"
        >
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              {t('No messages yet. Start the conversation!')}
            </div>
          ) : (
            messages.map((message) => (
              <div key={message._id} className="flex items-start gap-2">
                <Avatar
                  src={message.sender.profileImage || '/svg.png'}
                  alt={message.sender.username}
                  className="w-8 h-8"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{message.sender.username}</span>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                    </span>
                    {onlineUsers[message.sender._id] && (
                      <span className="w-2 h-2 bg-gradient-to-r from-[#32CD32] via-[#7CFC00] to-[#90EE90] rounded-full"></span>
                    )}
                  </div>

                  {message.text ? (
                    <p className="text-sm mt-1 break-words">{message.text}</p>
                  ) : message.audioMessage ? (
                    <div className="mt-1 bg-gray-100 rounded-lg p-2 flex items-center gap-2">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        className="text-blue-500"
                        onPress={() => {
                          const audio = new Audio(message.audioMessage?.url);
                          audio.play();
                        }}
                      >
                        <Icon icon="lucide:play" />
                      </Button>
                      <div className="h-1 flex-1 bg-gray-300 rounded-full">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: '0%' }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatTime(message.audioMessage?.duration || 0)}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            ))
          )}

          {/* Typing indicators */}
          {Object.keys(typingUsers).length > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-500 italic">
              {Object.values(typingUsers).join(', ')} {t('typing')}...
              <div className="flex gap-1">
                <span className="animate-bounce">.</span>
                <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: '0.4s' }}>.</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="p-3 border-t">
          {isRecording ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-100 rounded-lg p-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                <span className="text-sm">{formatTime(recordingTime)}</span>
              </div>
              <Button
                isIconOnly
                color="danger"
                variant="light"
                onPress={cancelRecording}
              >
                <Icon icon="lucide:x" />
              </Button>
              <Button
                isIconOnly
                color="primary"
                variant="solid"
                onPress={stopRecording}
              >
                <Icon icon="lucide:send" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Input
                placeholder={t('Type a message...')}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1"
                size="sm"
              />
              <Button
                isIconOnly
                color="primary"
                variant="light"
                onPress={startRecording}
              >
                <Icon icon="lucide:mic" />
              </Button>
              <Button
                isIconOnly
                color="primary"
                variant="solid"
                onPress={handleSendMessage}
                isDisabled={newMessage.trim() === ''}
              >
                <Icon icon="lucide:send" />
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default LiveChat;