# PerceptiveOps Lead Qualification

This repo now contains an implementation-ready proof-of-concept for inbound lead qualification. It includes the `n8n` workflow handoff artifact, the missing operational deliverables, and a local dry-run engine that exercises the same business rules without requiring live Airtable, HubSpot, or OpenAI credentials.

## What This Repo Does

This pack is designed to help you implement the workflow end to end in a controlled way.

The target flow is:

1. A lead form submits to an `n8n` webhook.
2. `n8n` validates and normalizes the payload.
3. `n8n` checks Airtable and HubSpot for duplicates.
4. Only valid, non-duplicate leads go to OpenAI for scoring and draft generation.
5. `n8n` validates the AI response against the JSON schema.
6. Qualified or nurture leads are upserted into HubSpot.
7. Every run is written to Airtable for audit and review.
8. Low-confidence, malformed, duplicate, or CRM-failed records are routed into review queues instead of being silently dropped.

This repo gives you:

- the workflow design and node logic
- the field mappings
- a form scaffold and webhook-forwarding scripts for Google Forms
- the fake data needed for testing
- a local verifier so you can test decision logic before touching live systems

This repo does not fully auto-provision HubSpot, Airtable, or `n8n` for you. Those parts still require manual implementation.

## Included

- `workflows/perceptiveops-lead-qualification.workflow.json`: `n8n` workflow blueprint with node-by-node logic, environment variable references, and failure branches.
- `scripts/lead_workflow_cli.js`: local verifier that simulates validation, dedup, AI scoring, CRM upsert, audit logging, and replay-safe runs.
- `scripts/create_lead_intake_form.gs`: Google Apps Script that creates a lead intake Google Form with sample options and a linked response sheet.
- `scripts/push_form_responses_to_webhook.gs`: Google Apps Script that forwards each form submission to the `n8n` webhook contract.
- `fixtures/test-leads.json`: 10-record demo dataset that matches the sample-data spec.
- `fixtures/verification-cases.json`: extended verification cases that also exercise malformed AI output and CRM failure handling.
- `artifacts/airtable-leads-table-template.csv`: importable Airtable CSV to create the leads audit table structure quickly.
- `artifacts/field-mapping-sheet.md`: Airtable and HubSpot field mapping.
- `artifacts/intake-form-spec.csv`: form field spec with sample property, budget, timeline, and source-channel options.
- `artifacts/dashboard-view-spec.md`: Airtable review queues and dashboard definitions.
- `artifacts/replay-procedure.md`: operator replay workflow and local replay command pattern.

## End-to-End Implementation

Follow this order. It keeps the cheap setup and validation work ahead of the live integrations.

### 1. Review the contracts first

Read these files before building:

- `automation-architecture.md`
- `artifacts/field-mapping-sheet.md`
- `configs/lead_scoring_prompt.txt`
- `configs/lead_score_schema.json`

This is the source of truth for:

- required fields
- output statuses
- duplicate rules
- AI response shape
- CRM and Airtable mappings

### 2. Verify the logic locally

Run the local verifier before configuring any live system:

```bash
npm run verify
```

Run the demo dataset:

```bash
npm run verify:sample
```

This proves the following behavior works in the local model:

- valid leads can become `qualified` or `nurture`
- duplicates are suppressed
- incomplete leads become `manual_review`
- invalid AI output becomes `manual_review`
- simulated HubSpot failure becomes `crm_sync_pending`

The verification output is written to `artifacts/verification-report.json`.

### 3. Prepare Airtable

Create one Airtable base for the audit trail and review queues.

Fastest setup path:

1. Import `artifacts/airtable-leads-table-template.csv` into Airtable to create the base table.
2. Delete the placeholder row after import.
3. Confirm field names and types against:

- `artifacts/field-mapping-sheet.md`

Then create the views listed in:

- `artifacts/dashboard-view-spec.md`

Minimum result:

- one table for audit rows
- one `manual_review` view
- one `crm_sync_pending` view
- one `duplicate` view
- one `qualified` follow-up view
- one `nurture` view

### 4. Prepare the intake form

If you want a quick demo-ready intake form, use the included Google Apps Script:

- `scripts/create_lead_intake_form.gs`

That script creates:

- a Google Form
- sample select options for property type, budget range, timeline, and source channel
- a linked spreadsheet for responses

Then add the webhook forwarding script:

- `scripts/push_form_responses_to_webhook.gs`

That script:

- listens for form submissions in the linked response sheet
- generates `submission_id`
- converts the submission timestamp to ISO format
- pushes the normalized payload to the `n8n` webhook

If you do not want Google Forms, use:

- `artifacts/intake-form-spec.csv`

to recreate the same form in Tally, Typeform, Airtable Forms, or another tool.

### 5. Prepare HubSpot

Create or confirm the custom contact properties referenced in:

- `artifacts/field-mapping-sheet.md`

At minimum, HubSpot needs custom properties for:

- `lead_score`
- `lead_segment`
- `qualification_reason`
- `dedup_key`
- `property_interest`
- `budget_range`
- `buying_timeline`
- `last_qualification_run_id`

You also need:

- a private app token with CRM object access
- the target pipeline or routing destination

### 6. Prepare OpenAI settings

Decide which model you will use for the structured scoring call.

Populate `.env.example` values into your real `n8n` environment or secrets store:

- `OPENAI_MODEL`
- `LOW_CONFIDENCE_THRESHOLD`
- `WEBHOOK_SHARED_SECRET`
- `HUBSPOT_PRIVATE_APP_TOKEN`
- `HUBSPOT_PIPELINE_ID`
- `AIRTABLE_PAT`
- `AIRTABLE_BASE_ID`
- `AIRTABLE_TABLE_LEADS`

### 7. Build the workflow in `n8n`

Use `workflows/perceptiveops-lead-qualification.workflow.json` as the blueprint and recreate the flow in `n8n`.

The key nodes to build are:

1. Webhook trigger
2. Normalize and validate code node
3. Airtable duplicate lookup
4. HubSpot duplicate lookup
5. Dedup decision branch
6. OpenAI scoring node
7. AI schema validation branch
8. HubSpot upsert node
9. Airtable audit writers for:
   - success
   - duplicate
   - manual review
   - CRM sync pending
10. Webhook response nodes

### 8. Run live integration tests

Use records from:

- `fixtures/test-leads.json`

Recommended test order:

1. one complete high-intent lead
2. one duplicate of that lead
3. one incomplete lead
4. one vague lead that should fall into manual review

Confirm after each run:

- Airtable record was written
- status is correct
- HubSpot only changed when expected
- no duplicate CRM record was created

### 9. Validate operations and replay

Before calling the implementation complete, confirm:

- `manual_review` queue is visible
- `crm_sync_pending` queue is visible
- duplicate log is visible
- replay procedure is documented and usable

Use:

- `artifacts/replay-procedure.md`
- `failure-mode-runbook.md`
- `handover-checklist.md`

## Local Verification

Run the full dry-run verification:

```bash
npm run verify
```

Run only the portfolio demo dataset:

```bash
npm run verify:sample
```

The verification run writes `artifacts/verification-report.json` and prints a status summary. No network calls are made in this mode.

## Manual Implementation Still Required

These steps are not completed automatically by this repo and must be done by hand.

### In Airtable

- create the base
- import or create the leads table
- add the audit fields
- create the views in `artifacts/dashboard-view-spec.md`
- share the correct operator permissions

### In the Form Layer

- run `scripts/create_lead_intake_form.gs` or recreate the form from `artifacts/intake-form-spec.csv`
- run `scripts/push_form_responses_to_webhook.gs`
- set the real webhook URL and shared secret
- install the form-submit trigger in Apps Script
- verify one live submission reaches `n8n`

### In HubSpot

- create the custom contact properties
- create or confirm the target pipeline/stage strategy
- create the private app token
- confirm the dedup and upsert behavior against real contact data

### In `n8n`

- recreate the workflow nodes from the blueprint
- connect credentials
- wire each branch
- add retries or error-routing behavior on the HubSpot and Airtable nodes
- test that the webhook secret is enforced

### In OpenAI

- choose the production model
- configure the credential in `n8n`
- confirm the response format works with your chosen node and model combination

### In Operations

- decide who owns the queues
- decide who approves drafts
- decide when `crm_sync_pending` must be replayed
- decide when high manual-review rates should trigger an incident

## What Is Already Implemented in the Repo

- workflow architecture and branching rules
- AI prompt and schema
- field mapping documentation
- Airtable table import template
- Google Form creation script
- Google Form to webhook forwarding script
- demo and verification datasets
- deterministic local workflow verifier
- replay guidance and dashboard spec

## What Is Not Yet Implemented as Live Automation

- an actual deployed `n8n` workflow
- a deployed and authorized Apps Script project
- live Airtable base and views
- live HubSpot custom properties and routing
- live OpenAI credential wiring
- live webhook endpoint exposed to a real form
- production monitoring and alerting outside the documented runbook

## Notes

- The local verifier uses deterministic scoring so the decision logic is repeatable during handoff and review.
- In the `n8n` workflow, AI output is expected to validate against `configs/lead_score_schema.json` before any CRM write.
- Human reps still send the first outreach. The workflow generates drafts only.
