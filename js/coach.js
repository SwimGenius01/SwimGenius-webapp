// ============================================
// COACH.JS — AI Coach using Anthropic API
// ============================================

let chatHistory = [];

const SYSTEM_PROMPT = `You are SwimGenius AI Coach — an expert swimming coach and sports scientist.
You help competitive and recreational swimmers improve their performance, technique, and training.
Be encouraging, specific, and practical. Keep responses concise (2–4 short paragraphs max).
When analysing swims, reference real coaching concepts: stroke mechanics, turns, starts, pacing, drills.
If you don't have enough info, ask one focused follow-up question.`;

export function initCoach() {
  chatHistory = [];
}

// ── Chat reply ────────────────────────────────
export async function getCoachReply(userMessage) {
  chatHistory.push({ role: "user", content: userMessage });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model:      "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system:     SYSTEM_PROMPT,
        messages:   chatHistory
      })
    });

    if (!response.ok) throw new Error("API error " + response.status);

    const data  = await response.json();
    const reply = (data.content && data.content[0] && data.content[0].text)
                  ? data.content[0].text
                  : "Sorry, I couldn't get a response. Please try again.";

    chatHistory.push({ role: "assistant", content: reply });
    return reply;

  } catch (err) {
    console.error("Coach API error:", err);
    const errMsg = "⚠️ Couldn't reach the AI Coach right now. Check your connection and try again.";
    chatHistory.push({ role: "assistant", content: errMsg });
    return errMsg;
  }
}

// ── Swim analysis ─────────────────────────────
export async function getAnalysis(stroke, dist, time, notes) {
  const prompt = `Analyse this swim result and return ONLY a JSON object — no markdown, no extra text.

Swim data:
- Stroke: ${stroke}
- Distance: ${dist}m
- Time: ${time}
- Notes: ${notes || "none"}

Return exactly this JSON shape:
{
  "score": <integer 0-100>,
  "grade": "<2-4 word label e.g. Strong Performance>",
  "summary": "<1 sentence overall summary>",
  "metrics": [
    { "name": "Pacing",     "value": <0-100> },
    { "name": "Technique",  "value": <0-100> },
    { "name": "Endurance",  "value": <0-100> },
    { "name": "Turns",      "value": <0-100> },
    { "name": "Efficiency", "value": <0-100> }
  ],
  "insights": "<2-3 sentences of specific coaching feedback with one actionable drill>"
}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model:      "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system:     "You are a swim performance analyst. Always respond with valid JSON only.",
        messages:   [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) throw new Error("API error " + response.status);

    const data = await response.json();
    const text = (data.content && data.content[0] && data.content[0].text) ? data.content[0].text : "";

    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);

  } catch (err) {
    console.error("Analysis API error:", err);
    return {
      score:    0,
      grade:    "Analysis Failed",
      summary:  "Could not reach the AI — please try again.",
      metrics:  [
        { name: "Pacing",     value: 0 },
        { name: "Technique",  value: 0 },
        { name: "Endurance",  value: 0 },
        { name: "Turns",      value: 0 },
        { name: "Efficiency", value: 0 }
      ],
      insights: "⚠️ AI analysis unavailable. Check your connection and try again."
    };
  }
}
