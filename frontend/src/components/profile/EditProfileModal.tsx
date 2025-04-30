"use client";

import React, { useState } from "react";
import { Icon } from "@iconify/react";
import { useEffect } from "react";
import api from '@/lib/apiUtils'; // Adjust the path based on your project structure
import { toast } from 'react-hot-toast';

interface ProfileData {
  _id?: string;
  name: string;
  username: string;
  bio: string;
  walletAddress: string;
  followers: number;
  following: number;
  darts: number;
  events: number;
  isVerified: boolean;
  coverImage: string;
  profileImage: string;
  socialLinks: {
    website: string;
    telegram: string;
    twitter: string;
    discord: string;
  };
}

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileData: ProfileData;
  setProfileData: React.Dispatch<React.SetStateAction<ProfileData>>; // ✅ Required to update state
  fetchProfileData: () => Promise<void>; // ✅ Fetch latest data after saving
  onSave: (updatedData: Partial<ProfileData>) => Promise<void>;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose, profileData, setProfileData, fetchProfileData, onSave }) => {
  const [formData, setFormData] = useState(profileData);
  const [usernameError, setUsernameError] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isUsernameValid, setIsUsernameValid] = useState(true);
  
  useEffect(() => {
    setFormData(profileData);
  }, [profileData]);
  
  if (!isOpen) return null;
  
  const handleUsernameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUsername = e.target.value.trim();
    setFormData((prev) => ({ ...prev, username: newUsername }));
  
    if (!newUsername) {
      setUsernameError("Username cannot be empty");
      setIsUsernameValid(false);
      return;
    }
  
    setIsChecking(true);
  
    try {
      console.log("Checking username:", newUsername); // ✅ Debug log
  
      const response = await api.get(`/users/check-username/${newUsername}`);
      console.log("API response:", response.data); // ✅ Check API response
  
      if (response.status === 200) {
        setUsernameError(""); // No error, username is available
        setIsUsernameValid(true);
      }
    } catch (error: any) {
      console.error("API error:", error.response?.data || error.message); // ✅ Log API error
  
      setUsernameError("Username is already taken");
      setIsUsernameValid(false);
    } finally {
      setIsChecking(false);
    }
  };

  const handleEditProfileModalSave = async (newData: Partial<ProfileData>) => {
    try {
      const formData = new FormData();
  
      if (newData.name) formData.append("name", newData.name);
      formData.append("username", newData.username || profileData.username);
      if (newData.bio) formData.append("bio", newData.bio);
      if (newData.walletAddress) formData.append("walletAddress", newData.walletAddress);
  
      // Ensure socialLinks exist and are properly formatted
      const socialLinksToSave = newData.socialLinks || profileData.socialLinks || {};
      formData.append("socialLinks", JSON.stringify(socialLinksToSave));
  
      // Handle profile image (only upload if new)
      if (newData.profileImage?.startsWith("data:image")) {
        const blob = await fetch(newData.profileImage).then((r) => r.blob());
        formData.append("profileImage", blob, "profile-image.jpg");
      }
  
      // Handle cover image (only upload if new)
      if (newData.coverImage?.startsWith("data:image")) {
        const blob = await fetch(newData.coverImage).then((r) => r.blob());
        formData.append("coverImage", blob, "cover-image.jpg");
      }
  
      const response = await api.put("/users/profile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
  
      if (response.data.success) {
        setProfileData((prev) => ({
          ...prev,
          ...newData,
          socialLinks: {
            ...prev.socialLinks,
            ...(newData.socialLinks || {}),
          },
        }));
  
        toast.success("Profile updated successfully");
        // Immediately fetch the latest data to ensure it's properly saved
        await fetchProfileData();
      } else {
        throw new Error(response.data.message || "Failed to update profile");
      }
    } catch (error: any) {
      console.error("Error updating profile:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to update profile";
      toast.error(
        <div className="flex items-center gap-2">
          <Icon icon="mdi:alert-circle" className="text-red-500 text-xl" />
          <span>{errorMessage}</span>
        </div>,
        {
          duration: 4000,
          style: {
            background: '#1F2937',
            color: '#fff',
            border: '1px solid #374151',
            padding: '12px 16px',
            borderRadius: '8px',
          }
        }
      );
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isUsernameValid) return; // Prevent submission if username is invalid
  
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error("Error saving profile changes:", error);
    }
  };
  
  const handleFileChange = (type: "cover" | "profile") => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          setFormData((prev) => ({
            ...prev,
            [type === "cover" ? "coverImage" : "profileImage"]: result,
          }));
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black bg-opacity-70">
      <div className="bg-black text-white rounded-lg shadow-2xl w-full max-w-sm sm:max-w-lg md:max-w-2xl p-4 sm:p-6 max-h-[80vh] overflow-y-auto z-50 border border-gray-800">
        <h2 className="text-lg sm:text-xl font-semibold mb-4">Edit Profile</h2>
        <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <div className="col-span-2">
    <p className="mb-2 text-gray-300">Cover Photo</p>
    <div
      className="relative h-32 md:h-48 w-full rounded-lg border-2 border-dashed border-gray-700 cursor-pointer hover:border-[#B671FF] transition-colors"
      onClick={() => handleFileChange("cover")}
    >
      {formData.coverImage ? (
        <img src={formData.coverImage} alt="Cover" className="w-full h-full object-cover rounded-lg" />
      ) : (
        <div className="flex items-center justify-center h-full">
          <Icon icon="lucide:image-plus" className="text-4xl text-gray-400" />
        </div>
      )}
    </div>
  </div>

  {/* Profile Photo - Centered */}
  <div className="flex flex-col items-start w-full col-span-2">
    <p className="mb-2 text-gray-300">Profile Photo</p>
    <div
      className="relative w-24 md:w-32 h-24 md:h-32 rounded-full border-2 border-dashed border-gray-700 cursor-pointer hover:border-[#B671FF] transition-colors"
      onClick={() => handleFileChange("profile")}
    >
      {formData.profileImage ? (
        <img src={formData.profileImage} alt="Profile" className="w-full h-full object-cover rounded-full" />
      ) : (
        <div className="flex items-center justify-center h-full">
          <Icon icon="lucide:user-plus" className="text-4xl text-gray-400" />
        </div>
      )}
    </div>
  </div>

  {/* Name & Username in the Same Grid Layout */}
  <div className="w-full">
    <label className="block text-gray-300">Name</label>
    <input
      type="text"
      value={formData.name}
      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
      className="w-full p-2 border rounded bg-gray-800 border-gray-700 text-white focus:border-[#B671FF] focus:outline-none"
    />
  </div>

  <div className="w-full">
  <label className="block text-gray-300">Username</label>
  <input
    type="text"
    value={formData.username}
    onChange={handleUsernameChange}
    className={`w-full p-2 border rounded bg-gray-800 border-gray-700 text-white focus:border-[#B671FF] focus:outline-none ${
      usernameError ? "border-red-500" : ""
    }`}
  />
  {isChecking && <p className="text-yellow-400 text-sm">Checking...</p>}
  {usernameError && <p className="text-red-500 text-sm">{usernameError}</p>}
</div>


  <div className="col-span-2">
    <label className="block text-gray-300">Bio</label>
    <textarea
      value={formData.bio}
      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
      className="w-full p-2 border rounded bg-gray-800 border-gray-700 text-white focus:border-[#B671FF] focus:outline-none"
    />
  </div>

  <div className="col-span-2">
    <label className="block text-gray-300">Wallet Address</label>
    <input
      type="text"
      value={formData.walletAddress}
      onChange={(e) => setFormData({ ...formData, walletAddress: e.target.value })}
      className="w-full p-2 border rounded bg-gray-800 border-gray-700 text-white focus:border-[#B671FF] focus:outline-none"
    />
  </div>
  
  {/* Social Links Section */}
  <div className="col-span-2 mt-4">
    <h3 className="text-lg font-semibold text-gray-300 mb-2">Social Links</h3>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className="block text-gray-300">
          <Icon icon="mdi:web" className="inline mr-2" />
          Website
        </label>
        <input
          type="url"
          value={formData.socialLinks?.website || ''}
          onChange={(e) => setFormData({
            ...formData,
            socialLinks: {
              ...formData.socialLinks,
              website: e.target.value
            }
          })}
          placeholder="https://example.com"
          className="w-full p-2 border rounded bg-gray-800 border-gray-700 text-white focus:border-[#B671FF] focus:outline-none"
        />
      </div>
      
      <div>
        <label className="block text-gray-300">
          <Icon icon="mdi:twitter" className="inline mr-2" />
          Twitter
        </label>
        <input
          type="url"
          value={formData.socialLinks?.twitter || ''}
          onChange={(e) => setFormData({
            ...formData,
            socialLinks: {
              ...formData.socialLinks,
              twitter: e.target.value
            }
          })}
          placeholder="https://twitter.com/username"
          className="w-full p-2 border rounded bg-gray-800 border-gray-700 text-white focus:border-[#B671FF] focus:outline-none"
        />
      </div>
      
      <div>
        <label className="block text-gray-300">
          <Icon icon="mdi:telegram" className="inline mr-2" />
          Telegram
        </label>
        <input
          type="url"
          value={formData.socialLinks?.telegram || ''}
          onChange={(e) => setFormData({
            ...formData,
            socialLinks: {
              ...formData.socialLinks,
              telegram: e.target.value
            }
          })}
          placeholder="https://t.me/username"
          className="w-full p-2 border rounded bg-gray-800 border-gray-700 text-white focus:border-[#B671FF] focus:outline-none"
        />
      </div>
      
      <div>
        <label className="block text-gray-300">
          <Icon icon="mdi:discord" className="inline mr-2" />
          Discord
        </label>
        <input
          type="url"
          value={formData.socialLinks?.discord || ''}
          onChange={(e) => setFormData({
            ...formData,
            socialLinks: {
              ...formData.socialLinks,
              discord: e.target.value
            }
          })}
          placeholder="https://discord.gg/invite"
          className="w-full p-2 border rounded bg-gray-800 border-gray-700 text-white focus:border-[#B671FF] focus:outline-none"
        />
      </div>
    </div>
  </div>
</div>


          <div className="flex justify-end space-x-2 mt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-gradient-to-r from-[#B671FF] via-[#C577EE] to-[#E282CA] text-black  rounded hover:bg-[#B671FF] hover:text-white transition-colors">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;