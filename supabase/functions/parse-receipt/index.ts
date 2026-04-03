declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response>): void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Max-Age": "86400",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  const prompt = `You are an Indian receipt/invoice OCR system. Extract expense details from the image.
The available expense categories are: food, transport, shopping, bills, entertainment, health, education, other.
You MUST assign the most appropriate category based on the merchant/items.

Return ONLY valid JSON with this structure:
{
  "merchant": "store name",
  "amount": 123.45,
  "date": "YYYY-MM-DD",
  "category": "food",
  "items": [{"name": "item", "price": 10}]
}
For bank statements with multiple transactions, return:
{
  "expenses": [
    {"merchant": "name", "amount": 100, "date": "YYYY-MM-DD", "category": "food"},
    ...
  ]
}
Use today's date if not visible. Amount should be the total. Handle ₹ symbol.
Category guidelines: restaurants/food delivery=food, cab/train/fuel=transport, online shopping/retail=shopping, phone/electricity/gas=bills, movies/streaming/games=entertainment, pharmacy/hospital/doctor=health, courses/books/tuition=education.`;

  try {
    const { image, mimeType } = await req.json();

    if (!image) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiApiKey = Deno.env.get("GOOGLE_GEMINI_API_KEY") ?? Deno.env.get("GEMINI_API_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    let response: Response;

    if (geminiApiKey) {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    inline_data: {
                      mime_type: mimeType || "image/jpeg",
                      data: image,
                    },
                  },
                  {
                    text: `${prompt}\n\nExtract expense details from this receipt/invoice/statement.`,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0,
              maxOutputTokens: 1000,
            },
          }),
        }
      );
    } else if (lovableApiKey) {
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: prompt,
            },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mimeType || "image/jpeg"};base64,${image}`,
                  },
                },
                {
                  type: "text",
                  text: "Extract expense details from this receipt/invoice/statement.",
                },
              ],
            },
          ],
          max_tokens: 1000,
        }),
      });
    } else {
      throw new Error("Configure GOOGLE_GEMINI_API_KEY or LOVABLE_API_KEY as a Supabase secret");
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error("AI processing failed");
    }

    const aiResponse = await response.json();
    const content = geminiApiKey
      ? aiResponse.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("") || ""
      : aiResponse.choices?.[0]?.message?.content || "";

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse receipt data");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Parse receipt error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

Deno.serve(handler);
