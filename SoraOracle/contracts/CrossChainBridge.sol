// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CrossChainBridge
 * @notice Bridge oracle data between BNB Chain and other networks
 * @dev Uses message verification and relayer system for cross-chain communication
 */
contract CrossChainBridge is Ownable, ReentrancyGuard {
    
    enum ChainType { ETHEREUM, POLYGON, ARBITRUM, OPTIMISM, BASE }
    enum MessageStatus { PENDING, VERIFIED, EXECUTED, FAILED }

    struct CrossChainMessage {
        uint256 sourceChainId;
        uint256 targetChainId;
        bytes32 messageHash;
        bytes payload;
        uint32 timestamp;
        MessageStatus status;
        address relayer;
    }

    struct ChainConfig {
        ChainType chainType;
        uint256 chainId;
        address bridgeContract;
        bool active;
        uint32 confirmationBlocks;
    }

    mapping(bytes32 => CrossChainMessage) public messages;
    mapping(uint256 => ChainConfig) public chainConfigs;
    mapping(address => bool) public authorizedRelayers;
    mapping(bytes32 => mapping(address => bool)) public messageVerifications;
    
    bytes32[] public pendingMessages;
    uint256[] public supportedChains;
    address[] public relayerList;
    
    uint8 public requiredVerifications = 2;
    uint256 public relayerFee = 0.005 ether;

    event ChainConfigured(uint256 indexed chainId, ChainType chainType, address bridgeContract);
    event MessageSent(bytes32 indexed messageHash, uint256 sourceChain, uint256 targetChain, bytes payload);
    event MessageVerified(bytes32 indexed messageHash, address indexed relayer);
    event MessageExecuted(bytes32 indexed messageHash, bool success);
    event RelayerAdded(address indexed relayer);
    event RelayerRemoved(address indexed relayer);

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Configure a supported chain
     * @param _chainId Chain ID (1 for Ethereum, 137 for Polygon, etc.)
     * @param _chainType Type of chain
     * @param _bridgeContract Bridge contract address on that chain
     * @param _confirmationBlocks Required block confirmations
     */
    function configureChain(
        uint256 _chainId,
        ChainType _chainType,
        address _bridgeContract,
        uint32 _confirmationBlocks
    ) external onlyOwner {
        require(_bridgeContract != address(0), "Invalid bridge contract");
        require(_confirmationBlocks > 0, "Invalid confirmations");

        chainConfigs[_chainId] = ChainConfig({
            chainType: _chainType,
            chainId: _chainId,
            bridgeContract: _bridgeContract,
            active: true,
            confirmationBlocks: _confirmationBlocks
        });

        // Add to supported chains if new
        bool exists = false;
        for (uint256 i = 0; i < supportedChains.length; i++) {
            if (supportedChains[i] == _chainId) {
                exists = true;
                break;
            }
        }
        if (!exists) {
            supportedChains.push(_chainId);
        }

        emit ChainConfigured(_chainId, _chainType, _bridgeContract);
    }

    /**
     * @notice Add authorized relayer
     */
    function addRelayer(address _relayer) external onlyOwner {
        require(_relayer != address(0), "Invalid relayer");
        require(!authorizedRelayers[_relayer], "Already relayer");
        authorizedRelayers[_relayer] = true;
        relayerList.push(_relayer);
        emit RelayerAdded(_relayer);
    }

    /**
     * @notice Remove relayer
     */
    function removeRelayer(address _relayer) external onlyOwner {
        require(authorizedRelayers[_relayer], "Not a relayer");
        authorizedRelayers[_relayer] = false;
        emit RelayerRemoved(_relayer);
    }

    /**
     * @notice Send oracle data to another chain
     * @param _targetChainId Destination chain
     * @param _payload Encoded oracle data
     */
    function sendCrossChainMessage(
        uint256 _targetChainId,
        bytes memory _payload
    ) external payable nonReentrant returns (bytes32 messageHash) {
        require(msg.value >= relayerFee, "Insufficient relay fee");
        require(chainConfigs[_targetChainId].active, "Chain not supported");

        uint256 sourceChainId = block.chainid;
        messageHash = keccak256(abi.encodePacked(
            sourceChainId,
            _targetChainId,
            _payload,
            block.timestamp,
            msg.sender
        ));

        messages[messageHash] = CrossChainMessage({
            sourceChainId: sourceChainId,
            targetChainId: _targetChainId,
            messageHash: messageHash,
            payload: _payload,
            timestamp: uint32(block.timestamp),
            status: MessageStatus.PENDING,
            relayer: address(0)
        });

        pendingMessages.push(messageHash);
        emit MessageSent(messageHash, sourceChainId, _targetChainId, _payload);

        return messageHash;
    }

    /**
     * @notice Verify a cross-chain message (called by relayers)
     * @param _messageHash Message to verify
     */
    function verifyMessage(bytes32 _messageHash) external nonReentrant {
        require(authorizedRelayers[msg.sender], "Not authorized relayer");
        require(messages[_messageHash].status == MessageStatus.PENDING, "Not pending");
        require(!messageVerifications[_messageHash][msg.sender], "Already verified");

        messageVerifications[_messageHash][msg.sender] = true;

        // Count all verifications for this message by checking all authorized relayers
        uint8 verificationCount = 0;
        for (uint256 i = 0; i < relayerList.length; i++) {
            if (messageVerifications[_messageHash][relayerList[i]]) {
                verificationCount++;
            }
        }

        emit MessageVerified(_messageHash, msg.sender);

        // If enough verifications, mark as verified
        if (verificationCount >= requiredVerifications) {
            messages[_messageHash].status = MessageStatus.VERIFIED;
        }
    }

    /**
     * @notice Execute verified cross-chain message
     * @param _messageHash Message to execute
     */
    function executeMessage(bytes32 _messageHash) external nonReentrant {
        CrossChainMessage storage message = messages[_messageHash];
        require(message.status == MessageStatus.VERIFIED, "Not verified");
        
        // Mark as executed
        message.status = MessageStatus.EXECUTED;
        message.relayer = msg.sender;

        // Decode and execute payload (implementation specific)
        // For oracle data: could trigger answer submission, market resolution, etc.
        
        emit MessageExecuted(_messageHash, true);
    }

    /**
     * @notice Get message details
     */
    function getMessage(bytes32 _messageHash) external view returns (
        uint256 sourceChainId,
        uint256 targetChainId,
        bytes memory payload,
        uint32 timestamp,
        MessageStatus status
    ) {
        CrossChainMessage memory message = messages[_messageHash];
        return (
            message.sourceChainId,
            message.targetChainId,
            message.payload,
            message.timestamp,
            message.status
        );
    }

    /**
     * @notice Get all pending messages
     */
    function getPendingMessages() external view returns (bytes32[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < pendingMessages.length; i++) {
            if (messages[pendingMessages[i]].status == MessageStatus.PENDING) {
                count++;
            }
        }

        bytes32[] memory result = new bytes32[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < pendingMessages.length; i++) {
            if (messages[pendingMessages[i]].status == MessageStatus.PENDING) {
                result[index] = pendingMessages[i];
                index++;
            }
        }

        return result;
    }

    /**
     * @notice Get supported chains
     */
    function getSupportedChains() external view returns (uint256[] memory) {
        return supportedChains;
    }

    /**
     * @notice Update required verifications
     */
    function setRequiredVerifications(uint8 _required) external onlyOwner {
        require(_required >= 1, "Must require at least 1");
        requiredVerifications = _required;
    }

    /**
     * @notice Update relayer fee
     */
    function setRelayerFee(uint256 _newFee) external onlyOwner {
        relayerFee = _newFee;
    }

    /**
     * @notice Withdraw accumulated fees
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        payable(owner()).transfer(balance);
    }
}
