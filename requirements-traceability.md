# Requirements Traceability

## Scope
Document a portfolio-grade automation for lead intake, scoring, CRM routing, and follow-up drafting.

## Functional Requirements

| ID | Requirement | Workflow Control | Evidence |
|---|---|---|---|
| FR-001 | Capture inbound leads from a form | n8n webhook trigger with required-field validation | Test submission appears in intake log |
| FR-002 | Prevent duplicate lead creation | Dedup lookup in Airtable and HubSpot before AI or create | Duplicate test results in `duplicate` only |
| FR-003 | Score and segment the lead | GPT-4 returns score, segment, and rationale in JSON | Parsed result stored in audit row |
| FR-004 | Draft personalized follow-up | Prompt includes business context and lead details | Draft text stored for human review |
| FR-005 | Sync qualified data to CRM | HubSpot upsert node with explicit field map | Contact record updated without duplicates |
| FR-006 | Preserve an audit trail | Airtable write stores raw inputs, status, confidence, and run ID | Review table shows every submission |
| FR-007 | Route uncertain cases safely | Confidence threshold and validation flags force `manual_review` | Low-confidence tests stop automation drift |

## Non-Functional Requirements

| ID | Requirement | Workflow Control | Evidence |
|---|---|---|---|
| NFR-REL-001 | Safe to replay | Idempotency key based on normalized email and source | Replay does not create extra records |
| NFR-REL-002 | Visible failure states | `manual_review` and `crm_sync_pending` queues with reasons | Operator can identify the broken step |
| NFR-COST-001 | Minimize AI spend | AI call occurs only after dedup and validation | Invalid or duplicate leads never hit GPT-4 |
| NFR-SEC-001 | Keep secrets out of workflow docs | Credentials stored only in platform credential vault | No keys in documentation pack |
| NFR-OPS-001 | Handover ready | Runbook, verification checklist, and owner mapping included | Another operator can review the flow |
| NFR-PORT-001 | Reusable across service businesses | Domain-specific scoring rules isolated in config | Same flow can serve legal or consulting |

## Assumptions
- One owner mapping table exists for routing.
- Manual outreach remains human-approved.
- Demo data is anonymized.

## Completion Evidence Summary
- Qualified lead test succeeds in both Airtable and HubSpot.
- Duplicate submission produces no new CRM record.
- Missing-field submission routes to `manual_review`.
- Malformed AI response is rejected before CRM write.
