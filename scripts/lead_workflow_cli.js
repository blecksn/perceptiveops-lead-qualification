#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const REQUIRED_FIELDS = [
  'submission_id',
  'submitted_at',
  'full_name',
  'email',
  'message',
  'source_channel'
];

function resolvePath(input) {
  return path.isAbsolute(input) ? input : path.resolve(process.cwd(), input);
}

function readJson(inputPath) {
  return JSON.parse(fs.readFileSync(resolvePath(inputPath), 'utf8'));
}

function writeJson(outputPath, value) {
  fs.writeFileSync(resolvePath(outputPath), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function parseArgs(argv) {
  const options = {
    input: null,
    existing: null,
    output: null,
    onlyStatus: null,
    reportInput: false,
    summary: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!options.input && !token.startsWith('--')) {
      options.input = token;
      continue;
    }
    if (token === '--existing') {
      options.existing = argv[index + 1];
      index += 1;
      continue;
    }
    if (token === '--output') {
      options.output = argv[index + 1];
      index += 1;
      continue;
    }
    if (token === '--only-status') {
      options.onlyStatus = argv[index + 1].split(',').map((item) => item.trim()).filter(Boolean);
      index += 1;
      continue;
    }
    if (token === '--report-input') {
      options.reportInput = true;
      continue;
    }
    if (token === '--summary') {
      options.summary = true;
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }

  if (!options.input) {
    throw new Error('Usage: node scripts/lead_workflow_cli.js <input.json> [--existing path] [--output path] [--summary]');
  }

  return options;
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizePhone(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return '';
  }
  const hasPlus = raw.startsWith('+');
  const digits = raw.replace(/[^\d]/g, '');
  return hasPlus ? `+${digits}` : digits;
}

function collapseWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function splitName(fullName) {
  const trimmed = collapseWhitespace(fullName);
  if (!trimmed) {
    return { firstName: '', lastName: '' };
  }
  const parts = trimmed.split(' ');
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ')
  };
}

function makeId(prefix, seed) {
  return `${prefix}_${crypto.createHash('sha1').update(seed).digest('hex').slice(0, 10)}`;
}

function buildRunId(submissionId, submittedAt) {
  return `run_${submissionId}_${submittedAt.replace(/[^0-9]/g, '').slice(0, 14)}`;
}

function normalizeLead(payload) {
  const normalized = {
    submission_id: String(payload.submission_id || '').trim(),
    submitted_at: String(payload.submitted_at || '').trim(),
    normalized_contact: {
      full_name: collapseWhitespace(payload.full_name),
      email: collapseWhitespace(payload.email).toLowerCase(),
      phone: normalizePhone(payload.phone),
      property_type: collapseWhitespace(payload.property_type),
      budget_range: collapseWhitespace(payload.budget_range),
      timeline: collapseWhitespace(payload.timeline),
      message: collapseWhitespace(payload.message),
      source_channel: slugify(payload.source_channel)
    },
    validation_flags: []
  };

  for (const field of REQUIRED_FIELDS) {
    if (!collapseWhitespace(payload[field])) {
      normalized.validation_flags.push(`missing_${field}`);
    }
  }

  if (normalized.normalized_contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.normalized_contact.email)) {
    normalized.validation_flags.push('invalid_email_format');
  }

  if (normalized.normalized_contact.message && normalized.normalized_contact.message.length < 30) {
    normalized.validation_flags.push('thin_message_context');
  }

  normalized.dedup_key = `${normalized.normalized_contact.email}|${normalized.normalized_contact.source_channel}`;
  return normalized;
}

function findDuplicate(stores, dedupKey) {
  if (!dedupKey || dedupKey.startsWith('|')) {
    return null;
  }
  const airtableRecord = stores.airtable.find((record) => record.dedup_key === dedupKey);
  const hubspotRecord = stores.hubspot.find((record) => record.dedup_key === dedupKey);
  if (!airtableRecord && !hubspotRecord) {
    return null;
  }
  return {
    airtable_record_id: airtableRecord ? airtableRecord.airtable_record_id : null,
    hubspot_contact_id: hubspotRecord ? hubspotRecord.hubspot_contact_id : null
  };
}

function findExistingContactByEmail(stores, email) {
  if (!email) {
    return null;
  }
  return stores.hubspot.find((record) => record.email === email) || null;
}

function buildDraft(name, angle, request) {
  const firstName = splitName(name).firstName || 'there';
  return `Hi ${firstName}, thanks for reaching out. Based on what you shared, ${angle}. If it helps, I can prepare a short list of options around your ${request.property_type || 'search'} goals and recommend the best next step for your ${request.timeline || 'timeline'}.`;
}

function scoreLead(normalizedLead, rawLead) {
  if (rawLead.simulate_ai_invalid) {
    return {
      score: 'not-a-number',
      segment: 'qualified'
    };
  }

  const flags = [...normalizedLead.validation_flags];
  const request = normalizedLead.normalized_contact;

  if (flags.some((flag) => flag.startsWith('missing_') || flag === 'invalid_email_format')) {
    return {
      score: 15,
      segment: 'manual_review',
      confidence: 0.35,
      qualification_reason: 'Required intake information is missing or invalid.',
      followup_angle: 'we need a valid email and a clearer intake record before sales outreach',
      draft_message: `Hi, thanks for your interest. Before we can route this to the right rep, could you reply with your preferred email address and a bit more detail about what you are looking for and your timing?`
    };
  }

  let score = 35;
  let confidence = 0.7;
  const reasons = [];
  const message = request.message.toLowerCase();
  const budget = request.budget_range.toLowerCase();
  const timeline = request.timeline.toLowerCase();

  if (request.phone) {
    score += 8;
    reasons.push('phone provided');
  }
  if (budget) {
    score += 10;
    reasons.push('budget provided');
  } else {
    confidence -= 0.1;
  }
  if (timeline.includes('30') || timeline.includes('45') || timeline.includes('60')) {
    score += 15;
    reasons.push('near-term timeline');
  } else if (timeline.includes('90') || timeline.includes('120') || timeline.includes('3-6')) {
    score += 4;
    reasons.push('longer timeline');
  } else if (!timeline) {
    confidence -= 0.12;
  }

  if (message.includes('pre-approval') || message.includes('relocating') || message.includes('move') || message.includes('schedule')) {
    score += 18;
    reasons.push('clear buying intent');
  }
  if (message.includes('investment') || message.includes('cap rate') || message.includes('tenant demand')) {
    score += 14;
    reasons.push('commercial intent and decision criteria');
  }
  if (message.includes('exploring') || message.includes('sense of')) {
    score -= 4;
    reasons.push('research phase');
  }
  if (message.includes('send options') || message.includes('something exceptional')) {
    confidence -= 0.18;
    reasons.push('request is vague');
  }
  if (flags.includes('thin_message_context')) {
    confidence -= 0.14;
  }

  if (budget.includes('1.2m') || budget.includes('1.5m') || budget.includes('900k') || budget.includes('1.1m')) {
    score += 8;
    reasons.push('high-value budget band');
  }

  score = Math.max(0, Math.min(100, score));
  confidence = Math.max(0.1, Math.min(0.98, Number(confidence.toFixed(2))));

  let segment = 'nurture';
  if (confidence < getLowConfidenceThreshold()) {
    segment = 'manual_review';
  } else if (score >= 70) {
    segment = 'qualified';
  } else if (score < 45) {
    segment = 'manual_review';
  }

  const qualificationReason = reasons.length
    ? `Lead scored based on ${reasons.join(', ')}.`
    : 'Lead requires human review because clear buying signals are limited.';
  const followupAngle = segment === 'qualified'
    ? 'the lead appears ready for a focused consult and property shortlist'
    : segment === 'nurture'
      ? 'the lead would benefit from a lower-pressure education-first follow-up'
      : 'the lead needs clearer scope before routing';

  return {
    score,
    segment,
    confidence,
    qualification_reason: qualificationReason,
    followup_angle: followupAngle,
    draft_message: buildDraft(request.full_name, followupAngle, request)
  };
}

function validateAiResult(result) {
  if (!result || typeof result !== 'object') {
    return 'AI result is not an object.';
  }
  if (!Number.isInteger(result.score) || result.score < 0 || result.score > 100) {
    return 'AI score is missing or outside 0-100.';
  }
  if (!['qualified', 'nurture', 'manual_review'].includes(result.segment)) {
    return 'AI segment is invalid.';
  }
  if (typeof result.confidence !== 'number' || result.confidence < 0 || result.confidence > 1) {
    return 'AI confidence is invalid.';
  }
  for (const key of ['qualification_reason', 'followup_angle', 'draft_message']) {
    if (typeof result[key] !== 'string' || !result[key].trim()) {
      return `AI field ${key} is missing.`;
    }
  }
  return null;
}

function getLowConfidenceThreshold() {
  return Number(process.env.LOW_CONFIDENCE_THRESHOLD || '0.65');
}

function buildAuditRecord({ rawLead, normalizedLead, aiResult, status, nextAction, duplicate, existingContact, hubspotContactId, hubspotSyncStatus, runId, manualReviewReason }) {
  return {
    airtable_record_id: makeId('rec', `${runId}:${normalizedLead.dedup_key}:${status}`),
    submission_id: normalizedLead.submission_id,
    dedup_key: normalizedLead.dedup_key,
    full_name: normalizedLead.normalized_contact.full_name,
    email: normalizedLead.normalized_contact.email,
    phone: normalizedLead.normalized_contact.phone,
    property_type: normalizedLead.normalized_contact.property_type,
    budget_range: normalizedLead.normalized_contact.budget_range,
    timeline: normalizedLead.normalized_contact.timeline,
    message: normalizedLead.normalized_contact.message,
    source_channel: normalizedLead.normalized_contact.source_channel,
    lead_score: aiResult ? aiResult.score : null,
    segment: aiResult ? aiResult.segment : null,
    qualification_reason: aiResult ? aiResult.qualification_reason : null,
    personalized_draft: aiResult ? aiResult.draft_message : null,
    confidence: aiResult ? aiResult.confidence : null,
    manual_review_reason: manualReviewReason || normalizedLead.validation_flags.join(', ') || null,
    status,
    hubspot_contact_id: hubspotContactId || (duplicate ? duplicate.hubspot_contact_id : null),
    hubspot_sync_status: hubspotSyncStatus,
    owner_assignment: status === 'qualified' ? 'sales-queue-a' : status === 'nurture' ? 'nurture-queue' : null,
    next_action: nextAction,
    processed_at: normalizedLead.submitted_at,
    run_id: runId,
    duplicate_of_airtable_record: duplicate ? duplicate.airtable_record_id : null,
    existing_email_match: existingContact ? existingContact.hubspot_contact_id : null,
    validation_flags: normalizedLead.validation_flags,
    simulated_failure: rawLead.simulate_hubspot_failure ? 'hubspot' : rawLead.simulate_ai_invalid ? 'ai' : null
  };
}

function processLead(rawLead, stores) {
  const normalizedLead = normalizeLead(rawLead);
  const runId = buildRunId(normalizedLead.submission_id, normalizedLead.submitted_at);
  const duplicate = findDuplicate(stores, normalizedLead.dedup_key);
  const existingContact = findExistingContactByEmail(stores, normalizedLead.normalized_contact.email);

  if (existingContact && normalizedLead.normalized_contact.phone && existingContact.phone && existingContact.phone !== normalizedLead.normalized_contact.phone) {
    normalizedLead.validation_flags.push('existing_contact_phone_mismatch');
  }

  if (duplicate) {
    const auditRecord = buildAuditRecord({
      rawLead,
      normalizedLead,
      aiResult: null,
      status: 'duplicate',
      nextAction: 'Suppress create and preserve prior audit trail.',
      duplicate,
      existingContact,
      hubspotContactId: duplicate.hubspot_contact_id,
      hubspotSyncStatus: 'skipped_duplicate',
      runId
    });
    stores.airtable.push(auditRecord);
    return { auditRecord, hubspotRecord: null, status: auditRecord.status };
  }

  if (normalizedLead.validation_flags.some((flag) => flag.startsWith('missing_') || flag === 'invalid_email_format')) {
    const aiResult = scoreLead(normalizedLead, rawLead);
    const auditRecord = buildAuditRecord({
      rawLead,
      normalizedLead,
      aiResult,
      status: 'manual_review',
      nextAction: 'Collect missing or invalid intake data and replay.',
      duplicate: null,
      existingContact,
      hubspotContactId: null,
      hubspotSyncStatus: 'skipped_validation',
      runId,
      manualReviewReason: normalizedLead.validation_flags.join(', ')
    });
    stores.airtable.push(auditRecord);
    return { auditRecord, hubspotRecord: null, status: auditRecord.status };
  }

  const aiResult = scoreLead(normalizedLead, rawLead);
  const aiValidationError = validateAiResult(aiResult);
  if (aiValidationError) {
    normalizedLead.validation_flags.push('ai_output_invalid');
    const auditRecord = buildAuditRecord({
      rawLead,
      normalizedLead,
      aiResult: null,
      status: 'manual_review',
      nextAction: 'Inspect AI output, correct the prompt or schema, then replay.',
      duplicate: null,
      existingContact,
      hubspotContactId: null,
      hubspotSyncStatus: 'skipped_ai_validation',
      runId,
      manualReviewReason: 'ai_output_invalid'
    });
    auditRecord.manual_review_reason = normalizedLead.validation_flags.join(', ');
    auditRecord.qualification_reason = aiValidationError;
    stores.airtable.push(auditRecord);
    return { auditRecord, hubspotRecord: null, status: auditRecord.status };
  }

  if (aiResult.confidence < getLowConfidenceThreshold() || aiResult.segment === 'manual_review') {
    const auditRecord = buildAuditRecord({
      rawLead,
      normalizedLead,
      aiResult,
      status: 'manual_review',
      nextAction: 'Human review required before CRM routing.',
      duplicate: null,
      existingContact,
      hubspotContactId: null,
      hubspotSyncStatus: 'skipped_low_confidence',
      runId,
      manualReviewReason: aiResult.confidence < getLowConfidenceThreshold() ? 'low_confidence' : aiResult.segment
    });
    stores.airtable.push(auditRecord);
    return { auditRecord, hubspotRecord: null, status: auditRecord.status };
  }

  const hubspotContactId = existingContact
    ? existingContact.hubspot_contact_id
    : makeId('hs', `${normalizedLead.normalized_contact.email}:${runId}`);
  const hubspotRecord = {
    hubspot_contact_id: hubspotContactId,
    dedup_key: normalizedLead.dedup_key,
    email: normalizedLead.normalized_contact.email,
    source_channel: normalizedLead.normalized_contact.source_channel,
    phone: normalizedLead.normalized_contact.phone,
    lead_score: aiResult.score,
    lead_segment: aiResult.segment,
    qualification_reason: aiResult.qualification_reason
  };

  if (rawLead.simulate_hubspot_failure) {
    const auditRecord = buildAuditRecord({
      rawLead,
      normalizedLead,
      aiResult,
      status: 'crm_sync_pending',
      nextAction: 'Retry HubSpot upsert after resolving the API or field mapping issue.',
      duplicate: null,
      existingContact,
      hubspotContactId,
      hubspotSyncStatus: 'failed_simulated',
      runId
    });
    stores.airtable.push(auditRecord);
    return { auditRecord, hubspotRecord: null, status: auditRecord.status };
  }

  const auditRecord = buildAuditRecord({
    rawLead,
    normalizedLead,
    aiResult,
    status: aiResult.segment,
    nextAction: aiResult.segment === 'qualified' ? 'Rep reviews the draft and makes first contact.' : 'Enroll in nurture queue and review the draft before sending.',
    duplicate: null,
    existingContact,
    hubspotContactId,
    hubspotSyncStatus: 'synced',
    runId
  });

  stores.hubspot = stores.hubspot.filter((record) => record.hubspot_contact_id !== hubspotContactId);
  stores.hubspot.push(hubspotRecord);
  stores.airtable.push(auditRecord);
  return { auditRecord, hubspotRecord, status: auditRecord.status };
}

function buildSummary(results) {
  const counts = results.reduce((accumulator, result) => {
    accumulator[result.status] = (accumulator[result.status] || 0) + 1;
    return accumulator;
  }, {});
  return {
    total: results.length,
    statuses: counts
  };
}

function normalizeInputRecords(records, reportInput) {
  if (!reportInput) {
    return records;
  }
  return records
    .filter((record) => record && record.auditRecord)
    .map((record) => ({
      submission_id: record.auditRecord.submission_id,
      submitted_at: record.auditRecord.processed_at,
      full_name: record.auditRecord.full_name,
      email: record.auditRecord.email,
      phone: record.auditRecord.phone,
      property_type: record.auditRecord.property_type,
      budget_range: record.auditRecord.budget_range,
      timeline: record.auditRecord.timeline,
      message: record.auditRecord.message,
      source_channel: record.auditRecord.source_channel,
      prior_status: record.auditRecord.status
    }));
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const rawFile = readJson(options.input);
  const rawInput = options.reportInput && rawFile && Array.isArray(rawFile.results) ? rawFile.results : rawFile;
  const filteredRawInput = options.onlyStatus
    ? rawInput.filter((record) => options.onlyStatus.includes(record.status || record.auditRecord?.status || record.prior_status))
    : rawInput;
  const inputRecords = normalizeInputRecords(filteredRawInput, options.reportInput);
  const existing = options.existing ? readJson(options.existing) : { airtable: [], hubspot: [] };
  const stores = {
    airtable: [...existing.airtable],
    hubspot: [...existing.hubspot]
  };

  const results = inputRecords.map((lead) => processLead(lead, stores));
  const report = {
    generated_at: new Date().toISOString(),
    low_confidence_threshold: getLowConfidenceThreshold(),
    input_count: inputRecords.length,
    summary: buildSummary(results),
    results
  };

  if (options.output) {
    writeJson(options.output, report);
  }

  if (options.summary) {
    console.log(JSON.stringify(report.summary, null, 2));
  } else {
    console.log(JSON.stringify(report, null, 2));
  }
}

main();
