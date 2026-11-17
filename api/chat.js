// Vercel serverless function. The Groq key lives ONLY in the GROQ_API_KEY environment variable.
const CRISIS = /(kill myself|suicid|end my life|want to die|wanna die|hurt myself|harm myself|self[- ]?harm|no reason to live|better off dead|don't want to (live|be here)|can't go on|cut myself)/;
const BAD = /(\bmg\b|dosage|prescri|diagnos(e|is|ed)|overdose|\bpills?\b)/;
const norm = t => t.toLowerCase().replace(/[’‘]/g, "'");
const SYSTEM = `You are CalmAid, a warm, down-to-earth chat companion for university students who feel stressed, anxious, low or overwhelmed. You use simple CBT ideas, but you sound like a caring friend who listens well, not a worksheet.

How to talk:
- Respond to what they actually said. Pick up their specific words and situation (the exam, the project defence, the argument) instead of giving generic comfort.
- Sound natural and human: plain, casual English, contractions, short sentences. Match their tone and energy. If they write in Pidgin or slang, you can ease your tone to match, but stay clear and respectful.
- Vary how you start. Never open two replies the same way, and avoid stock lines like "I'm sorry to hear that", "It makes sense that you feel this way" or "Thank you for sharing".
- Don't rush to fix things. Early on, mostly listen, reflect back what you heard, and ask one gentle, specific question. Once you understand what's going on, offer a different way of looking at it, and only when it fits, one tiny next step.
- Weave CBT in naturally (spotting always/never thinking, separating a thought from a fact, asking what they'd tell a friend) without naming techniques or running a checklist.
- Keep it to about 2 to 5 short sentences (roughly 40 to 90 words). At most one question per reply. No lists, headings, bold or emojis unless they use them first.
- If they say they feel better or want to stop, wrap up warmly and don't push another exercise.

Boundaries: you are an AI, not a human or a therapist, and you never claim otherwise. Never diagnose, never give medication or dosage advice, never promise outcomes. If they ask for something outside this (medical, legal and so on), say kindly it's beyond what you can help with and point them to a professional.

Safety: if they mention harming themselves, suicide, not wanting to be here, or being in danger, drop the exercise. Respond calmly and with care, say you're really glad they told you, and ask them to tap the Urgent help button and reach out to someone they trust right now. Do the same if they sound hopeless or unsafe even without those exact words.`;
const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const hits = new Map(); // per-instance rate limit: 10 requests per minute per IP

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const allowed = process.env.ALLOWED_ORIGIN;
  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', allowed);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.headers.origin && req.headers.origin !== allowed) return res.status(403).json({ error: 'forbidden' });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const key = process.env.GROQ_API_KEY;
  if (!key) return res.status(500).json({ error: 'server not configured' });

  const ip = String(req.headers['x-forwarded-for'] || 'local').split(',')[0].trim();
  const now = Date.now(), h = hits.get(ip) || { n: 0, t: now };
  if (now - h.t > 60000) { h.n = 0; h.t = now; }
  if (++h.n > 10) return res.status(429).json({ error: 'slow down' });
  hits.set(ip, h);

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  const msgs = body && body.messages;
  const ok = Array.isArray(msgs) && msgs.length > 0 && msgs.length <= 12 &&
    msgs.every(m => m && ['user', 'assistant'].includes(m.role) && typeof m.content === 'string' && m.content.length > 0 && m.content.length <= 500) &&
    msgs[msgs.length - 1].role === 'user';
  if (!ok) return res.status(400).json({ error: 'bad request' });

  // Safety first: crisis language never reaches the model.
  if (CRISIS.test(norm(msgs[msgs.length - 1].content))) return res.status(200).json({ source: 'crisis', crisis: true });

  const fallback = () => res.status(200).json({ source: 'fallback', fallback: true });
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 10000);
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST', signal: ctl.signal,
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      // gpt-oss models reason before answering; keep it low and leave token room so the reply is never empty.
      body: JSON.stringify({ model: MODEL, temperature: 0.8, max_completion_tokens: 800, ...(/gpt-oss/.test(MODEL) ? { reasoning_effort: 'low' } : {}), messages: [{ role: 'system', content: SYSTEM }, ...msgs] })
    });
    if (!r.ok) return fallback();
    const d = await r.json();
    const text = d && d.choices && d.choices[0] && d.choices[0].message && String(d.choices[0].message.content || '').trim();
    if (!text || BAD.test(norm(text))) return fallback();
    return res.status(200).json({ source: 'ai', reply: text.slice(0, 900) });
  } catch { return fallback(); } finally { clearTimeout(timer); }
};
