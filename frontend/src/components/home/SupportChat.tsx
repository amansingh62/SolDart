"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import {  Send, Image as ImageIcon, X } from "lucide-react"
import { Icon } from "@iconify/react"

type Message = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  image?: string;
};

export default function SupportChat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: 'Hello! I\'m EchoAI. What can I help you with?',
    timestamp: new Date()
  }]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    });
  };

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setSelectedImage(result);
      };
      reader.readAsDataURL(file);
    }
    setShowImageUpload(false);
  };

  // Remove selected image
  const removeSelectedImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Toggle image upload interface
  const toggleImageUpload = () => {
    setShowImageUpload(!showImageUpload);
  };

  // Send message to API
  const sendMessage = async () => {
    if (!message.trim() && !selectedImage) return;

    // Add user message to chat
    const userMessage: Message = {
      role: 'user',
      content: message || 'Image attached',
      timestamp: new Date(),
      image: selectedImage || undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage("");
    setSelectedImage(null);
    setIsLoading(true);
    setError(null);

    try {
      // Prepare messages for API
      const apiMessages = messages.concat(userMessage).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Call API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: apiMessages,
          image: userMessage.image
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      // Add AI response to chat
      const aiMessage: Message = {
        role: 'assistant',
        content: data.message || 'Sorry, I couldn\'t process your request.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to get a response. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="rounded-2xl overflow-hidden bg-[rgba(243,144,236,0.21)] border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.1)] backdrop-blur-[12px] transition-all duration-300 hover:shadow-[0_8px_32px_rgba(182,113,255,0.15)]">
      <div className="p-4 bg-gradient-to-r from-[#B671FF] to-[#E282CA] text-white">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Icon icon="lucide:message-circle-question" className="text-xl" />
          Support Chat
        </h3>
        <p className="text-sm text-white/80">Ask EchoAI for help</p>
      </div>

      <div className="p-4 h-[300px] overflow-y-auto scrollbar-hide">
        {messages.map((msg, index) => (
          <div key={index} className={`mb-4 ${msg.role === 'user' ? 'flex justify-end' : ''}`}>
            <div className={`max-w-[80%] rounded-2xl p-3 ${msg.role === 'user'
              ? 'bg-gradient-to-r from-[#B671FF] to-[#E282CA] text-white rounded-tr-none'
              : 'bg-white/80 text-gray-800 rounded-tl-none shadow-sm'
              }`}>
              {msg.image && (
                <div className="mb-2 rounded-lg overflow-hidden relative w-full max-w-[200px] h-[200px]">
                  <Image 
                    src={msg.image} 
                    alt="Attached image" 
                    fill
                    className="object-cover"
                    sizes="(max-width: 200px) 100vw, 200px"
                  />
                </div>
              )}
              <p className="text-sm break-words whitespace-normal overflow-wrap-break-word">{msg.content}</p>
              <p className="text-xs mt-1 opacity-70">{formatDate(msg.timestamp)}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="max-w-[80%] rounded-2xl p-3 bg-white/80 text-gray-800 rounded-tl-none shadow-sm">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className="text-red-500 text-sm p-2 bg-red-100 rounded-lg mb-4">
            {error}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-white/20 bg-white/10">
        {showImageUpload && (
          <div className="mb-3 p-3 bg-white/20 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Upload Image</span>
              <button
                onClick={toggleImageUpload}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={16} />
              </button>
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              ref={fileInputRef}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2 px-3 bg-white/30 hover:bg-white/40 rounded-lg text-sm transition-colors"
            >
              Choose File
            </button>
          </div>
        )}

        {selectedImage && (
          <div className="mb-3 relative w-fit">
            <div className="relative w-[100px] h-[100px] rounded-lg overflow-hidden">
              <Image
                src={selectedImage}
                alt="Selected image preview"
                fill
                className="object-cover"
                sizes="100px"
              />
            </div>
            <button
              onClick={removeSelectedImage}
              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 shadow-md"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={toggleImageUpload}
            className="p-2 text-gray-600 hover:text-[#B671FF] transition-colors"
            title="Attach image"
          >
            <ImageIcon size={20} />
          </button>
          <input
  type="text"
  value={message}
  onChange={(e) => setMessage(e.target.value)}
  onKeyPress={handleKeyPress}
  placeholder="Type your message..."
  className="flex-1 p-2 rounded-xl bg-white/30 focus:outline-none focus:ring-2 focus:ring-[#B671FF]/50 text-sm overflow-hidden text-ellipsis break-words whitespace-normal overflow-wrap-break-word"
  style={{ wordWrap: 'break-word' }}
/>
          <button
            onClick={sendMessage}
            disabled={isLoading || (!message.trim() && !selectedImage)}
            className={`p-2 rounded-full ${isLoading || (!message.trim() && !selectedImage)
              ? 'bg-gray-300 text-gray-500'
              : 'bg-gradient-to-r from-[#B671FF] to-[#E282CA] text-white hover:shadow-md'
              } transition-all`}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}