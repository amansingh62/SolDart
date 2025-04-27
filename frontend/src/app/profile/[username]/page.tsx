'use client';

import { useParams } from 'next/navigation';
import ProfileSection from "@/components/profile/ProfileSection";

export default function UserProfileByUsername() {
  const params = useParams();
  const username = params.username as string;
  
  return (
    <ProfileSection username={username} />
  );
}