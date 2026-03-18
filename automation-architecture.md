# Automation Architecture

## Stack
- Orchestrator: n8n
- Trigger: Google Form or equivalent webhook form
- AI: OpenAI GPT-4 for lead scoring and first-touch drafting
- CRM: HubSpot
- Audit store: Airtable

## Business Outcome
- Respond to inbound leads faster.
- Give sales a transparent qualification trail.
- Turn a generic website contact flow into a measurable pipeline story.

## Data Contract

### Input Contract
- `submission_id` (string, required)
- `submitted_at` (ISO timestamp, required)
- `full_name` (string, required)
- `email` (string, required)
- `phone` (string, optional)
- `property_type` (string, optional)
- `budget_range` (string, optional)
- `timeline` (string, optional)
- `message` (string, required)
- `source_channel` (string, required)

### Intermediate Contract
- `dedup_key` (string, required)
- `normalized_contact` (object, required)
- `ai_score` (integer 0-100, nullable)
- `ai_segment` (`qualified` | `nurture` | `manual_review`, required)
- `ai_reasoning` (string, nullable)
- `personalized_draft` (string, nullable)
- `confidence` (number 0-1, required)
- `validation_flags[]` (array, optional)

### Output Contract
- `hubspot_contact_id` (string, nullable)
- `airtable_record_id` (string, required)
- `status` (`qualified` | `nurture` | `manual_review` | `duplicate` | `crm_sync_pending`, required)
- `owner_assignment` (string, nullable)
- `next_action` (string, required)
- `processed_at` (ISO timestamp, required)
- `run_id` (string, required)

## Workflow Path
1. Webhook receives form payload.
2. Validate required fields and sanitize email, phone, and message text.
3. Build `dedup_key` from normalized email plus source channel.
4. Check Airtable and HubSpot for an existing active lead with the same dedup key.
5. If duplicate exists, log `duplicate`, skip AI, and end.
6. If required fields are missing, write `manual_review` and end.
7. Send compact lead context to GPT-4 with a strict JSON schema.
8. Validate AI output and reject malformed or low-confidence responses.
9. Upsert lead to HubSpot with score, route reason, and owner.
10. Write the full audit row to Airtable.
11. If status is `qualified` or `nurture`, store a personalized first-touch draft and due date for human send.

## Reliability Controls
- Idempotency key: `dedup_key`.
- Retries: transient retries on OpenAI, HubSpot, and Airtable write nodes.
- Replay rule: only replay items in `manual_review` or `crm_sync_pending`.
- Duplicate guard: second pass checks both Airtable and HubSpot before create.

## Approval and Fallback
- No auto-send of outbound email in the portfolio version.
- Human rep reviews AI draft before send.
- If HubSpot write fails, Airtable becomes the temporary system of record with `crm_sync_pending`.

## Observability
- Airtable fields: `status`, `manual_review_reason`, `hubspot_sync_status`, `run_id`, `processed_at`, `confidence`.
- Daily review view for `manual_review`, `duplicate`, and `crm_sync_pending`.
- Alert threshold: more than 10% of submissions fail scoring or CRM sync in a day.

## Portability Notes
- Replace the form source without changing the core flow if it can emit the same webhook contract.
- Replace HubSpot with another CRM by swapping only the CRM upsert block and owner mapping table.
