import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_CONFIG } from '../config/api';
import './SearchBar.css';

interface SearchResult {
  market_id: string;
  question: string;
  deadline: string;
  is_resolved: boolean;
  created_at: string;
}

interface SearchBarProps {
  disabled?: boolean;
}

function SearchBar({ disabled = false }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      setShowResults(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      searchMarkets();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const searchMarkets = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_CONFIG.baseURL}/api/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      setResults(data);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (marketId: string) => {
    setShowResults(false);
    setQuery('');
    navigate(`/market/${marketId}`);
  };

  return (
    <div className={`search-bar ${disabled ? 'search-bar-disabled' : ''}`} ref={searchRef}>
      <div className="search-input-wrapper">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          className="search-input"
          placeholder="Search markets..."
          value={query}
          onChange={(e) => !disabled && setQuery(e.target.value)}
          onFocus={() => !disabled && results.length > 0 && setShowResults(true)}
          disabled={disabled}
        />
        {loading && <span className="search-loading">⏳</span>}
      </div>
      {disabled && <div className="search-tooltip">Coming Soon</div>}

      {showResults && results.length > 0 && (
        <div className="search-results">
          {results.map((result) => (
            <div
              key={result.market_id}
              className="search-result-item"
              onClick={() => handleResultClick(result.market_id)}
            >
              <div className="result-question">{result.question}</div>
              <div className="result-meta">
                <span className={result.is_resolved ? 'resolved' : 'active'}>
                  {result.is_resolved ? '✅ Resolved' : '⏳ Active'}
                </span>
                <span className="result-date">
                  {new Date(result.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showResults && query.trim().length >= 3 && results.length === 0 && !loading && (
        <div className="search-results">
          <div className="no-results">No markets found</div>
        </div>
      )}
    </div>
  );
}

export default SearchBar;
