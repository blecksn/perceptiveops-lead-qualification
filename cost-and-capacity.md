# Cost and Capacity

## Expected Workload
- Typical volume: 10-40 new leads per day.
- Peak periods: campaign launches and weekend property ads.
- Qualified rate assumption: 20-35%.

## Cost Drivers
- GPT-4 scoring and draft generation.
- HubSpot API activity if enrichment or owner lookups expand.
- Airtable base size and automation views.

## Cost Controls
- Reject duplicates and incomplete leads before AI.
- Use one structured AI call for scoring and draft rationale instead of multiple passes.
- Skip AI draft generation when status is `manual_review`.
- Cache owner mapping and scoring rules in Airtable config rather than repeated lookup APIs.

## Capacity Assumptions
- Low concurrency with brief bursts.
- Response target: score and route within 5 minutes.
- Human review queue should stay below 10% of submissions.

## Scaling Notes
- For multi-brand use, add a `brand_id` config lookup at intake.
- For high volume, split intake, scoring, and CRM sync into separate sub-workflows.
- For stricter SLAs, queue submissions before AI to smooth spikes.

## Spend Monitoring
- Alert if AI calls exceed submitted leads minus duplicates by more than 5%.
- Alert if `manual_review` exceeds 15% of submissions for two days.
- Review monthly cost per qualified lead.
