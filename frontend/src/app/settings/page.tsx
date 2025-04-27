'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/home/Layout';
import { Button } from '@heroui/react';
import { Icon } from '@iconify/react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useLanguage } from '@/context/LanguageContext';

export default function SettingsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [user, setUser] = useState<any>(null);
  const { t } = useLanguage();

  // Fetch user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/auth/user`,
          { withCredentials: true }
        );
        if (response.data) {
          setUser(response.data);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        toast.error('Failed to load user data');
        // Redirect to home if not authenticated
        router.push('/');
      }
    };

    fetchUserData();
  }, [router]);

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast.error('Please enter your password to confirm account deletion');
      return;
    }

    try {
      setIsLoading(true);
      const response = await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/auth/delete-account`,
        { 
          data: { password: deletePassword },
          withCredentials: true 
        }
      );

      if (response.data.success) {
        toast.success('Your account has been successfully deleted');
        
        // Clear all authentication data
        localStorage.removeItem('token');
        localStorage.removeItem('connectedWalletInfo');
        localStorage.removeItem('recentSearches');
        
        // Clear cookies by calling the logout endpoint
        await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/auth/logout`,
          {},
          { withCredentials: true }
        );
        
        // Dispatch logout event to update AuthContext
        window.dispatchEvent(new Event('userLoggedOut'));
        
        // Redirect to home page after successful deletion
        setTimeout(() => {
          router.push('/');
        }, 2000);
      }
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast.error(error.response?.data?.message || 'Failed to delete account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold mb-6">Settings</h1>
          
          {/* Account Settings Section */}
          
          
          {/* Privacy & Security Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 border-b pb-2">Privacy & Security</h2>
            
            {/* Change Password */}
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">Password</h3>
              <p className="text-gray-600 mb-2">Update your password</p>
              <Button 
                className="bg-blue-500 rounded-lg hover:bg-blue-600 text-white"
                startContent={<Icon icon="lucide:lock" />}
              >
                Change Password
              </Button>
            </div>
            
            {/* Delete Account */}
            <div>
              <h3 className="text-lg font-medium mb-2">Delete Account</h3>
              <p className="text-gray-600 mb-2">Permanently delete your account and all your data</p>
              
              {!showDeleteConfirm ? (
                <Button 
                  className="bg-red-500 hover:bg-red-600 text-white rounded-xl"
                  startContent={<Icon icon="lucide:trash-2" />}
                  onPress={() => setShowDeleteConfirm(true)}
                >
                  Delete Account
                </Button>
              ) : (
                <div className="border border-red-300 rounded-md p-4 bg-red-50">
                  <p className="text-red-600 font-medium mb-3">
                    Warning: This action cannot be undone. All your data will be permanently deleted.
                  </p>
                  <div className="mb-3">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                      Enter your password to confirm:
                    </label>
                    <input
                      type="password"
                      id="password"
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      placeholder="Your password"
                    />
                  </div>
                  <div className="flex space-x-3">
                    <Button
                      className="bg-red-500 hover:bg-red-600 text-white rounded-xl"
                      startContent={<Icon icon="lucide:trash-2" />}
                      onPress={handleDeleteAccount}
                      isLoading={isLoading}
                    >
                      Confirm Delete
                    </Button>
                    <Button
                      className="bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-xl"
                      onPress={() => {
                        setShowDeleteConfirm(false);
                        setDeletePassword('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
  );
}