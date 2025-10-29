import './globals.css';
import type { Metadata } from 'next';
import { Press_Start_2P, Inter } from 'next/font/google';
import Header from './components/Header';
import { ThemeProvider } from './providers/ThemeProvider';
import { WalletProvider } from './providers/WalletProvider';

const pressStart = Press_Start_2P({ 
  weight: '400',
  subsets: ['latin'],
  variable: '--font-press-start'
});

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter'
});

export const metadata: Metadata = {
  title: 'S402 Scan - Oracle Ecosystem Explorer for BNB Chain',
  description: 'Analytics dashboard for s402 oracle payments on BNB Smart Chain',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${pressStart.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className="font-sans bg-s402-light-bg dark:bg-s402-dark text-gray-800 dark:text-gray-100 min-h-screen transition-colors">
        <div className="flex flex-col min-h-screen">
          <ThemeProvider>
            <WalletProvider>
              <Header />
            <div className="h-16"></div>
            <main className="container mx-auto px-4 py-8 flex-1">
              {children}
            </main>
            <footer className="border-t border-gray-200 dark:border-gray-800 mt-16 py-8">
              <div className="container mx-auto px-4 text-center text-gray-600 dark:text-gray-400 text-sm">
                <p>S402 Scan - Oracle Ecosystem Explorer for BNB Chain</p>
                <p className="mt-2">Built by <a href="https://github.com/sora-oracle" className="text-s402-orange hover:underline">Sora Oracle</a></p>
              </div>
            </footer>
            </WalletProvider>
          </ThemeProvider>
        </div>
      </body>
    </html>
  );
}
