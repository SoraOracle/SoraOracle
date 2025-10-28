import { Routes, Route } from 'react-router-dom';
import { useWallet } from '@sora-oracle/sdk/hooks';
import { useSoraOracle } from '@sora-oracle/sdk/hooks';
import { SORA_CONFIG } from './config';
import { ProfileProvider } from './contexts/ProfileContext';
import Header from './components/Header';
import MarketDetailPage from './pages/MarketDetailPage';
import CreateMarketPage from './pages/CreateMarketPage';
import DashboardPage from './pages/DashboardPage';
import OracleProviderPage from './pages/OracleProviderPage';
import AnalyticsPage from './pages/AnalyticsPage';
import { S402DemoPage } from './pages/S402DemoPage';
import './styles/App.css';

function App() {
  const wallet = useWallet();
  const { oracleClient, marketClient } = useSoraOracle(SORA_CONFIG, wallet.provider);

  return (
    <ProfileProvider>
      <div className="app">
        <Header wallet={wallet} />
        <main className="main-content">
          <Routes>
            <Route 
              path="/" 
              element={<S402DemoPage wallet={wallet} />} 
            />
            <Route 
              path="/s402" 
              element={<S402DemoPage wallet={wallet} />} 
            />
            <Route 
              path="/market/:id" 
              element={<MarketDetailPage marketClient={marketClient} wallet={wallet} />} 
            />
            <Route 
              path="/create" 
              element={<CreateMarketPage oracleClient={oracleClient} marketClient={marketClient} wallet={wallet} />} 
            />
            <Route 
              path="/dashboard" 
              element={<DashboardPage />} 
            />
            <Route 
              path="/oracle" 
              element={<OracleProviderPage oracleClient={oracleClient} />} 
            />
            <Route 
              path="/analytics" 
              element={<AnalyticsPage />} 
            />
          </Routes>
        </main>
      </div>
    </ProfileProvider>
  );
}

export default App;
