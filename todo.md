# Repository Audit and Fix Plan

## Scope confirmation
- [x] Confirm aggressive sweep scope and one-PR delivery requirement

## Audit
- [x] Inspect repo status and current branch
- [x] Run available automated checks to identify failures
- [x] Review high-risk warnings, TODOs, and obvious defects

## Fix
- [x] Work from branch `aggressive-repo-sweep-fixes`
- [x] Apply targeted fixes for confirmed issues
  - [x] Fix ABI parity drift and mock contract address parity
  - [x] Restore recovery status owner veto/challenge UI
  - [x] Fix RainbowKit ConnectButton.Custom Jest mock for admin connect gate
  - [x] Update commerce auto-convert audit for fail-closed deprecated path
  - [x] Fix lint-blocking CommonJS import in demo server
- [x] Add or update tests where practical

## Verify and deliver
- [x] Run targeted and relevant full checks
- [x] Review diff and exclude generated files
- [x] Commit, push branch, and open one PR
- [x] Report summary and PR link
