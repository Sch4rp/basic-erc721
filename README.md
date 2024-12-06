# Basic ERC721 Implementation

Minimalist implementation of ERC721 NFT standard focused on core ownership functionality.

## Features
- Minting & burning tokens
- Balance tracking
- Ownership verification
- Transfer mechanism
- ERC721 event emission

## Usage
```solidity
import "./NFT.sol";

// Deploy
NFT nft = new NFT();

// Mint token
nft.mint(address recipient, uint256 tokenId);

// Check ownership 
address owner = nft.ownerOf(tokenId);

// Check balance
uint256 balance = nft.balanceOf(address);

// Transfer token
nft.transferFrom(address from, address to, uint256 tokenId);

// Burn token
nft.burn(tokenId);
```

## Security
- Solidity 0.8.27
- OpenZeppelin IERC721 interface
- MIT License

## Testing
```
npm install
npx hardhat test
```

## License
MIT License
