# Seer View Compatibility Migration

This project moved non-critical Seer read helpers out of `Seer` to keep Seer deployable under contract size limits.

Use `SeerView` for these read functions:

| Previous target | Previous function | New target | New function | Args |
|---|---|---|---|---|
| Seer | `getMentorInfo(subject)` | SeerView | `getMentorInfo(seer, subject)` | prepend Seer address |
| Seer | `getActiveEndorsements(subject)` | SeerView | `getActiveEndorsements(seer, subject)` | prepend Seer address |
| Seer | `getScores(subjects)` | SeerView | `getScores(seer, subjects)` | prepend Seer address |
| Seer | `getScoresBatch(subjects)` | SeerView | `getScoresBatch(seer, subjects)` | prepend Seer address |
| Seer | `getTrustLevel(subject)` | SeerView | `getTrustLevel(seer, subject)` | prepend Seer address |

## Current repo status

No immediate frontend break is expected from this change for endorsements/mentorship pages because they already read from `SeerSocial`:

- `app/endorsements/page.tsx` uses `SeerSocial.getActiveEndorsements`
- `hooks/useMentorHooks.ts` uses `SeerSocial.getMentorInfo`

## Integration checklist

1. Deploy `SeerView`.
2. Store the deployed `SeerView` address in your environment/config.
3. Update ABIs/client calls for any integration still calling removed Seer read methods.
4. For every migrated call, prepend the Seer contract address as the first argument.
5. Keep write calls and core reads on Seer unchanged (for example `getScore`, `getScoreBreakdown`, `getScoreHistory`).

## Notes

- This is an ABI-level migration for read-only helper functions only.
- Core scoring, enforcement, and write flows remain in Seer.
