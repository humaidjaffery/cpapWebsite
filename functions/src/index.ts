import { randomInt } from "crypto";
import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret, defineString } from "firebase-functions/params";
import { logger } from "firebase-functions";
import { sendMailerooTemplateEmail } from "./maileroo";
import { generateEmailPhrases } from "./openai";
import {
  errorToMessage,
  extractEmail,
  getFirstName,
  makeMailerooReferenceId,
  sanitizeSurvey,
  SurveyDocument,
} from "./survey";

initializeApp();

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");
const MAILEROO_API_KEY = defineSecret("MAILEROO_API_KEY");

const OPENAI_MODEL = defineString("OPENAI_MODEL", { default: "gpt-5.4-mini" });
const MAILEROO_TEMPLATE_ID = defineString("MAILEROO_TEMPLATE_ID", { default: "7779" });
const MAILEROO_FROM_ADDRESS = defineString("MAILEROO_FROM_ADDRESS", {
  default: "shaheer@dreamseals.com",
});
const MAILEROO_FROM_NAME = defineString("MAILEROO_FROM_NAME", { default: "Shaheer Rehman" });
const MAILEROO_REPLY_TO_ADDRESS = defineString("MAILEROO_REPLY_TO_ADDRESS", { default: "shaheerkr77@gmail.com" });

const EMAIL_SUBJECT_PREFIX = "Your CPAP survey: ";
const MIN_EMAIL_SEND_DELAY_MINUTES = 1;
const MAX_EMAIL_SEND_DELAY_MINUTES = 10;
const GENERIC_EMAIL_DELAY_MS = 60 * 60 * 1000;
const GENERIC_EMAIL_BATCH_SIZE = 25;
const GENERIC_EMAIL_SUBJECT = "Could a better-fitting CPAP mask help?";
const GENERIC_USER_SUGGESTION =
  "your interest in a CPAP mask designed around a more comfortable, reliable fit";
const GENERIC_USER_PAST_EXPERIENCE =
  "the fit, comfort, and seal issues that can make standard CPAP masks frustrating";

export const initializeWaitlistEmailStatus = onDocumentCreated(
  {
    document: "waitlist/{docId}",
    region: "us-central1",
  },
  async (event) => {
    const ref = event.data?.ref;
    if (!ref) {
      return;
    }

    await getFirestore().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) {
        return;
      }

      const current = snapshot.data() as SurveyDocument;
      const emailMetadata: Record<string, unknown> = {};

      if (!current.emailStatus) {
        emailMetadata.emailStatus = "pending";
      }

      if (typeof current.emailAttemptCount !== "number") {
        emailMetadata.emailAttemptCount = 0;
      }

      if (!current.emailStatusUpdatedAt) {
        emailMetadata.emailStatusUpdatedAt = FieldValue.serverTimestamp();
      }

      if (!current.genericEmailDueAt && !current.surveyCompletedAt && !current.emailSentAt) {
        emailMetadata.genericEmailDueAt = Timestamp.fromMillis(
          Date.now() + GENERIC_EMAIL_DELAY_MS,
        );
      }

      if (Object.keys(emailMetadata).length > 0) {
        transaction.update(ref, emailMetadata);
      }
    });
  },
);

export const sendSurveyFollowupEmail = onDocumentUpdated(
  {
    document: "waitlist/{docId}",
    region: "us-central1",
    secrets: [OPENAI_API_KEY, MAILEROO_API_KEY],
    timeoutSeconds: 120,
    memory: "512MiB",
  },
  async (event) => {
    const before = event.data?.before.data() as SurveyDocument | undefined;
    const after = event.data?.after.data() as SurveyDocument | undefined;
    const ref = event.data?.after.ref;
    const docId = event.params.docId;

    if (!before || !after || !ref) {
      return;
    }

    const becameSurveyComplete = !before.surveyCompletedAt && Boolean(after.surveyCompletedAt);
    const retryRequested =
      before.emailStatus !== "pending" && after.emailStatus === "pending" && !after.emailSentAt;

    if (!becameSurveyComplete && !retryRequested) {
      return;
    }

    if (after.emailStatus === "sent" || after.emailSentAt) {
      return;
    }

    const db = getFirestore();
    const claim = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      const current = snapshot.data() as SurveyDocument | undefined;

      if (!current?.surveyCompletedAt || current.emailStatus === "sent" || current.emailSentAt) {
        return null;
      }

      if (
        current.emailStatus === "generating" ||
        current.emailStatus === "sending" ||
        current.emailStatus === "scheduled"
      ) {
        return null;
      }

      const email = extractEmail(current.emailOrPhone);
      if (!email) {
        transaction.update(ref, {
          emailStatus: "skipped",
          emailStatusUpdatedAt: FieldValue.serverTimestamp(),
          emailError: "No valid email address found in emailOrPhone",
          emailLastAttemptAt: FieldValue.serverTimestamp(),
        });
        return null;
      }

      transaction.update(ref, {
        emailStatus: "generating",
        emailStatusUpdatedAt: FieldValue.serverTimestamp(),
        emailAttemptCount: FieldValue.increment(1),
        emailLastAttemptAt: FieldValue.serverTimestamp(),
        emailKind: "personalized",
        genericEmailDueAt: FieldValue.delete(),
        emailError: FieldValue.delete(),
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
      const firstName = getFirstName(claim.data.userName);
      const referenceId = makeMailerooReferenceId(docId);
      const emailSchedule = createRandomEmailSchedule();
      const generated = await generateEmailPhrases({
        apiKey: OPENAI_API_KEY.value(),
        model: OPENAI_MODEL.value(),
        survey: sanitizeSurvey(claim.data),
      });
      const emailSubject = `${EMAIL_SUBJECT_PREFIX}${generated.emailSubject}`;

      await ref.update({
        emailStatus: "sending",
        emailStatusUpdatedAt: FieldValue.serverTimestamp(),
        generatedUserSuggestion: generated.userSuggestion,
        generatedUserPastExperience: generated.userPastExperience,
        generatedEmailSubject: emailSubject,
        openaiResponseId: generated.responseId || FieldValue.delete(),
        emailLastAttemptAt: FieldValue.serverTimestamp(),
      });

      const maileroo = await sendMailerooTemplateEmail({
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
        emailStatusUpdatedAt: FieldValue.serverTimestamp(),
        emailScheduledFor: Timestamp.fromDate(emailSchedule.scheduledFor),
        emailScheduleDelayMinutes: emailSchedule.delayMinutes,
        emailLastAttemptAt: FieldValue.serverTimestamp(),
        mailerooReferenceId: maileroo.referenceId,
        emailError: FieldValue.delete(),
      });

      logger.info("Scheduled survey follow-up email", {
        docId,
        scheduledAt: emailSchedule.scheduledAtIso,
        delayMinutes: emailSchedule.delayMinutes,
        mailerooReferenceId: maileroo.referenceId,
      });
    } catch (error) {
      const emailError = errorToMessage(error);
      await ref.update({
        emailStatus: "failed",
        emailStatusUpdatedAt: FieldValue.serverTimestamp(),
        emailError,
        emailLastAttemptAt: FieldValue.serverTimestamp(),
      });

      logger.error("Failed to send survey follow-up email", {
        docId,
        error: emailError,
      });
    }
  },
);

export const sendGenericWaitlistEmail = onSchedule(
  {
    schedule: "every 5 minutes",
    region: "us-central1",
    secrets: [MAILEROO_API_KEY],
    timeoutSeconds: 300,
    memory: "256MiB",
  },
  async () => {
    const db = getFirestore();
    const dueSnapshot = await db
      .collection("waitlist")
      .where("genericEmailDueAt", "<=", Timestamp.now())
      .limit(GENERIC_EMAIL_BATCH_SIZE)
      .get();

    for (const snapshot of dueSnapshot.docs) {
      const claim = await db.runTransaction(async (transaction) => {
        const currentSnapshot = await transaction.get(snapshot.ref);
        const current = currentSnapshot.data() as SurveyDocument | undefined;
        const dueAt = current?.genericEmailDueAt;

        if (
          !current ||
          current.surveyCompletedAt ||
          current.emailStatus !== "pending" ||
          current.emailSentAt ||
          !(dueAt instanceof Timestamp) ||
          dueAt.toMillis() > Date.now()
        ) {
          return null;
        }

        const email = extractEmail(current.emailOrPhone);
        if (!email) {
          transaction.update(snapshot.ref, {
            emailStatus: "skipped",
            emailStatusUpdatedAt: FieldValue.serverTimestamp(),
            emailError: "No valid email address found in emailOrPhone",
            emailLastAttemptAt: FieldValue.serverTimestamp(),
            genericEmailDueAt: FieldValue.delete(),
          });
          return null;
        }

        transaction.update(snapshot.ref, {
          emailStatus: "sending",
          emailStatusUpdatedAt: FieldValue.serverTimestamp(),
          emailAttemptCount: FieldValue.increment(1),
          emailLastAttemptAt: FieldValue.serverTimestamp(),
          emailKind: "generic",
          genericEmailDueAt: FieldValue.delete(),
          emailError: FieldValue.delete(),
        });

        return {
          email,
          firstName: getFirstName(current.userName),
        };
      });

      if (!claim) {
        continue;
      }

      try {
        const referenceId = makeMailerooReferenceId(snapshot.id);
        const maileroo = await sendMailerooTemplateEmail({
          apiKey: MAILEROO_API_KEY.value(),
          templateId: parseTemplateId(MAILEROO_TEMPLATE_ID.value()),
          fromAddress: MAILEROO_FROM_ADDRESS.value(),
          fromName: MAILEROO_FROM_NAME.value(),
          replyToAddress: normalizedOptionalParam(MAILEROO_REPLY_TO_ADDRESS.value()),
          toAddress: claim.email,
          toName: claim.firstName,
          subject: GENERIC_EMAIL_SUBJECT,
          referenceId,
          tagSource: "generic-followup",
          templateData: {
            first_name: claim.firstName,
            user_suggestion: GENERIC_USER_SUGGESTION,
            user_past_experience: GENERIC_USER_PAST_EXPERIENCE,
            waitlist_doc_id: snapshot.id,
          },
        });

        await snapshot.ref.update({
          emailStatus: "sent",
          emailStatusUpdatedAt: FieldValue.serverTimestamp(),
          emailSentAt: FieldValue.serverTimestamp(),
          emailLastAttemptAt: FieldValue.serverTimestamp(),
          generatedEmailSubject: GENERIC_EMAIL_SUBJECT,
          generatedUserSuggestion: GENERIC_USER_SUGGESTION,
          generatedUserPastExperience: GENERIC_USER_PAST_EXPERIENCE,
          mailerooReferenceId: maileroo.referenceId,
          emailError: FieldValue.delete(),
        });

        logger.info("Sent generic waitlist email", {
          docId: snapshot.id,
          mailerooReferenceId: maileroo.referenceId,
        });
      } catch (error) {
        const emailError = errorToMessage(error);
        await snapshot.ref.update({
          emailStatus: "failed",
          emailStatusUpdatedAt: FieldValue.serverTimestamp(),
          emailError,
          emailLastAttemptAt: FieldValue.serverTimestamp(),
        });

        logger.error("Failed to send generic waitlist email", {
          docId: snapshot.id,
          error: emailError,
        });
      }
    }
  },
);

function parseTemplateId(value: string): number {
  const templateId = Number(value);
  if (!Number.isInteger(templateId) || templateId <= 0) {
    throw new Error("MAILEROO_TEMPLATE_ID must be set to a positive integer");
  }

  return templateId;
}

function normalizedOptionalParam(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

function createRandomEmailSchedule(): {
  delayMinutes: number;
  scheduledAtIso: string;
  scheduledFor: Date;
} {
  const delayMinutes = randomInt(
    MIN_EMAIL_SEND_DELAY_MINUTES,
    MAX_EMAIL_SEND_DELAY_MINUTES + 1,
  );
  const scheduledFor = new Date(Date.now() + delayMinutes * 60 * 1000);

  return {
    delayMinutes,
    scheduledAtIso: scheduledFor.toISOString(),
    scheduledFor,
  };
}
