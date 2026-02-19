export type MenuAnalysis = {
  topPicks: { name: string; reason: string; tags: string[] }[];
  caution: { name: string; reason: string; tags: string[] }[];
  avoid: { name: string; reason: string; tags: string[] }[];
  warnings: string[];
};

const MENU_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    topPicks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          reason: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
        },
        required: ["name", "reason", "tags"],
      },
    },
    caution: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          reason: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
        },
        required: ["name", "reason", "tags"],
      },
    },
    avoid: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          reason: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
        },
        required: ["name", "reason", "tags"],
      },
    },
    warnings: { type: "array", items: { type: "string" } },
  },
  required: ["topPicks", "caution", "avoid", "warnings"],
} as const;

export async function analyzeMenuWithGemini(params: {
  imageBase64: string;
  mimeType: string;
  userGoal: "Lose fat" | "Maintain weight" | "Gain muscle";
  dietPrefs: string[];
  allergies: string[];
}): Promise<MenuAnalysis> {
  const key = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!key) throw new Error("Missing EXPO_PUBLIC_GEMINI_API_KEY");

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
    encodeURIComponent(key);

  const prompt = `
Return ONLY JSON. No markdown. No extra text.

Goal: ${params.userGoal}
Diet preferences: ${params.dietPrefs.join(", ") || "none"}
Allergies: ${params.allergies.join(", ") || "none"}

Task:
- Analyze the menu photo.
- Return dishes in 3 groups: topPicks, caution, avoid.
- Return up to 3 dishes per group.
- Each dish: name, short reason, 0-3 tags.
- Add warnings array.
`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: params.mimeType,
              data: params.imageBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      response_mime_type: "application/json",
      response_json_schema: MENU_SCHEMA,
      temperature: 0.2,
      maxOutputTokens: 1200,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini error ${res.status}: ${errText}`);
  }

  const data = await res.json();

  const raw =
    data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join("") ?? "";

  if (!raw) throw new Error("Empty model response");

  try {
    return JSON.parse(raw) as MenuAnalysis;
  } catch (parseError) {
    // Retry with stricter prompt
    const retryPrompt = `Return ONLY JSON. No markdown. No extra text.

Goal: ${params.userGoal}
Diet preferences: ${params.dietPrefs.join(", ") || "none"}
Allergies: ${params.allergies.join(", ") || "none"}

Task:
- Analyze the menu photo.
- Return dishes in 3 groups: topPicks, caution, avoid.
- Return up to 3 dishes per group.
- Each dish: name, short reason, 0-3 tags.
- Add warnings array.`;

    const retryBody = {
      contents: [
        {
          role: "user",
          parts: [
            { text: retryPrompt },
            {
              inlineData: {
                mimeType: params.mimeType,
                data: params.imageBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        response_mime_type: "application/json",
        response_json_schema: MENU_SCHEMA,
        temperature: 0.2,
        maxOutputTokens: 1200,
      },
    };

    const retryRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(retryBody),
    });

    if (!retryRes.ok) {
      const errText = await retryRes.text();
      console.warn(`Menu analysis JSON parse failed, retry also failed: ${errText}`);
      throw new Error(`Gemini error ${retryRes.status}: ${errText}`);
    }

    const retryData = await retryRes.json();
    const retryRaw =
      retryData?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join("") ?? "";

    if (!retryRaw) {
      console.warn("Menu analysis JSON parse failed, retry returned empty response");
      throw new Error("Empty model response after retry");
    }

    try {
      return JSON.parse(retryRaw) as MenuAnalysis;
    } catch (retryParseError) {
      console.warn(`Menu analysis JSON parse failed after retry: ${retryParseError instanceof Error ? retryParseError.message : String(retryParseError)}`);
      throw new Error("Model returned invalid JSON after retry");
    }
  }
}
