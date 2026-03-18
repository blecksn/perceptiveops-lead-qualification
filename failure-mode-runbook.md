# Failure-Mode Runbook

## Purpose
Define how the operator detects, contains, and resolves common failures in the lead qualification workflow.

## Incident Levels
- P1: New inbound leads are not processed for 30 minutes during business hours.
- P2: CRM sync or AI scoring failures exceed 10% of daily volume.
- P3: Single-record failure with a clear manual workaround.

## Failure Scenarios

### 1) Webhook not receiving submissions
- Detection: Form submissions increase but n8n shows no runs.
- Containment: Pause outbound commitments and collect raw submissions from the form backend.
- Recovery: Validate webhook URL, secret, and form publish status; replay pending submissions once fixed.
- Human action: Confirm that no high-intent lead was missed.

### 2) Duplicate lead created in CRM
- Detection: Same email/source pair shows more than one active record.
- Containment: Disable CRM create node and preserve new submissions in Airtable only.
- Recovery: Merge duplicates in HubSpot, restore dedup lookup, replay only blocked records.
- Human action: Review whether dedup key should include phone or campaign source.

### 3) GPT-4 returns malformed or weak output
- Detection: JSON parse fails or `confidence < 0.65`.
- Containment: Route to `manual_review`; do not create score-based automation actions.
- Recovery: Retry once with a shorter prompt; if still invalid, keep the record for human scoring.
- Human action: Update prompt or schema example if failure recurs.

### 4) HubSpot API failure
- Detection: HubSpot node returns 429, 5xx, or schema error.
- Containment: Store lead in Airtable with `crm_sync_pending`.
- Recovery: Retry transient errors with backoff; fix field mapping for schema issues; replay from pending queue.
- Human action: Verify no lead owner assignment was lost.

### 5) Bad personalization draft
- Detection: Draft contains placeholders, incorrect tone, or prohibited claims.
- Containment: Mark `draft_rejected`; do not send externally.
- Recovery: Human rep edits manually; workflow remains successful because send is never automated in this version.
- Human action: Record prompt issue in reflection notes for future improvement.

## Replay Procedure
1. Identify the failed record and failure reason.
2. Fix the root issue first.
3. Replay only records in `manual_review` or `crm_sync_pending`.
4. Confirm Airtable status and HubSpot status align.

## Daily Operator Routine
- Review all `manual_review` leads.
- Check for duplicates and CRM backlog.
- Spot-check one AI-generated draft for quality drift.
