// ============================================
// COACH.JS — AI Coach via Firebase Cloud Function
// The function securely holds the Anthropic API key.
// ============================================

// !! Replace YOUR_PROJECT_ID with your actual Firebase project ID !!
// Found in firebase-config.js as "projectId"
const PROJECT_ID = "swimgenius-webapp";
const REGION     = "us-central1";

const CHAT_URL     = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/coachChat`;
const ANALYSIS_URL = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/coachAnalysis`;

const SYSTEM_PROMPT = `You are SwimGenius AI Coach — an expert swimming coach and sports scientist.
You help competitive and recreational swimmers improve their performance, technique, and training.
Be encouraging, specific, and practical. Keep responses concise (2–4 short paragraphs max).
When analysing swims, reference real coaching concepts: stroke mechanics, turns, starts, pacing, drills.
If you don't have enough info, ask one focused follow-up question.`;

let chatHistory = [];

export function initCoach() {
  chatHistory = [];
}

// ── Chat ─────────────────────────────────────
export async function getCoachReply(userMessage) {
  chatHistory.push({ role: "user", content: userMessage });

  try {
    const response = await fetch(CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: chatHistory, system: SYSTEM_PROMPT })
    });

    if (!response.ok) throw new Error("Function error " + response.status);

    const data  = await response.json();
    const reply = data.content?.[0]?.text ?? "Sorry, no response received.";

    chatHistory.push({ role: "assistant", content: reply });
    return reply;

  } catch (err) {
    console.error("Coach error:", err);
    const msg = "⚠️ Couldn't reach the AI Coach. Make sure the Cloud Function is deployed.";
    chatHistory.push({ role: "assistant", content: msg });
    return msg;
  }
}

// ── Analysis ─────────────────────────────────
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
    const response = await fetch(ANALYSIS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        system: "You are a swim performance analyst. Always respond with valid JSON only."
      })
    });

    if (!response.ok) throw new Error("Function error " + response.status);

    const data  = await response.json();
    const text  = data.content?.[0]?.text ?? "";
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);

  } catch (err) {
    console.error("Analysis error:", err);
    return {
      score:    0,
      grade:    "Analysis Failed",
      summary:  "Could not reach the AI — make sure the Cloud Function is deployed.",
      metrics:  [
        { name: "Pacing",     value: 0 },
        { name: "Technique",  value: 0 },
        { name: "Endurance",  value: 0 },
        { name: "Turns",      value: 0 },
        { name: "Efficiency", value: 0 }
      ],
      insights: "⚠️ AI analysis unavailable. Check that your Cloud Function is deployed."
    };
  }
}
