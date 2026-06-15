# Notification Infrastructure — Capability Certification (Backend Completion Campaign 1)

**Priority: CRITICAL · Wave A · almost every VFIDE system depends on it.**

Full certification of the notification system (NOT a surface review), traced from the actual code. Model:
`lib/audit/notificationInfraModel.ts`; matrix: `__tests__/audit/notificationInfra.test.ts` (**115 scenarios; all
pass; typecheck 0; full audit suite 754/29 green**). Target (100+) met.

## What exists (verified, not assumed)
- **In-app:** `notifications` table (`type/title/message/is_read/metadata`) + authed, rate-limited API.
- **SMS:** two providers — Africa's Talking (apt for the financially-excluded audience) + Twilio — each returning
  `{success, error}` gracefully (no throws).
- **Push:** web-push fanout to `push_subscriptions`, per-subscription isolation, sent/failed accounting, expired
  subscriptions dropped.
- **Events:** `emitServerEvent` → `ecosystem_events`, best-effort and swallowed (never breaks the primary op).
- **Preferences:** `notification_preferences` (per-channel) + API.
- **Types covered:** recovery, guardians, proof-of-life, inheritance, commerce, disputes, governance, trust, fraud,
  security (all 10).

## Certified-sound properties
- **Forgery resistance (FORGE-01..06, INT-02/03):** the create API enforces `canCreate = requester==target ||
  isAdmin` — a user cannot create a notification for another user; legitimate cross-user notifications are
  privileged server-side inserts in trusted route handlers; addresses are compared case-insensitively. Input is
  zod-validated.
- **Read / mark-read scoping (READ-01..05):** RLS + query-scoping bind reads and mark-read to the authenticated
  owner's wallet; a non-owner cannot read or mutate another user's notifications.
- **Spam resistance (SPAM-01..04, EDGE-09):** both read and write paths are rate-limited (inclusive boundary).
- **Channel resilience (SMS-01..06, PUSH-01..05, EVT-01..03):** SMS fails gracefully without throwing; push
  isolates per-subscription failures and drops expired subs; event persistence is swallowed so notification
  recording never breaks the triggering operation.

## Findings
### N-1 (CORRECTED → MEDIUM) — Email is not an implemented channel
> **⚠ CORRECTED after verification:** the original wording called this a HIGH Veritas-Law violation
> ("presented channel with no transport"). On closer read, email is NOT presented anywhere — the
> `notification_preferences` migration is push-specific (push_subscriptions + push client settings), the
> preferences API has no email handling, and no UI offers it. So email is simply **not implemented**
> (no transport, no preference, no presentation) — a COMPLETENESS gap against the campaign's desired
> channel set, not a false presentation. Severity MEDIUM. Remediation: build an email channel if desired,
> or accept in-app + SMS + push as the channel set; either way there is nothing falsely presented to remove.

### N-1 (original wording, retained for the record)
Email appears as a delivery channel/preference, but there is **no email-sending transport anywhere** in the
codebase (no nodemailer/sendgrid/resend/ses/postmark/mailgun/sendEmail). Every email-enabled path is undeliverable
(CH-04, ROUTE-*-email, EDGE-10, INT-06). **Veritas-Law violation:** offering a channel that cannot deliver implies
a capability that does not exist. **Remediation:** either implement an email transport, or remove email from the
channel/preference surface until it is built (do not present it as available). Until then, the UI must not imply
email notifications are active.

### N-2 (MEDIUM) — No delivery-time escalation for critical notifications
"Escalation" today is a **config-time** warning — `assessGuardianResilience` flags a fragile recovery setup
(threshold == guardian count) — but there is **no delivery-time channel-fallback** (ESC-04/05). An unacknowledged
critical notification (recovery / fraud / security) does not auto-escalate to another channel or retry. For a
protocol whose recovery and fraud flows depend on reaching the user, this is a real gap. **Remediation:** a
delivery-escalation/retry chain for CRITICAL types (e.g., in-app → push → SMS, with acknowledgement tracking).

### N-3 (LOW-MED) — Dispatch is decentralized
There is no central orchestrator that fans a notification out across channels by preference; each call site
(badges, endorsements, friends, messages, recovery, …) inserts the in-app row and optionally pushes/SMSes on its
own. This risks **inconsistent preference and channel application** across notification sources. **Remediation:**
a single `dispatchNotification(userId, type, payload)` helper that reads preferences and fans out uniformly.

### N-4 (LOW) — No automatic SMS provider failover
A failed SMS provider does not transparently retry the other (SMS-05/06, EDGE-06). Acceptable for non-critical
messages; for CRITICAL SMS, optional failover would improve reliability.

## Certification status
Source + model certified at the equivalent evidenced stages (source-correct, authority/forgery, full
channel×type×failure matrix, adversarial, cross-cutting integration). **Open boundary (the off-chain analogue of
stage-2):** deployment-level integration/e2e against live SMS/push providers + the database. The four findings are
recorded; N-1 (email) is the blocking honesty issue and should be resolved (implement or remove) before the
notification surface is represented as channel-complete.
