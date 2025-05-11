'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Icon } from "@iconify/react";
import api from '@/lib/apiUtils';
import { toast } from 'react-hot-toast';
import { io } from 'socket.io-client';

interface CreateDartFormProps {
  onPostCreated?: () => void;
}

const CreateDartForm: React.FC<CreateDartFormProps> = ({ onPostCreated }) => {
  const [content, setContent] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreview, setMediaPreview] = useState<string[]>([]);
  const [showPollForm, setShowPollForm] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [isOverLimit, setIsOverLimit] = useState(false);
  const MAX_CHARS = 500;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate character count whenever content changes
  useEffect(() => {
    const chars = content.length;
    setCharCount(chars);
    setIsOverLimit(chars > MAX_CHARS);
  }, [content]);

  // Handle text input change
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const chars = newContent.length;

    if (chars <= MAX_CHARS) {
      setContent(newContent);
    } else {
      // If user pastes text that exceeds limit, truncate it
      const truncatedContent = newContent.slice(0, MAX_CHARS);
      setContent(truncatedContent);
      toast.error(`Dart content is limited to ${MAX_CHARS} characters`);
    }
  };

  // Handle media file selection
  const handleMediaSelect = (type?: string) => {
    if (fileInputRef.current) {
      // Set accept attribute based on media type
      if (type === 'video') {
        fileInputRef.current.setAttribute('accept', 'video/*');
      } else if (type === 'image') {
        fileInputRef.current.setAttribute('accept', 'image/*');
      } else {
        fileInputRef.current.setAttribute('accept', 'image/*,video/*');
      }
      fileInputRef.current.click();
    }
  };

  // Process selected media files
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Check if adding these files would exceed the limit
    if (mediaFiles.length + files.length > 4) {
      toast.error('Maximum 4 media files allowed');
      return;
    }

    const newFiles: File[] = [];
    const newPreviews: string[] = [];

    Array.from(files).forEach(file => {
      // Check file type
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/') && file.type !== 'image/gif') {
        toast.error(`Unsupported file type: ${file.type}`);
        return;
      }

      // Check file size (different limits for images and videos)
      const isVideo = file.type.startsWith('video/');
      const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024; // 50MB for videos, 10MB for images

      if (file.size > maxSize) {
        toast.error(`File too large: ${file.name}. ${isVideo ? 'Videos' : 'Images'} must be under ${isVideo ? '50MB' : '10MB'}`);
        return;
      }

      newFiles.push(file);

      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      newPreviews.push(previewUrl);
    });

    setMediaFiles([...mediaFiles, ...newFiles]);
    setMediaPreview([...mediaPreview, ...newPreviews]);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove a media file
  const removeMedia = (index: number) => {
    const newFiles = [...mediaFiles];
    const newPreviews = [...mediaPreview];

    // Revoke object URL to prevent memory leaks
    URL.revokeObjectURL(newPreviews[index]);

    newFiles.splice(index, 1);
    newPreviews.splice(index, 1);

    setMediaFiles(newFiles);
    setMediaPreview(newPreviews);
  };

  // Toggle poll form
  const togglePollForm = () => {
    setShowPollForm(!showPollForm);
    if (!showPollForm) {
      setPollQuestion('');
      setPollOptions(['', '']);
    }
  };

  // Update poll option
  const updatePollOption = (index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  // Add new poll option
  const addPollOption = () => {
    if (pollOptions.length >= 5) {
      toast.error('Maximum 5 options allowed');
      return;
    }
    setPollOptions([...pollOptions, '']);
  };

  // Remove poll option
  const removePollOption = (index: number) => {
    if (pollOptions.length <= 2) {
      toast.error('Minimum 2 options required');
      return;
    }
    const newOptions = [...pollOptions];
    newOptions.splice(index, 1);
    setPollOptions(newOptions);
  };

  // Submit the post
  const handleSubmit = async () => {
    if (!content.trim() && mediaFiles.length === 0 && !showPollForm) {
      toast.error('Please add some content to your post');
      return;
    }

    if (showPollForm && (!pollQuestion.trim() || pollOptions.some(opt => !opt.trim()))) {
      toast.error('Please fill in all poll fields');
      return;
    }

    setIsSubmitting(true);

    try {
      // Check if wallet is connected
      const storedWalletInfo = localStorage.getItem('connectedWalletInfo');
      if (!storedWalletInfo) {
        toast.error('Please connect your wallet to post');
        setIsSubmitting(false);
        return;
      }

      // Get the connected wallet address
      const walletInfo = JSON.parse(storedWalletInfo);
      const connectedWalletAddress = walletInfo.data?.address;

      // Get the user's registered wallet address
      try {
        const userResponse = await api.get('/auth/user');
        if (!userResponse.data || !userResponse.data.wallets || userResponse.data.wallets.length === 0) {
          toast.error('Please connect your registered wallet to post');
          setIsSubmitting(false);
          return;
        }

        // Check if the connected wallet matches any of the user's registered wallets
        const isRegisteredWallet = userResponse.data.wallets.some(
          (wallet: any) => wallet.address === connectedWalletAddress
        );

        if (!isRegisteredWallet) {
          toast.error('Please connect with your registered wallet to post');
          setIsSubmitting(false);
          return;
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        toast.error('Failed to verify wallet ownership');
        setIsSubmitting(false);
        return;
      }

      // Sign a non-gas transaction message
      const message = `Sign this message to create a post: ${content}`;
      const wallet = (window as any).solana; // Assuming Phantom wallet is used
      if (!wallet) {
        toast.error('Wallet not found');
        setIsSubmitting(false);
        return;
      }

      const signature = await wallet.signMessage(new TextEncoder().encode(message));
      console.log('Transaction signed:', signature);

      const formData = new FormData();
      formData.append('content', content);

      // Add media files
      mediaFiles.forEach(file => {
        formData.append('media', file);
      });

      // Add poll data if present
      if (showPollForm) {
        formData.append('pollQuestion', pollQuestion);
        formData.append('pollOptions', JSON.stringify(pollOptions));
      }

      const response = await api.post('/posts', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        toast.success('Post created successfully!');
        setContent('');
        setMediaFiles([]);
        setMediaPreview([]);
        setShowPollForm(false);
        setPollQuestion('');
        setPollOptions(['', '']);
        if (onPostCreated) onPostCreated();
      } else {
        toast.error('Failed to create post');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-4 bg-white shadow-md rounded-lg mb-4">
      <div className="relative">
        <Textarea
          placeholder="Write your Echo...."
          className={`w-full mb-2 h-28 shadow-md rounded-lg p-3 dart-textarea ${isOverLimit ? 'border-red-500' : ''}`}
          value={content}
          onChange={handleContentChange}
        />
        <div className={`text-xs absolute bottom-4 right-4 ${isOverLimit ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
          {charCount}/{MAX_CHARS}
        </div>
      </div>

      {/* Media Preview */}
      {mediaPreview.length > 0 && (
        <div className={`grid ${mediaPreview.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-2 mb-3`}>
          {mediaPreview.map((preview, index) => (
            <div key={index} className="relative rounded-lg overflow-hidden">
              {mediaFiles[index].type.startsWith('image/') ? (
                <img src={preview} alt="Preview" className="w-full h-32 object-cover" />
              ) : mediaFiles[index].type.startsWith('video/') && (
                <video className="w-full h-32 object-cover" controls>
                  <source src={preview} type={mediaFiles[index].type} />
                  Your browser does not support the video tag.
                </video>
              )}
              <button
                className="absolute top-1 right-1 bg-black bg-opacity-50 text-white rounded-full p-1"
                onClick={() => removeMedia(index)}
              >
                <Icon icon="lucide:x" className="text-sm" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Poll Form */}
      {showPollForm && (
        <div className="bg-gray-100 p-3 rounded-lg mb-3">
          <input
            type="text"
            placeholder="Ask a question..."
            className="w-full p-2 border rounded mb-2"
            value={pollQuestion}
            onChange={(e) => setPollQuestion(e.target.value)}
          />

          {pollOptions.map((option, index) => (
            <div key={index} className="flex items-center mb-2">
              <input
                type="text"
                placeholder={`Option ${index + 1}`}
                className="flex-1 p-2 border rounded"
                value={option}
                onChange={(e) => updatePollOption(index, e.target.value)}
              />
              {pollOptions.length > 2 && (
                <button
                  className="ml-2 text-red-500"
                  onClick={() => removePollOption(index)}
                >
                  <Icon icon="lucide:trash-2" />
                </button>
              )}
            </div>
          ))}

          {pollOptions.length < 5 && (
            <button
              className="text-blue-500 flex items-center gap-1 text-sm"
              onClick={addPollOption}
            >
              <Icon icon="lucide:plus-circle" />
              Add Option
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex gap-2 sm:gap-3 flex-wrap justify-center sm:justify-start">
          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*,video/*"
            multiple
            onChange={handleFileChange}
          />

          {/* Media upload button */}
          <Button
            variant="ghost"
            size="icon"
            className="p-2 sm:p-3 rounded-lg shadow-md hover:bg-gray-200"
            onClick={() => handleMediaSelect('image')}
            disabled={mediaFiles.length >= 4 || isSubmitting}
          >
            <Icon icon="lucide:image" className="text-lg sm:text-3xl" />
          </Button>

          {/* Video upload button */}
          <Button
            variant="ghost"
            size="icon"
            className="p-2 sm:p-3 rounded-lg shadow-md hover:bg-gray-200"
            onClick={() => handleMediaSelect('video')}
            disabled={mediaFiles.length >= 4 || isSubmitting}
          >
            <Icon icon="lucide:video" className="text-lg sm:text-3xl" />
          </Button>

          {/* Poll button */}
          <Button
            variant="ghost"
            size="icon"
            className={`p-2 sm:p-3 rounded-lg shadow-md hover:bg-gray-200 ${showPollForm ? 'bg-gray-200' : ''}`}
            onClick={togglePollForm}
            disabled={isSubmitting}
          >
            <Icon icon="lucide:bar-chart-2" className="text-lg sm:text-3xl" />
          </Button>

          {/* GIF button */}
          <Button
            variant="ghost"
            size="icon"
            className="p-2 sm:p-3 rounded-lg shadow-md hover:bg-gray-200"
            onClick={() => handleMediaSelect()}
            disabled={mediaFiles.length >= 4 || isSubmitting}
          >
            <Icon icon="mdi:file-gif-box" className="text-lg sm:text-3xl" />
          </Button>
        </div>
        <Button
          className="bg-gradient-to-r from-[#B671FF] via-[#C577EE] to-[#E282CA] 
             text-black hover:!bg-black hover:!from-black hover:!via-black hover:!to-black 
             hover:text-white px-4 sm:px-6 py-2 font-medium rounded-md shadow-md w-full sm:w-auto transition duration-200"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Posting...' : 'Echo'}
        </Button>

      </div>
    </Card>
  );
};

export default CreateDartForm;