# Seer.sol — Hostile Audit Findings

**Lines:** 1,295 (includes ProofScoreBurnRouterPlus)  
**Score:** 3 Critical / 2 High / 5 Medium / 4 Low

---

## S-01 · CRITICAL — `resolveScoreDispute` reads blended `getScore()` but writes to DAO-only `_score`

**Location:** `resolveScoreDispute()`

**Description:**  
`getScore()` returns `_score + onChainBonus` (blended). But `resolveScoreDispute` reads this blended value and writes it back to `_score`. This means each dispute resolution inflates the stored DAO score by the on-chain component. Repeated disputes ratchet the score to `MAX_SCORE`.

Example: `_score = 3000`, `onChainBonus = 500`. `getScore() = 3500`. After dispute resolution writes 3500 back to `_score`, next `getScore() = 3500 + 500 = 4000`. Repeat until MAX_SCORE.

**Fix:**
```solidity
function resolveScoreDispute(address subject, int16 adjustment) external onlyDAO {
    // READ from _score directly, not getScore()
    int16 currentDaoScore = int16(_score[subject]);
    int16 newScore = currentDaoScore + adjustment;
    
    // Clamp to valid range
    if (newScore < 0) newScore = 0;
    if (newScore > int16(MAX_SCORE)) newScore = int16(MAX_SCORE);
    
    _score[subject] = uint16(newScore);
    emit ScoreDisputeResolved(subject, adjustment);
}
```

---

## S-02 · CRITICAL — `applyDecay` same read/write mismatch

**Fix:** Same pattern — use `_score[subject]` instead of `getScore(subject)` for decay calculations:
```solidity
function applyDecay(address subject) external {
    uint16 daoScore = _score[subject]; // DAO-only, no blending
    uint16 decayedScore = _calculateDecay(daoScore, lastActivity[subject]);
    _score[subject] = decayedScore;
}
```

---

## S-03 · CRITICAL — `setDAO()` instant with no timelock

**Fix:**
```solidity
address public pendingDAO;
uint64 public pendingDAOAt;
uint64 public constant DAO_CHANGE_DELAY = 7 days;

function proposeDAO(address _dao) external {
    require(msg.sender == dao, "not DAO");
    require(_dao != address(0), "zero");
    pendingDAO = _dao;
    pendingDAOAt = uint64(block.timestamp) + DAO_CHANGE_DELAY;
}

function applyDAO() external {
    require(msg.sender == dao, "not DAO");
    require(pendingDAOAt != 0 && block.timestamp >= pendingDAOAt, "timelock");
    dao = pendingDAO;
    delete pendingDAO;
    delete pendingDAOAt;
}
```

---

## S-04 · HIGH — DAO bypasses ALL operator rate limits on `setScore`

**Fix:**
```solidity
mapping(address => uint64) public lastDAOScoreChange;
uint64 public constant DAO_SCORE_COOLDOWN = 1 hours;

function setScore(address subject, uint16 newScore) external onlyDAO {
    require(block.timestamp >= lastDAOScoreChange[subject] + DAO_SCORE_COOLDOWN, "cooldown");
    // Existing 20% per-call cap stays
    lastDAOScoreChange[subject] = uint64(block.timestamp);
    // ...
}
```

---

## S-05 · HIGH — `_recordHistory` O(n) array shift

**Fix:** Use a circular buffer instead of shifting:
```solidity
uint256 public historyHead; // write pointer
function _recordHistory(address subject, uint16 score) internal {
    scoreHistory[subject][historyHead % HISTORY_SIZE] = ScoreEntry(score, uint64(block.timestamp));
    historyHead++;
}
```

---

## S-06 to S-10 · MEDIUM

- **S-06:** Fix threshold: `if (_score[subject] == 0) return calculateOnChainScore(subject);` (only truly unscored users).
- **S-07:** Add `require(totalWeight <= 100)` with a clear revert message.
- **S-08:** Delete source data on removal: `delete scoreSources[sourceId];`
- **S-09:** Use `getCachedScore` in transfer path instead of `getScore`.
- **S-10:** Make decay state-changing: `function applyDecay(address)` modifies `_score`.

---

## S-11 to S-14 · LOW

- **S-11:** Rename to `maxSingleChange` for clarity.
- **S-12:** Extract ProofScoreBurnRouterPlus to its own file.
- **S-13:** Add `require(block.timestamp >= lastDisputeResolution[subject] + 7 days)`.
- **S-14:** Use `int256` for event parameter instead of `int16`.
