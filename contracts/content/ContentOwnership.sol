// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/**
 * @title ContentOwnership
 * @dev Contract for verifying and recording content ownership
 */
contract ContentOwnership is ERC721, Ownable {
    // Content types
    enum ContentType { TEXT, IMAGE, VIDEO, AUDIO, OTHER }

    // Content platforms
    enum Platform { TWITTER, INSTAGRAM, TIKTOK, YOUTUBE, FACEBOOK, OTHER }

    // Content structure
    struct Content {
        string contentId;          // Content ID on the platform
        address creator;           // Creator address
        uint256 timestamp;         // Creation timestamp
        ContentType contentType;   // Content type
        Platform platform;         // Content platform
        string platformUsername;   // Platform username
        string contentHash;        // Content hash (IPFS or other distributed storage hash)
        string metadataURI;        // Metadata URI
        bool verified;             // Whether verified
    }

    // Mapping from content ID to token ID
    mapping(string => uint256) private _contentIdToTokenId;
    
    // Mapping from token ID to content
    mapping(uint256 => Content) private _tokenContents;
    
    // Mapping from creator address to array of owned token IDs
    mapping(address => uint256[]) private _creatorTokens;
    
    // Platform verifier addresses
    mapping(Platform => address) private _platformVerifiers;
    
    // Token URI storage
    mapping(uint256 => string) private _tokenURIs;
    
    // Events
    event ContentRegistered(uint256 indexed tokenId, string contentId, address indexed creator, Platform platform);
    event ContentVerified(uint256 indexed tokenId, string contentId, address indexed verifier);
    event PlatformVerifierUpdated(Platform indexed platform, address indexed verifier);

    // Token ID counter
    uint256 private _tokenIdCounter;

    /**
     * @dev Constructor
     * @param _owner Contract owner
     */
    constructor(address _owner) ERC721("OwnChain Content", "OWNC") Ownable(_owner) {
        _tokenIdCounter = 1; // Start counting from 1
    }

    /**
     * @dev Set platform verifier address
     * @param platform Platform
     * @param verifier Verifier address
     */
    function setPlatformVerifier(Platform platform, address verifier) external onlyOwner {
        require(verifier != address(0), "Verifier cannot be zero address");
        _platformVerifiers[platform] = verifier;
        emit PlatformVerifierUpdated(platform, verifier);
    }

    /**
     * @dev Get platform verifier address
     * @param platform Platform
     * @return Verifier address
     */
    function getPlatformVerifier(Platform platform) external view returns (address) {
        return _platformVerifiers[platform];
    }

    /**
     * @dev Register content ownership
     * @param contentId Content ID on the platform
     * @param contentType Content type
     * @param platform Content platform
     * @param platformUsername Platform username
     * @param contentHash Content hash
     * @param metadataURI Metadata URI
     * @return Newly created token ID
     */
    function registerContent(
        string calldata contentId,
        ContentType contentType,
        Platform platform,
        string calldata platformUsername,
        string calldata contentHash,
        string calldata metadataURI
    ) external returns (uint256) {
        require(bytes(contentId).length > 0, "Content ID cannot be empty");
        require(bytes(platformUsername).length > 0, "Platform username cannot be empty");
        require(bytes(contentHash).length > 0, "Content hash cannot be empty");
        require(_contentIdToTokenId[contentId] == 0, "Content already registered");

        uint256 tokenId = _tokenIdCounter++;
        
        Content memory newContent = Content({
            contentId: contentId,
            creator: _msgSender(),
            timestamp: block.timestamp,
            contentType: contentType,
            platform: platform,
            platformUsername: platformUsername,
            contentHash: contentHash,
            metadataURI: metadataURI,
            verified: false
        });

        _tokenContents[tokenId] = newContent;
        _contentIdToTokenId[contentId] = tokenId;
        _creatorTokens[_msgSender()].push(tokenId);
        _tokenURIs[tokenId] = metadataURI;

        _safeMint(_msgSender(), tokenId);

        emit ContentRegistered(tokenId, contentId, _msgSender(), platform);
        
        return tokenId;
    }

    /**
     * @dev Verify content ownership
     * @param tokenId Token ID
     * @param signature Platform verifier's signature
     */
    function verifyContent(uint256 tokenId, bytes calldata signature) external {
        require(_exists(tokenId), "Token does not exist");
        Content storage content = _tokenContents[tokenId];
        require(!content.verified, "Content already verified");
        
        address verifier = _platformVerifiers[content.platform];
        require(verifier != address(0), "Platform verifier not set");
        
        // Create message hash
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                content.contentId,
                content.creator,
                uint8(content.platform),
                content.platformUsername,
                content.contentHash
            )
        );
        
        // Add Ethereum signature prefix
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        
        // Verify signature
        bool isValid = SignatureChecker.isValidSignatureNow(verifier, ethSignedMessageHash, signature);
        require(isValid, "Invalid signature");
        
        content.verified = true;
        
        emit ContentVerified(tokenId, content.contentId, verifier);
    }

    /**
     * @dev Get content information
     * @param tokenId Token ID
     * @return Content information
     */
    function getContent(uint256 tokenId) external view returns (Content memory) {
        require(_exists(tokenId), "Token does not exist");
        return _tokenContents[tokenId];
    }

    /**
     * @dev Get token ID by content ID
     * @param contentId Content ID
     * @return Token ID
     */
    function getTokenIdByContentId(string calldata contentId) external view returns (uint256) {
        uint256 tokenId = _contentIdToTokenId[contentId];
        require(tokenId != 0, "Content not registered");
        return tokenId;
    }

    /**
     * @dev Get all token IDs of a creator
     * @param creator Creator address
     * @return Array of token IDs
     */
    function getCreatorTokens(address creator) external view returns (uint256[] memory) {
        return _creatorTokens[creator];
    }

    /**
     * @dev Check if token exists
     * @param tokenId Token ID
     * @return Whether exists
     */
    function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    /**
     * @dev Return token URI
     * @param tokenId Token ID
     * @return URI string
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "URI query for nonexistent token");
        return _tokenURIs[tokenId];
    }

    /**
     * @dev Set token URI
     * @param tokenId Token ID
     * @param _tokenURI URI string
     */
    function _setTokenURI(uint256 tokenId, string memory _tokenURI) internal {
        require(_exists(tokenId), "URI set for nonexistent token");
        _tokenURIs[tokenId] = _tokenURI;
    }

    /**
     * @dev Clear URI when burning token
     * @param tokenId Token ID
     */
    function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address) {
        address from = super._update(to, tokenId, auth);
        
        // If burning operation
        if (to == address(0)) {
            if (bytes(_tokenURIs[tokenId]).length != 0) {
                delete _tokenURIs[tokenId];
            }
        }
        
        return from;
    }

    /**
     * @dev Override supportsInterface to support ERC721
     */
    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return super.supportsInterface(interfaceId);
    }
} 