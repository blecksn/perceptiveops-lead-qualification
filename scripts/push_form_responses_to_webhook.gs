const WEBHOOK_CONFIG = {
  webhookUrl: 'https://your-n8n-host/webhook/perceptiveops-lead-intake',
  webhookSecret: 'replace-with-your-shared-secret',
  defaultSourceChannel: 'website',
  requestTimeoutSeconds: 30
};

function onFormSubmit(e) {
  const payload = buildWebhookPayload_(e);
  const response = pushPayloadToWebhook_(payload);
  Logger.log(
    JSON.stringify(
      {
        message: 'Lead pushed to webhook.',
        payload,
        statusCode: response.getResponseCode(),
        responseBody: response.getContentText()
      },
      null,
      2
    )
  );
}

function installSpreadsheetFormSubmitTrigger() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error('Open the response spreadsheet before running installSpreadsheetFormSubmitTrigger().');
  }

  const existing = ScriptApp.getProjectTriggers().find(
    (trigger) =>
      trigger.getHandlerFunction() === 'onFormSubmit' &&
      trigger.getEventType() === ScriptApp.EventType.ON_FORM_SUBMIT
  );

  if (existing) {
    Logger.log('A form submit trigger for onFormSubmit already exists.');
    return;
  }

  ScriptApp.newTrigger('onFormSubmit')
    .forSpreadsheet(spreadsheet)
    .onFormSubmit()
    .create();

  Logger.log(`Installed onFormSubmit trigger for spreadsheet ${spreadsheet.getId()}`);
}

function replayLastSubmission() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    throw new Error('No form response rows found.');
  }

  const headers = values[0];
  const lastRow = values[values.length - 1];
  const namedValues = {};

  headers.forEach((header, index) => {
    namedValues[String(header)] = [lastRow[index]];
  });

  const payload = buildWebhookPayloadFromNamedValues_(namedValues);
  const response = pushPayloadToWebhook_(payload);

  Logger.log(
    JSON.stringify(
      {
        message: 'Replayed last submission to webhook.',
        payload,
        statusCode: response.getResponseCode(),
        responseBody: response.getContentText()
      },
      null,
      2
    )
  );
}

function buildWebhookPayload_(e) {
  if (e && e.namedValues) {
    return buildWebhookPayloadFromNamedValues_(e.namedValues);
  }

  if (e && e.response) {
    return buildWebhookPayloadFromFormResponse_(e.response);
  }

  throw new Error('Unsupported event object. Expected a form submit trigger event.');
}

function buildWebhookPayloadFromNamedValues_(namedValues) {
  const timestampRaw = firstValue_(namedValues.Timestamp) || firstValue_(namedValues['Submitted At']);

  return {
    submission_id: Utilities.getUuid(),
    submitted_at: toIsoString_(timestampRaw || new Date()),
    full_name: firstValue_(namedValues['Full Name']),
    email: firstValue_(namedValues.Email),
    phone: firstValue_(namedValues.Phone),
    property_type: firstValue_(namedValues['Property Type']),
    budget_range: firstValue_(namedValues['Budget Range']),
    timeline: firstValue_(namedValues.Timeline),
    message: firstValue_(namedValues['How can we help?']),
    source_channel: firstValue_(namedValues['Source Channel']) || WEBHOOK_CONFIG.defaultSourceChannel
  };
}

function buildWebhookPayloadFromFormResponse_(response) {
  const itemResponses = response.getItemResponses();
  const answersByTitle = {};

  itemResponses.forEach((itemResponse) => {
    answersByTitle[itemResponse.getItem().getTitle()] = itemResponse.getResponse();
  });

  return {
    submission_id: Utilities.getUuid(),
    submitted_at: toIsoString_(response.getTimestamp()),
    full_name: safeString_(answersByTitle['Full Name']),
    email: safeString_(answersByTitle.Email),
    phone: safeString_(answersByTitle.Phone),
    property_type: safeString_(answersByTitle['Property Type']),
    budget_range: safeString_(answersByTitle['Budget Range']),
    timeline: safeString_(answersByTitle.Timeline),
    message: safeString_(answersByTitle['How can we help?']),
    source_channel: safeString_(answersByTitle['Source Channel']) || WEBHOOK_CONFIG.defaultSourceChannel
  };
}

function pushPayloadToWebhook_(payload) {
  if (!WEBHOOK_CONFIG.webhookUrl || WEBHOOK_CONFIG.webhookUrl.indexOf('https://') !== 0) {
    throw new Error('Set WEBHOOK_CONFIG.webhookUrl to your live HTTPS webhook URL.');
  }

  const response = UrlFetchApp.fetch(WEBHOOK_CONFIG.webhookUrl, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    headers: {
      'x-webhook-secret': WEBHOOK_CONFIG.webhookSecret
    },
    muteHttpExceptions: true
  });

  const statusCode = response.getResponseCode();
  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(
      `Webhook request failed with ${statusCode}: ${response.getContentText()}`
    );
  }

  return response;
}

function firstValue_(value) {
  if (Array.isArray(value)) {
    return safeString_(value[0]);
  }
  return safeString_(value);
}

function safeString_(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

function toIsoString_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }
  return parsed.toISOString();
}
