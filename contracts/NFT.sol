// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {IERC721} from "./IERC721.sol";

contract NFT is IERC721 {
    mapping(address owner => uint256 count) private balances;
    mapping(uint256 id => address owner) private owners;
    mapping(uint256 id => address approved) private approvals;
    mapping(address owner => mapping(address operator => bool approved)) private operators;

    error ZeroAddress();
    error UnknownToken();
    error NotOwnerApproved();
    error Exists();

    function _exists(uint256 tokenId) internal view returns (bool) {
        return owners[tokenId] != address(0);
    }

    modifier approvedOrOwner(uint256 tokenId) {
        address owner = owners[tokenId];
        if (msg.sender != owner && approvals[tokenId] != msg.sender && !operators[owner][msg.sender])
            revert NotOwnerApproved();
        _;
    }

    function mint(address to, uint256 tokenId) public {
        if (to == address(0)) revert ZeroAddress();
        if (_exists(tokenId)) revert Exists();

        balances[to] += 1;
        owners[tokenId] = to;

        emit Transfer(address(0), to, tokenId);
    }

    function burn(address from, uint256 tokenId) public approvedOrOwner(tokenId) {
        balances[from] -= 1;
        delete owners[tokenId];
        delete approvals[tokenId];

        emit Transfer(from, address(0), tokenId);
    }

    function transferFrom(address from, address to, uint256 tokenId) external payable override approvedOrOwner(tokenId) {
        if (to == address(0)) revert ZeroAddress();
        if (from != owners[tokenId]) revert NotOwnerApproved();

        balances[from] -= 1;
        balances[to] += 1;
        owners[tokenId] = to;
        delete approvals[tokenId];

        emit Transfer(from, to, tokenId);
    }

    function balanceOf(address owner) public view override returns (uint256) {
        if (owner == address(0)) revert ZeroAddress();
        return balances[owner];
    }

    function ownerOf(uint256 tokenId) public view override returns (address) {
        address owner = owners[tokenId];
        if (owner == address(0)) revert ZeroAddress();
        return owner;
    }

    function approve(address approved, uint256 tokenId) external payable override {
        if (owners[tokenId] != msg.sender && operators[ownerOf(tokenId)][msg.sender] != true) revert NotOwnerApproved();

        approvals[tokenId] = approved;

        emit Approval(msg.sender, approved, tokenId);
    }

    function setApprovalForAll(address operator, bool approved) external {
        operators[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function getApproved(uint256 tokenId) external view override returns (address) {
        if (!_exists(tokenId)) revert UnknownToken();
        return approvals[tokenId];
    }

    function isApprovedForAll(address owner, address operator) external view returns (bool) {
        return operators[owner][operator];
    }
}
