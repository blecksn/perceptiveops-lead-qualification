const FORM_CONFIG = {
  title: 'PerceptiveOps Lead Intake',
  description: [
    'Use this form to capture inbound lead requests for qualification and routing.',
    'Sample options are included for property type, budget range, and timeline.',
    'Google Forms will capture the response timestamp automatically in the linked sheet.'
  ].join('\n\n'),
  confirmationMessage: 'Thanks. Your request has been received and will be reviewed shortly.',
  spreadsheetName: 'PerceptiveOps Lead Intake Responses',
  propertyTypes: [
    '3-bedroom home',
    'Condo',
    'Townhome',
    'Single-family home',
    'Investment property',
    'Luxury property'
  ],
  budgetRanges: [
    '<$350k',
    '$350k-$500k',
    '$500k-$650k',
    '$650k-$850k',
    '$850k-$1.1m',
    '$1.1m-$1.5m',
    '$1.5m+'
  ],
  timelines: [
    'ASAP',
    'Within 30 days',
    'Within 60 days',
    'Within 90 days',
    '3-6 months',
    '6+ months'
  ],
  sourceChannels: [
    'website',
    'instagram',
    'partner-referral',
    'paid-search',
    'event'
  ]
};

function createLeadIntakeForm() {
  const form = FormApp.create(FORM_CONFIG.title);
  form.setDescription(FORM_CONFIG.description);
  form.setConfirmationMessage(FORM_CONFIG.confirmationMessage);
  form.setAllowResponseEdits(false);
  form.setAcceptingResponses(true);
  form.setShowLinkToRespondAgain(false);
  form.setProgressBar(true);

  addTextItem_(form, 'Full Name', true, 'Jordan Reed');
  addEmailItem_(form, 'Email', true, 'jordan@example.com');
  addTextItem_(form, 'Phone', false, '+1 555 010 1001');
  addMultipleChoiceItem_(form, 'Property Type', false, FORM_CONFIG.propertyTypes);
  addMultipleChoiceItem_(form, 'Budget Range', false, FORM_CONFIG.budgetRanges);
  addMultipleChoiceItem_(form, 'Timeline', false, FORM_CONFIG.timelines);
  addParagraphTextItem_(
    form,
    'How can we help?',
    true,
    'We are relocating next month and want to schedule viewings this week.'
  );
  addMultipleChoiceItem_(form, 'Source Channel', true, FORM_CONFIG.sourceChannels);

  const spreadsheet = SpreadsheetApp.create(FORM_CONFIG.spreadsheetName);
  form.setDestination(FormApp.DestinationType.SPREADSHEET, spreadsheet.getId());

  const result = {
    formId: form.getId(),
    editUrl: form.getEditUrl(),
    publishedUrl: form.getPublishedUrl(),
    spreadsheetId: spreadsheet.getId(),
    spreadsheetUrl: spreadsheet.getUrl()
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function addTextItem_(form, title, required, helpText) {
  const item = form.addTextItem().setTitle(title).setRequired(required);
  if (helpText) {
    item.setHelpText(helpText);
  }
  return item;
}

function addEmailItem_(form, title, required, helpText) {
  const item = form.addTextItem().setTitle(title).setRequired(required);
  item.setValidation(
    FormApp.createTextValidation()
      .requireTextIsEmail()
      .setHelpText('Enter a valid email address.')
      .build()
  );
  if (helpText) {
    item.setHelpText(helpText);
  }
  return item;
}

function addParagraphTextItem_(form, title, required, helpText) {
  const item = form.addParagraphTextItem().setTitle(title).setRequired(required);
  if (helpText) {
    item.setHelpText(helpText);
  }
  return item;
}

function addMultipleChoiceItem_(form, title, required, choices) {
  return form
    .addMultipleChoiceItem()
    .setTitle(title)
    .setChoiceValues(choices)
    .setRequired(required);
}
