import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quests - CoinDart',
  description: 'Complete quests and earn rewards on CoinDart',
};

export default function QuestsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="w-full">
      {children}
    </section>
  );
}