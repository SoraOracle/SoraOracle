import './globals.css';
import type { Metadata } from 'next';
import { Press_Start_2P, Inter } from 'next/font/google';

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
        <nav className="border-b border-gray-800 bg-s402-gray">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-8">
                <h1 className="text-xl font-pixel">
                  <span className="text-s402-orange">S402</span>SCAN
                </h1>
                <div className="hidden md:flex space-x-6">
                  <a href="/" className="hover:text-s402-orange transition">Dashboard</a>
                  <a href="/transactions" className="hover:text-s402-orange transition">Transactions</a>
                  <a href="/providers" className="hover:text-s402-orange transition">Providers</a>
                  <a href="/data-sources" className="hover:text-s402-orange transition">Data Sources</a>
                  <a href="/composer" className="hover:text-s402-orange transition">Composer</a>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-400">BNB Chain</span>
                <button className="bg-s402-orange px-4 py-2 rounded-lg hover:bg-orange-600 transition">
                  Connect Wallet
                </button>
              </div>
            </div>
          </div>
        </nav>
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
