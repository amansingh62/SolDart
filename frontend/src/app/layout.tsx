import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import Layout from "@/components/home/Layout";
import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { HashtagProvider } from "@/context/HashtagContext";
import { Toaster } from 'react-hot-toast';
import ForceLogoutHandler from '@/components/ForceLogoutHandler';

const poppins = Poppins({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  title: {
    default: "SolEcho",
    template: "%s | SolEcho"
  },
  description: "SolEcho - Your Next-Generation Platform",
  icons: {
    icon: '/solecho (1).png',
    shortcut: '/solecho (1).png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${poppins.variable} font-poppins antialiased`}
      >
        <ForceLogoutHandler />
        <AuthProvider>
          <LanguageProvider>
            <HashtagProvider>
              <Layout>{children}</Layout>
            </HashtagProvider>
          </LanguageProvider>
        </AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1F2937',
              color: '#fff',
              border: '1px solid #374151',
              padding: '12px 16px',
              borderRadius: '8px',
            },
            duration: 4000,
          }}
        />
      </body>
    </html>
  );
}