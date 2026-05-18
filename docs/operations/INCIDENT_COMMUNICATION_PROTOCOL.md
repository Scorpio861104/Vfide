# Incident Communication Protocol

This protocol standardizes incident communication timing, ownership, and escalation.

## Severity Matrix

| Severity | Initial stakeholder update SLA | Update cadence | Expected owner |
| --- | --- | --- | --- |
| Sev-1 (critical outage / active exploit) | 15 minutes | Every 30 minutes | Incident commander |
| Sev-2 (major degradation) | 30 minutes | Every 60 minutes | Incident commander |
| Sev-3 (limited impact) | 60 minutes | Every 120 minutes | Service owner |

## Escalation Tree

1. Incident commander: starts timeline, declares severity, assigns owner roles.
2. Technical lead: triage, containment, and remediation coordination.
3. Communications lead: drafts stakeholder updates and status-page notes.
4. Executive escalation: required for Sev-1 and unresolved Sev-2 incidents over 4 hours.

## Required Message Templates

### Initial Alert

- Incident ID:
- Severity:
- Impact summary:
- Affected systems:
- Immediate containment action:
- Next update ETA:

### Progress Update

- Incident ID:
- Current status:
- Newly observed impact:
- Mitigation progress:
- Risks/unknowns:
- Next update ETA:

### Resolution Notice

- Incident ID:
- Root cause summary:
- Time to detect / contain / resolve:
- User impact window:
- Follow-up actions and owners:

## Tabletop Exercise Cadence

- Run communication tabletop exercises at least once per quarter.
- Store the latest tabletop record in `audit/incident-communication-tabletop.latest.json`.
- Include timestamps, participants, and action items in each record.
