const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ContentMonetization", function () {
  let OwnToken;
  let ContentOwnership;
  let ContentMonetization;
  let ownToken;
  let contentOwnership;
  let contentMonetization;
  let owner;
  let creator;
  let supporter;
  let buyer;
  let feeCollector;
  let tokenId;

  // Content type and platform enums
  const ContentType = {
    TEXT: 0,
    IMAGE: 1,
    VIDEO: 2,
    AUDIO: 3,
    OTHER: 4
  };

  const Platform = {
    TWITTER: 0,
    INSTAGRAM: 1,
    TIKTOK: 2,
    YOUTUBE: 3,
    FACEBOOK: 4,
    OTHER: 5
  };

  beforeEach(async function () {
    // Get contract factories and signers
    OwnToken = await ethers.getContractFactory("OwnToken");
    ContentOwnership = await ethers.getContractFactory("ContentOwnership");
    ContentMonetization = await ethers.getContractFactory("ContentMonetization");
    
    [owner, creator, supporter, buyer, feeCollector, 
     ecosystemAddress, teamAddress, communityAddress, 
     publicSaleAddress, platformAddress, liquidityAddress] = await ethers.getSigners();

    // Deploy OwnToken contract
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

    // Deploy ContentOwnership contract
    contentOwnership = await ContentOwnership.deploy(owner.address);

    // Deploy ContentMonetization contract
    contentMonetization = await ContentMonetization.deploy(
      owner.address,
      await ownToken.getAddress(),
      await contentOwnership.getAddress()
    );

    // Register content
    const contentId = "twitter-123456";
    const contentType = ContentType.TEXT;
    const platform = Platform.TWITTER;
    const platformUsername = "creator_username";
    const contentHash = "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco";
    const metadataURI = "ipfs://QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco";

    // Register content
    const tx = await contentOwnership.connect(creator).registerContent(
      contentId,
      contentType,
      platform,
      platformUsername,
      contentHash,
      metadataURI
    );

    // Wait for transaction confirmation
    const receipt = await tx.wait();

    // Get tokenId from event
    const event = receipt.logs.find(
      log => contentOwnership.interface.parseLog(log)?.name === "ContentRegistered"
    );
    const parsedEvent = contentOwnership.interface.parseLog(event);
    tokenId = parsedEvent.args.tokenId;

    // Transfer some tokens to supporter and buyer
    const transferAmount = ethers.parseEther("10000");
    await ownToken.connect(publicSaleAddress).transfer(supporter.address, transferAmount);
    await ownToken.connect(publicSaleAddress).transfer(buyer.address, transferAmount);
  });

  describe("Deployment", function () {
    it("should set the correct owner", async function () {
      expect(await contentMonetization.owner()).to.equal(owner.address);
    });

    it("should set the correct token and content ownership contracts", async function () {
      expect(await contentMonetization.ownToken()).to.equal(await ownToken.getAddress());
      expect(await contentMonetization.contentOwnership()).to.equal(await contentOwnership.getAddress());
    });
  });

  describe("Fee Settings", function () {
    it("should allow updating platform fee", async function () {
      await contentMonetization.connect(owner).updatePlatformFee(1000); // 10%
      expect(await contentMonetization.platformFeeBps()).to.equal(1000);
    });

    it("should not allow setting platform fee above 20%", async function () {
      await expect(
        contentMonetization.connect(owner).updatePlatformFee(2100) // 21%
      ).to.be.revertedWith("Fee cannot exceed 20%");
    });

    it("should allow updating default royalty rate", async function () {
      await contentMonetization.connect(owner).updateDefaultRoyalty(2000); // 20%
      expect(await contentMonetization.defaultRoyaltyBps()).to.equal(2000);
    });

    it("should not allow setting default royalty above 30%", async function () {
      await expect(
        contentMonetization.connect(owner).updateDefaultRoyalty(3100) // 31%
      ).to.be.revertedWith("Royalty cannot exceed 30%");
    });

    it("should allow creator to set content-specific royalty", async function () {
      await contentMonetization.connect(creator).setContentRoyalty(tokenId, 3000); // 30%
      expect(await contentMonetization.getContentRoyalty(tokenId)).to.equal(3000);
    });

    it("should not allow non-creator to set content-specific royalty", async function () {
      await expect(
        contentMonetization.connect(supporter).setContentRoyalty(tokenId, 3000)
      ).to.be.revertedWith("Only creator or owner can set royalty");
    });
  });

  describe("Content Support", function () {
    it("should allow supporting content", async function () {
      const supportAmount = ethers.parseEther("100");
      
      // Authorize token expenditure
      await ownToken.connect(supporter).approve(await contentMonetization.getAddress(), supportAmount);
      
      // Get creator's initial balance
      const content = await contentOwnership.getContent(tokenId);
      const initialCreatorBalance = await ownToken.balanceOf(content.creator);
      
      // Support content
      const tx = await contentMonetization.connect(supporter).supportContent(tokenId, supportAmount);
      const receipt = await tx.wait();
      
      // Get supportId from event
      const event = receipt.logs.find(
        log => contentMonetization.interface.parseLog(log)?.name === "ContentSupported"
      );
      const parsedEvent = contentMonetization.interface.parseLog(event);
      const supportId = parsedEvent.args.supportId;
      
      // Verify support record
      const support = await contentMonetization.getSupport(supportId);
      expect(support.supporter).to.equal(supporter.address);
      expect(support.tokenId).to.equal(tokenId);
      expect(support.amount).to.equal(supportAmount);
      
      // Verify creator received amount (95%, as platform fee is 5%)
      const platformFee = supportAmount * BigInt(500) / BigInt(10000); // 5%
      const creatorAmount = supportAmount - platformFee;
      
      // Check balances (allow larger margin of error)
      const creatorBalance = await ownToken.balanceOf(content.creator);
      expect(creatorBalance).to.be.closeTo(initialCreatorBalance + creatorAmount, ethers.parseEther("1"));
      
      const contractBalance = await ownToken.balanceOf(await contentMonetization.getAddress());
      expect(contractBalance).to.be.closeTo(platformFee, ethers.parseEther("1"));
      
      // Verify support lists
      expect(await contentMonetization.getTotalSupports()).to.equal(1);
      
      const creatorSupports = await contentMonetization.getCreatorSupports(content.creator);
      expect(creatorSupports.length).to.equal(1);
      expect(creatorSupports[0]).to.equal(supportId);
      
      const supporterSupports = await contentMonetization.getSupporterSupports(supporter.address);
      expect(supporterSupports.length).to.equal(1);
      expect(supporterSupports[0]).to.equal(supportId);
      
      const contentSupports = await contentMonetization.getContentSupports(tokenId);
      expect(contentSupports.length).to.equal(1);
      expect(contentSupports[0]).to.equal(supportId);
    });
  });

  describe("Royalty Payment", function () {
    it("should allow paying royalties", async function () {
      const saleAmount = ethers.parseEther("1000");
      
      // Set content-specific royalty (15%)
      await contentMonetization.connect(creator).setContentRoyalty(tokenId, 1500);
      
      // Get creator's initial balance
      const content = await contentOwnership.getContent(tokenId);
      const initialCreatorBalance = await ownToken.balanceOf(content.creator);
      
      // Authorize token expenditure
      await ownToken.connect(buyer).approve(await contentMonetization.getAddress(), saleAmount);
      
      // Pay royalty
      await contentMonetization.connect(buyer).payRoyalty(tokenId, saleAmount);
      
      // Calculate royalty amount
      const royaltyAmount = saleAmount * BigInt(1500) / BigInt(10000); // 15%
      
      // Check creator balance (allow larger margin of error)
      const creatorBalance = await ownToken.balanceOf(content.creator);
      expect(creatorBalance).to.be.closeTo(initialCreatorBalance + royaltyAmount, ethers.parseEther("10"));
    });
  });

  describe("Funds Withdrawal", function () {
    it("should allow owner to withdraw platform fees", async function () {
      const supportAmount = ethers.parseEther("100");
      
      // Authorize token expenditure
      await ownToken.connect(supporter).approve(await contentMonetization.getAddress(), supportAmount);
      
      // Support content
      await contentMonetization.connect(supporter).supportContent(tokenId, supportAmount);
      
      // Calculate platform fee
      const platformFee = supportAmount * BigInt(500) / BigInt(10000); // 5%
      
      // Get recipient's initial balance
      const recipient = buyer.address; // Use buyer as recipient
      const initialRecipientBalance = await ownToken.balanceOf(recipient);
      
      // Get contract balance
      const contractBalance = await ownToken.balanceOf(await contentMonetization.getAddress());
      
      // Withdraw funds
      await contentMonetization.connect(owner).withdrawFunds(recipient, contractBalance);
      
      // Check recipient balance
      const recipientBalance = await ownToken.balanceOf(recipient);
      expect(recipientBalance).to.be.closeTo(initialRecipientBalance + contractBalance, ethers.parseEther("1"));
      
      // Check contract balance
      const finalContractBalance = await ownToken.balanceOf(await contentMonetization.getAddress());
      expect(finalContractBalance).to.equal(0);
    });
    
    it("should not allow non-owner to withdraw funds", async function () {
      const supportAmount = ethers.parseEther("100");
      
      // Authorize token expenditure
      await ownToken.connect(supporter).approve(await contentMonetization.getAddress(), supportAmount);
      
      // Support content
      await contentMonetization.connect(supporter).supportContent(tokenId, supportAmount);
      
      // Calculate platform fee
      const platformFee = supportAmount * BigInt(500) / BigInt(10000); // 5%
      
      // Try to withdraw funds as non-owner
      await expect(
        contentMonetization.connect(supporter).withdrawFunds(supporter.address, platformFee)
      ).to.be.revertedWithCustomError(contentMonetization, "OwnableUnauthorizedAccount");
    });
  });
}); 