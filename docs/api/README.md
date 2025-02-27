# OwnChain API Documentation

This document provides API instructions for interacting with OwnChain smart contracts.

## Table of Contents

1. [OwnToken Contract](#owntoken-contract)
2. [ContentOwnership Contract](#contentownership-contract)
3. [ContentMonetization Contract](#contentmonetization-contract)

## OwnToken Contract

OwnToken is the main token of OwnChain, used for platform service access, governance voting, content creator payments, and data access authorization.

### Basic Information

- Name: OwnChain Token
- Symbol: OWN
- Decimals: 18
- Total Supply: 1,000,000,000 OWN

### Main Functions

#### Token Transfer

```javascript
// Transfer tokens
await ownToken.transfer(recipientAddress, amount);

// Transfer tokens from another address (requires prior approval)
await ownToken.transferFrom(fromAddress, toAddress, amount);

// Approve token spending
await ownToken.approve(spenderAddress, amount);
```

#### Team Token Unlock

```javascript
// Query available team tokens
const availableTokens = await ownToken.availableTeamTokens();

// Release team tokens
await ownToken.releaseTeamTokens();
```

#### Transaction Fee Management

```javascript
// Update transaction fee (owner only)
await ownToken.updateTransactionFee(newFeeBps);

// Update fee collector address (owner only)
await ownToken.updateFeeCollector(newFeeCollectorAddress);

// Enable or disable transaction fees (owner only)
await ownToken.setFeeEnabled(true/false);

// Buyback and burn tokens from fee collector (owner only)
await ownToken.burnFromFeeCollector(amount);
```

## ContentOwnership Contract

ContentOwnership contract is used to verify and record content ownership, based on the ERC721 standard.

### Content Types and Platform Enums

```javascript
// Content types
const ContentType = {
  TEXT: 0,
  IMAGE: 1,
  VIDEO: 2,
  AUDIO: 3,
  OTHER: 4
};

// Content platforms
const Platform = {
  TWITTER: 0,
  INSTAGRAM: 1,
  TIKTOK: 2,
  YOUTUBE: 3,
  FACEBOOK: 4,
  OTHER: 5
};
```

### Main Functions

#### Platform Verifier Management

```javascript
// Set platform verifier (owner only)
await contentOwnership.setPlatformVerifier(platform, verifierAddress);

// Get platform verifier
const verifier = await contentOwnership.getPlatformVerifier(platform);
```

#### Content Registration and Verification

```javascript
// Register content
const tokenId = await contentOwnership.registerContent(
  contentId,
  contentType,
  platform,
  platformUsername,
  contentHash,
  metadataURI
);

// Verify content
await contentOwnership.verifyContent(tokenId, signature);
```

#### Content Queries

```javascript
// Get content information
const content = await contentOwnership.getContent(tokenId);

// Get token ID by content ID
const tokenId = await contentOwnership.getTokenIdByContentId(contentId);

// Get all token IDs of a creator
const creatorTokens = await contentOwnership.getCreatorTokens(creatorAddress);
```

#### Token Transfer (ERC721 Standard)

```javascript
// Transfer token
await contentOwnership.transferFrom(fromAddress, toAddress, tokenId);

// Safe transfer token
await contentOwnership.safeTransferFrom(fromAddress, toAddress, tokenId);

// Approve token operation
await contentOwnership.approve(operatorAddress, tokenId);

// Set or revoke batch authorization for operator
await contentOwnership.setApprovalForAll(operatorAddress, approved);
```

## ContentMonetization Contract

ContentMonetization contract allows creators to earn revenue from their content.

### Main Functions

#### Fee Settings

```javascript
// Update platform fee rate (owner only)
await contentMonetization.updatePlatformFee(newFeeBps);

// Update default royalty rate (owner only)
await contentMonetization.updateDefaultRoyalty(newRoyaltyBps);

// Set royalty rate for specific content (creator or owner)
await contentMonetization.setContentRoyalty(tokenId, royaltyBps);

// Get royalty rate for content
const royalty = await contentMonetization.getContentRoyalty(tokenId);
```

#### Content Support and Royalties

```javascript
// Support content (tip)
// Note: OwnToken approval required first
await ownToken.approve(contentMonetizationAddress, amount);
const supportId = await contentMonetization.supportContent(tokenId, amount);

// Pay royalty for secondary sales
// Note: OwnToken approval required first
await ownToken.approve(contentMonetizationAddress, saleAmount);
await contentMonetization.payRoyalty(tokenId, saleAmount);
```

#### Fund Management

```javascript
// Withdraw platform fees (owner only)
await contentMonetization.withdrawFunds(recipientAddress, amount);
```

#### Support Queries

```javascript
// Get all supports received by a creator
const creatorSupports = await contentMonetization.getCreatorSupports(creatorAddress);

// Get all supports provided by a supporter
const supporterSupports = await contentMonetization.getSupporterSupports(supporterAddress);

// Get all supports received by content
const contentSupports = await contentMonetization.getContentSupports(tokenId);

// Get support details
const support = await contentMonetization.getSupport(supportId);

// Get total number of supports
const totalSupports = await contentMonetization.getTotalSupports();
```

## Example Workflows

### Content Creator Workflow

1. Creator publishes content on social media platform
2. Creator calls `contentOwnership.registerContent` to register content ownership
3. Platform verifier verifies content and calls `contentOwnership.verifyContent`
4. Creator can set royalty rate for content with `contentMonetization.setContentRoyalty`
5. Creator can receive token support from supporters
6. Creator can earn royalties from secondary sales of content

### Supporter Workflow

1. Supporter acquires OWN tokens
2. Supporter authorizes ContentMonetization contract to use their tokens
3. Supporter calls `contentMonetization.supportContent` to support content
4. Supporter can view their support history with `contentMonetization.getSupporterSupports`

### Platform Integration Workflow

1. Platform registers as a verifier with `contentOwnership.setPlatformVerifier`
2. Platform helps creators verify content with `contentOwnership.verifyContent`
3. Platform can earn revenue from transaction fees
4. Platform can provide UI interface to simplify user interaction with contracts 