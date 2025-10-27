export const SORA_ORACLE_ABI = [
  "function askGeneralQuestion(string calldata question) external payable returns (bytes32)",
  "function askYesNoQuestion(string calldata question) external payable returns (bytes32)",
  "function provideAnswer(bytes32 questionId, string calldata textAnswer, uint256 numericAnswer, bool boolAnswer, uint8 confidenceScore, string calldata dataSource) external",
  "function refund(bytes32 questionId) external",
  "function withdraw() external",
  "function getQuestionWithAnswer(bytes32 questionId) external view returns (bytes32, address, uint256, uint8, uint256, bool, string memory, uint256, bool, uint8, string memory, uint256, address)",
  "function providerBalance(address provider) external view returns (uint256)",
  "function questionFee() external view returns (uint256)",
  "event QuestionAsked(bytes32 indexed questionId, bytes32 indexed questionHash, address indexed asker, uint8 answerType, uint256 bounty, string question)",
  "event AnswerProvided(bytes32 indexed questionId, string textAnswer, uint256 numericAnswer, bool boolAnswer, uint8 confidenceScore, string dataSource, address indexed provider)",
  "event OracleWithdrawn(address indexed provider, uint256 amount)"
];

export const BATCH_OPERATIONS_ABI = [
  "function batchAskQuestions(string[] calldata questions, uint8[] calldata answerTypes) external payable returns (bytes32[] memory)",
  "function batchProvideAnswers(bytes32[] calldata questionIds, string[] calldata textAnswers, uint256[] calldata numericAnswers, bool[] calldata boolAnswers, uint8[] calldata confidenceScores, string[] calldata dataSources) external",
  "function batchCheckStatus(bytes32[] calldata questionIds) external view returns (bool[] memory)",
  "function questionFee() external view returns (uint256)"
];

export const PREDICTION_MARKET_ABI = [
  "function createMarket(bytes32 questionId, string calldata question, uint256 deadline) external",
  "function takePosition(bytes32 marketId, bool isYes) external payable",
  "function resolveMarket(bytes32 marketId) external",
  "function claimWinnings(bytes32 marketId) external",
  "function getMarket(bytes32 marketId) external view returns (bytes32, string memory, uint256, uint256, uint256, bool, bool, uint256)",
  "function getUserPosition(bytes32 marketId, address user) external view returns (bool, uint256, bool)",
  "event MarketCreated(bytes32 indexed marketId, bytes32 indexed questionId, string question, uint256 deadline)",
  "event PositionTaken(bytes32 indexed marketId, address indexed user, bool isYes, uint256 amount)",
  "event MarketResolved(bytes32 indexed marketId, bool outcome)",
  "event WinningsClaimed(bytes32 indexed marketId, address indexed user, uint256 amount)"
];

export const REPUTATION_TRACKER_ABI = [
  "function getProviderStats(address provider) external view returns (uint256, uint256, uint256, uint256)",
  "function getReputationScore(address provider) external view returns (uint256)",
  "function getTopProviders(uint256 count) external view returns (address[] memory)",
  "event ReputationUpdated(address indexed provider, uint256 newScore, uint256 totalAnswers, uint256 totalEarnings)"
];

export const DISPUTE_RESOLUTION_ABI = [
  "function createDispute(bytes32 questionId, string calldata reason) external payable returns (bytes32)",
  "function vote(bytes32 disputeId, bool support) external payable",
  "function resolveDispute(bytes32 disputeId) external",
  "function getDispute(bytes32 disputeId) external view returns (bytes32, address, uint256, uint256, uint256, bool, bool, uint256)",
  "event DisputeCreated(bytes32 indexed disputeId, bytes32 indexed questionId, address indexed challenger, uint256 stake)",
  "event VoteCast(bytes32 indexed disputeId, address indexed voter, bool support, uint256 stake)",
  "event DisputeResolved(bytes32 indexed disputeId, bool outcome)"
];
