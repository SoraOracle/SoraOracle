import { useState, useEffect } from 'react';
import { useWallet } from '@sora-oracle/sdk/hooks';
import './OracleProviderPage.css';

interface Question {
  questionHash: string;
  question: string;
  bounty: string;
  timestamp: number;
  asker: string;
  answered: boolean;
}

interface ProviderStats {
  totalAnswers: number;
  totalEarnings: string;
  averageConfidence: number;
  reputationScore: number;
  pendingWithdrawal: string;
  answersThisMonth: number;
}

function OracleProviderPage({ oracleClient }: any) {
  const { isConnected } = useWallet();
  const [activeTab, setActiveTab] = useState<'pending' | 'history' | 'analytics'>('pending');
  const [pendingQuestions, setPendingQuestions] = useState<Question[]>([]);
  const [answeredQuestions, setAnsweredQuestions] = useState<Question[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [answerType, setAnswerType] = useState<'yes-no' | 'text'>('yes-no');
  const [boolAnswer, setBoolAnswer] = useState<boolean>(true);
  const [confidence, setConfidence] = useState(80);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState<ProviderStats>({
    totalAnswers: 0,
    totalEarnings: '0',
    averageConfidence: 0,
    reputationScore: 0,
    pendingWithdrawal: '0',
    answersThisMonth: 0
  });

  useEffect(() => {
    if (isConnected && oracleClient) {
      loadOracleData();
    }
  }, [isConnected, oracleClient]);

  const loadOracleData = async () => {
    setLoading(true);
    try {
      // Simulate loading oracle questions (replace with real SDK calls)
      const mockPendingQuestions: Question[] = [
        {
          questionHash: '0x1234',
          question: 'Will Bitcoin price exceed $100,000 by December 31, 2025?',
          bounty: '0.01',
          timestamp: Date.now() - 3600000,
          asker: '0xabc...def',
          answered: false
        },
        {
          questionHash: '0x5678',
          question: 'Will Ethereum successfully complete the next upgrade before Q2 2025?',
          bounty: '0.01',
          timestamp: Date.now() - 7200000,
          asker: '0x123...456',
          answered: false
        },
        {
          questionHash: '0x9abc',
          question: 'Will S&P 500 reach 6000 points before March 2025?',
          bounty: '0.01',
          timestamp: Date.now() - 10800000,
          asker: '0x789...012',
          answered: false
        }
      ];

      const mockAnsweredQuestions: Question[] = [
        {
          questionHash: '0xdef0',
          question: 'Did Tesla stock reach $300 in October 2025?',
          bounty: '0.01',
          timestamp: Date.now() - 86400000,
          asker: '0xabc...123',
          answered: true
        },
        {
          questionHash: '0xabc1',
          question: 'Will there be a US interest rate cut in Q4 2024?',
          bounty: '0.01',
          timestamp: Date.now() - 172800000,
          asker: '0xdef...456',
          answered: true
        }
      ];

      setPendingQuestions(mockPendingQuestions);
      setAnsweredQuestions(mockAnsweredQuestions);

      // Mock stats
      setStats({
        totalAnswers: 127,
        totalEarnings: '1.27',
        averageConfidence: 87,
        reputationScore: 892,
        pendingWithdrawal: '0.15',
        answersThisMonth: 23
      });
    } catch (error) {
      console.warn('Error loading oracle data:', error);
    }
    setLoading(false);
  };

  const handleSubmitAnswer = async () => {
    if (!selectedQuestion) return;
    
    setSubmitting(true);
    try {
      console.log('Submitting answer:', {
        questionHash: selectedQuestion,
        answer: answerType === 'yes-no' ? (boolAnswer ? 'YES' : 'NO') : answerText,
        confidence
      });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      alert('Answer submitted successfully!');
      setSelectedQuestion(null);
      setAnswerText('');
      setConfidence(80);
      loadOracleData();
    } catch (error) {
      console.error('Error submitting answer:', error);
      alert('Failed to submit answer');
    }
    setSubmitting(false);
  };

  const handleWithdraw = async () => {
    if (!isConnected) {
      alert('Please connect your wallet');
      return;
    }

    if (parseFloat(stats.pendingWithdrawal) === 0) {
      alert('No earnings to withdraw');
      return;
    }

    try {
      console.log('Withdrawing:', stats.pendingWithdrawal, 'BNB');
      alert(`Withdrawing ${stats.pendingWithdrawal} BNB to your wallet`);
    } catch (error) {
      console.error('Withdrawal error:', error);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (!isConnected) {
    return (
      <div className="oracle-provider-page">
        <div className="container">
          <div className="empty-state">
            <h2>Connect Your Wallet</h2>
            <p>Please connect your wallet to access the Oracle Provider panel</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="oracle-provider-page">
        <div className="container">
          <div className="loading-state">
            <p>Loading oracle data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="oracle-provider-page">
      <div className="container">
        <div className="oracle-header">
          <div>
            <h1>Oracle Provider Panel</h1>
            <p className="subtitle">Answer questions and earn rewards</p>
          </div>
          {parseFloat(stats.pendingWithdrawal) > 0 && (
            <button className="btn-withdraw" onClick={handleWithdraw}>
              Withdraw Earnings ({stats.pendingWithdrawal} BNB)
            </button>
          )}
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">💡</div>
            <div className="stat-content">
              <div className="stat-label">Total Answers</div>
              <div className="stat-value">{stats.totalAnswers}</div>
            </div>
          </div>

          <div className="stat-card positive">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <div className="stat-label">Total Earnings</div>
              <div className="stat-value">{stats.totalEarnings} BNB</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🎯</div>
            <div className="stat-content">
              <div className="stat-label">Avg Confidence</div>
              <div className="stat-value">{stats.averageConfidence}%</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">⭐</div>
            <div className="stat-content">
              <div className="stat-label">Reputation</div>
              <div className="stat-value">{stats.reputationScore}/1000</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📅</div>
            <div className="stat-content">
              <div className="stat-label">This Month</div>
              <div className="stat-value">{stats.answersThisMonth}</div>
            </div>
          </div>

          <div className="stat-card positive">
            <div className="stat-icon">💵</div>
            <div className="stat-content">
              <div className="stat-label">Pending</div>
              <div className="stat-value">{stats.pendingWithdrawal} BNB</div>
            </div>
          </div>
        </div>

        <div className="oracle-content">
          <div className="tab-buttons">
            <button 
              className={activeTab === 'pending' ? 'active' : ''}
              onClick={() => setActiveTab('pending')}
            >
              Pending Questions ({pendingQuestions.length})
            </button>
            <button 
              className={activeTab === 'history' ? 'active' : ''}
              onClick={() => setActiveTab('history')}
            >
              Answer History ({answeredQuestions.length})
            </button>
            <button 
              className={activeTab === 'analytics' ? 'active' : ''}
              onClick={() => setActiveTab('analytics')}
            >
              Analytics
            </button>
          </div>

          {activeTab === 'pending' && (
            <div className="questions-list">
              {pendingQuestions.length === 0 ? (
                <div className="empty-state">
                  <p>No pending questions at the moment</p>
                </div>
              ) : (
                pendingQuestions.map(q => (
                  <div key={q.questionHash} className="question-card">
                    <div className="question-header">
                      <span className="bounty-badge">💰 {q.bounty} BNB</span>
                      <span className="time-badge">{formatTimestamp(q.timestamp)}</span>
                    </div>
                    <div className="question-text">{q.question}</div>
                    <div className="question-footer">
                      <span className="asker">From: {q.asker}</span>
                      <button 
                        className="btn-answer"
                        onClick={() => setSelectedQuestion(q.questionHash)}
                      >
                        Answer Question
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="history-list">
              {answeredQuestions.map(q => (
                <div key={q.questionHash} className="history-card">
                  <div className="history-header">
                    <span className="answered-badge">✅ Answered</span>
                    <span className="earned-badge">+{q.bounty} BNB</span>
                  </div>
                  <div className="history-question">{q.question}</div>
                  <div className="history-footer">
                    <span className="history-time">{formatTimestamp(q.timestamp)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="analytics-section">
              <div className="analytics-card">
                <h3>Performance Metrics</h3>
                <div className="metrics-grid">
                  <div className="metric">
                    <div className="metric-label">Success Rate</div>
                    <div className="metric-value">94.5%</div>
                    <div className="metric-trend positive">+2.3% this month</div>
                  </div>
                  <div className="metric">
                    <div className="metric-label">Response Time</div>
                    <div className="metric-value">23 min</div>
                    <div className="metric-trend positive">-5 min avg</div>
                  </div>
                  <div className="metric">
                    <div className="metric-label">Accuracy Score</div>
                    <div className="metric-value">96.2%</div>
                    <div className="metric-trend positive">+1.8%</div>
                  </div>
                  <div className="metric">
                    <div className="metric-label">Earnings/Answer</div>
                    <div className="metric-value">0.01 BNB</div>
                    <div className="metric-trend neutral">Stable</div>
                  </div>
                </div>
              </div>

              <div className="analytics-card">
                <h3>Recent Activity</h3>
                <div className="activity-timeline">
                  <div className="activity-item">
                    <div className="activity-dot"></div>
                    <div className="activity-content">
                      <div className="activity-title">Answered 3 questions</div>
                      <div className="activity-time">2 hours ago</div>
                    </div>
                  </div>
                  <div className="activity-item">
                    <div className="activity-dot"></div>
                    <div className="activity-content">
                      <div className="activity-title">Withdrew 0.25 BNB</div>
                      <div className="activity-time">1 day ago</div>
                    </div>
                  </div>
                  <div className="activity-item">
                    <div className="activity-dot"></div>
                    <div className="activity-content">
                      <div className="activity-title">Reputation increased to 892</div>
                      <div className="activity-time">3 days ago</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {selectedQuestion && (
          <div className="modal-overlay" onClick={() => setSelectedQuestion(null)}>
            <div className="modal-content answer-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Provide Answer</h2>
                <button className="close-button" onClick={() => setSelectedQuestion(null)}>×</button>
              </div>

              <div className="question-preview">
                {pendingQuestions.find(q => q.questionHash === selectedQuestion)?.question}
              </div>

              <div className="answer-form">
                <div className="form-group">
                  <label>Answer Type</label>
                  <div className="answer-type-selector">
                    <button
                      className={answerType === 'yes-no' ? 'active' : ''}
                      onClick={() => setAnswerType('yes-no')}
                    >
                      Yes/No
                    </button>
                    <button
                      className={answerType === 'text' ? 'active' : ''}
                      onClick={() => setAnswerType('text')}
                    >
                      Text
                    </button>
                  </div>
                </div>

                {answerType === 'yes-no' ? (
                  <div className="form-group">
                    <label>Answer</label>
                    <div className="bool-selector">
                      <button
                        className={`bool-button yes ${boolAnswer ? 'active' : ''}`}
                        onClick={() => setBoolAnswer(true)}
                      >
                        YES
                      </button>
                      <button
                        className={`bool-button no ${!boolAnswer ? 'active' : ''}`}
                        onClick={() => setBoolAnswer(false)}
                      >
                        NO
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="form-group">
                    <label>Answer</label>
                    <textarea
                      value={answerText}
                      onChange={e => setAnswerText(e.target.value)}
                      placeholder="Provide your answer..."
                      rows={4}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label>Confidence Score: {confidence}%</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={confidence}
                    onChange={e => setConfidence(parseInt(e.target.value))}
                    className="confidence-slider"
                  />
                  <div className="confidence-labels">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>

                <div className="form-actions">
                  <button 
                    className="btn-secondary" 
                    onClick={() => setSelectedQuestion(null)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn-primary" 
                    onClick={handleSubmitAnswer}
                    disabled={submitting || (answerType === 'text' && !answerText.trim())}
                  >
                    {submitting ? 'Submitting...' : 'Submit Answer'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default OracleProviderPage;
