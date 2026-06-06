// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @title FraudJury
/// @notice Rotating peer-jury adjudication for VFIDE fraud cases (step 3 of the FraudRegistry reform).
/// @dev NON-CUSTODIAL FAIRNESS CORE. This contract decides *whether* a fraud accusation is upheld.
///      It never touches funds. A consequence (handled by FraudRegistry: risk signal + Seer score
///      penalty + service-ban) may only follow a peer-jury CONFIRMATION here. The DAO can VETO a
///      case (force it to Dismissed) but can NEVER confirm one — punishment requires peer consensus,
///      and the only unilateral power any authority holds is leniency.
///
///      v1 design (explicitly chosen; see flags):
///        - SELECTION: open, score-gated peer voting. Any address with Seer score >= JUROR_MIN_SCORE
///          may vote, except the target (cannot judge own case) and any address that filed a complaint
///          against the target (accusers cannot also judge). [v2 hardening: random selection from a
///          registered pool via VRF, plus guardian-of-target exclusion.]
///        - VOTING: commit-reveal, so early votes cannot anchor later ones (no bandwagoning).
///        - OUTCOME: needs >= JURY_QUORUM reveals and a >= CONFIRM_SUPERMAJORITY_PCT share of revealed
///          votes to Confirm; otherwise Dismissed. Quorum failure => Dismissed (fail-safe to leniency).
contract FraudJury {
    /// @notice Per-case lifecycle / outcome.
    enum Verdict { None, Voting, Confirmed, Dismissed }

    /// @notice Case state for a target under review.
    struct Case {
        Verdict verdict;
        uint64 commitDeadline; // commits accepted while block.timestamp < commitDeadline
        uint64 revealDeadline; // reveals accepted in [commitDeadline, revealDeadline)
        uint32 confirmVotes;
        uint32 dismissVotes;
        uint32 totalReveals;
    }

    /// @notice The only contract allowed to open cases (FraudRegistry).
    address public immutable fraudRegistry;
    /// @notice Seer score oracle, used for juror eligibility.
    ISeer_Jury public immutable seer;
    /// @notice Governance address (veto / migration only).
    address public dao;

    /// @notice Minimum ProofScore to serve as a juror.
    uint16 public constant JUROR_MIN_SCORE = 7000;
    /// @notice Minimum number of revealed votes for a binding outcome.
    uint32 public constant JURY_QUORUM = 5;
    /// @notice Confirm requires this percent (of revealed votes) voting to confirm (>= ~2/3).
    uint32 public constant CONFIRM_SUPERMAJORITY_PCT = 66;
    /// @notice Commit phase length.
    uint64 public constant COMMIT_WINDOW = 3 days;
    /// @notice Reveal phase length (starts when the commit phase ends).
    uint64 public constant REVEAL_WINDOW = 2 days;

    /// @notice target => current case.
    mapping(address => Case) public cases;
    /// @notice target => monotonic round counter (lets a target be re-tried after a prior outcome
    ///         without stale commitments colliding).
    mapping(address => uint32) public caseRound;
    /// @notice keccak(target,round,juror) => vote commitment.
    mapping(bytes32 => bytes32) public commitments;
    /// @notice keccak(target,round,juror) => revealed flag.
    mapping(bytes32 => bool) public revealedVote;

    event CaseOpened(address indexed target, uint32 indexed round, uint64 commitDeadline, uint64 revealDeadline);
    event VoteCommitted(address indexed target, uint32 indexed round, address indexed juror);
    event VoteRevealed(address indexed target, uint32 indexed round, address indexed juror, bool confirm);
    event CaseFinalized(address indexed target, uint32 indexed round, Verdict verdict, uint32 confirmVotes, uint32 totalReveals);
    event CaseVetoed(address indexed target, uint32 indexed round, address indexed by);
    event DAOUpdated(address indexed dao);

    error J_Zero();
    error J_NotRegistry();
    error J_NotDAO();
    error J_CaseActive();
    error J_NoCase();
    error J_NotVoting();
    error J_CommitClosed();
    error J_RevealNotOpen();
    error J_RevealClosed();
    error J_TooEarly();
    error J_Ineligible();
    error J_AlreadyCommitted();
    error J_NoCommitment();
    error J_AlreadyRevealed();
    error J_BadReveal();

    modifier onlyRegistry() {
        if (msg.sender != fraudRegistry) revert J_NotRegistry();
        _;
    }
    modifier onlyDAO() {
        if (msg.sender != dao) revert J_NotDAO();
        _;
    }

    constructor(address _fraudRegistry, address _seer, address _dao) {
        if (_fraudRegistry == address(0) || _seer == address(0) || _dao == address(0)) revert J_Zero();
        fraudRegistry = _fraudRegistry;
        seer = ISeer_Jury(_seer);
        dao = _dao;
    }

    /// @notice Open a fresh jury cycle for `target`. Called by FraudRegistry at the flag threshold.
    function openCase(address target) external onlyRegistry {
        if (target == address(0)) revert J_Zero();
        Case storage c = cases[target];
        if (c.verdict == Verdict.Voting) revert J_CaseActive();

        uint32 round;
        unchecked { round = ++caseRound[target]; }
        uint64 commitDeadline = uint64(block.timestamp) + COMMIT_WINDOW;
        uint64 revealDeadline = commitDeadline + REVEAL_WINDOW;

        c.verdict = Verdict.Voting;
        c.commitDeadline = commitDeadline;
        c.revealDeadline = revealDeadline;
        c.confirmVotes = 0;
        c.dismissVotes = 0;
        c.totalReveals = 0;

        emit CaseOpened(target, round, commitDeadline, revealDeadline);
    }

    /// @notice Commit a hashed vote. commitment = keccak256(abi.encodePacked(confirm, salt, msg.sender)).
    /// @dev Eligibility (score gate, not-target, not-an-accuser) is checked at commit time.
    function commitVote(address target, bytes32 commitment) external {
        Case storage c = cases[target];
        if (c.verdict != Verdict.Voting) revert J_NotVoting();
        if (block.timestamp >= c.commitDeadline) revert J_CommitClosed();
        if (commitment == bytes32(0)) revert J_Zero();
        _requireEligible(target, msg.sender);

        bytes32 key = _key(target, msg.sender);
        if (commitments[key] != bytes32(0)) revert J_AlreadyCommitted();
        commitments[key] = commitment;

        emit VoteCommitted(target, caseRound[target], msg.sender);
    }

    /// @notice Reveal a previously committed vote during the reveal phase.
    function revealVote(address target, bool confirm, bytes32 salt) external {
        Case storage c = cases[target];
        if (c.verdict != Verdict.Voting) revert J_NotVoting();
        if (block.timestamp < c.commitDeadline) revert J_RevealNotOpen();
        if (block.timestamp >= c.revealDeadline) revert J_RevealClosed();

        bytes32 key = _key(target, msg.sender);
        bytes32 com = commitments[key];
        if (com == bytes32(0)) revert J_NoCommitment();
        if (revealedVote[key]) revert J_AlreadyRevealed();
        if (keccak256(abi.encodePacked(confirm, salt, msg.sender)) != com) revert J_BadReveal();

        revealedVote[key] = true;
        unchecked {
            if (confirm) { ++c.confirmVotes; } else { ++c.dismissVotes; }
            ++c.totalReveals;
        }

        emit VoteRevealed(target, caseRound[target], msg.sender, confirm);
    }

    /// @notice Finalize a case once the reveal phase has ended. Callable by anyone.
    function finalize(address target) external {
        Case storage c = cases[target];
        if (c.verdict != Verdict.Voting) revert J_NotVoting();
        if (block.timestamp < c.revealDeadline) revert J_TooEarly();

        bool confirmed = c.totalReveals >= JURY_QUORUM &&
            uint256(c.confirmVotes) * 100 >= uint256(c.totalReveals) * CONFIRM_SUPERMAJORITY_PCT;
        c.verdict = confirmed ? Verdict.Confirmed : Verdict.Dismissed;

        emit CaseFinalized(target, caseRound[target], c.verdict, c.confirmVotes, c.totalReveals);
    }

    /// @notice DAO may force a case to Dismissed (soften-only). It can NEVER set Confirmed.
    function daoVeto(address target) external onlyDAO {
        Case storage c = cases[target];
        if (c.verdict == Verdict.None) revert J_NoCase();
        c.verdict = Verdict.Dismissed;
        emit CaseVetoed(target, caseRound[target], msg.sender);
    }

    /// @notice Migrate governance address.
    function setDAO(address _dao) external onlyDAO {
        // NOTE (pre-mainnet): mirror FraudRegistry's timelocked setter pattern before mainnet.
        if (_dao == address(0)) revert J_Zero();
        dao = _dao;
        emit DAOUpdated(_dao);
    }

    /// @notice True only when a peer jury has upheld the accusation. FraudRegistry gates on this.
    function isConfirmed(address target) external view returns (bool) {
        return cases[target].verdict == Verdict.Confirmed;
    }

    /// @notice Current verdict for a target.
    function verdictOf(address target) external view returns (Verdict) {
        return cases[target].verdict;
    }

    function _key(address target, address juror) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(target, caseRound[target], juror));
    }

    function _requireEligible(address target, address juror) internal view {
        if (juror == target) revert J_Ineligible();                       // cannot judge own case
        if (seer.getScore(juror) < JUROR_MIN_SCORE) revert J_Ineligible(); // trust gate
        // accusers cannot also judge the case they filed
        if (IFraudRegistry_Jury(fraudRegistry).hasComplained(target, juror)) revert J_Ineligible();
    }
}

/// @notice Minimal Seer score view used for juror eligibility.
interface ISeer_Jury {
    function getScore(address subject) external view returns (uint16);
}

/// @notice Minimal FraudRegistry view used to exclude accusers from the jury.
interface IFraudRegistry_Jury {
    function hasComplained(address target, address who) external view returns (bool);
}
