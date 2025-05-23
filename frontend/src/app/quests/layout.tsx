import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quests',
  description: 'Complete quests and earn rewards on SolEcho',
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