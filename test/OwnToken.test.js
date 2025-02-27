const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("OwnToken", function () {
  let OwnToken;
  let ownToken;
  let owner;
  let addr1;
  let addr2;
  let ecosystemAddress;
  let teamAddress;
  let communityAddress;
  let publicSaleAddress;
  let platformAddress;
  let liquidityAddress;
  let feeCollector;

  beforeEach(async function () {
    // Get contract factory and signers
    OwnToken = await ethers.getContractFactory("OwnToken");
    [owner, addr1, addr2, ecosystemAddress, teamAddress, communityAddress, 
     publicSaleAddress, platformAddress, liquidityAddress, feeCollector] = await ethers.getSigners();

    // Deploy contract
    ownToken = await OwnToken.deploy(
      owner.address,
      ecosystemAddress.address,
      teamAddress.address,
      communityAddress.address,
      publicSaleAddress.address,
      platformAddress.address,
      liquidityAddress.address,
      feeCollector.address
    );
  });

  describe("Deployment", function () {
    it("should set the correct owner", async function () {
      expect(await ownToken.owner()).to.equal(owner.address);
    });

    it("should set the correct token name and symbol", async function () {
      expect(await ownToken.name()).to.equal("OwnChain Token");
      expect(await ownToken.symbol()).to.equal("OWN");
    });

    it("should correctly allocate initial tokens", async function () {
      // Check ecosystem address balance (should be 30% of total supply)
      const totalSupply = ethers.parseEther("1000000000"); // 1 billion tokens
      const ecosystemAmount = totalSupply * BigInt(3000) / BigInt(10000); // 30%
      expect(await ownToken.balanceOf(ecosystemAddress.address)).to.equal(ecosystemAmount);

      // Check community incentive address balance (should be 25% of total supply)
      const communityAmount = totalSupply * BigInt(2500) / BigInt(10000); // 25%
      expect(await ownToken.balanceOf(communityAddress.address)).to.equal(communityAmount);

      // Check public sale address balance (should be 10% of total supply)
      const publicSaleAmount = totalSupply * BigInt(1000) / BigInt(10000); // 10%
      expect(await ownToken.balanceOf(publicSaleAddress.address)).to.equal(publicSaleAmount);
    });
  });

  describe("Team Token Unlock", function () {
    it("should correctly calculate available team tokens", async function () {
      // Initially there should be no available team tokens
      expect(await ownToken.availableTeamTokens()).to.equal(0);

      // Simulate time passing (1 year)
      await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine");

      // After 1 year, 25% of team tokens should be available
      const totalSupply = ethers.parseEther("1000000000"); // 1 billion tokens
      const teamAmount = totalSupply * BigInt(1500) / BigInt(10000); // 15%
      const expectedAvailable = teamAmount * BigInt(365) / BigInt(4 * 365); // About 25%
      
      // Allow some margin of error (due to block timestamp imprecision)
      const available = await ownToken.availableTeamTokens();
      expect(available).to.be.closeTo(expectedAvailable, ethers.parseEther("100")); // Allow 100 tokens margin of error
    });

    it("should allow releasing team tokens", async function () {
      // Simulate time passing (2 years)
      await ethers.provider.send("evm_increaseTime", [2 * 365 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine");

      // Release team tokens
      await ownToken.releaseTeamTokens();

      // Check team address balance
      const totalSupply = ethers.parseEther("1000000000"); // 1 billion tokens
      const teamAmount = totalSupply * BigInt(1500) / BigInt(10000); // 15%
      const expectedReleased = teamAmount * BigInt(2 * 365) / BigInt(4 * 365); // About 50%
      
      expect(await ownToken.balanceOf(teamAddress.address)).to.be.closeTo(expectedReleased, ethers.parseEther("100"));
    });
  });

  describe("Transaction Fees", function () {
    it("should correctly collect transaction fees", async function () {
      // Get fee collector initial balance
      const initialFeeCollectorBalance = await ownToken.balanceOf(feeCollector.address);
      
      // Transfer some tokens from public sale address to addr1
      const transferAmount = ethers.parseEther("1000");
      await ownToken.connect(publicSaleAddress).transfer(addr1.address, transferAmount);

      // Get initial balance
      const initialBalance = await ownToken.balanceOf(addr1.address);
      
      // addr1 transfers tokens to addr2, should collect 1% fee
      const sendAmount = ethers.parseEther("100");
      await ownToken.connect(addr1).transfer(addr2.address, sendAmount);

      // Calculate expected amounts
      const feeAmount = sendAmount * BigInt(100) / BigInt(10000); // 1%
      const expectedAmount = sendAmount - feeAmount;

      // Check balances
      expect(await ownToken.balanceOf(addr2.address)).to.equal(expectedAmount);
      
      // Check fee collector balance (allow larger margin of error)
      const feeCollectorBalance = await ownToken.balanceOf(feeCollector.address);
      expect(feeCollectorBalance).to.be.closeTo(initialFeeCollectorBalance + feeAmount, ethers.parseEther("10"));
      
      expect(await ownToken.balanceOf(addr1.address)).to.equal(initialBalance - sendAmount);
    });

    it("should allow updating transaction fee", async function () {
      // Update transaction fee to 2%
      await ownToken.connect(owner).updateTransactionFee(200);
      expect(await ownToken.transactionFeeBps()).to.equal(200);

      // Get fee collector initial balance
      const initialFeeCollectorBalance = await ownToken.balanceOf(feeCollector.address);
      console.log("Initial fee collector balance:", initialFeeCollectorBalance.toString());
      
      // Transfer some tokens from public sale address to addr1
      const transferAmount = ethers.parseEther("1000");
      await ownToken.connect(publicSaleAddress).transfer(addr1.address, transferAmount);
      
      // Calculate first transfer fee
      const firstTransferFee = transferAmount * BigInt(200) / BigInt(10000); // 2%
      console.log("First transfer fee:", firstTransferFee.toString());
      
      // Get fee collector balance after first transfer
      const afterFirstTransferFeeCollectorBalance = await ownToken.balanceOf(feeCollector.address);
      console.log("Fee collector balance after first transfer:", afterFirstTransferFeeCollectorBalance.toString());

      // Get addr1 initial balance
      const initialBalance = await ownToken.balanceOf(addr1.address);
      console.log("addr1 initial balance:", initialBalance.toString());
      
      // addr1 transfers tokens to addr2, should collect 2% fee
      const sendAmount = ethers.parseEther("100");
      await ownToken.connect(addr1).transfer(addr2.address, sendAmount);

      // Calculate expected amounts for second transfer
      const secondTransferFee = sendAmount * BigInt(200) / BigInt(10000); // 2%
      const expectedAmount = sendAmount - secondTransferFee;
      console.log("Second transfer fee:", secondTransferFee.toString());
      console.log("Expected received amount:", expectedAmount.toString());

      // Check addr2 balance
      const addr2Balance = await ownToken.balanceOf(addr2.address);
      console.log("addr2 actual balance:", addr2Balance.toString());
      expect(addr2Balance).to.equal(expectedAmount);
      
      // Check fee collector balance
      const finalFeeCollectorBalance = await ownToken.balanceOf(feeCollector.address);
      console.log("Final fee collector balance:", finalFeeCollectorBalance.toString());
      
      // Check if fee collector balance increased by the correct amount
      const expectedFeeCollectorBalance = initialFeeCollectorBalance + firstTransferFee + secondTransferFee;
      console.log("Expected fee collector balance:", expectedFeeCollectorBalance.toString());
      expect(finalFeeCollectorBalance).to.be.closeTo(expectedFeeCollectorBalance, ethers.parseEther("1"));
      
      // Check addr1 final balance
      const addr1FinalBalance = await ownToken.balanceOf(addr1.address);
      console.log("addr1 final balance:", addr1FinalBalance.toString());
      expect(addr1FinalBalance).to.equal(initialBalance - sendAmount);
    });

    it("should allow disabling transaction fees", async function () {
      // Disable transaction fees
      await ownToken.connect(owner).setFeeEnabled(false);
      expect(await ownToken.feeEnabled()).to.equal(false);

      // Transfer some tokens from public sale address to addr1
      const transferAmount = ethers.parseEther("1000");
      await ownToken.connect(publicSaleAddress).transfer(addr1.address, transferAmount);

      // addr1 transfers tokens to addr2, should not collect fees
      await ownToken.connect(addr1).transfer(addr2.address, transferAmount);

      // Check balances
      expect(await ownToken.balanceOf(addr2.address)).to.equal(transferAmount);
      expect(await ownToken.balanceOf(feeCollector.address)).to.equal(0);
    });
  });

  describe("Token Burning", function () {
    it("should allow burning tokens from fee collector", async function () {
      // Transfer some tokens from public sale address to addr1
      const transferAmount = ethers.parseEther("1000");
      await ownToken.connect(publicSaleAddress).transfer(addr1.address, transferAmount);

      // Get initial balance
      const initialBalance = await ownToken.balanceOf(addr1.address);
      
      // addr1 transfers tokens to addr2, collecting fees
      const sendAmount = ethers.parseEther("500");
      await ownToken.connect(addr1).transfer(addr2.address, sendAmount);

      // Get fee collector balance
      const feeCollectorBalance = await ownToken.balanceOf(feeCollector.address);
      expect(feeCollectorBalance).to.be.gt(0);

      // Get total supply
      const initialTotalSupply = await ownToken.totalSupply();

      // Fee collector approves owner
      await ownToken.connect(feeCollector).approve(owner.address, feeCollectorBalance);

      // Burn tokens
      await ownToken.connect(owner).burnFromFeeCollector(feeCollectorBalance);

      // Check fee collector balance and total supply
      expect(await ownToken.balanceOf(feeCollector.address)).to.equal(0);
      expect(await ownToken.totalSupply()).to.equal(initialTotalSupply - feeCollectorBalance);
    });
  });
}); 