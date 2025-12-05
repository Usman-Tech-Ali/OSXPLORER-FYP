'use client';

import { SessionProvider } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { Footer } from '@/components/ui/footer';
import { NavbarWrapper } from '@/components/ui/navbar-wrapper';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isGamePage = pathname?.includes('/modules/') && pathname?.includes('/games/');
  
  if (isGamePage) {
    return (
      <SessionProvider>
        <main className="flex-1">{children}</main>
      </SessionProvider>
    );
  }
  
  return (
    <SessionProvider>
      <NavbarWrapper />
      <main className="flex-1">{children}</main>
      <Footer />
    </SessionProvider>
  );
}