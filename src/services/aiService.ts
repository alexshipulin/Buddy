import { DishRecommendation, MenuScanResult } from '../domain/models';
import { createId } from '../utils/id';
import * as FileSystem from 'expo-file-system/legacy';

const GEMINI_TEXT_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
const GEMINI_VISION_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

type GeminiTextRequest = {
  contents: Array<{
    role?: string;
    parts: Array<{ text: string }>;
  }>;
};

type GeminiVisionRequest = {
  contents: Array<{
    parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
  }>;
  generationConfig?: {
    response_mime_type?: string;
    response_json_schema?: unknown;
    temperature?: number;
    maxOutputTokens?: number;
  };
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: { message?: string; code?: number };
};

function getApiKey(): string | null {
  const key = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!key || key === 'your_key_here' || key.trim() === '') {
    return null;
  }
  return key;
}

function createMockMenuResult(): MenuScanResult {
  return {
    id: createId('scan'),
    createdAt: new Date().toISOString(),
    inputImages: [],
    topPicks: [
      { name: 'Grilled salmon with greens', reasonShort: 'High protein and healthy fats.', tags: ['High protein', 'Omega-3'] },
      { name: 'Chicken salad', reasonShort: 'Lean protein with fiber-rich vegetables.', tags: ['High protein', 'Lower calories'] },
    ],
    caution: [
      { name: 'Teriyaki chicken', reasonShort: 'Protein is good, but sauce can add sugar.', tags: ['Lower sugar'] },
    ],
    avoid: [
      { name: 'Deep-fried combo platter', reasonShort: 'Very high energy density.', tags: ['Lower calories'] },
    ],
    summaryText: 'Buddy analyzed your menu. Add your API key for AI-powered recommendations.',
    disclaimerFlag: true,
  };
}

function createMockChatResponse(): string {
  return 'I can help you with meal planning! Add your Gemini API key to enable AI-powered responses.';
}

export async function uriToBase64(uri: string): Promise<string | null> {
  if (uri.startsWith('data:')) {
    return uri.split(',')[1] || null;
  }
  if (uri.startsWith('file://')) {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      return base64;
    } catch {
      return null;
    }
  }
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string)?.split(',')[1];
          resolve(base64 || null);
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }
  return uri;
}

async function callGeminiTextAPI(payload: GeminiTextRequest): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('API_KEY_MISSING');
  }

  const url = `${GEMINI_TEXT_API_URL}?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini error ${response.status}: ${errText}`);
  }

  const data: GeminiResponse = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p?.text).filter(Boolean).join('') ?? '';
  if (!text) {
    throw new Error('Empty response from Gemini');
  }
  return text;
}

async function callGeminiVisionAPI(payload: GeminiVisionRequest): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('API_KEY_MISSING');
  }

  const url = `${GEMINI_VISION_API_URL}?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini error ${response.status}: ${errText}`);
  }

  const data: GeminiResponse = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p?.text).filter(Boolean).join('') ?? '';
  if (!text) {
    throw new Error('Empty response from Gemini');
  }
  return text;
}

function parseMenuAnalysis(text: string, images: string[]): MenuScanResult {
  try {
    const parsed = JSON.parse(text) as Partial<MenuScanResult>;
    return {
      id: createId('scan'),
      createdAt: new Date().toISOString(),
      inputImages: images,
      topPicks: parsed.topPicks || [],
      caution: parsed.caution || [],
      avoid: parsed.avoid || [],
      summaryText: parsed.summaryText || 'Menu analysis complete.',
      disclaimerFlag: true,
    };
  } catch {
    return createMockMenuResult();
  }
}

export async function analyzeMenu(input: string | string[] | { base64: string; mimeType: string }): Promise<MenuScanResult> {
  const apiKey = getApiKey();

  if (!apiKey) {
    return createMockMenuResult();
  }

  try {
    let base64Image: string | null = null;
    let mimeType = 'image/jpeg';
    let imageUris: string[] = [];

    if (typeof input === 'object' && 'base64' in input) {
      base64Image = input.base64;
      mimeType = input.mimeType;
      imageUris = [];
    } else {
      const images = Array.isArray(input) ? input : [input];
      imageUris = images;
      const firstImage = images[0];
      if (!firstImage) {
        return createMockMenuResult();
      }
      base64Image = await uriToBase64(firstImage);
      if (!base64Image) {
        return createMockMenuResult();
      }
    }

    const prompt = `Analyze this menu image and return JSON with:
{
  "topPicks": [{"name": "...", "reasonShort": "...", "tags": [...]}],
  "caution": [{"name": "...", "reasonShort": "...", "tags": [...]}],
  "avoid": [{"name": "...", "reasonShort": "...", "tags": [...]}],
  "summaryText": "..."
}`;

    const payload: GeminiVisionRequest = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: base64Image,
              },
            },
          ],
        },
      ],
    };

    const responseText = await callGeminiVisionAPI(payload);
    return parseMenuAnalysis(responseText, imageUris);
  } catch (error) {
    if (error instanceof Error && error.message === 'API_KEY_MISSING') {
      return createMockMenuResult();
    }
    return createMockMenuResult();
  }
}

const MEAL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    caloriesKcal: { type: 'number' },
    proteinG: { type: 'number' },
    carbsG: { type: 'number' },
    fatG: { type: 'number' },
    description: { type: 'string' },
  },
  required: ['caloriesKcal', 'proteinG', 'carbsG', 'fatG', 'description'],
} as const;

export async function analyzeMealPhoto(imageUri: string): Promise<{ macros: { caloriesKcal: number; proteinG: number; carbsG: number; fatG: number }; description: string }> {
  const apiKey = getApiKey();

  if (!apiKey) {
    return {
      macros: { caloriesKcal: 450, proteinG: 30, carbsG: 40, fatG: 15 },
      description: 'Meal logged. Add API key for AI analysis.',
    };
  }

  try {
    const base64Image = await uriToBase64(imageUri);
    if (!base64Image) {
      return {
        macros: { caloriesKcal: 450, proteinG: 30, carbsG: 40, fatG: 15 },
        description: 'Meal logged. Could not process image.',
      };
    }

    const prompt = 'Analyze this meal photo and return JSON with caloriesKcal, proteinG, carbsG, fatG (numbers) and description (string).';

    const payload: GeminiVisionRequest = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Image,
              },
            },
          ],
        },
      ],
      generationConfig: {
        response_mime_type: 'application/json',
        response_json_schema: MEAL_SCHEMA,
        temperature: 0.2,
        maxOutputTokens: 200,
      },
    };

    const responseText = await callGeminiVisionAPI(payload);
    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch (parseError) {
      // Retry with stricter prompt
      const retryPrompt = 'Return ONLY JSON. No markdown. No extra text. Analyze this meal photo and return JSON with caloriesKcal, proteinG, carbsG, fatG (numbers) and description (string).';
      const retryPayload: GeminiVisionRequest = {
        contents: [
          {
            parts: [
              { text: retryPrompt },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: base64Image,
                },
              },
            ],
          },
        ],
        generationConfig: {
          response_mime_type: 'application/json',
          response_json_schema: MEAL_SCHEMA,
          temperature: 0.2,
          maxOutputTokens: 200,
        },
      };

      const retryResponseText = await callGeminiVisionAPI(retryPayload);
      try {
        parsed = JSON.parse(retryResponseText);
      } catch (retryParseError) {
        console.warn(`Meal photo analysis JSON parse failed after retry: ${retryParseError instanceof Error ? retryParseError.message : String(retryParseError)}`);
        throw new Error('Model returned invalid JSON after retry');
      }
    }

    return {
      macros: {
        caloriesKcal: parsed.caloriesKcal || 450,
        proteinG: parsed.proteinG || 30,
        carbsG: parsed.carbsG || 40,
        fatG: parsed.fatG || 15,
      },
      description: parsed.description || 'Meal analyzed.',
    };
  } catch (error) {
    console.warn(`Meal photo analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    return {
      macros: { caloriesKcal: 450, proteinG: 30, carbsG: 40, fatG: 15 },
      description: 'Meal logged. AI analysis unavailable.',
    };
  }
}

export async function askBuddy(message: string, context?: any): Promise<string> {
  const apiKey = getApiKey();

  if (!apiKey) {
    return createMockChatResponse();
  }

  try {
    const contextText = context ? `Context: ${JSON.stringify(context)}\n\n` : '';
    const prompt = `${contextText}User question: ${message}\n\nProvide a helpful, concise response about nutrition and meal planning.`;

    const payload: GeminiTextRequest = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    };

    return await callGeminiTextAPI(payload);
  } catch {
    return createMockChatResponse();
  }
}

export async function geminiTextTest(prompt: string): Promise<string> {
  const key = getApiKey();
  if (!key) {
    throw new Error('Missing EXPO_PUBLIC_GEMINI_API_KEY');
  }

  const payload: GeminiTextRequest = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  };

  return await callGeminiTextAPI(payload);
}