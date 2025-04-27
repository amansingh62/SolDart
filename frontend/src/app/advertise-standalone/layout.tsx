// This layout completely overrides the root layout
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { AuthProvider } from "@/context/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Advertise Your Project | SolDart",
  description: "Advertise your project on SolDart",
  icons: {
    icon: '/svg.png',
    shortcut: '/svg.png',
  },
};

// These settings ensure this layout is completely independent
export const dynamic = 'force-static';
export const runtime = 'edge';

// This is a standalone layout that doesn't include any navigation or sidebar
export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head />
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white`}>
        <AuthProvider>
          {/* No layout components, just the children */}
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}