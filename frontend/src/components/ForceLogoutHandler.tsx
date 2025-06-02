'use client';

import { useEffect } from 'react';
// import { useRouter, usePathname } from 'next/navigation';

export default function ForceLogoutHandler() {
  // const router = useRouter();
  // const pathname = usePathname();

  useEffect(() => {
    const handleForceLogout = () => {
      // Redirect to /login is disabled
    };
    window.addEventListener('forceLogout', handleForceLogout);
    return () => window.removeEventListener('forceLogout', handleForceLogout);
  }, []);

  return null;
} 