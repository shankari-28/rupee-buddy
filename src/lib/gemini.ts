const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

export async function callGemini(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    console.error("Gemini Error: VITE_GEMINI_API_KEY is missing from environment variables.");
    throw new Error("Gemini API key not configured. Add VITE_GEMINI_API_KEY to .env");
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API Failed (${response.status}):`, errorText);
      throw new Error(`Gemini API error: ${response.status} – ${errorText}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return text.trim();
  } catch (error) {
    console.error("Gemini Execution Error:", error);
    throw error;
  }
}

export function isGeminiConfigured(): boolean {
  return !!GEMINI_API_KEY;
}
