# Build Spec

## Objective
Package an implementation-ready proof-of-concept for inbound lead qualification without delivering a live workflow.

## Modules
1. Intake webhook and payload validation
2. Dedup check across Airtable and HubSpot
3. AI scoring and segmentation
4. Personalized draft generation
5. CRM upsert
6. Audit write and review queue handling

## Required Config
- `OPENAI_MODEL`
- `HUBSPOT_PIPELINE_ID`
- `AIRTABLE_BASE_ID`
- `AIRTABLE_TABLE_LEADS`
- `LOW_CONFIDENCE_THRESHOLD`
- `WEBHOOK_SHARED_SECRET`

## Core Decisions
- Human sends the first outreach; automation drafts only.
- Airtable stores audit and manual-review metadata.
- HubSpot remains the sales system of record.
- AI output must validate against schema before any write.

## Edge Cases to Build For
- Missing email or message
- Duplicate email/source pair
- Existing CRM contact with different phone number
- Low-confidence score
- Malformed JSON output
- HubSpot rate-limit response

## Deliverables
- n8n workflow outline
- field mapping sheet
- test dataset
- replay procedure
- dashboard view for review queues
