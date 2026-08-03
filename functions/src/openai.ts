import { SanitizedSurvey } from "./survey";

export interface OpenAiEmailPhraseResult {
  userSuggestion: string;
  userPastExperience: string;
  emailSubject: string;
  responseId: string;
}

interface OpenAiResponse {
  id?: string;
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
    }>;
  }>;
}

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

export async function generateEmailPhrases(params: {
  apiKey: string;
  model: string;
  survey: SanitizedSurvey;
}): Promise<OpenAiEmailPhraseResult> {
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: params.model,
      instructions: [
        "You write concise email template variables for DreamSeal, a custom CPAP mask startup.",
        "Return three short phrases, not complete sentences.",
        "the first two phrases must naturally fit the following email template and must fit in completely naturally and be gramtically accurate: Hey, I'm reaching out because I saw your response about {{  user_suggestion }}, and I really want to learn more. I was wondering if you had 10-15 minutes really quickly to learn more about your experience. We are still at a very early stage and we need help from you in order for us to truly create the best fully-customized CPAP mask so that we can hopefully remove your problems with {{ user_past_experience }}.",
        "user_suggestion should summarize what the user wants improved or suggested, especially from improvements.",
        "user_past_experience should summarize the user's previous CPAP mask experience or pain point, especially from masksUsed.",
        "The last phrase you return is the email subject and should be a modification of either user_suggestion or user_past_experience, depending on which has more substance, if there are both similar then lean towards user_suggestion. The subject should be concise and catchy to encourage email opens and end with a question mark.",
        "Keep the first two phrases lowercase unless a brand/product name requires capitalization. ",
        "Do not end either phrase with punctuation.",
        "Do not include unnecessary age, city, or sensitive health details.",
        "Use only the survey facts provided. If details are sparse, keep the phrases general.",
        "Double check to make sure each phrase returned sounds completely natural and flows smoothly and is completely gramtically accurate. Add any words to make sure all the phrases naturally fit into the email template and sound completely natural. Do not return phrases that would make the email template sound robotic or AI-generated."
      ].join(" "),
      input: [
        {
          role: "user",
          content: JSON.stringify({
            task: "Create two short email-template phrases and one email subject for this survey respondent.",
            source_fields: {
              improvements: params.survey.improvements,
              masksUsed: params.survey.masksUsed,
            },
          }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "dreamseal_email_template_phrases",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              user_suggestion: {
                type: "string",
                minLength: 3,
                maxLength: 120,
              },
              user_past_experience: {
                type: "string",
                minLength: 3,
                maxLength: 120,
              },
              email_subject: {
                type: "string",
                minLength: 3,
                maxLength: 100,
              },
            },
            required: ["user_suggestion", "user_past_experience", "email_subject"],
          },
        },
      },
      max_output_tokens: 120,
      store: false,
    }),
  });

  const responseBody = await response.text();

  if (!response.ok) {
    throw new Error(`OpenAI request failed (${response.status}): ${responseBody}`);
  }

  const parsed = JSON.parse(responseBody) as OpenAiResponse;
  const outputText = extractOutputText(parsed);
  const outputJson = JSON.parse(outputText) as {
    user_suggestion?: unknown;
    user_past_experience?: unknown;
    email_subject?: unknown;
  };

  if (typeof outputJson.user_suggestion !== "string") {
    throw new Error("OpenAI response did not include user_suggestion");
  }

  if (typeof outputJson.user_past_experience !== "string") {
    throw new Error("OpenAI response did not include user_past_experience");
  }

  if (typeof outputJson.email_subject !== "string") {
    throw new Error("OpenAI response did not include email_subject");
  }

  const userSuggestion = cleanPhrase(outputJson.user_suggestion);
  const userPastExperience = cleanPhrase(outputJson.user_past_experience);
  const emailSubject = cleanSubject(outputJson.email_subject);

  if (!userSuggestion) {
    throw new Error("OpenAI response included an empty user_suggestion");
  }

  if (!userPastExperience) {
    throw new Error("OpenAI response included an empty user_past_experience");
  }

  if (!emailSubject) {
    throw new Error("OpenAI response included an empty email_subject");
  }

  return {
    userSuggestion,
    userPastExperience,
    emailSubject,
    responseId: parsed.id ?? "",
  };
}

function extractOutputText(response: OpenAiResponse): string {
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

function cleanPhrase(value: string): string {
  return value.trim().replace(/[.!?]+$/g, "");
}

function cleanSubject(value: string): string {
  return value.trim().replace(/[.!?]+$/g, "");
}
