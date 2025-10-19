// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../contracts/SoraOracle.sol";
import "../../contracts/PancakeTWAPOracle.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title DeFiLendingExample
 * @notice Example: Using Sora Oracle for collateral valuation
 * @dev Shows how to integrate TWAP oracles for safe lending/liquidation
 * 
 * Key Features:
 * - Permissionless: Accept ANY token with PancakeSwap liquidity as collateral
 * - Manipulation-resistant: Uses TWAP for liquidations (not spot!)
 * - Bootstrap-aware: Requires TWAP to be ready before accepting collateral
 */
contract DeFiLendingExample is ReentrancyGuard {
    SoraOracle public oracle;
    
    uint256 public constant COLLATERAL_RATIO = 150; // 150% collateralization
    uint256 public constant LIQUIDATION_THRESHOLD = 120; // Liquidate at 120%
    
    struct Loan {
        address borrower;
        address collateralToken;
        address collateralPair;
        uint256 collateralAmount;
        uint256 borrowedAmount;
        bool active;
    }
    
    mapping(uint256 => Loan) public loans;
    uint256 public loanCounter;
    
    event LoanCreated(uint256 indexed loanId, address indexed borrower, uint256 collateral, uint256 borrowed);
    event LoanRepaid(uint256 indexed loanId, address indexed borrower);
    event LoanLiquidated(uint256 indexed loanId, address indexed liquidator);
    
    constructor(address _oracle) {
        oracle = SoraOracle(_oracle);
    }
    
    /**
     * @notice Deposit collateral and borrow (permissionless - any token!)
     * @param _collateralPair PancakeSwap pair for your collateral token
     * @param _collateralToken Your collateral token address
     * @param _collateralAmount Amount to deposit
     * @param _borrowAmount Amount to borrow (in BNB)
     */
    function createLoan(
        address _collateralPair,
        address _collateralToken,
        uint256 _collateralAmount,
        uint256 _borrowAmount
    ) external payable nonReentrant returns (uint256 loanId) {
        require(msg.value == _collateralAmount, "Send collateral");
        
        // Get TWAP oracle (auto-creates if needed)
        PancakeTWAPOracle twap = oracle.twapOracles(_collateralPair);
        
        if (address(twap) == address(0)) {
            // First time using this token - create TWAP oracle
            oracle.getTWAPPrice(_collateralPair, _collateralToken, 1 ether);
            twap = oracle.twapOracles(_collateralPair);
        }
        
        // CRITICAL: Require TWAP to be ready (not bootstrap mode)
        require(twap.canConsult(), "Wait 5 min for TWAP - bootstrap mode not safe for lending");
        
        // Get collateral value using manipulation-resistant TWAP
        uint256 collateralValue = oracle.getTWAPPrice(
            _collateralPair,
            _collateralToken,
            _collateralAmount
        );
        
        // Check collateralization ratio
        uint256 requiredCollateral = (_borrowAmount * COLLATERAL_RATIO) / 100;
        require(collateralValue >= requiredCollateral, "Insufficient collateral");
        
        loanId = loanCounter++;
        loans[loanId] = Loan({
            borrower: msg.sender,
            collateralToken: _collateralToken,
            collateralPair: _collateralPair,
            collateralAmount: _collateralAmount,
            borrowedAmount: _borrowAmount,
            active: true
        });
        
        // Send borrowed amount
        (bool success, ) = payable(msg.sender).call{value: _borrowAmount}("");
        require(success, "Borrow transfer failed");
        
        emit LoanCreated(loanId, msg.sender, _collateralAmount, _borrowAmount);
    }
    
    /**
     * @notice Repay loan and get collateral back
     */
    function repayLoan(uint256 _loanId) external payable nonReentrant {
        Loan storage loan = loans[_loanId];
        require(loan.active, "Loan not active");
        require(msg.sender == loan.borrower, "Not borrower");
        require(msg.value == loan.borrowedAmount, "Wrong repay amount");
        
        loan.active = false;
        
        // Return collateral
        (bool success, ) = payable(msg.sender).call{value: loan.collateralAmount}("");
        require(success, "Collateral return failed");
        
        emit LoanRepaid(_loanId, msg.sender);
    }
    
    /**
     * @notice Liquidate undercollateralized loan
     * @dev Uses TWAP to prevent price manipulation attacks
     */
    function liquidate(uint256 _loanId) external nonReentrant {
        Loan storage loan = loans[_loanId];
        require(loan.active, "Loan not active");
        
        // Get TWAP oracle
        PancakeTWAPOracle twap = oracle.twapOracles(loan.collateralPair);
        require(twap.canConsult(), "TWAP not ready");
        
        // Calculate current collateral value using TWAP (manipulation-resistant!)
        uint256 collateralValue = oracle.getTWAPPrice(
            loan.collateralPair,
            loan.collateralToken,
            loan.collateralAmount
        );
        
        // Check if undercollateralized
        uint256 requiredValue = (loan.borrowedAmount * LIQUIDATION_THRESHOLD) / 100;
        require(collateralValue < requiredValue, "Not liquidatable");
        
        loan.active = false;
        
        // Liquidator pays borrowed amount, gets collateral
        (bool success, ) = payable(msg.sender).call{value: loan.collateralAmount}("");
        require(success, "Liquidation transfer failed");
        
        emit LoanLiquidated(_loanId, msg.sender);
    }
    
    /**
     * @notice Check if loan is healthy (for display)
     */
    function checkLoanHealth(uint256 _loanId) external view returns (
        uint256 collateralValue,
        uint256 collateralizationRatio,
        bool isHealthy
    ) {
        Loan memory loan = loans[_loanId];
        
        PancakeTWAPOracle twap = oracle.twapOracles(loan.collateralPair);
        if (address(twap) == address(0) || !twap.canConsult()) {
            return (0, 0, false);
        }
        
        collateralValue = oracle.getTWAPPrice(
            loan.collateralPair,
            loan.collateralToken,
            loan.collateralAmount
        );
        
        collateralizationRatio = (collateralValue * 100) / loan.borrowedAmount;
        isHealthy = collateralizationRatio >= LIQUIDATION_THRESHOLD;
    }
}
