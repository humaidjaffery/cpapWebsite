import { createHash } from "crypto";

export type SurveyDocument = Record<string, unknown>;

export interface SanitizedSurvey {
  name: string | null;
  usedCpap: string | null;
  cpapDuration: string | null;
  masksUsed: string | null;
  satisfaction: string | null;
  improvements: string | null;
  maskArtIdeas: string | null;
  maskArtInterest: string | null;
  maskArtExtra: string | null;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function extractEmail(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const email = value.trim().toLowerCase();
  return EMAIL_PATTERN.test(email) ? email : null;
}

export function getFirstName(value: unknown): string {
  if (typeof value !== "string") {
    return "there";
  }

  const firstName = value.trim().split(/\s+/)[0];
  return firstName || "there";
}

export function makeMailerooReferenceId(docId: string): string {
  return createHash("sha256").update(docId).digest("hex").slice(0, 24);
}

export function sanitizeSurvey(data: SurveyDocument): SanitizedSurvey {
  return {
    name: optionalText(data.userName, 80),
    usedCpap: optionalText(data.usedCpap, 20),
    cpapDuration: optionalText(data.cpapDuration, 80),
    masksUsed: optionalText(data.masksUsed, 500),
    satisfaction: optionalText(data.satisfaction, 20),
    improvements: optionalText(data.improvements, 1200),
    maskArtIdeas: optionalText(data.maskArtIdeas, 800),
    maskArtInterest: optionalText(data.maskArtInterest, 20),
    maskArtExtra: optionalText(data.maskArtExtra, 120),
  };
}

export function errorToMessage(error: unknown): string {
  if (error instanceof Error) {
    return truncate(error.message, 1000);
  }

  return truncate(String(error), 1000);
}

function optionalText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? truncate(trimmed, maxLength) : null;
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}
