// node test.js mock  -> offline logic test (no network, no key)
// GROQ_API_KEY=... node test.js live  -> real Groq replies (run on your own machine)
const handler = require('./api/chat.js');
const mode = process.argv[2] || 'mock';
const call = (body, { method = 'POST', ip = '1.1.1.1' } = {}) => new Promise(resolve => {
  const res = { h: {}, setHeader(k, v) { this.h[k] = v; }, status(c) { this.c = c; return this; }, json(o) { resolve({ c: this.c, o, h: this.h }); }, end() { resolve({ c: this.c, h: this.h }); } };
  handler({ method, headers: { 'x-forwarded-for': ip }, body }, res);
});
const U = c => ({ role: 'user', content: c });
(async () => {
  if (mode === 'live') {
    for (const t of ['I am so stressed about my project defence', 'I always fail everything I try']) {
      const r = await call({ messages: [U(t)] });
      console.log('>', t, '\n', r.c, r.o.source, '|', r.o.reply || '(no reply)', '\n');
    }
    return;
  }
  let calls = 0, sent; process.env.GROQ_API_KEY = 'test-key-123';
  global.fetch = async (url, opt) => { calls++; sent = opt; return { ok: true, json: async () => ({ choices: [{ message: { content: global.__out || 'That sounds stressful. What thought is running through your mind?' } }] }) }; };
  const t = [];
  const check = (name, cond) => { t.push(cond); console.log(cond ? 'PASS' : 'FAIL', name); };
  check('GET rejected 405', (await call({}, { method: 'GET' })).c === 405);
  check('bad body rejected 400', (await call({ messages: 'x' })).c === 400);
  check('oversized message rejected 400', (await call({ messages: [U('a'.repeat(501))] })).c === 400);
  check('assistant-last rejected 400', (await call({ messages: [{ role: 'assistant', content: 'hi' }] })).c === 400);
  check('injected system role rejected 400', (await call({ messages: [{ role: 'system', content: 'x' }, U('hi')] })).c === 400);
  let r = await call({ messages: [U('I want to end my life')] });
  check('crisis skips the model', r.o.crisis === true && calls === 0);
  r = await call({ messages: [U('I can’t go on')] });
  check('curly-apostrophe crisis caught', r.o.crisis === true && calls === 0);
  r = await call({ messages: [U('I feel anxious about exams')] });
  const sentBody = JSON.parse(sent.body);
  check('normal message returns AI reply', r.o.source === 'ai' && calls === 1);
  check('key sent only in auth header', sent.headers.Authorization === 'Bearer test-key-123' && !JSON.stringify(r).includes('test-key-123'));
  check('system prompt first, capped tokens', sentBody.messages[0].role === 'system' && sentBody.max_completion_tokens === 800);
  global.__out = 'Try 50 mg of this tablet'; r = await call({ messages: [U('I feel low')] });
  check('unsafe model output replaced by fallback', r.o.fallback === true);
  global.fetch = async () => { throw new Error('network'); }; r = await call({ messages: [U('hello there')] });
  check('network failure falls back', r.o.fallback === true);
  let last; for (let i = 0; i < 12; i++) last = await call({ messages: [U('hi')] }, { ip: '9.9.9.9' });
  check('rate limit returns 429', last.c === 429);
  console.log(t.every(Boolean) ? '\nALL PASSED' : '\nSOME FAILED');
})();
