"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const maileroo_1 = require("./maileroo");
const originalFetch = globalThis.fetch;
(0, node_test_1.afterEach)(() => {
    globalThis.fetch = originalFetch;
});
(0, node_test_1.test)("sends generic email immediately without scheduled_at", async () => {
    let requestBody;
    globalThis.fetch = async (_input, init) => {
        requestBody = JSON.parse(String(init?.body));
        return new Response(JSON.stringify({ success: true, data: { reference_id: "abcdef1234567890abcdef12" } }), { status: 200 });
    };
    await (0, maileroo_1.sendMailerooTemplateEmail)({
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
    strict_1.default.equal(requestBody?.scheduled_at, undefined);
    strict_1.default.deepEqual(requestBody?.tags, {
        source: "generic-followup",
        waitlist_doc_id: "document-id",
    });
});
(0, node_test_1.test)("keeps personalized email scheduling", async () => {
    let requestBody;
    globalThis.fetch = async (_input, init) => {
        requestBody = JSON.parse(String(init?.body));
        return new Response(JSON.stringify({ success: true }), { status: 200 });
    };
    await (0, maileroo_1.sendMailerooTemplateEmail)({
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
    strict_1.default.equal(requestBody?.scheduled_at, "2026-08-03T06:00:00.000Z");
});
//# sourceMappingURL=maileroo.test.js.map