// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    
    bytes32 public constant PERMIT_TYPEHASH =
        keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
    
    bytes32 public immutable DOMAIN_SEPARATOR;
    
    mapping(address => uint256) public nonces;
    
    constructor() ERC20("Mock USDC", "USDC") {
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("Mock USDC")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
        
        _mint(msg.sender, 1000000 * 10**decimals());
    }
    
    function decimals() public pure override returns (uint8) {
        return 6;
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
    
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(block.timestamp <= deadline, "Permit expired");
        
        bytes32 structHash = keccak256(
            abi.encode(PERMIT_TYPEHASH, owner, spender, value, nonces[owner]++, deadline)
        );
        
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
        );
        
        address signer = ecrecover(digest, v, r, s);
        require(signer == owner && signer != address(0), "Invalid signature");
        
        _approve(owner, spender, value);
    }
}
