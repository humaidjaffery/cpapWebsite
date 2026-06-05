"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePersonalizedSnippet = generatePersonalizedSnippet;
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
async function generatePersonalizedSnippet(params) {
    const response = await fetch(OPENAI_RESPONSES_URL, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${params.apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: params.model,
            instructions: [
                "You write concise startup waitlist follow-up copy for DreamSeal, a custom CPAP mask startup.",
                "Generate only one warm personalized paragraph for an email template.",
                "Do not give medical advice.",
                "Do not claim the product treats, cures, prevents, or diagnoses any condition.",
                "Do not mention FDA approval, insurance coverage, clinical validation, timelines, discounts, or pricing promises.",
                "Do not include unnecessary age, city, or sensitive health details.",
                "Use only the survey facts provided. If details are sparse, keep the paragraph general.",
            ].join(" "),
            input: [
                {
                    role: "user",
                    content: JSON.stringify({
                        task: "Write a short personalized snippet for this survey respondent.",
                        survey: params.survey,
                    }),
                },
            ],
            text: {
                format: {
                    type: "json_schema",
                    name: "dreamseal_personalized_email_snippet",
                    strict: true,
                    schema: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                            personalized_snippet: {
                                type: "string",
                                minLength: 80,
                                maxLength: 600,
                            },
                        },
                        required: ["personalized_snippet"],
                    },
                },
            },
            max_output_tokens: 220,
            store: false,
        }),
    });
    const responseBody = await response.text();
    if (!response.ok) {
        throw new Error(`OpenAI request failed (${response.status}): ${responseBody}`);
    }
    const parsed = JSON.parse(responseBody);
    const outputText = extractOutputText(parsed);
    const outputJson = JSON.parse(outputText);
    if (typeof outputJson.personalized_snippet !== "string") {
        throw new Error("OpenAI response did not include personalized_snippet");
    }
    const personalizedSnippet = outputJson.personalized_snippet.trim();
    if (!personalizedSnippet) {
        throw new Error("OpenAI response included an empty personalized_snippet");
    }
    return {
        personalizedSnippet,
        responseId: parsed.id ?? "",
    };
}
function extractOutputText(response) {
    if (typeof response.output_text === "string" && response.output_text.trim()) {
        return response.output_text;
    }
    for (const output of response.output ?? []) {
        for (const content of output.content ?? []) {
            if (typeof content.text === "string" && content.text.trim()) {
                return content.text;
            }
        }
    }
    throw new Error("OpenAI response did not include output text");
}
//# sourceMappingURL=openai.js.map