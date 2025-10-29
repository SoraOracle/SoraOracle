'use client';

import { useEffect } from 'react';

export default function AgentChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Hide layout padding and footer for chat page
    const main = document.querySelector('main');
    const footer = document.querySelector('footer');
    
    if (main) {
      main.className = '';
      main.style.padding = '0';
      main.style.overflow = 'hidden';
    }
    
    if (footer) {
      footer.style.display = 'none';
    }
    
    return () => {
      // Restore on unmount
      if (main) {
        main.className = 'container mx-auto px-4 py-8 flex-1';
        main.style.padding = '';
        main.style.overflow = '';
      }
      if (footer) {
        footer.style.display = '';
      }
    };
  }, []);

  return <>{children}</>;
}
