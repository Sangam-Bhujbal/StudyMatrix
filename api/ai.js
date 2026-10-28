const GEMINI_MODEL = 'gemini-2.0-flash';

const prompts = {
  mindmap: (input) => `Create a study mind-map for this topic or text: ${input}. Return only JSON with keys title, mermaid, nodeCount, depth, missing_concepts. Mermaid must be a valid graph TD diagram using short node IDs and quoted labels.`,
  feynman: (input) => `Evaluate this Feynman explanation: ${input}. Return only JSON with keys accuracy (0-100), grade, verdict, strengths (array), gaps (array), resources (array), missing_concepts (array), suggestions (array).`,
  quiz: (input) => `Create a study quiz from these notes: ${input}. Return only JSON with keys topic and questions. questions must be an array of 3 objects with q, options (4 strings), correct (0-3), explanation.`,
  chat: (input) => `You are Matrix AI, a concise study coach. Respond to this user in 2-4 helpful sentences. Current tab: ${input.activeTab}. User message: ${input.message}`,
};

function jsonFromText(text) {
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(cleaned);
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST required' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: 'Gemini is not configured' });
    return;
  }

  try {
    const { type, input } = req.body || {};
    if (!prompts[type]) {
      res.status(400).json({ error: 'Unsupported AI request' });
      return;
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompts[type](input) }] }],
          generationConfig: { temperature: 0.35, responseMimeType: 'application/json' },
        }),
      }
    );
    if (!response.ok) throw new Error(`Gemini returned ${response.status}`);
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini returned no content');

    const result = type === 'chat' ? text : jsonFromText(text);
    res.status(200).json({ mode: 'live', result });
  } catch (error) {
    console.error('[AI endpoint]', error.message);
    res.status(502).json({ error: 'Live AI request failed' });
  }
}

module.exports = handler;
