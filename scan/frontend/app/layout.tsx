import './globals.css';
import type { Metadata } from 'next';
import { Press_Start_2P, Inter } from 'next/font/google';
import Header from './components/Header';

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
      <body className="font-sans bg-black text-white min-h-screen">
        <Header />
        <div className="h-16"></div>
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
        <footer className="border-t border-gray-800 mt-16 py-8">
          <div className="container mx-auto px-4 text-center text-gray-400 text-sm">
            <p>S402 Scan - Oracle Ecosystem Explorer for BNB Chain</p>
            <p className="mt-2">Built by <a href="https://github.com/sora-oracle" className="text-s402-orange hover:underline">Sora Oracle</a></p>
          </div>
        </footer>
      </body>
    </html>
  );
}
