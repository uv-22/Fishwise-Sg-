// FishWise SG — gear-advisor
//
// POST { messages: [{ role: "user" | "assistant", content: string }, ...] }
//   →  { answer: string }
//
// One-on-one gear counselling for beginner anglers in Singapore, grounded in
// the FishWise Gear Match catalogue (src/data/gear.js — keep the list below in
// sync) and the official PUB / NParks rules. The key is a Supabase secret
// (ANTHROPIC_API_KEY); the browser never sees it.

import Anthropic from "npm:@anthropic-ai/sdk";
import { corsHeaders, json } from "../_shared/cors.ts";

const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });

const CATALOGUE = `
Rods: Light spinning rod 2.1 m (typically $35-90, reservoirs/canals) · Jetty spinning rod 2.7 m ($55-140, jetties/beaches) · Junior rod & reel combo 1.6 m ($20-45, kids)
Reels: 2500-size spinning reel ($40-120) · 4000-size spinning reel ($60-160)
Line: PE 1.0 braid 150 m ($18-40) · 12 lb nylon mono 200 m ($6-15) · 20 lb fluorocarbon leader 30 m ($10-25)
Hooks & terminal: Carbon steel micro-barb hooks ($4-10) · Barbless hooks ($4-10) · Ball & bean sinker kit ($5-12) · Snap swivels ($3-8)
Lures: Soft plastic paddle-tails 3" + jig heads ($10-22) · Floating minnow 7 cm ($12-35) · Weedless topwater frog ($10-25) · Casting spoons 15 g ($6-15)
Tools: Lip-grip tool ($10-30) · Long-nose pliers + line cutter ($10-30) · Waist pouch for line offcuts ($5-20)
Safety: Rechargeable headlamp ($15-45) · Non-slip deck shoes ($30-80) · Pocket first-aid kit ($8-20) · Tackle box + shoulder bag ($20-50)
Kits: Reservoir lure starter · Jetty & beach kit · Family first cast · Snakehead topwater`;

// Rules below were taken from the official PUB and NParks fishing pages
// (checked 2 Nov 2026). Update them here if the official pages change.
const SYSTEM = `You are the FishWise SG gear advisor: a friendly one-on-one counsellor who helps beginner anglers in Singapore choose fishing gear.

FishWise does not sell gear. It is the middle man: you recommend the right TYPE of item and the shop types that usually stock it. Prices below are typical Singapore retail ranges in SGD, not FishWise prices.
${CATALOGUE}

Where to buy: Decathlon Singapore (budget beginner gear, several stores), Lure Haven (12 Hamilton Road, Japanese lure-fishing specialist), neighbourhood tackle shops in HDB town centres, and online marketplaces for line and small tackle. FishWise has no partnership with these shops.

Rules to respect (attribute them to PUB or NParks):
- PUB reservoirs and waterways: fish only in designated areas marked by fishing-zone signs and blue railings; artificial bait only; no fly fishing.
- NParks: use carbon steel micro-barb or barbless hooks at reservoirs and waterways; look out for "No fishing" signs.
- Both state fines of up to $3,000 for breaking fishing rules.

How to answer:
- Ask at most one short question at a time if you need to know where they will fish, what they hope to catch, who is fishing (adults or children) or their budget.
- When you recommend, list each item by its catalogue name with its typical price range, give a typical total range, say in one line why each item is there, and say where it is usually stocked.
- Never recommend live or natural bait for PUB waters. Prefer micro-barb or barbless hooks.
- Keep answers under 160 words, plain language, no markdown tables.
- Never invent shops, prices, opening hours or rules. For anything that is not about fishing gear or fishing in Singapore, briefly say you can only help with fishing gear.`;

type Msg = { role: "user" | "assistant"; content: string };

function validMessages(raw: unknown): Msg[] | null {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 16) return null;
  const out: Msg[] = [];
  for (let i = 0; i < raw.length; i++) {
    const m = raw[i] as Record<string, unknown>;
    const role = i % 2 === 0 ? "user" : "assistant";
    if (!m || m.role !== role || typeof m.content !== "string") return null;
    const content = m.content.trim();
    if (!content || content.length > 800) return null;
    out.push({ role, content });
  }
  return out[out.length - 1].role === "user" ? out : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);

  let messages: Msg[] | null = null;
  try {
    const body = await req.json();
    messages = validMessages(body.messages);
  } catch {
    return json({ error: "Request body must be JSON." }, 400);
  }
  if (!messages) {
    return json({ error: "Send 1–16 alternating messages, starting and ending with the user, each under 800 characters." }, 400);
  }

  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      output_config: { effort: "low" },
      messages,
    });

    if (response.stop_reason === "refusal") {
      return json({ answer: "I can't help with that one — I can only advise on fishing gear." });
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
      return json({ error: "The gear advisor is unavailable. Try again shortly." }, 502);
    }
    console.error("gear-advisor failed", err);
    return json({ error: "Something went wrong." }, 500);
  }
});
