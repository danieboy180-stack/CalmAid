// Vercel serverless function. The Groq key lives ONLY in the GROQ_API_KEY environment variable.
const CRISIS = /(kill myself|suicid|end my life|want to die|wanna die|hurt myself|harm myself|self[- ]?harm|no reason to live|better off dead|don't want to (live|be here)|can't go on|cut myself)/;
const BAD = /(\bmg\b|dosage|prescri|diagnos(e|is|ed)|overdose|\bpills?\b)/;
const norm = t => t.toLowerCase().replace(/[’‘]/g, "'");
const SYSTEM = `You are CalmAid, a supportive CBT first-aid chat for university students.
Follow this order: acknowledge the feeling, ask what thought sits behind it, offer one balanced view, suggest one small coping step.
Rules: reply in under 70 words, warm and plain English, at most one question. Never diagnose, never give medication or dosage advice, never claim to be a therapist or a human.
If the person mentions harming themselves or suicide, do not continue the exercise: tell them to tap the Urgent help button and contact someone they trust.`;
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
      body: JSON.stringify({ model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant', temperature: 0.4, max_tokens: 220, messages: [{ role: 'system', content: SYSTEM }, ...msgs] })
    });
    if (!r.ok) return fallback();
    const d = await r.json();
    const text = d && d.choices && d.choices[0] && d.choices[0].message && String(d.choices[0].message.content || '').trim();
    if (!text || BAD.test(norm(text))) return fallback();
    return res.status(200).json({ source: 'ai', reply: text.slice(0, 700) });
  } catch { return fallback(); } finally { clearTimeout(timer); }
};
