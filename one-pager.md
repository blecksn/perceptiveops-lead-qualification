# Lead Qualification & Nurturing Automation

**Owner:** PerceptiveOps Projects Documentation
**Last Updated:** 2026-03-18
**Key Links:** Asana task `https://app.asana.com/1/1198984568520915/project/1213727021120023/task/1213726995378042` | GitHub repo `https://github.com/blecksn/perceptiveops-lead-qualification` | One-pager `https://github.com/blecksn/perceptiveops-lead-qualification/blob/main/one-pager.md`

---

## Purpose & Success Criteria

**Who it is for:** Revenue teams in real estate and other service businesses that rely on inbound lead forms and manual follow-up.
**Problem:** New leads arrive at unpredictable times, sales reps respond inconsistently, and poor-fit leads consume the same effort as high-intent prospects.
**What it does:** The automation captures inbound form submissions, scores lead quality with GPT-4, routes each lead into HubSpot, logs the decision trail in Airtable, and drafts personalized follow-up for the rep.
**Success looks like:** Every qualified lead is routed within 5 minutes, duplicates are suppressed, low-confidence AI outputs are flagged for review, and reps can demonstrate a repeatable follow-up process using sample data.

## How It Works

A prospect submits a lead form. The workflow validates the payload, checks whether the lead already exists, enriches and scores the lead with AI, then writes the result to HubSpot and Airtable. Qualified leads trigger a personalized first-touch draft, while uncertain or incomplete leads are sent to a review queue so the team can correct the record before outreach.

## How to Use It

1. Submit a lead through the approved intake form with name, email, phone, property interest, budget, and message.
2. Wait for the lead to appear in Airtable and HubSpot with a status of `qualified`, `nurture`, `manual_review`, or `duplicate`.
3. Open the Airtable pipeline view to review score rationale, assignment status, and generated follow-up content.
4. If anything looks wrong, inspect the `manual_review_reason` field and replay only after the record is corrected.

## Appendix

**Assumptions:** Form submissions use fake or anonymized demo data; HubSpot has custom properties for lead score and qualification reason; Airtable is the audit layer, not the source CRM.
**Known Limitations:** AI scoring is advisory and should not auto-reject strategic accounts; enrichment is limited to fields already provided on the form; multilingual sentiment is out of scope for this pack.
**Troubleshooting:** If scoring fails, send the lead to `manual_review`; if HubSpot is unavailable, log the payload in Airtable with `crm_sync_pending`; if a lead appears twice, investigate the dedup key before replay.
