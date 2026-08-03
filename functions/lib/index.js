"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSurveyFollowupEmail = void 0;
const crypto_1 = require("crypto");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const firestore_2 = require("firebase-functions/v2/firestore");
const params_1 = require("firebase-functions/params");
const firebase_functions_1 = require("firebase-functions");
const maileroo_1 = require("./maileroo");
const openai_1 = require("./openai");
const survey_1 = require("./survey");
(0, app_1.initializeApp)();
const OPENAI_API_KEY = (0, params_1.defineSecret)("OPENAI_API_KEY");
const MAILEROO_API_KEY = (0, params_1.defineSecret)("MAILEROO_API_KEY");
const OPENAI_MODEL = (0, params_1.defineString)("OPENAI_MODEL", { default: "gpt-5.4-mini" });
const MAILEROO_TEMPLATE_ID = (0, params_1.defineString)("MAILEROO_TEMPLATE_ID", { default: "7779" });
const MAILEROO_FROM_ADDRESS = (0, params_1.defineString)("MAILEROO_FROM_ADDRESS", {
    default: "shaheer@dreamseals.com",
});
const MAILEROO_FROM_NAME = (0, params_1.defineString)("MAILEROO_FROM_NAME", { default: "Shaheer Rehman" });
const MAILEROO_REPLY_TO_ADDRESS = (0, params_1.defineString)("MAILEROO_REPLY_TO_ADDRESS", { default: "shaheerkr77@gmail.com" });
const EMAIL_SUBJECT_PREFIX = "Your CPAP survey: ";
const MIN_EMAIL_SEND_DELAY_MINUTES = 10;
const MAX_EMAIL_SEND_DELAY_MINUTES = 20;
exports.sendSurveyFollowupEmail = (0, firestore_2.onDocumentUpdated)({
    document: "waitlist/{docId}",
    region: "us-central1",
    secrets: [OPENAI_API_KEY, MAILEROO_API_KEY],
    timeoutSeconds: 120,
    memory: "512MiB",
}, async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const ref = event.data?.after.ref;
    const docId = event.params.docId;
    if (!before || !after || !ref) {
        return;
    }
    const becameSurveyComplete = !before.surveyCompletedAt && Boolean(after.surveyCompletedAt);
    const retryRequested = before.emailStatus !== "pending" && after.emailStatus === "pending" && !after.emailSentAt;
    if (!becameSurveyComplete && !retryRequested) {
        return;
    }
    if (after.emailStatus === "sent" || after.emailSentAt) {
        return;
    }
    const db = (0, firestore_1.getFirestore)();
    const claim = await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);
        const current = snapshot.data();
        if (!current?.surveyCompletedAt || current.emailStatus === "sent" || current.emailSentAt) {
            return null;
        }
        if (current.emailStatus === "generating" ||
            current.emailStatus === "sending" ||
            current.emailStatus === "scheduled") {
            return null;
        }
        const email = (0, survey_1.extractEmail)(current.emailOrPhone);
        if (!email) {
            transaction.update(ref, {
                emailStatus: "skipped",
                emailError: "No valid email address found in emailOrPhone",
                emailLastAttemptAt: firestore_1.FieldValue.serverTimestamp(),
            });
            return null;
        }
        transaction.update(ref, {
            emailStatus: "generating",
            emailAttemptCount: firestore_1.FieldValue.increment(1),
            emailLastAttemptAt: firestore_1.FieldValue.serverTimestamp(),
            emailError: firestore_1.FieldValue.delete(),
        });
        return {
            data: current,
            email,
        };
    });
    if (!claim) {
        return;
    }
    try {
        const templateId = parseTemplateId(MAILEROO_TEMPLATE_ID.value());
        const firstName = (0, survey_1.getFirstName)(claim.data.userName);
        const referenceId = (0, survey_1.makeMailerooReferenceId)(docId);
        const emailSchedule = createRandomEmailSchedule();
        const generated = await (0, openai_1.generateEmailPhrases)({
            apiKey: OPENAI_API_KEY.value(),
            model: OPENAI_MODEL.value(),
            survey: (0, survey_1.sanitizeSurvey)(claim.data),
        });
        const emailSubject = `${EMAIL_SUBJECT_PREFIX}${generated.emailSubject}`;
        await ref.update({
            emailStatus: "sending",
            generatedUserSuggestion: generated.userSuggestion,
            generatedUserPastExperience: generated.userPastExperience,
            generatedEmailSubject: emailSubject,
            openaiResponseId: generated.responseId || firestore_1.FieldValue.delete(),
            emailLastAttemptAt: firestore_1.FieldValue.serverTimestamp(),
        });
        const maileroo = await (0, maileroo_1.sendMailerooTemplateEmail)({
            apiKey: MAILEROO_API_KEY.value(),
            templateId,
            fromAddress: MAILEROO_FROM_ADDRESS.value(),
            fromName: MAILEROO_FROM_NAME.value(),
            replyToAddress: normalizedOptionalParam(MAILEROO_REPLY_TO_ADDRESS.value()),
            toAddress: claim.email,
            toName: firstName,
            subject: emailSubject,
            referenceId,
            scheduledAt: emailSchedule.scheduledAtIso,
            templateData: {
                first_name: firstName,
                user_suggestion: generated.userSuggestion,
                user_past_experience: generated.userPastExperience,
                waitlist_doc_id: docId,
            },
        });
        await ref.update({
            emailStatus: "scheduled",
            emailScheduledFor: firestore_1.Timestamp.fromDate(emailSchedule.scheduledFor),
            emailScheduleDelayMinutes: emailSchedule.delayMinutes,
            emailLastAttemptAt: firestore_1.FieldValue.serverTimestamp(),
            mailerooReferenceId: maileroo.referenceId,
            emailError: firestore_1.FieldValue.delete(),
        });
        firebase_functions_1.logger.info("Scheduled survey follow-up email", {
            docId,
            scheduledAt: emailSchedule.scheduledAtIso,
            delayMinutes: emailSchedule.delayMinutes,
            mailerooReferenceId: maileroo.referenceId,
        });
    }
    catch (error) {
        const emailError = (0, survey_1.errorToMessage)(error);
        await ref.update({
            emailStatus: "failed",
            emailError,
            emailLastAttemptAt: firestore_1.FieldValue.serverTimestamp(),
        });
        firebase_functions_1.logger.error("Failed to send survey follow-up email", {
            docId,
            error: emailError,
        });
    }
});
function parseTemplateId(value) {
    const templateId = Number(value);
    if (!Number.isInteger(templateId) || templateId <= 0) {
        throw new Error("MAILEROO_TEMPLATE_ID must be set to a positive integer");
    }
    return templateId;
}
function normalizedOptionalParam(value) {
    const trimmed = value.trim();
    return trimmed || null;
}
function createRandomEmailSchedule() {
    const delayMinutes = (0, crypto_1.randomInt)(MIN_EMAIL_SEND_DELAY_MINUTES, MAX_EMAIL_SEND_DELAY_MINUTES + 1);
    const scheduledFor = new Date(Date.now() + delayMinutes * 60 * 1000);
    return {
        delayMinutes,
        scheduledAtIso: scheduledFor.toISOString(),
        scheduledFor,
    };
}
//# sourceMappingURL=index.js.map