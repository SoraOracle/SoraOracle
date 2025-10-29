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
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-800/50 bg-black/80 backdrop-blur-xl">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-8">
                <h1 className="text-xl font-pixel">
                  <span className="text-s402-orange drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]">S402</span>SCAN
                </h1>
                <div className="hidden md:flex space-x-6 text-sm">
                  <a href="/" className="hover:text-s402-orange transition-all duration-300 hover:drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]">Dashboard</a>
                  <a href="/transactions" className="hover:text-s402-orange transition-all duration-300 hover:drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]">Transactions</a>
                  <a href="/providers" className="hover:text-s402-orange transition-all duration-300 hover:drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]">Providers</a>
                  <a href="/data-sources" className="hover:text-s402-orange transition-all duration-300 hover:drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]">Data Sources</a>
                  <a href="/composer" className="hover:text-s402-orange transition-all duration-300 hover:drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]">Composer</a>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-400 px-3 py-1.5 rounded-full bg-gray-900/50 border border-gray-800">BNB Chain</span>
                <button className="bg-s402-orange px-4 py-2 rounded-lg hover:bg-orange-600 transition-all duration-300 hover:shadow-[0_0_20px_rgba(249,115,22,0.5)] hover:scale-105">
                  Connect Wallet
                </button>
              </div>
            </div>
          </div>
        </nav>
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
