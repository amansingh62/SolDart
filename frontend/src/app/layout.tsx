import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import Layout from "@/components/home/Layout";
import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { HashtagProvider } from "@/context/HashtagContext";

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
        <AuthProvider>
          <LanguageProvider>
            <HashtagProvider>
              <Layout>{children}</Layout>
            </HashtagProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}