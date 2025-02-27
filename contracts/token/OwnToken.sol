// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title OwnToken
 * @dev Main token of OwnChain, used for platform service access, governance voting, content creator payments, and data access authorization
 */
contract OwnToken is ERC20, ERC20Burnable, Ownable {
    // Token allocation addresses
    address public ecosystemDevelopmentAddress;
    address public teamAndAdvisorsAddress;
    address public communityIncentivesAddress;
    address public publicSaleAddress;
    address public platformIntegrationRewardsAddress;
    address public liquidityAndReservesAddress;

    // Token allocation percentages (in basis points, 1 basis point = 0.01%)
    uint16 private constant ECOSYSTEM_DEVELOPMENT_BPS = 3000; // 30%
    uint16 private constant TEAM_AND_ADVISORS_BPS = 1500;     // 15%
    uint16 private constant COMMUNITY_INCENTIVES_BPS = 2500;  // 25%
    uint16 private constant PUBLIC_SALE_BPS = 1000;           // 10%
    uint16 private constant PLATFORM_INTEGRATION_BPS = 1000;  // 10%
    uint16 private constant LIQUIDITY_AND_RESERVES_BPS = 1000;// 10%

    // Total supply
    uint256 private constant TOTAL_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens, 18 decimals

    // Team and advisors unlock schedule
    uint256 public teamAndAdvisorsUnlockStart;
    uint256 public constant TEAM_UNLOCK_DURATION = 4 * 365 days; // 4 years linear unlock
    uint256 public teamAndAdvisorsInitialLocked;
    uint256 public teamAndAdvisorsReleased;

    // Transaction fee settings
    uint16 public transactionFeeBps = 100; // Default 1% transaction fee
    uint16 public constant MAX_FEE_BPS = 500; // Maximum fee 5%
    address public feeCollector;
    bool public feeEnabled = true;

    // Events
    event FeeUpdated(uint16 newFeeBps);
    event FeeCollectorUpdated(address indexed newFeeCollector);
    event FeeEnabledUpdated(bool enabled);
    event TokensBurned(uint256 amount);
    event TeamTokensReleased(uint256 amount);

    /**
     * @dev Constructor, initializes the token and allocates initial supply
     * @param _owner Contract owner
     * @param _ecosystemDevelopmentAddress Ecosystem development address
     * @param _teamAndAdvisorsAddress Team and advisors address
     * @param _communityIncentivesAddress Community incentives address
     * @param _publicSaleAddress Public sale address
     * @param _platformIntegrationRewardsAddress Platform integration rewards address
     * @param _liquidityAndReservesAddress Liquidity and reserves address
     * @param _feeCollector Fee collector address
     */
    constructor(
        address _owner,
        address _ecosystemDevelopmentAddress,
        address _teamAndAdvisorsAddress,
        address _communityIncentivesAddress,
        address _publicSaleAddress,
        address _platformIntegrationRewardsAddress,
        address _liquidityAndReservesAddress,
        address _feeCollector
    ) ERC20("OwnChain Token", "OWN") Ownable(_owner) {
        require(_ecosystemDevelopmentAddress != address(0), "Ecosystem address cannot be zero");
        require(_teamAndAdvisorsAddress != address(0), "Team address cannot be zero");
        require(_communityIncentivesAddress != address(0), "Community address cannot be zero");
        require(_publicSaleAddress != address(0), "Public sale address cannot be zero");
        require(_platformIntegrationRewardsAddress != address(0), "Platform rewards address cannot be zero");
        require(_liquidityAndReservesAddress != address(0), "Liquidity address cannot be zero");
        require(_feeCollector != address(0), "Fee collector cannot be zero");

        ecosystemDevelopmentAddress = _ecosystemDevelopmentAddress;
        teamAndAdvisorsAddress = _teamAndAdvisorsAddress;
        communityIncentivesAddress = _communityIncentivesAddress;
        publicSaleAddress = _publicSaleAddress;
        platformIntegrationRewardsAddress = _platformIntegrationRewardsAddress;
        liquidityAndReservesAddress = _liquidityAndReservesAddress;
        feeCollector = _feeCollector;

        // Allocate tokens
        uint256 ecosystemAmount = (TOTAL_SUPPLY * ECOSYSTEM_DEVELOPMENT_BPS) / 10000;
        uint256 teamAmount = (TOTAL_SUPPLY * TEAM_AND_ADVISORS_BPS) / 10000;
        uint256 communityAmount = (TOTAL_SUPPLY * COMMUNITY_INCENTIVES_BPS) / 10000;
        uint256 publicSaleAmount = (TOTAL_SUPPLY * PUBLIC_SALE_BPS) / 10000;
        uint256 platformAmount = (TOTAL_SUPPLY * PLATFORM_INTEGRATION_BPS) / 10000;
        uint256 liquidityAmount = (TOTAL_SUPPLY * LIQUIDITY_AND_RESERVES_BPS) / 10000;

        // Mint tokens to addresses
        _mint(ecosystemDevelopmentAddress, ecosystemAmount);
        _mint(communityIncentivesAddress, communityAmount);
        _mint(publicSaleAddress, publicSaleAmount);
        _mint(platformIntegrationRewardsAddress, platformAmount);
        _mint(liquidityAndReservesAddress, liquidityAmount);

        // Team token locking
        teamAndAdvisorsInitialLocked = teamAmount;
        teamAndAdvisorsReleased = 0;
        teamAndAdvisorsUnlockStart = block.timestamp;
    }

    /**
     * @dev Calculate the current amount of team tokens that can be released
     * @return Amount of releasable tokens
     */
    function availableTeamTokens() public view returns (uint256) {
        if (block.timestamp < teamAndAdvisorsUnlockStart) {
            return 0;
        }

        uint256 elapsedTime = block.timestamp - teamAndAdvisorsUnlockStart;
        if (elapsedTime >= TEAM_UNLOCK_DURATION) {
            return teamAndAdvisorsInitialLocked - teamAndAdvisorsReleased;
        }

        uint256 unlockable = (teamAndAdvisorsInitialLocked * elapsedTime) / TEAM_UNLOCK_DURATION;
        return unlockable - teamAndAdvisorsReleased;
    }

    /**
     * @dev Release team tokens
     */
    function releaseTeamTokens() external {
        uint256 amount = availableTeamTokens();
        require(amount > 0, "No tokens available for release");

        teamAndAdvisorsReleased += amount;
        _mint(teamAndAdvisorsAddress, amount);

        emit TeamTokensReleased(amount);
    }

    /**
     * @dev Update transaction fee
     * @param _newFeeBps New fee (in basis points)
     */
    function updateTransactionFee(uint16 _newFeeBps) external onlyOwner {
        require(_newFeeBps <= MAX_FEE_BPS, "Fee exceeds maximum");
        transactionFeeBps = _newFeeBps;
        emit FeeUpdated(_newFeeBps);
    }

    /**
     * @dev Update fee collector address
     * @param _newFeeCollector New fee collector address
     */
    function updateFeeCollector(address _newFeeCollector) external onlyOwner {
        require(_newFeeCollector != address(0), "Fee collector cannot be zero");
        feeCollector = _newFeeCollector;
        emit FeeCollectorUpdated(_newFeeCollector);
    }

    /**
     * @dev Enable or disable transaction fees
     * @param _enabled Whether enabled
     */
    function setFeeEnabled(bool _enabled) external onlyOwner {
        feeEnabled = _enabled;
        emit FeeEnabledUpdated(_enabled);
    }

    /**
     * @dev Buyback and burn tokens from fee collector
     * @param _amount Amount of tokens to burn
     */
    function burnFromFeeCollector(uint256 _amount) external onlyOwner {
        require(_amount > 0, "Amount must be greater than zero");
        require(_amount <= balanceOf(feeCollector), "Insufficient balance");

        _spendAllowance(feeCollector, _msgSender(), _amount);
        _burn(feeCollector, _amount);

        emit TokensBurned(_amount);
    }

    /**
     * @dev Override transfer function to implement transaction fees
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        address owner = _msgSender();
        
        if (feeEnabled && owner != feeCollector && to != feeCollector) {
            uint256 feeAmount = (amount * transactionFeeBps) / 10000;
            uint256 transferAmount = amount - feeAmount;
            
            // First deduct the full amount from sender
            _update(owner, address(0), amount);
            
            // Then add to recipient and fee collector separately
            _update(address(0), feeCollector, feeAmount);
            _update(address(0), to, transferAmount);
        } else {
            _update(owner, to, amount);
        }
        
        return true;
    }

    /**
     * @dev Override transferFrom function to implement transaction fees
     */
    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        address spender = _msgSender();
        _spendAllowance(from, spender, amount);
        
        if (feeEnabled && from != feeCollector && to != feeCollector) {
            uint256 feeAmount = (amount * transactionFeeBps) / 10000;
            uint256 transferAmount = amount - feeAmount;
            
            // First deduct the full amount from sender
            _update(from, address(0), amount);
            
            // Then add to recipient and fee collector separately
            _update(address(0), feeCollector, feeAmount);
            _update(address(0), to, transferAmount);
        } else {
            _update(from, to, amount);
        }
        
        return true;
    }
} 