# Dashboard View Spec

## Airtable Views

### Manual Review Queue
- Filter: `status = manual_review`
- Sort: `processed_at` ascending
- Highlight: `confidence < 0.65`
- Key columns: `full_name`, `email`, `manual_review_reason`, `qualification_reason`, `processed_at`, `run_id`

### CRM Sync Pending
- Filter: `status = crm_sync_pending`
- Sort: `processed_at` ascending
- Key columns: `full_name`, `email`, `hubspot_sync_status`, `next_action`, `processed_at`

### Duplicate Suppression Log
- Filter: `status = duplicate`
- Sort: `processed_at` descending
- Key columns: `email`, `source_channel`, `dedup_key`, `next_action`, `processed_at`

### Qualified Follow-Up Queue
- Filter: `status = qualified`
- Sort: `processed_at` ascending
- Key columns: `full_name`, `lead_score`, `personalized_draft`, `owner_assignment`, `next_action`

### Nurture Queue
- Filter: `status = nurture`
- Sort: `processed_at` ascending
- Key columns: `full_name`, `lead_score`, `qualification_reason`, `personalized_draft`, `next_action`

## Metrics Block

- `Daily submissions`: count of all records created today
- `Daily duplicates`: count of `status = duplicate` today
- `Daily manual review rate`: `manual_review / total`
- `Daily CRM pending rate`: `crm_sync_pending / total`
- `Qualified today`: count of `status = qualified` today
- Alert threshold: flag operator review when `manual_review + crm_sync_pending > 10%` of daily volume

## Demo-Friendly Layout

1. Top row: daily counts and exception rates
2. Middle row: `Qualified Follow-Up Queue` and `Manual Review Queue`
3. Bottom row: `CRM Sync Pending` and `Duplicate Suppression Log`

## Operating Rule

The operator starts each day with `Manual Review Queue`, then clears `CRM Sync Pending`, then spot-checks one record from `Qualified Follow-Up Queue` for draft quality drift.
