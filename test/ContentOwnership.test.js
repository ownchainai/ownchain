const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ContentOwnership", function () {
  let ContentOwnership;
  let contentOwnership;
  let owner;
  let creator;
  let verifier;
  let user;

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
    // Get contract factory and signers
    ContentOwnership = await ethers.getContractFactory("ContentOwnership");
    [owner, creator, verifier, user] = await ethers.getSigners();

    // Deploy contract
    contentOwnership = await ContentOwnership.deploy(owner.address);
    
    // Set platform verifier
    await contentOwnership.connect(owner).setPlatformVerifier(Platform.TWITTER, verifier.address);
  });

  describe("Deployment", function () {
    it("should set the correct owner", async function () {
      expect(await contentOwnership.owner()).to.equal(owner.address);
    });

    it("should set the correct token name and symbol", async function () {
      expect(await contentOwnership.name()).to.equal("OwnChain Content");
      expect(await contentOwnership.symbol()).to.equal("OWNC");
    });
  });

  describe("Platform Verifiers", function () {
    it("should correctly set platform verifier", async function () {
      expect(await contentOwnership.getPlatformVerifier(Platform.TWITTER)).to.equal(verifier.address);
    });

    it("should allow updating platform verifier", async function () {
      await contentOwnership.connect(owner).setPlatformVerifier(Platform.INSTAGRAM, user.address);
      expect(await contentOwnership.getPlatformVerifier(Platform.INSTAGRAM)).to.equal(user.address);
    });

    it("should only allow owner to set platform verifier", async function () {
      await expect(
        contentOwnership.connect(creator).setPlatformVerifier(Platform.INSTAGRAM, user.address)
      ).to.be.revertedWithCustomError(contentOwnership, "OwnableUnauthorizedAccount");
    });
  });

  describe("Content Registration", function () {
    it("should allow registering content", async function () {
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
      const tokenId = parsedEvent.args.tokenId;

      // Verify content information
      const content = await contentOwnership.getContent(tokenId);
      expect(content.contentId).to.equal(contentId);
      expect(content.creator).to.equal(creator.address);
      expect(content.contentType).to.equal(contentType);
      expect(content.platform).to.equal(platform);
      expect(content.platformUsername).to.equal(platformUsername);
      expect(content.contentHash).to.equal(contentHash);
      expect(content.metadataURI).to.equal(metadataURI);
      expect(content.verified).to.equal(false);

      // Verify token ownership
      expect(await contentOwnership.ownerOf(tokenId)).to.equal(creator.address);
      
      // Verify getting tokenId by contentId
      expect(await contentOwnership.getTokenIdByContentId(contentId)).to.equal(tokenId);
      
      // Verify creator's token list
      const creatorTokens = await contentOwnership.getCreatorTokens(creator.address);
      expect(creatorTokens).to.include(tokenId);
    });

    it("should not allow registering existing contentId", async function () {
      const contentId = "twitter-123456";
      const contentType = ContentType.TEXT;
      const platform = Platform.TWITTER;
      const platformUsername = "creator_username";
      const contentHash = "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco";
      const metadataURI = "ipfs://QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco";

      // First content registration
      await contentOwnership.connect(creator).registerContent(
        contentId,
        contentType,
        platform,
        platformUsername,
        contentHash,
        metadataURI
      );

      // Try to register the same contentId again
      await expect(
        contentOwnership.connect(creator).registerContent(
          contentId,
          contentType,
          platform,
          platformUsername,
          contentHash,
          metadataURI
        )
      ).to.be.revertedWith("Content already registered");
    });
  });

  describe("Content Verification", function () {
    let tokenId;
    const contentId = "twitter-123456";
    const contentType = ContentType.TEXT;
    const platform = Platform.TWITTER;
    const platformUsername = "creator_username";
    const contentHash = "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco";
    const metadataURI = "ipfs://QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco";

    beforeEach(async function () {
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
    });

    it("should allow verifying content", async function () {
      // Create message hash
      const messageHash = ethers.solidityPackedKeccak256(
        ["string", "address", "uint8", "string", "string"],
        [contentId, creator.address, platform, platformUsername, contentHash]
      );

      // Verifier signs
      const signature = await verifier.signMessage(ethers.getBytes(messageHash));

      // Verify content
      await contentOwnership.connect(user).verifyContent(tokenId, signature);

      // Check if content is verified
      const content = await contentOwnership.getContent(tokenId);
      expect(content.verified).to.equal(true);
    });

    it("should not allow verifying with invalid signature", async function () {
      // Create message hash (with wrong contentId)
      const messageHash = ethers.solidityPackedKeccak256(
        ["string", "address", "uint8", "string", "string"],
        ["wrong-content-id", creator.address, platform, platformUsername, contentHash]
      );

      // Verifier signs
      const signature = await verifier.signMessage(ethers.getBytes(messageHash));

      // Try to verify content
      await expect(
        contentOwnership.connect(user).verifyContent(tokenId, signature)
      ).to.be.revertedWith("Invalid signature");
    });

    it("should not allow verifying content twice", async function () {
      // Create message hash
      const messageHash = ethers.solidityPackedKeccak256(
        ["string", "address", "uint8", "string", "string"],
        [contentId, creator.address, platform, platformUsername, contentHash]
      );

      // Verifier signs
      const signature = await verifier.signMessage(ethers.getBytes(messageHash));

      // First verification
      await contentOwnership.connect(user).verifyContent(tokenId, signature);

      // Try to verify again
      await expect(
        contentOwnership.connect(user).verifyContent(tokenId, signature)
      ).to.be.revertedWith("Content already verified");
    });
  });

  describe("Token Transfer", function () {
    let tokenId;

    beforeEach(async function () {
      // Register content
      const tx = await contentOwnership.connect(creator).registerContent(
        "twitter-123456",
        ContentType.TEXT,
        Platform.TWITTER,
        "creator_username",
        "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
        "ipfs://QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco"
      );

      // Wait for transaction confirmation
      const receipt = await tx.wait();

      // Get tokenId from event
      const event = receipt.logs.find(
        log => contentOwnership.interface.parseLog(log)?.name === "ContentRegistered"
      );
      const parsedEvent = contentOwnership.interface.parseLog(event);
      tokenId = parsedEvent.args.tokenId;
    });

    it("should allow transferring tokens", async function () {
      // Transfer token from creator to user
      await contentOwnership.connect(creator).transferFrom(creator.address, user.address, tokenId);
      
      // Check new owner
      expect(await contentOwnership.ownerOf(tokenId)).to.equal(user.address);
      
      // Creator should still be the creator
      const content = await contentOwnership.getContent(tokenId);
      expect(content.creator).to.equal(creator.address);
    });
  });
}); 