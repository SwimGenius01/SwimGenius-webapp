// ============================================
// COACH.JS — AI Coach chat logic
// Anthropic integration is stubbed out for now.
// Will be wired up once Firebase is live.
// ============================================

let chatHistory = [];

export function initCoach() {
  chatHistory = [];
}

// Called by app.js when the user sends a message
export async function getCoachReply(userMessage) {
  chatHistory.push({ role: "user", content: userMessage });

  // ── STUB: replace this block with a real Anthropic call later ──
  const reply = "🚧 AI Coach is coming soon! The Anthropic integration will be wired up once Firebase is connected.";
  // ──────────────────────────────────────────────────────────────

  chatHistory.push({ role: "assistant", content: reply });
  return reply;
}

// Called by app.js when the user submits the analysis form
export async function getAnalysis(stroke, dist, time, notes) {
  // ── STUB ──
  return {
    score:    75,
    grade:    "Good Performance",
    summary:  "Analysis coming soon — Anthropic integration will be wired up next.",
    metrics:  [
      { name: "Pacing",    value: 70 },
      { name: "Technique", value: 78 },
      { name: "Endurance", value: 72 },
      { name: "Turns",     value: 68 },
      { name: "Efficiency",value: 74 },
    ],
    insights: "🚧 Full AI analysis coming soon. Your swim data has been noted."
  };
}
