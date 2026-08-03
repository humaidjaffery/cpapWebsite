"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractEmail = extractEmail;
exports.getFirstName = getFirstName;
exports.makeMailerooReferenceId = makeMailerooReferenceId;
exports.sanitizeSurvey = sanitizeSurvey;
exports.errorToMessage = errorToMessage;
const crypto_1 = require("crypto");
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function extractEmail(value) {
    if (typeof value !== "string") {
        return null;
    }
    const email = value.trim().toLowerCase();
    return EMAIL_PATTERN.test(email) ? email : null;
}
function getFirstName(value) {
    if (typeof value !== "string") {
        return "there";
    }
    const firstName = value.trim().split(/\s+/)[0];
    return firstName || "there";
}
function makeMailerooReferenceId(docId) {
    return (0, crypto_1.createHash)("sha256").update(docId).digest("hex").slice(0, 24);
}
function sanitizeSurvey(data) {
    return {
        name: optionalText(data.userName, 80),
        usedCpap: optionalText(data.usedCpap, 20),
        cpapDuration: optionalText(data.cpapDuration, 80),
        masksUsed: optionalText(data.masksUsed, 500),
        satisfaction: optionalText(data.satisfaction, 20),
        improvements: optionalText(data.improvements, 1200),
        maskArtInterest: optionalText(data.maskArtInterest, 20),
        maskArtExtra: optionalText(data.maskArtExtra, 120),
    };
}
function errorToMessage(error) {
    if (error instanceof Error) {
        return truncate(error.message, 1000);
    }
    return truncate(String(error), 1000);
}
function optionalText(value, maxLength) {
    if (typeof value !== "string") {
        return null;
    }
    const trimmed = value.trim();
    return trimmed ? truncate(trimmed, maxLength) : null;
}
function truncate(value, maxLength) {
    return value.length > maxLength ? value.slice(0, maxLength) : value;
}
//# sourceMappingURL=survey.js.map