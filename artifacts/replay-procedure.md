# Replay Procedure

## Operator Steps

1. Confirm the failed records are in `manual_review` or `crm_sync_pending`.
2. Fix the root issue first.
3. Re-run only the affected submissions.
4. Confirm the new run updates Airtable and HubSpot consistently.
5. Do not replay `duplicate` records unless the dedup rule itself was wrong.

## Local Dry-Run Replay

Replay only failed statuses from the verification report:

```bash
node scripts/lead_workflow_cli.js artifacts/verification-report.json --report-input --only-status manual_review,crm_sync_pending --existing fixtures/mock-existing-leads.json --summary
```

Replay the extended verification dataset after changing a rule:

```bash
node scripts/lead_workflow_cli.js fixtures/verification-cases.json --existing fixtures/mock-existing-leads.json --summary
```

## `n8n` Replay Guidance

1. Filter Airtable for `manual_review` or `crm_sync_pending`.
2. Export those records or feed them into a dedicated replay sub-workflow.
3. Keep the original `submission_id` and recompute `run_id`.
4. Re-run dedup before AI and CRM sync so replay stays idempotent.

## Safe Replay Rules

- Preserve the original `submission_id`.
- Never bypass dedup or schema validation on replay.
- If HubSpot failed previously, replay after the field mapping or API issue is resolved.
- If AI output was invalid, rerun only after the prompt, schema, or parsing node is corrected.
