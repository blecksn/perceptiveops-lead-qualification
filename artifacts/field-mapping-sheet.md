# Field Mapping Sheet

## Input to Normalized Contract

| Intake Field | Normalized Field | Notes |
|---|---|---|
| `submission_id` | `submission_id` | Preserved verbatim and written to Airtable for replay. |
| `submitted_at` | `submitted_at` | Must be ISO 8601. |
| `full_name` | `normalized_contact.full_name` | Trim whitespace. |
| `email` | `normalized_contact.email` | Lowercase and trim before dedup. |
| `phone` | `normalized_contact.phone` | Keep `+` if present; strip formatting noise. |
| `property_type` | `normalized_contact.property_type` | Optional. |
| `budget_range` | `normalized_contact.budget_range` | Optional. |
| `timeline` | `normalized_contact.timeline` | Optional. |
| `message` | `normalized_contact.message` | Collapse repeated whitespace. |
| `source_channel` | `normalized_contact.source_channel` | Lowercase slug used in `dedup_key`. |

## Normalized Contract to Airtable Audit

| Normalized / Derived Field | Airtable Field |
|---|---|
| `submission_id` | `submission_id` |
| `dedup_key` | `dedup_key` |
| `normalized_contact.full_name` | `full_name` |
| `normalized_contact.email` | `email` |
| `normalized_contact.phone` | `phone` |
| `normalized_contact.property_type` | `property_type` |
| `normalized_contact.budget_range` | `budget_range` |
| `normalized_contact.timeline` | `timeline` |
| `normalized_contact.message` | `message` |
| `normalized_contact.source_channel` | `source_channel` |
| `ai_score` | `lead_score` |
| `ai_segment` | `segment` |
| `ai_reasoning` | `qualification_reason` |
| `personalized_draft` | `personalized_draft` |
| `confidence` | `confidence` |
| `validation_flags[]` | `manual_review_reason` |
| `status` | `status` |
| `hubspot_contact_id` | `hubspot_contact_id` |
| `owner_assignment` | `owner_assignment` |
| `next_action` | `next_action` |
| `processed_at` | `processed_at` |
| `run_id` | `run_id` |
| CRM sync state | `hubspot_sync_status` |

## Normalized Contract to HubSpot

| Normalized / Derived Field | HubSpot Property | Notes |
|---|---|---|
| `normalized_contact.email` | `email` | Primary upsert key. |
| `normalized_contact.full_name` | `firstname` / `lastname` | Split in workflow if needed. |
| `normalized_contact.phone` | `phone` | Only overwrite if present. |
| `normalized_contact.property_type` | `property_interest` | Custom property. |
| `normalized_contact.budget_range` | `budget_range` | Custom property. |
| `normalized_contact.timeline` | `buying_timeline` | Custom property. |
| `normalized_contact.source_channel` | `lead_source_detail` | Preserve original channel. |
| `ai_score` | `lead_score` | Custom numeric property. |
| `ai_segment` | `lead_segment` | Custom enum property. |
| `ai_reasoning` | `qualification_reason` | Custom text property. |
| `dedup_key` | `dedup_key` | Custom text property used for duplicate suppression. |
| `run_id` | `last_qualification_run_id` | Traceability. |

## Required Custom Properties

- HubSpot: `lead_score`, `lead_segment`, `qualification_reason`, `dedup_key`, `property_interest`, `budget_range`, `buying_timeline`, `last_qualification_run_id`
- Airtable: all audit fields above, plus filtered views defined in `artifacts/dashboard-view-spec.md`
