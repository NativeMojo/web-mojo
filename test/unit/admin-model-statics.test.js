/**
 * Admin model statics — registration regression tests.
 *
 * Each migrated admin model should expose the form / view-class
 * statics that admin TablePages rely on. The static can be registered
 * either at the bottom of the model file (preferred for shared
 * models) or at the top of the consuming TablePage file (preferred
 * for page-coupled models). This test verifies the source-text
 * shape of each registration site so accidental removal during
 * future refactors fails CI.
 *
 * Per planning/requests/admin-tablepages-ux-sweep.md (commit 3).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

module.exports = async function (testContext) {
  const { describe, it, expect } = testContext;

  describe('Model form statics (registered on the model file)', () => {
    const cases = [
      // [file, expectedStatic regex]
      ['src/extensions/admin/models/Incident.js',  /Incident\.ADD_FORM\s*=\s*IncidentForms\.create/],
      ['src/extensions/admin/models/Incident.js',  /Incident\.EDIT_FORM\s*=\s*IncidentForms\.edit/],
      ['src/extensions/admin/models/Incident.js',  /IncidentEvent\.EDIT_FORM\s*=\s*IncidentEventForms\.edit/],
      ['src/extensions/admin/models/Tickets.js',   /Ticket\.ADD_FORM\s*=\s*TicketForms\.create/],
      ['src/extensions/admin/models/Tickets.js',   /Ticket\.EDIT_FORM\s*=\s*TicketForms\.edit/],
      ['src/extensions/admin/models/Email.js',     /EmailDomain\.ADD_FORM\s*=\s*EmailDomainForms\.create/],
      ['src/extensions/admin/models/Email.js',     /EmailDomain\.EDIT_FORM\s*=\s*EmailDomainForms\.edit/],
      ['src/extensions/admin/models/Email.js',     /Mailbox\.ADD_FORM\s*=\s*MailboxForms\.create/],
      ['src/extensions/admin/models/Email.js',     /Mailbox\.EDIT_FORM\s*=\s*MailboxForms\.edit/],
      ['src/extensions/admin/models/Email.js',     /EmailTemplate\.ADD_FORM\s*=\s*EmailTemplateForms\.create/],
      ['src/extensions/admin/models/Email.js',     /EmailTemplate\.EDIT_FORM\s*=\s*EmailTemplateForms\.edit/],
      ['src/extensions/admin/models/Push.js',      /PushConfig\.ADD_FORM\s*=\s*PushConfigForms\.create/],
      ['src/extensions/admin/models/Push.js',      /PushConfig\.EDIT_FORM\s*=\s*PushConfigForms\.edit/],
      ['src/extensions/admin/models/Push.js',      /PushTemplate\.ADD_FORM\s*=\s*PushTemplateForms\.create/],
      ['src/extensions/admin/models/Push.js',      /PushTemplate\.EDIT_FORM\s*=\s*PushTemplateForms\.edit/],
      ['src/extensions/admin/models/Push.js',      /PushDevice\.VIEW_CLASS\s*=\s*PushDeviceView/],
      ['src/extensions/admin/models/Bouncer.js',   /BouncerSignature\.ADD_FORM\s*=\s*BouncerSignatureForms\.create/],
      ['src/extensions/admin/models/Bouncer.js',   /BouncerSignature\.EDIT_FORM\s*=\s*BouncerSignatureForms\.edit/],
      ['src/extensions/admin/models/IPSet.js',     /IPSet\.EDIT_FORM\s*=\s*IPSetForms\.edit/],
      ['src/extensions/admin/models/AWS.js',       /S3Bucket\.ADD_FORM\s*=\s*S3BucketForms\.create/],
      ['src/extensions/admin/models/AWS.js',       /S3Bucket\.EDIT_FORM\s*=\s*S3BucketForms\.edit/],
      ['src/core/models/Files.js',                 /FileManager\.ADD_FORM\s*=\s*FileManagerForms\.create/],
      ['src/core/models/Files.js',                 /FileManager\.EDIT_FORM\s*=\s*FileManagerForms\.edit/],
      ['src/core/models/Files.js',                 /File\.EDIT_FORM\s*=\s*FileForms\.edit/]
    ];

    cases.forEach(([file, re]) => {
      it(`${file} — registers ${re.source}`, () => {
        const src = read(file);
        expect(re.test(src)).toBe(true);
      });
    });
  });

  describe('Model VIEW_CLASS statics (registered at top of TablePage)', () => {
    const cases = [
      ['src/extensions/admin/account/groups/GroupTablePage.js',                /Group\.VIEW_CLASS\s*=\s*GroupView/],
      ['src/extensions/admin/account/users/MemberTablePage.js',                /Member\.VIEW_CLASS\s*=\s*MemberView/],
      ['src/extensions/admin/account/devices/UserDeviceTablePage.js',          /UserDevice\.VIEW_CLASS\s*=\s*DeviceView/],
      ['src/extensions/admin/account/devices/GeoLocatedIPTablePage.js',        /GeoLocatedIP\.VIEW_CLASS\s*=\s*GeoIPView/],
      ['src/extensions/admin/incidents/IncidentTablePage.js',                  /Incident\.VIEW_CLASS\s*=\s*IncidentView/],
      ['src/extensions/admin/incidents/EventTablePage.js',                     /IncidentEvent\.VIEW_CLASS\s*=\s*EventView/],
      ['src/extensions/admin/incidents/RuleSetTablePage.js',                   /RuleSet\.VIEW_CLASS\s*=\s*RuleSetView/],
      ['src/extensions/admin/incidents/TicketTablePage.js',                    /Ticket\.VIEW_CLASS\s*=\s*TicketView/],
      ['src/extensions/admin/messaging/email/EmailTemplateTablePage.js',       /EmailTemplate\.VIEW_CLASS\s*=\s*EmailTemplateView/],
      ['src/extensions/admin/messaging/email/SentMessageTablePage.js',         /SentMessage\.VIEW_CLASS\s*=\s*EmailView/],
      ['src/extensions/admin/messaging/PublicMessageTablePage.js',             /PublicMessage\.VIEW_CLASS\s*=\s*PublicMessageView/],
      ['src/extensions/admin/messaging/push/PushDeliveryTablePage.js',         /PushDelivery\.VIEW_CLASS\s*=\s*PushDeliveryView/],
      ['src/extensions/admin/messaging/sms/PhoneNumberTablePage.js',           /PhoneNumber\.VIEW_CLASS\s*=\s*PhoneNumberView/],
      ['src/extensions/admin/messaging/sms/SMSTablePage.js',                   /SMS\.VIEW_CLASS\s*=\s*SMSView/],
      ['src/extensions/admin/monitoring/LogTablePage.js',                      /Log\.VIEW_CLASS\s*=\s*LogView/],
      ['src/extensions/admin/monitoring/MetricsPermissionsTablePage.js',       /MetricsPermission\.VIEW_CLASS\s*=\s*MetricsPermissionsView/],
      ['src/extensions/admin/security/IPSetTablePage.js',                      /IPSet\.VIEW_CLASS\s*=\s*IPSetView/],
      ['src/extensions/admin/security/BouncerDeviceTablePage.js',              /BouncerDevice\.VIEW_CLASS\s*=\s*BouncerDeviceView/],
      ['src/extensions/admin/security/BouncerSignalTablePage.js',              /BouncerSignal\.VIEW_CLASS\s*=\s*BouncerSignalView/],
      ['src/extensions/admin/shortlinks/ShortLinkTablePage.js',                /ShortLink\.VIEW_CLASS\s*=\s*ShortLinkView/],
      ['src/extensions/admin/storage/FileTablePage.js',                        /File\.VIEW_CLASS\s*=\s*FileView/],
      ['src/extensions/admin/assistant/AssistantConversationTablePage.js',     /AssistantConversation\.VIEW_CLASS\s*=\s*AssistantConversationView/],
      ['src/extensions/admin/assistant/AssistantSkillTablePage.js',            /AssistantSkill\.VIEW_CLASS\s*=\s*AssistantSkillView/]
    ];

    cases.forEach(([file, re]) => {
      it(`${file} — registers ${re.source}`, () => {
        const src = read(file);
        expect(re.test(src)).toBe(true);
      });
    });
  });

  describe('Inline duplication removed', () => {
    // After commit 3, pages whose model now carries the static must NOT
    // re-declare `formCreate:` / `formEdit:` / `itemViewClass:` in the
    // constructor — that re-introduces the duplication this commit
    // collapsed. (Pages still listed below either keep no inline form
    // config, OR have a custom Add flow that justifies the remaining
    // override; those are expected to use `onAdd:` instead.)
    const offenders = [
      'src/extensions/admin/account/groups/GroupTablePage.js',
      'src/extensions/admin/account/users/MemberTablePage.js',
      'src/extensions/admin/incidents/IncidentTablePage.js',
      'src/extensions/admin/incidents/EventTablePage.js',
      'src/extensions/admin/incidents/RuleSetTablePage.js',
      'src/extensions/admin/incidents/TicketTablePage.js',
      'src/extensions/admin/messaging/email/EmailTemplateTablePage.js',
      'src/extensions/admin/messaging/email/EmailDomainTablePage.js',
      'src/extensions/admin/messaging/email/EmailMailboxTablePage.js',
      'src/extensions/admin/messaging/email/SentMessageTablePage.js',
      'src/extensions/admin/messaging/push/PushConfigTablePage.js',
      'src/extensions/admin/messaging/push/PushTemplateTablePage.js',
      'src/extensions/admin/messaging/push/PushDeliveryTablePage.js',
      'src/extensions/admin/messaging/push/PushDeviceTablePage.js',
      'src/extensions/admin/security/BotSignatureTablePage.js',
      'src/extensions/admin/security/BouncerDeviceTablePage.js',
      'src/extensions/admin/security/BouncerSignalTablePage.js',
      'src/extensions/admin/security/IPSetTablePage.js',
      'src/extensions/admin/storage/S3BucketTablePage.js',
      'src/extensions/admin/storage/FileManagerTablePage.js'
    ];

    offenders.forEach((rel) => {
      it(`${rel} — no inline \`formCreate:\` / \`formEdit:\` / \`itemViewClass:\``, () => {
        const src = read(rel);
        // The bare config-key shape — at start of a line after whitespace.
        expect(/^\s*formCreate\s*:/m.test(src)).toBe(false);
        expect(/^\s*formEdit\s*:/m.test(src)).toBe(false);
        expect(/^\s*itemViewClass\s*:/m.test(src)).toBe(false);
      });
    });
  });
};
