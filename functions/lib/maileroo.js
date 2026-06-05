"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMailerooTemplateEmail = sendMailerooTemplateEmail;
const MAILEROO_TEMPLATE_URL = "https://smtp.maileroo.com/api/v2/emails/template";
async function sendMailerooTemplateEmail(params) {
    const body = {
        from: {
            address: params.fromAddress,
            display_name: params.fromName,
        },
        to: {
            address: params.toAddress,
            display_name: params.toName,
        },
        subject: params.subject,
        template_id: params.templateId,
        template_data: params.templateData,
        tracking: true,
        tags: {
            source: "survey-complete",
            waitlist_doc_id: params.templateData.waitlist_doc_id,
        },
        reference_id: params.referenceId,
    };
    if (params.replyToAddress) {
        body.reply_to = {
            address: params.replyToAddress,
            display_name: params.fromName,
        };
    }
    const response = await fetch(MAILEROO_TEMPLATE_URL, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${params.apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });
    const responseBody = await response.text();
    if (!response.ok) {
        throw new Error(`Maileroo request failed (${response.status}): ${responseBody}`);
    }
    const parsed = JSON.parse(responseBody);
    if (parsed.success === false) {
        throw new Error(`Maileroo request failed: ${parsed.message ?? responseBody}`);
    }
    return {
        referenceId: parsed.data?.reference_id ?? params.referenceId,
    };
}
//# sourceMappingURL=maileroo.js.map