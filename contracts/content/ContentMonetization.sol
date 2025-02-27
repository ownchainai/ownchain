// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "../token/OwnToken.sol";
import "./ContentOwnership.sol";

/**
 * @title ContentMonetization
 * @dev Contract that allows creators to earn revenue from their content
 */
contract ContentMonetization is Ownable {
    // State variables
    OwnToken public ownToken;
    ContentOwnership public contentOwnership;
    
    // Platform fee rate (in basis points, 1 basis point = 0.01%)
    uint16 public platformFeeBps = 500; // Default 5%
    
    // Royalty fee rate (in basis points)
    uint16 public defaultRoyaltyBps = 1000; // Default 10%
    
    // Content-specific royalties
    mapping(uint256 => uint16) private _contentRoyalties;
    
    // Content support record
    struct Support {
        address supporter;
        uint256 tokenId;
        uint256 amount;
        uint256 timestamp;
    }
    
    // All support records
    Support[] private _allSupports;
    
    // Supports received by creators
    mapping(address => uint256[]) private _creatorSupports;
    
    // Supports provided by supporters
    mapping(address => uint256[]) private _supporterSupports;
    
    // Supports received by content
    mapping(uint256 => uint256[]) private _contentSupports;
    
    // Reentrancy lock
    bool private _locked;
    
    // Events
    event ContentSupported(uint256 indexed supportId, address indexed supporter, uint256 indexed tokenId, uint256 amount);
    event RoyaltyPaid(uint256 indexed tokenId, address indexed creator, uint256 amount);
    event PlatformFeeUpdated(uint16 newFeeBps);
    event DefaultRoyaltyUpdated(uint16 newRoyaltyBps);
    event ContentRoyaltyUpdated(uint256 indexed tokenId, uint16 royaltyBps);
    event FundsWithdrawn(address indexed recipient, uint256 amount);

    // Modifier to prevent reentrancy attacks
    modifier nonReentrant() {
        require(!_locked, "ReentrancyGuard: reentrant call");
        _locked = true;
        _;
        _locked = false;
    }

    /**
     * @dev Constructor
     * @param _owner Contract owner
     * @param _ownToken OwnToken contract address
     * @param _contentOwnership ContentOwnership contract address
     */
    constructor(
        address _owner,
        address _ownToken,
        address _contentOwnership
    ) Ownable(_owner) {
        require(_ownToken != address(0), "OwnToken address cannot be zero");
        require(_contentOwnership != address(0), "ContentOwnership address cannot be zero");
        
        ownToken = OwnToken(_ownToken);
        contentOwnership = ContentOwnership(_contentOwnership);
        _locked = false;
    }

    /**
     * @dev Update platform fee rate
     * @param _newFeeBps New fee rate (in basis points)
     */
    function updatePlatformFee(uint16 _newFeeBps) external onlyOwner {
        require(_newFeeBps <= 2000, "Fee cannot exceed 20%");
        platformFeeBps = _newFeeBps;
        emit PlatformFeeUpdated(_newFeeBps);
    }

    /**
     * @dev Update default royalty rate
     * @param _newRoyaltyBps New royalty rate (in basis points)
     */
    function updateDefaultRoyalty(uint16 _newRoyaltyBps) external onlyOwner {
        require(_newRoyaltyBps <= 3000, "Royalty cannot exceed 30%");
        defaultRoyaltyBps = _newRoyaltyBps;
        emit DefaultRoyaltyUpdated(_newRoyaltyBps);
    }

    /**
     * @dev Set royalty rate for specific content
     * @param _tokenId Content token ID
     * @param _royaltyBps Royalty rate (in basis points)
     */
    function setContentRoyalty(uint256 _tokenId, uint16 _royaltyBps) external {
        require(_royaltyBps <= 5000, "Royalty cannot exceed 50%");
        
        // Get content information
        ContentOwnership.Content memory content = contentOwnership.getContent(_tokenId);
        
        // Ensure only creator or contract owner can set royalty
        require(
            content.creator == _msgSender() || owner() == _msgSender(),
            "Only creator or owner can set royalty"
        );
        
        _contentRoyalties[_tokenId] = _royaltyBps;
        emit ContentRoyaltyUpdated(_tokenId, _royaltyBps);
    }

    /**
     * @dev Get royalty rate for content
     * @param _tokenId Content token ID
     * @return Royalty rate (in basis points)
     */
    function getContentRoyalty(uint256 _tokenId) public view returns (uint16) {
        uint16 royalty = _contentRoyalties[_tokenId];
        return royalty > 0 ? royalty : defaultRoyaltyBps;
    }

    /**
     * @dev Support content (tip)
     * @param _tokenId Content token ID
     * @param _amount Support amount
     * @return Support ID
     */
    function supportContent(uint256 _tokenId, uint256 _amount) external nonReentrant returns (uint256) {
        require(_amount > 0, "Amount must be greater than zero");
        
        // Get content information
        ContentOwnership.Content memory content = contentOwnership.getContent(_tokenId);
        
        // Calculate fees
        uint256 platformFee = (_amount * platformFeeBps) / 10000;
        uint256 creatorAmount = _amount - platformFee;
        
        // Transfer tokens
        require(
            ownToken.transferFrom(_msgSender(), address(this), _amount),
            "Token transfer failed"
        );
        
        // Transfer creator's share to creator
        require(
            ownToken.transfer(content.creator, creatorAmount),
            "Creator payment failed"
        );
        
        // Record support
        uint256 supportId = _allSupports.length;
        Support memory newSupport = Support({
            supporter: _msgSender(),
            tokenId: _tokenId,
            amount: _amount,
            timestamp: block.timestamp
        });
        
        _allSupports.push(newSupport);
        _creatorSupports[content.creator].push(supportId);
        _supporterSupports[_msgSender()].push(supportId);
        _contentSupports[_tokenId].push(supportId);
        
        emit ContentSupported(supportId, _msgSender(), _tokenId, _amount);
        
        return supportId;
    }

    /**
     * @dev Pay royalty for secondary sales
     * @param _tokenId Content token ID
     * @param _saleAmount Sale amount
     */
    function payRoyalty(uint256 _tokenId, uint256 _saleAmount) external nonReentrant {
        require(_saleAmount > 0, "Sale amount must be greater than zero");
        
        // Get content information
        ContentOwnership.Content memory content = contentOwnership.getContent(_tokenId);
        
        // Calculate royalty
        uint16 royaltyBps = getContentRoyalty(_tokenId);
        uint256 royaltyAmount = (_saleAmount * royaltyBps) / 10000;
        
        // Transfer royalty
        require(
            ownToken.transferFrom(_msgSender(), content.creator, royaltyAmount),
            "Royalty payment failed"
        );
        
        emit RoyaltyPaid(_tokenId, content.creator, royaltyAmount);
    }

    /**
     * @dev Withdraw platform fees
     * @param _recipient Recipient address
     * @param _amount Withdrawal amount
     */
    function withdrawFunds(address _recipient, uint256 _amount) external onlyOwner nonReentrant {
        require(_recipient != address(0), "Recipient cannot be zero address");
        require(_amount > 0, "Amount must be greater than zero");
        
        uint256 balance = ownToken.balanceOf(address(this));
        require(_amount <= balance, "Insufficient balance");
        
        require(
            ownToken.transfer(_recipient, _amount),
            "Transfer failed"
        );
        
        emit FundsWithdrawn(_recipient, _amount);
    }

    /**
     * @dev Get all supports received by a creator
     * @param _creator Creator address
     * @return Array of support IDs
     */
    function getCreatorSupports(address _creator) external view returns (uint256[] memory) {
        return _creatorSupports[_creator];
    }

    /**
     * @dev Get all supports provided by a supporter
     * @param _supporter Supporter address
     * @return Array of support IDs
     */
    function getSupporterSupports(address _supporter) external view returns (uint256[] memory) {
        return _supporterSupports[_supporter];
    }

    /**
     * @dev Get all supports received by content
     * @param _tokenId Content token ID
     * @return Array of support IDs
     */
    function getContentSupports(uint256 _tokenId) external view returns (uint256[] memory) {
        return _contentSupports[_tokenId];
    }

    /**
     * @dev Get support details by ID
     * @param _supportId Support ID
     * @return Support details
     */
    function getSupport(uint256 _supportId) external view returns (Support memory) {
        require(_supportId < _allSupports.length, "Invalid support ID");
        return _allSupports[_supportId];
    }

    /**
     * @dev Get total number of supports
     * @return Total number of supports
     */
    function getTotalSupports() external view returns (uint256) {
        return _allSupports.length;
    }
} 