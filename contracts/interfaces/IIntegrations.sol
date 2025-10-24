// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IReferralRewards {
    function recordVolume(address _user, uint256 _volume, uint256 _fee) external payable;
}

interface ILiquidityIncentives {
    function registerMarketCreation(uint256 _marketId, address _creator) external;
    function addLiquidityIncentive(uint256 _marketId, uint256 _liquidityAmount) external;
}

interface IMarketFactory {
    enum MarketType { BINARY, MULTI_OUTCOME }
    
    function registerMarket(
        address _marketContract,
        uint256 _marketId,
        MarketType _marketType,
        string memory _category,
        string[] memory _tags,
        address _creator
    ) external returns (uint256 globalId);
}
