// FishWise SG — ask-coach
//
// POST { question: string }  →  { answer: string }
//
// A short, safety-first fishing coach. The key is a Supabase secret
// (ANTHROPIC_API_KEY); the browser never sees it.

import Anthropic from "npm:@anthropic-ai/sdk";
import { corsHeaders, json } from "../_shared/cors.ts";

const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });

// Facts below were taken from the official PUB and NParks fishing pages
// (checked 2 Nov 2026). Update them here if the official pages change.
const SYSTEM = `You are the FishWise SG coach: a friendly, practical guide for beginner anglers in Singapore.

Known rules from the official pages (state them only as attributed to PUB or NParks):
- Fishing is only allowed at designated areas. A listed reservoir or park is NOT open end to end.
- PUB lists 15 designated fishing locations at reservoirs and waterways. Designated areas are marked by fishing-zone signage and blue railings. Only artificial bait is allowed and fly fishing is not allowed there.
- NParks lists parks with designated fishing areas and says to look out for "No fishing" signs. At reservoirs and waterways, use carbon steel micro-barb or barbless hooks.
- NParks exclusions include Chek Jawa Wetlands on Pulau Ubin, and the mangroves, bridges and rivers at Pasir Ris Park.
- Both PUB and NParks state fines of up to $3,000 for breaking fishing rules.
- NParks: release protected species, do not string line across paths, keep away from boats and other people, dispose of line, hooks and bait in bins, and stop fishing and shelter in bad weather.

How to answer:
- Keep answers under 150 words, in plain language, with short steps where useful.
- Put safety first: lightning, venomous spines, pufferfish toxicity, slippery jetties.
- Never help anyone fish where it is not permitted, and never invent rules, fines, opening hours or locations. If unsure, say so and point to the PUB and NParks fishing pages.
- For questions unrelated to fishing, briefly say you can only help with fishing.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);

  let question = "";
  try {
    const body = await req.json();
    question = typeof body.question === "string" ? body.question.trim() : "";
  } catch {
    return json({ error: "Request body must be JSON." }, 400);
  }
  if (question.length < 3) return json({ error: "Ask a question of at least 3 characters." }, 400);
  if (question.length > 500) return json({ error: "Keep questions under 500 characters." }, 400);

  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      output_config: { effort: "low" },
      messages: [{ role: "user", content: question }],
    });

    if (response.stop_reason === "refusal") {
      return json({ answer: "I can't help with that one. For fishing rules, see the PUB and NParks fishing pages." });
    }

    const answer = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n")
      .trim();
    if (!answer) return json({ error: "No answer returned." }, 502);
    return json({ answer });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return json({ error: "Too many requests right now. Wait a moment and try again." }, 429);
    }
    if (err instanceof Anthropic.APIError) {
      console.error("Anthropic API error", err.status, err.message);
      return json({ error: "The AI coach is unavailable. Try again shortly." }, 502);
    }
    console.error("ask-coach failed", err);
    return json({ error: "Something went wrong." }, 500);
  }
});
