import hre from "hardhat"
import {expect} from "chai"
import {HardhatEthersSigner} from "@nomicfoundation/hardhat-ethers/signers";
import {ethers} from "ethers";
import {NFT} from "../typechain-types";

describe("NFT.sol", () => {
    let contract: NFT
    let owner: HardhatEthersSigner
    let recipient: HardhatEthersSigner
    let operator: HardhatEthersSigner
    let unauthorized: HardhatEthersSigner

    before(async () => {
        [owner, recipient, operator, unauthorized] = await hre.ethers.getSigners()
    })

    beforeEach(async () => {
        const factory = await hre.ethers.getContractFactory('NFT')
        contract = await factory.deploy()
    })

    it("should prevent giving balance of zero address", async () => {
        await expect(contract.balanceOf(ethers.ZeroAddress))
            .to.be.revertedWithCustomError(contract, "ZeroAddress")
    })

    it("should prevent calling owner of zero address", async () => {
        await expect(contract.ownerOf(ethers.ZeroAddress))
            .to.be.revertedWithCustomError(contract, "ZeroAddress")
    })

    describe("when minting", () => {
        it("should start with zero balance", async () => {
            expect(await contract.balanceOf(owner.address)).to.equal(0)
        })

        it("should increase balance after minting", async () => {
            await contract.mint(owner.address, 1)
            expect(await contract.balanceOf(owner.address)).to.equal(1)
        })

        it("should assign token to owner", async () => {
            await contract.mint(owner.address, 1)
            expect(await contract.ownerOf(1)).to.equal(owner.address)
        })

        it("should revert when minting to zero address", async () => {
            await expect(contract.mint(ethers.ZeroAddress, 1))
                .to.be.revertedWithCustomError(contract, "ZeroAddress")
        })

        it("should revert when minting same token twice", async () => {
            await contract.mint(owner.address, 1)
            await expect(contract.mint(owner.address, 1))
                .to.be.revertedWithCustomError(contract, "Exists")
        })

        it("should emit Transfer event on mint", async () => {
            await expect(contract.mint(owner.address, 1))
                .to.emit(contract, "Transfer")
                .withArgs(ethers.ZeroAddress, owner.address, 1)
        })
    })

    describe("when burning", () => {
        beforeEach(async () => {
            await contract.mint(owner.address, 1)
        })

        it("should decrease balance after burning", async () => {
            await contract.burn(owner.address, 1)
            expect(await contract.balanceOf(owner.address)).to.equal(0)
        })

        it("should remove token from owner", async () => {
            await contract.burn(owner.address, 1)
            expect(await contract.balanceOf(owner.address)).to.equal(0)
        })

        it("should emit Transfer event on burn", async () => {
            await expect(contract.burn(owner.address, 1))
                .to.emit(contract, "Transfer")
                .withArgs(owner.address, ethers.ZeroAddress, 1)
        })

        it("should revert when burning non-owned token", async () => {
            await expect(contract.connect(unauthorized).burn(owner.address, 1))
                .to.be.revertedWithCustomError(contract, "NotOwnerApproved")
        })
    })

    describe("when transferring", () => {
        beforeEach(async () => {
            await contract.mint(owner.address, 1)
        })

        it("should decrease sender balance", async () => {
            await contract.transferFrom(owner.address, recipient.address, 1)
            expect(await contract.balanceOf(owner.address)).to.equal(0)
        })

        it("should increase receiver balance", async () => {
            await contract.transferFrom(owner.address, recipient.address, 1)
            expect(await contract.balanceOf(recipient.address)).to.equal(1)
        })

        it("should update token ownership", async () => {
            await contract.transferFrom(owner.address, recipient.address, 1)
            expect(await contract.ownerOf(1)).to.equal(recipient.address)
        })

        it("should emit Transfer event", async () => {
            await expect(contract.transferFrom(owner.address, recipient.address, 1))
                .to.emit(contract, "Transfer")
                .withArgs(owner.address, recipient.address, 1)
        })

        it("should revert on unauthorized transfer", async () => {
            await expect(contract.connect(unauthorized).transferFrom(owner.address, recipient.address, 1))
                .to.be.revertedWithCustomError(contract, "NotOwnerApproved")
        })

        it("should revert on transfer to zero address", async () => {
            await expect(contract.transferFrom(owner.address, ethers.ZeroAddress, 1))
                .to.be.revertedWithCustomError(contract, "ZeroAddress")
        })

        it('should revert on transfer if from address is not owner', async () => {
            await contract.connect(owner).mint(recipient.address, 2);
            await expect(contract
                .connect(recipient)
                .transferFrom(unauthorized.address, owner.address, 2))
                .to.be.revertedWithCustomError(contract, "NotOwnerApproved");
        });
    })

    describe("when managing approvals", () => {
        beforeEach(async () => {
            await contract.mint(owner.address, 1)
            await contract.mint(owner.address, 2)
        })

        it("should return zero address when no approval", async () => {
            expect(await contract.getApproved(1)).to.equal(ethers.ZeroAddress)
        })

        it("should prevent accessing non-existing token", async () => {
            await expect(contract.getApproved(3)).to.be.revertedWithCustomError(contract, "UnknownToken")
        })

        it("should approve address for token", async () => {
            await contract.approve(recipient.address, 1)
            expect(await contract.getApproved(1)).to.equal(recipient.address)
        })

        it("should allow operator to approve address for token", async () => {
            await contract.setApprovalForAll(operator.address, true)
            await contract.connect(operator).approve(recipient.address, 1)
            expect(await contract.getApproved(1)).to.equal(recipient.address)
        })

        it("should allow approved address to transfer", async () => {
            await contract.approve(recipient.address, 1)
            await contract.connect(recipient).transferFrom(owner.address, operator.address, 1)
            expect(await contract.ownerOf(1)).to.equal(operator.address)
        })

        it("should clear approval after transfer", async () => {
            await contract.approve(recipient.address, 1)
            await contract.connect(recipient).transferFrom(owner.address, operator.address, 1)
            expect(await contract.getApproved(1)).to.equal(ethers.ZeroAddress)
        })

        it("should revert on approval from non-owner", async () => {
            await expect(contract.connect(unauthorized).approve(recipient.address, 1))
                .to.be.revertedWithCustomError(contract, "NotOwnerApproved")
        })

        it("should emit Approval event", async () => {
            await expect(contract.approve(recipient.address, 1))
                .to.emit(contract, "Approval")
                .withArgs(owner.address, recipient.address, 1)
        })

        it("should approve operator for all tokens", async () => {
            await contract.setApprovalForAll(operator.address, true)
            expect(await contract.isApprovedForAll(owner.address, operator.address)).to.equal(true)
        })

        it("should allow operator to transfer any token", async () => {
            await contract.setApprovalForAll(operator.address, true)
            await contract.connect(operator).transferFrom(owner.address, recipient.address, 1)
            await contract.connect(operator).transferFrom(owner.address, recipient.address, 2)
            expect(await contract.ownerOf(1)).to.equal(recipient.address)
            expect(await contract.ownerOf(2)).to.equal(recipient.address)
        })

        it("should revoke operator approval", async () => {
            await contract.setApprovalForAll(operator.address, true)
            await contract.setApprovalForAll(operator.address, false)
            expect(await contract.isApprovedForAll(owner.address, operator.address)).to.equal(false)
        })

        it("should emit ApprovalForAll event", async () => {
            await expect(contract.setApprovalForAll(operator.address, true))
                .to.emit(contract, "ApprovalForAll")
                .withArgs(owner.address, operator.address, true)
        })

        it("should block revoked operator from transferring", async () => {
            await contract.setApprovalForAll(operator.address, true)
            await contract.setApprovalForAll(operator.address, false)
            await expect(contract.connect(operator).transferFrom(owner.address, recipient.address, 1))
                .to.be.revertedWithCustomError(contract, "NotOwnerApproved")
        })
    })
})
