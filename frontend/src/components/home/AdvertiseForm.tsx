'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Icon } from '@iconify/react';
import api from '@/lib/apiUtils';
import { useAuth } from '@/context/AuthContext';

const AdvertiseForm: React.FC = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    projectName: '',
    projectDetails: '',
    twitterHandle: '',
    telegramHandle: '',
    website: '',
    contactEmail: '',
    adDuration: '24 Hours - $29',
    transactionHash: ''
  });
  const [bannerImage, setBannerImage] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBannerImage(file);
      setBannerPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate form
    if (!formData.projectName.trim()) {
      setError('Project name is required');
      return;
    }
    if (!formData.projectDetails.trim()) {
      setError('Project details are required');
      return;
    }
    if (!formData.contactEmail.trim()) {
      setError('Contact email is required');
      return;
    }
    if (!bannerImage) {
      setError('Project banner is required');
      return;
    }
    if (!formData.transactionHash.trim()) {
      setError('Transaction hash is required');
      return;
    }

    try {
      setIsSubmitting(true);

      const submitData = new FormData();
      submitData.append('projectName', formData.projectName);
      submitData.append('projectDetails', formData.projectDetails);
      submitData.append('twitterHandle', formData.twitterHandle);
      submitData.append('telegramHandle', formData.telegramHandle);
      submitData.append('website', formData.website);
      submitData.append('contactEmail', formData.contactEmail);
      submitData.append('adDuration', formData.adDuration);
      submitData.append('transactionHash', formData.transactionHash);
      submitData.append('bannerImage', bannerImage);

      const response = await api.post('/advertisements', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setSuccess('Advertisement submitted successfully! It will be reviewed shortly.');

      // Reset form
      setFormData({
        projectName: '',
        projectDetails: '',
        twitterHandle: '',
        telegramHandle: '',
        website: '',
        contactEmail: '',
        adDuration: '24 Hours - $29',
        transactionHash: ''
      });
      setBannerImage(null);
      setBannerPreview('');
    } catch (err: any) {
      console.error('Error submitting advertisement:', err);
      setError(err.response?.data?.message || 'Failed to submit advertisement');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Form is shown regardless of login status

  return (
    <Card className="max-w-full bg-white rounded-lg shadow-[0px_4px_15px_rgba(128,128,128,0.4)] mb-4">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Advertise Your Project</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded">
              {success}
            </div>
          )}

          <div>
            <label htmlFor="projectName" className="block text-sm font-medium mb-1">Project Name:</label>
            <Input
              id="projectName"
              name="projectName"
              value={formData.projectName}
              onChange={handleInputChange}
              className="w-full"
              required
            />
          </div>

          <div>
            <label htmlFor="projectDetails" className="block text-sm font-medium mb-1">Project Details:</label>
            <Textarea
              id="projectDetails"
              name="projectDetails"
              value={formData.projectDetails}
              onChange={handleInputChange}
              className="w-full min-h-[100px]"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="twitterHandle" className="block text-sm font-medium mb-1">Twitter Handle:</label>
              <Input
                id="twitterHandle"
                name="twitterHandle"
                value={formData.twitterHandle}
                onChange={handleInputChange}
                className="w-full"
                placeholder="@username"
              />
            </div>

            <div>
              <label htmlFor="telegramHandle" className="block text-sm font-medium mb-1">Telegram Handle:</label>
              <Input
                id="telegramHandle"
                name="telegramHandle"
                value={formData.telegramHandle}
                onChange={handleInputChange}
                className="w-full"
                placeholder="@username"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="website" className="block text-sm font-medium mb-1">Website:</label>
              <Input
                id="website"
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                className="w-full"
                placeholder="https://"
              />
            </div>

            <div>
              <label htmlFor="contactEmail" className="block text-sm font-medium mb-1">Contact Email:</label>
              <Input
                id="contactEmail"
                name="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={handleInputChange}
                className="w-full"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="bannerImage" className="block text-sm font-medium mb-1">Project Banner:</label>
            <div className="flex items-center space-x-4">
              <label className="cursor-pointer flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-4 w-full h-[100px] hover:bg-gray-50 transition-colors">
                <input
                  type="file"
                  id="bannerImage"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  required
                />
                {bannerPreview ? (
                  <img src={bannerPreview} alt="Banner preview" className="max-h-full max-w-full object-contain" />
                ) : (
                  <div className="text-center">
                    <Icon icon="lucide:upload" className="mx-auto h-8 w-8 text-gray-400" />
                    <span className="mt-2 block text-sm text-gray-500">Choose a file</span>
                  </div>
                )}
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1">Recommended size: 1200x300px. Max size: 5MB</p>
          </div>

          <div>
            <label htmlFor="adDuration" className="block text-sm font-medium mb-1">Ad Duration:</label>
            <select
              id="adDuration"
              name="adDuration"
              value={formData.adDuration}
              onChange={handleInputChange}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              required
            >
              <option value="24 Hours - $29">24 Hours - $29</option>
              <option value="3 Days - $69">3 Days - $69</option>
              <option value="7 Days - $149">7 Days - $149</option>
            </select>
          </div>

          <div className="p-4 bg-gray-100 rounded-lg">
            <h3 className="text-md font-medium mb-2">Payment Details:</h3>
            <p className="text-sm mb-2">Send the payment in equivalent USDT amount as per the advertisement duration you are opting for to the following address:</p>
            <div className="flex items-center p-2 bg-gray-200 rounded mb-2">
              <code className="text-sm flex-1 break-all">7FzyP3EQobFFHweZTMtoi6Yg6rUu5NNoUJyhmy7ZAggZ</code>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText('7FzyP3EQobFFHweZTMtoi6Yg6rUu5NNoUJyhmy7ZAggZ')}
                className="ml-2 text-blue-500 hover:text-blue-700"
              >
                <Icon icon="lucide:copy" className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="transactionHash" className="block text-sm font-medium mb-1">Enter transaction hash:</label>
            <Input
              id="transactionHash"
              name="transactionHash"
              value={formData.transactionHash}
              onChange={handleInputChange}
              className="w-full"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Icon icon="lucide:loader-2" className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : 'Submit'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AdvertiseForm;