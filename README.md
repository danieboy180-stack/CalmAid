# CalmAid

A CBT first-aid chatbot for university students: a rule-based safety check and four-step CBT flow (Acknowledge, Reflect, Reframe, Cope), with optional AI-worded replies from Groq. UI follows the Stackra admin design (Outfit, lime hero, ink buttons).

## How it works
- `index.html`, `styles.css`, `app.js`: the chat front end (no build step).
- `api/chat.js`: Vercel serverless function. Holds the Groq key, checks crisis language first (the model never sees it), validates input, rate-limits, and falls back to the built-in rule-based replies if Groq fails.
- `test.js`: `node test.js mock` (offline logic test) and `GROQ_API_KEY=... node test.js live` (real replies).

## Deploy (Vercel)
1. Create a NEW key at console.groq.com/keys.
2. vercel.com/new, import this repo.
3. Before clicking Deploy, open Environment Variables and add `GROQ_API_KEY` with the key. Deploy.
4. If you add the key later, redeploy so it is picked up.

Optional env vars: `GROQ_MODEL` (default `openai/gpt-oss-120b`), `ALLOWED_ORIGIN` (lock the API to your site).

Never put the key in the code or commit it. Without a key the app still works with the rule-based replies.

Note: CalmAid is first-aid support, not therapy or a diagnosis. Verify the emergency numbers (112, SURPIN 0800 078 7746) before use. Vercel Hobby is for non-commercial use.
