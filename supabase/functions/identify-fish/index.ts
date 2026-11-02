// FishWise SG — identify-fish
//
// POST { image: <base64 JPEG/PNG/WebP>, mediaType: "image/jpeg" }
//   → { result: { is_fish, common_name, scientific_name, confidence, ... } }
//
// The Anthropic API key lives only here, as a Supabase secret:
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// The browser never sees it.

import Anthropic from "npm:@anthropic-ai/sdk";
import { corsHeaders, json } from "../_shared/cors.ts";

const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });

// Must match the ids in src/data/species.js so results can link to the guide.
const GUIDE_IDS = [
  "peacock-bass", "peacock-cichlid", "snakehead", "tilapia", "barramundi", "mangrove-jack",
  "javelin-grunter", "goatee-croaker", "brown-stingray", "pufferfish", "scorpionfish", "marine-catfish",
];

const MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BASE64_CHARS = 7_000_000; // ≈ 5 MB decoded, the API's per-image limit

const RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "is_fish", "common_name", "scientific_name", "confidence", "matched_guide_id",
    "danger", "key_features", "handling", "edible_warning", "look_alikes", "notes",
  ],
  properties: {
    is_fish: { type: "boolean" },
    common_name: { type: "string" },
    scientific_name: { type: "string" },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    matched_guide_id: { type: "string", enum: [...GUIDE_IDS, "none"] },
    danger: { type: "string", enum: ["safe", "caution", "danger"] },
    key_features: { type: "array", items: { type: "string" } },
    handling: { type: "array", items: { type: "string" } },
    edible_warning: { type: "string" },
    look_alikes: { type: "array", items: { type: "string" } },
    notes: { type: "string" },
  },
};

const SYSTEM = `You identify fish from photos for FishWise SG, an app that helps beginner anglers in Singapore fish safely and legally.

Identify the fish as specifically as the photo allows. Singapore anglers commonly meet peacock bass, snakehead and tilapia in reservoirs, and barramundi, mangrove jack, javelin grunter, croakers, stingrays, pufferfish, scorpionfish and marine catfish on the coast.

- If the photo does not show a fish, set is_fish to false, leave the name fields empty, and explain in notes what a better photo would look like.
- Be honest about uncertainty: use "low" confidence when key features are not visible, and list look-alikes.
- matched_guide_id must be one of the provided ids when the fish is that species, otherwise "none".
- danger: "danger" for venomous or toxic species (stingrays, catfish, scorpionfish, pufferfish and similar), "caution" for sharp teeth, gill covers or spines, otherwise "safe". When in doubt between two levels, choose the more careful one.
- handling: 2 to 4 short, practical steps for a beginner. For dangerous species, say not to grip the fish and to cut the line close to the hook if unhooking is not safe.
- edible_warning: only fill this when there is a specific safety concern, such as toxic species. Otherwise use an empty string. Never state whether keeping the fish is legal; say to follow the rules on the PUB and NParks fishing pages if relevant.
- key_features: the visible features that support your identification.
- Keep every string short and plain.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);

  let body: { image?: unknown; mediaType?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Request body must be JSON." }, 400);
  }

  const image = typeof body.image === "string" ? body.image : "";
  const mediaType = typeof body.mediaType === "string" ? body.mediaType : "";
  if (!image || !/^[A-Za-z0-9+/=]+$/.test(image)) return json({ error: "Send the photo as base64." }, 400);
  if (image.length > MAX_BASE64_CHARS) return json({ error: "Photo is too large. Keep it under 5 MB." }, 413);
  if (!MEDIA_TYPES.includes(mediaType)) return json({ error: "Use a JPEG, PNG, WebP or GIF image." }, 415);

  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: RESULT_SCHEMA },
      },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: image } },
            { type: "text", text: `Identify this fish. Guide ids: ${GUIDE_IDS.join(", ")}.` },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return json({ error: "The AI could not process this photo. Try another photo." }, 422);
    }
    if (response.stop_reason === "max_tokens") {
      return json({ error: "The AI response was cut short. Please try again." }, 502);
    }

    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") return json({ error: "No result returned." }, 502);

    const result = JSON.parse(text.text);
    return json({ result });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return json({ error: "Too many requests right now. Wait a moment and try again." }, 429);
    }
    if (err instanceof Anthropic.APIError) {
      console.error("Anthropic API error", err.status, err.message);
      return json({ error: "The AI service is unavailable. Try again shortly." }, 502);
    }
    console.error("identify-fish failed", err);
    return json({ error: "Identification failed." }, 500);
  }
});
