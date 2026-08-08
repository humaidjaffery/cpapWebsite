import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { sendMailerooTemplateEmail } from "./maileroo";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("sends generic email immediately without scheduled_at", async () => {
  let requestBody: Record<string, unknown> | undefined;
  globalThis.fetch = async (_input, init) => {
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(
      JSON.stringify({ success: true, data: { reference_id: "abcdef1234567890abcdef12" } }),
      { status: 200 },
    );
  };

  await sendMailerooTemplateEmail({
    apiKey: "test-key",
    templateId: 7779,
    fromAddress: "sender@example.com",
    fromName: "Sender",
    replyToAddress: null,
    toAddress: "person@example.com",
    toName: "there",
    subject: "Generic subject",
    referenceId: "abcdef1234567890abcdef12",
    tagSource: "generic-followup",
    templateData: {
      first_name: "there",
      user_suggestion: "a better fit",
      user_past_experience: "standard mask discomfort",
      waitlist_doc_id: "document-id",
    },
  });

  assert.equal(requestBody?.scheduled_at, undefined);
  assert.deepEqual(requestBody?.tags, {
    source: "generic-followup",
    waitlist_doc_id: "document-id",
  });
});

test("keeps personalized email scheduling", async () => {
  let requestBody: Record<string, unknown> | undefined;
  globalThis.fetch = async (_input, init) => {
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  };

  await sendMailerooTemplateEmail({
    apiKey: "test-key",
    templateId: 7779,
    fromAddress: "sender@example.com",
    fromName: "Sender",
    replyToAddress: null,
    toAddress: "person@example.com",
    toName: "Person",
    subject: "Personalized subject",
    referenceId: "abcdef1234567890abcdef12",
    scheduledAt: "2026-08-03T06:00:00.000Z",
    templateData: {
      first_name: "Person",
      user_suggestion: "a better fit",
      user_past_experience: "standard mask discomfort",
      waitlist_doc_id: "document-id",
    },
  });

  assert.equal(requestBody?.scheduled_at, "2026-08-03T06:00:00.000Z");
});
