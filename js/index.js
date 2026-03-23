const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const anthropicKey = defineSecret("ANTHROPIC_API_KEY");

// ── /coachChat ─────────────────────────────────
// Body: { messages: [...], system: "..." }
exports.coachChat = onRequest(
  { secrets: [anthropicKey], cors: true },
  async (req, res) => {
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST")    { res.status(405).send("Method Not Allowed"); return; }

    try {
      const { messages, system } = req.body;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type":      "application/json",
          "x-api-key":         anthropicKey.value(),
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model:      "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system,
          messages
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "Anthropic error");
      res.json(data);

    } catch (err) {
      console.error("coachChat error:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ── /coachAnalysis ─────────────────────────────
// Body: { messages: [...], system: "..." }
exports.coachAnalysis = onRequest(
  { secrets: [anthropicKey], cors: true },
  async (req, res) => {
    if (req.method === "OPTIONS") { res.status(204).send(""); return; }
    if (req.method !== "POST")    { res.status(405).send("Method Not Allowed"); return; }

    try {
      const { messages, system } = req.body;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type":      "application/json",
          "x-api-key":         anthropicKey.value(),
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model:      "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system,
          messages
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "Anthropic error");
      res.json(data);

    } catch (err) {
      console.error("coachAnalysis error:", err);
      res.status(500).json({ error: err.message });
    }
  }
);
