// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "forge-std/Test.sol";
import {MerchantPortal, PaymentChannel, MERCH_NotDAO, MERCH_NotMerchant, MERCH_NotRegistered, MERCH_Suspended, MERCH_VaultLocked, MERCH_LowTrust, MERCH_InvalidPayment} from "../../contracts/MerchantPortal.sol";
import {VFIDEToken} from "../../contracts/VFIDEToken.sol";

/**
 * Comprehensive test suite for MerchantPortal contract
 * Coverage: merchant registration, payment processing, trust scores, suspension
 * Target: 60+ tests for 0→100% coverage
 */
contract MerchantPortalTest is Test {
    MerchantPortal public portal;
    VFIDEToken public token;
    
    // Mock contracts
    MockVaultHub public vaultHub;
    MockSeer public seer;
    MockSecurityHub public securityHub;
    MockProofLedger public ledger;
    MockStablecoin public stablecoin;
    
    // Test addresses
    address public dao = address(0x100);
    address public feeSink = address(0x150);
    address public merchant1 = address(0x201);
    address public merchant2 = address(0x202);
    address public customer1 = address(0x301);
    address public customer2 = address(0x302);
    
    // Mock vaults
    address public merchant1Vault;
    address public merchant2Vault;
    address public customer1Vault;
    address public customer2Vault;
    
    uint256 constant PAYMENT_AMOUNT = 1000 ether;
    uint16 constant MIN_MERCHANT_SCORE = 5600; // 56% on 0-10000 scale
    
    event MerchantRegistered(address indexed merchant, string businessName, string category);
    event MerchantSuspended(address indexed merchant, string reason);
    event MerchantReinstated(address indexed merchant);
    event PaymentProcessed(
        address indexed customer,
        address indexed merchant,
        address token,
        uint256 amount,
        uint256 fee,
        string orderId,
        uint16 customerScore,
        PaymentChannel channel
    );
    
    function setUp() public {
        // Deploy VFIDEToken with proper mock contracts
        MockDevVault devVault = new MockDevVault();
        MockPresale presale = new MockPresale();
        // constructor(devReserveVestingVault, _presaleContract, treasury, _vaultHub, _ledger, _treasurySink)
        token = new VFIDEToken(address(devVault), address(presale), address(this), address(0), address(0), address(0));
        token.setVaultOnly(false);
        
        // Transfer tokens from devVault to test contract
        vm.prank(address(devVault));
        require(token.transfer(address(this), 100_000 ether), "transfer failed");
        require(token.transfer(address(this), 100_000 ether), "transfer failed");
        
        // Deploy mock contracts
        vaultHub = new MockVaultHub();
        seer = new MockSeer();
        securityHub = new MockSecurityHub();
        ledger = new MockProofLedger();
        stablecoin = new MockStablecoin();
        
        // Deploy MerchantPortal
        vm.prank(dao);
        portal = new MerchantPortal(
            dao,
            address(vaultHub),
            address(seer),
            address(securityHub),
            address(ledger),
            feeSink
        );
        
        // Create vaults
        merchant1Vault = address(new MockVault());
        merchant2Vault = address(new MockVault());
        customer1Vault = address(new MockVault());
        customer2Vault = address(new MockVault());
        
        vaultHub.setVault(merchant1, merchant1Vault);
        vaultHub.setVault(merchant2, merchant2Vault);
        vaultHub.setVault(customer1, customer1Vault);
        vaultHub.setVault(customer2, customer2Vault);
        
        // Set trust scores (merchants need 5600+ on 0-10000 scale)
        seer.setScore(merchant1, 6000); // 60% - above min
        seer.setScore(merchant2, 7000); // 70% - well above min
        seer.setScore(customer1, 5000); // 50% - neutral
        seer.setScore(customer2, 8000); // 80% - high trust
        
        // Accept tokens
        vm.startPrank(dao);
        portal.setAcceptedToken(address(token), true);
        portal.setAcceptedToken(address(stablecoin), true);
        vm.stopPrank();
        
        // Fund customer vaults
        require(token.transfer(customer1Vault, PAYMENT_AMOUNT * 10), "transfer failed");
        require(token.transfer(customer2Vault, PAYMENT_AMOUNT * 10), "transfer failed");
        stablecoin.mint(customer1Vault, PAYMENT_AMOUNT * 10);
        stablecoin.mint(customer2Vault, PAYMENT_AMOUNT * 10);
        
        // Approve portal
        vm.prank(customer1Vault);
        token.approve(address(portal), type(uint256).max);
        vm.prank(customer2Vault);
        token.approve(address(portal), type(uint256).max);
        vm.prank(customer1Vault);
        stablecoin.approve(address(portal), type(uint256).max);
        vm.prank(customer2Vault);
        stablecoin.approve(address(portal), type(uint256).max);
    }
    
    // ============================================
    // DEPLOYMENT & INITIALIZATION TESTS
    // ============================================
    
    function test_Deployment() public view {
        assertEq(portal.dao(), dao);
        assertEq(address(portal.vaultHub()), address(vaultHub));
        assertEq(address(portal.seer()), address(seer));
        assertEq(address(portal.securityHub()), address(securityHub));
        assertEq(address(portal.ledger()), address(ledger));
        assertEq(portal.feeSink(), feeSink);
        assertEq(portal.protocolFeeBps(), 0); // 0% - no merchant payment fee
        assertEq(portal.minMerchantScore(), MIN_MERCHANT_SCORE);
    }
    
    function test_RevertDeploymentWithZeroDAO() public {
        vm.expectRevert(bytes("zero"));
        new MerchantPortal(
            address(0),
            address(vaultHub),
            address(seer),
            address(securityHub),
            address(ledger),
            feeSink
        );
    }
    
    function test_RevertDeploymentWithZeroVaultHub() public {
        vm.expectRevert(bytes("zero"));
        new MerchantPortal(
            dao,
            address(0),
            address(seer),
            address(securityHub),
            address(ledger),
            feeSink
        );
    }
    
    // ============================================
    // DAO CONTROL TESTS
    // ============================================
    
    function test_SetModules() public {
        MockVaultHub newHub = new MockVaultHub();
        MockSeer newSeer = new MockSeer();
        
        vm.prank(dao);
        portal.setModules(
            address(newHub),
            address(newSeer),
            address(securityHub),
            address(ledger)
        );
        
        assertEq(address(portal.vaultHub()), address(newHub));
        assertEq(address(portal.seer()), address(newSeer));
    }
    
    function test_RevertSetModulesFromNonDAO() public {
        vm.prank(merchant1);
        vm.expectRevert(MERCH_NotDAO.selector);
        portal.setModules(
            address(vaultHub),
            address(seer),
            address(securityHub),
            address(ledger)
        );
    }
    
    function test_SetProtocolFee() public {
        vm.prank(dao);
        portal.setProtocolFee(100); // 1%
        
        assertEq(portal.protocolFeeBps(), 100);
    }
    
    function test_RevertSetProtocolFeeTooHigh() public {
        vm.prank(dao);
        vm.expectRevert(bytes("fee too high"));
        portal.setProtocolFee(501); // >5%
    }
    
    function test_SetFeeSink() public {
        address newSink = address(0x999);
        
        vm.prank(dao);
        portal.setFeeSink(newSink);
        
        assertEq(portal.feeSink(), newSink);
    }
    
    function test_RevertSetFeeSinkZero() public {
        vm.prank(dao);
        vm.expectRevert(bytes("zero"));
        portal.setFeeSink(address(0));
    }
    
    function test_SetMinMerchantScore() public {
        vm.prank(dao);
        portal.setMinMerchantScore(700);
        
        assertEq(portal.minMerchantScore(), 700);
    }
    
    function test_RevertSetMinMerchantScoreInvalid() public {
        vm.prank(dao);
        vm.expectRevert("invalid score");
        portal.setMinMerchantScore(10001); // Must be > 10000 to fail
    }
    
    function test_SetAcceptedToken() public {
        address newToken = address(0x888);
        
        vm.prank(dao);
        portal.setAcceptedToken(newToken, true);
        
        assertTrue(portal.acceptedTokens(newToken));
    }
    
    function test_RemoveAcceptedToken() public {
        vm.prank(dao);
        portal.setAcceptedToken(address(token), false);
        
        assertFalse(portal.acceptedTokens(address(token)));
    }
    
    // ============================================
    // MERCHANT REGISTRATION TESTS
    // ============================================
    
    function test_RegisterMerchant() public {
        vm.prank(merchant1);
        vm.expectEmit(true, false, false, true);
        emit MerchantRegistered(merchant1, "Coffee Shop", "retail");
        portal.registerMerchant("Coffee Shop", "retail");
        
        (
            bool registered,
            bool suspended,
            string memory businessName,
            string memory category,
            ,
            uint256 totalVolume,
            uint256 txCount,
        ) = portal.merchants(merchant1);
        
        assertTrue(registered);
        assertFalse(suspended);
        assertEq(businessName, "Coffee Shop");
        assertEq(category, "retail");
        assertEq(totalVolume, 0);
        assertEq(txCount, 0);
    }
    
    function test_RegisterMultipleMerchants() public {
        vm.prank(merchant1);
        portal.registerMerchant("Coffee Shop", "retail");
        
        vm.prank(merchant2);
        portal.registerMerchant("Web Design Co", "services");
        
        (bool reg1,,,,,,,) = portal.merchants(merchant1);
        (bool reg2,,,,,,,) = portal.merchants(merchant2);
        
        assertTrue(reg1);
        assertTrue(reg2);
    }
    
    function test_RevertRegisterMerchantAlreadyRegistered() public {
        vm.startPrank(merchant1);
        portal.registerMerchant("Coffee Shop", "retail");
        
        vm.expectRevert(bytes("already registered"));
        portal.registerMerchant("Coffee Shop 2", "retail");
        vm.stopPrank();
    }
    
    function test_RevertRegisterMerchantLowTrustScore() public {
        address lowTrustMerchant = address(0x500);
        seer.setScore(lowTrustMerchant, 4000); // Below 5600
        
        vm.prank(lowTrustMerchant);
        vm.expectRevert(MERCH_LowTrust.selector);
        portal.registerMerchant("Bad Shop", "retail");
    }
    
    function test_RegisterMerchantWithMinimumScore() public {
        address minScoreMerchant = address(0x600);
        seer.setScore(minScoreMerchant, MIN_MERCHANT_SCORE); // Exactly 5600 (56%)
        vaultHub.setVault(minScoreMerchant, address(new MockVault()));
        
        vm.prank(minScoreMerchant);
        portal.registerMerchant("Min Score Shop", "retail");
        
        (bool registered,,,,,,,) = portal.merchants(minScoreMerchant);
        assertTrue(registered);
    }
    
    // ============================================
    // MERCHANT SUSPENSION TESTS
    // ============================================
    
    function test_SuspendMerchant() public {
        vm.prank(merchant1);
        portal.registerMerchant("Coffee Shop", "retail");
        
        vm.prank(dao);
        vm.expectEmit(true, false, false, true);
        emit MerchantSuspended(merchant1, "fraud detected");
        portal.suspendMerchant(merchant1, "fraud detected");
        
        (, bool suspended,,,,,,) = portal.merchants(merchant1);
        assertTrue(suspended);
    }
    
    function test_RevertSuspendMerchantNotRegistered() public {
        vm.prank(dao);
        vm.expectRevert(MERCH_NotRegistered.selector);
        portal.suspendMerchant(merchant1, "not registered");
    }
    
    function test_RevertSuspendMerchantFromNonDAO() public {
        vm.prank(merchant1);
        portal.registerMerchant("Coffee Shop", "retail");
        
        vm.prank(merchant2);
        vm.expectRevert(MERCH_NotDAO.selector);
        portal.suspendMerchant(merchant1, "unauthorized");
    }
    
    function test_ReinstateMerchant() public {
        vm.prank(merchant1);
        portal.registerMerchant("Coffee Shop", "retail");
        
        vm.startPrank(dao);
        portal.suspendMerchant(merchant1, "fraud");
        
        vm.expectEmit(true, false, false, false);
        emit MerchantReinstated(merchant1);
        portal.reinstateMerchant(merchant1);
        vm.stopPrank();
        
        (, bool suspended,,,,,,) = portal.merchants(merchant1);
        assertFalse(suspended);
    }
    
    function test_RevertReinstateMerchantNotRegistered() public {
        vm.prank(dao);
        vm.expectRevert(MERCH_NotRegistered.selector);
        portal.reinstateMerchant(merchant1);
    }
    
    // ============================================
    // PAYMENT PROCESSING TESTS
    // ============================================
    
    function test_ProcessPayment() public {
        // Register merchant
        vm.prank(merchant1);
        portal.registerMerchant("Coffee Shop", "retail");
        
        // Process payment (0% protocol fee - merchants keep 100%)
        uint256 expectedFee = 0; // 0% protocol fee
        uint256 expectedNet = PAYMENT_AMOUNT;
        
        vm.prank(merchant1);
        vm.expectEmit(true, true, false, true);
        emit PaymentProcessed(
            customer1,
            merchant1,
            address(token),
            PAYMENT_AMOUNT,
            expectedFee,
            "ORDER-001",
            5000, // customer1's score (50%)
            PaymentChannel.IN_PERSON
        );
        uint256 netAmount = portal.processPayment(
            customer1,
            address(token),
            PAYMENT_AMOUNT,
            "ORDER-001"
        );
        
        assertEq(netAmount, expectedNet);
        assertEq(token.balanceOf(merchant1Vault), expectedNet);
        assertEq(token.balanceOf(feeSink), 0); // No fees collected
    }
    
    function test_ProcessMultiplePayments() public {
        vm.prank(merchant1);
        portal.registerMerchant("Coffee Shop", "retail");
        
        vm.startPrank(merchant1);
        portal.processPayment(customer1, address(token), PAYMENT_AMOUNT, "ORDER-001");
        portal.processPayment(customer1, address(token), PAYMENT_AMOUNT, "ORDER-002");
        vm.stopPrank();
        
        (,,,,,uint256 totalVolume, uint256 txCount,) = portal.merchants(merchant1);
        assertEq(totalVolume, PAYMENT_AMOUNT * 2);
        assertEq(txCount, 2);
    }
    
    function test_ProcessPaymentWithStablecoin() public {
        vm.prank(merchant1);
        portal.registerMerchant("Coffee Shop", "retail");
        
        vm.prank(merchant1);
        uint256 netAmount = portal.processPayment(
            customer1,
            address(stablecoin),
            PAYMENT_AMOUNT,
            "ORDER-001"
        );
        
        assertTrue(netAmount > 0);
        assertGt(stablecoin.balanceOf(merchant1Vault), 0);
    }
    
    function test_RevertProcessPaymentNotMerchant() public {
        vm.prank(customer1);
        vm.expectRevert(MERCH_NotMerchant.selector);
        portal.processPayment(
            customer2,
            address(token),
            PAYMENT_AMOUNT,
            "ORDER-001"
        );
    }
    
    function test_RevertProcessPaymentSuspendedMerchant() public {
        vm.prank(merchant1);
        portal.registerMerchant("Coffee Shop", "retail");
        
        vm.prank(dao);
        portal.suspendMerchant(merchant1, "fraud");
        
        vm.prank(merchant1);
        vm.expectRevert(MERCH_Suspended.selector);
        portal.processPayment(
            customer1,
            address(token),
            PAYMENT_AMOUNT,
            "ORDER-001"
        );
    }
    
    function test_RevertProcessPaymentZeroCustomer() public {
        vm.prank(merchant1);
        portal.registerMerchant("Coffee Shop", "retail");
        
        vm.prank(merchant1);
        vm.expectRevert(MERCH_InvalidPayment.selector);
        portal.processPayment(
            address(0),
            address(token),
            PAYMENT_AMOUNT,
            "ORDER-001"
        );
    }
    
    function test_RevertProcessPaymentZeroToken() public {
        vm.prank(merchant1);
        portal.registerMerchant("Coffee Shop", "retail");
        
        vm.prank(merchant1);
        vm.expectRevert(MERCH_InvalidPayment.selector);
        portal.processPayment(
            customer1,
            address(0),
            PAYMENT_AMOUNT,
            "ORDER-001"
        );
    }
    
    function test_RevertProcessPaymentZeroAmount() public {
        vm.prank(merchant1);
        portal.registerMerchant("Coffee Shop", "retail");
        
        vm.prank(merchant1);
        vm.expectRevert(MERCH_InvalidPayment.selector);
        portal.processPayment(
            customer1,
            address(token),
            0,
            "ORDER-001"
        );
    }
    
    function test_RevertProcessPaymentTokenNotAccepted() public {
        vm.prank(merchant1);
        portal.registerMerchant("Coffee Shop", "retail");
        
        address unacceptedToken = address(0x777);
        
        vm.prank(merchant1);
        vm.expectRevert(bytes("token not accepted"));
        portal.processPayment(
            customer1,
            unacceptedToken,
            PAYMENT_AMOUNT,
            "ORDER-001"
        );
    }
    
    function test_RevertProcessPaymentCustomerNoVault() public {
        vm.prank(merchant1);
        portal.registerMerchant("Coffee Shop", "retail");
        
        address noVaultCustomer = address(0x888);
        
        vm.prank(merchant1);
        vm.expectRevert(bytes("no vault"));
        portal.processPayment(
            noVaultCustomer,
            address(token),
            PAYMENT_AMOUNT,
            "ORDER-001"
        );
    }
    
    function test_RevertProcessPaymentCustomerVaultLocked() public {
        vm.prank(merchant1);
        portal.registerMerchant("Coffee Shop", "retail");
        
        securityHub.setLocked(customer1Vault, true);
        
        vm.prank(merchant1);
        vm.expectRevert(MERCH_VaultLocked.selector);
        portal.processPayment(
            customer1,
            address(token),
            PAYMENT_AMOUNT,
            "ORDER-001"
        );
    }
    
    // ============================================
    // FEE CALCULATION TESTS
    // ============================================
    
    function test_ProcessPaymentWithDifferentFees() public {
        vm.prank(merchant1);
        portal.registerMerchant("Coffee Shop", "retail");
        
        // Change fee to 1%
        vm.prank(dao);
        portal.setProtocolFee(100);
        
        uint256 expectedFee = (PAYMENT_AMOUNT * 100) / 10000; // 1%
        uint256 expectedNet = PAYMENT_AMOUNT - expectedFee;
        
        vm.prank(merchant1);
        uint256 netAmount = portal.processPayment(
            customer1,
            address(token),
            PAYMENT_AMOUNT,
            "ORDER-001"
        );
        
        assertEq(netAmount, expectedNet);
        assertEq(token.balanceOf(feeSink), expectedFee);
    }
    
    function test_ProcessPaymentWithZeroFee() public {
        vm.prank(merchant1);
        portal.registerMerchant("Coffee Shop", "retail");
        
        vm.prank(dao);
        portal.setProtocolFee(0);
        
        vm.prank(merchant1);
        uint256 netAmount = portal.processPayment(
            customer1,
            address(token),
            PAYMENT_AMOUNT,
            "ORDER-001"
        );
        
        assertEq(netAmount, PAYMENT_AMOUNT);
        assertEq(token.balanceOf(merchant1Vault), PAYMENT_AMOUNT);
    }
    
    // ============================================
    // VIEW FUNCTION TESTS
    // ============================================
    
    function test_GetMerchantInfo() public {
        vm.prank(merchant1);
        portal.registerMerchant("Coffee Shop", "retail");
        
        (
            bool registered,
            bool suspended,
            string memory businessName,
            string memory category,
            uint64 registeredAt,
            uint256 totalVolume,
            uint256 txCount,
        ) = portal.merchants(merchant1);
        
        assertTrue(registered);
        assertFalse(suspended);
        assertEq(businessName, "Coffee Shop");
        assertEq(category, "retail");
        assertGt(registeredAt, 0);
        assertEq(totalVolume, 0);
        assertEq(txCount, 0);
    }
    
    function test_GetMerchantVolumeAndTransactions() public {
        vm.prank(merchant1);
        portal.registerMerchant("Coffee Shop", "retail");
        
        vm.startPrank(merchant1);
        portal.processPayment(customer1, address(token), 100 ether, "ORDER-001");
        portal.processPayment(customer1, address(token), 200 ether, "ORDER-002");
        portal.processPayment(customer2, address(token), 300 ether, "ORDER-003");
        vm.stopPrank();
        
        (,,,,,uint256 totalVolume, uint256 txCount,) = portal.merchants(merchant1);
        assertEq(totalVolume, 600 ether);
        assertEq(txCount, 3);
    }
    
    // ============================================
    // FUZZ TESTS
    // ============================================
    
    function testFuzz_RegisterMerchantWithValidScore(uint16 score) public {
        vm.assume(score >= MIN_MERCHANT_SCORE && score <= 10000);
        
        address merchant = address(uint160(uint256(keccak256(abi.encodePacked(score)))));
        seer.setScore(merchant, score);
        vaultHub.setVault(merchant, address(new MockVault()));
        
        vm.prank(merchant);
        portal.registerMerchant("Test Shop", "retail");
        
        (bool registered,,,,,,,) = portal.merchants(merchant);
        assertTrue(registered);
    }
    
    function testFuzz_ProcessPaymentAmount(uint96 amount) public {
        vm.assume(amount > 0 && amount <= PAYMENT_AMOUNT * 10);
        
        vm.prank(merchant1);
        portal.registerMerchant("Coffee Shop", "retail");
        
        vm.prank(merchant1);
        uint256 netAmount = portal.processPayment(
            customer1,
            address(token),
            amount,
            "ORDER-FUZZ"
        );
        
        // 0% protocol fee - merchant keeps full amount
        assertEq(netAmount, amount);
    }
    
    function testFuzz_ProtocolFee(uint16 feeBps) public {
        vm.assume(feeBps <= 500); // Max 5%
        
        vm.prank(dao);
        portal.setProtocolFee(feeBps);
        
        assertEq(portal.protocolFeeBps(), feeBps);
    }
}

// ============================================
// MOCK CONTRACTS
// ============================================

contract MockDevVault {}
contract MockPresale {}

contract MockVaultHub {
    mapping(address => address) public vaults;
    
    function vaultOf(address owner) external view returns (address) {
        return vaults[owner];
    }
    
    function ensureVault(address owner) external returns (address) {
        if (vaults[owner] == address(0)) {
            vaults[owner] = address(new MockVault());
        }
        return vaults[owner];
    }
    
    function isVault(address a) external view returns (bool) {
        return a != address(0);
    }
    
    function setVault(address owner, address vault) external {
        vaults[owner] = vault;
    }
}

contract MockVault {}

contract MockSeer {
    mapping(address => uint16) public scores;
    uint16 public highTrustThreshold = 7000; // 70% on 10x scale
    uint16 public lowTrustThreshold = 3000;  // 30% on 10x scale
    uint16 public minMerchantScore = 5600; // Minimum score for merchant registration (56%)
    
    function getScore(address subject) external view returns (uint16) {
        uint16 score = scores[subject];
        return score == 0 ? 5000 : score; // Default neutral = 5000 (50%)
    }
    
    function setScore(address subject, uint16 score) external {
        scores[subject] = score;
    }
    
    function minForMerchant() external view returns (uint16) {
        return minMerchantScore;
    }
}

contract MockSecurityHub {
    mapping(address => bool) public locked;
    
    function isLocked(address vault) external view returns (bool) {
        return locked[vault];
    }
    
    function setLocked(address vault, bool status) external {
        locked[vault] = status;
    }
}

contract MockProofLedger {
    function logSystemEvent(address, string calldata, address) external pure {}
    function logEvent(address, string calldata, uint256, string calldata) external pure {}
}

contract MockStablecoin {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }
    
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }
    
    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(allowance[from][msg.sender] >= amount, "insufficient allowance");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}
