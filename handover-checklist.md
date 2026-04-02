# Handover Checklist

## Ownership
- Primary owner: Automation lead
- Backup owner: Revenue operations analyst
- Review channel: `#automation-incidents`

## Access
- n8n credentials created for OpenAI, HubSpot, and Airtable.
- Form webhook secret documented outside the workflow.
- Google Apps Script project configured if Google Forms is used for intake.
- Airtable views shared with read access for demos and edit access for operators only.

## Operational Readiness
- Happy-path test passed for a complete new lead.
- Duplicate submission test passed.
- Low-confidence AI output test passed.
- HubSpot failure path reviewed with `crm_sync_pending`.
- Form submission forwarding to the webhook tested end to end.

## Documentation Readiness
- One-pager reviewed by a non-technical stakeholder.
- Architecture and runbook aligned on statuses and replay rules.
- Sample data spec uses fake names, emails, and phone numbers.
- README includes the form setup and manual implementation steps.

## Rollback
- Trigger: duplicate creation or CRM sync failures exceed threshold.
- Action: disable CRM create/update node and keep Airtable intake active.
- Verification: confirm all new submissions are retained for later replay.

## Signoff
- Business signoff:
- Technical signoff:
- Portfolio-ready date:
