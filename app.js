const $=s=>document.querySelector(s),app=$('#app');
const IC={home:'<path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',chat:'<path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-5.4A8 8 0 1 1 21 12z"/>',calm:'<path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8"/>',about:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'};
$('#how').innerHTML=[['1','Say how you feel','A few words about what’s on your mind'],['2','Look at the thought','What sits behind the feeling'],['3','Try a balanced view','A kinder, more realistic angle'],['4','Take one small step','Breathe, ground yourself or reach out']].map(([n,t,d])=>`<div class="ou-item"><span class="ou-av">${n}</span><span style="min-width:0"><span class="ou-name">${t}</span><span class="ou-sub">${d}</span></span></div>`).join('');
const MOODS=[['😟','Anxious','Worried or on edge'],['😔','Sad','Low or down'],['😣','Stressed','Under pressure'],['🤯','Overwhelmed','Too much at once']];
$('#moods').innerHTML=MOODS.map(([e,m,d])=>`<button class="tile" data-m="${m.toLowerCase()}"><span class="ou-av">${e}</span><span><span class="ou-lbl">${m}</span><span class="ou-sub">${d}</span></span></button>`).join('');
function go(t){document.querySelectorAll('.view').forEach(v=>v.classList.toggle('on',v.id==='v-'+t));document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('on',b.dataset.t===t));if(t==='chat'){greet();setTimeout(()=>{$('#inp').focus({preventScroll:true})},50)}if(t!=='calm')stopBreath()}
$('#start').onclick=()=>go('chat');
$('#moods').onclick=e=>{const b=e.target.closest('button');if(!b)return;const fresh=!S.started;if(fresh){S.started=1;track()}go('chat');if(fresh)setTimeout(()=>send(`I’m feeling ${b.dataset.m}`),350)};
/* ---- CBT engine (Chapter 3): crisis check first, then acknowledge → reflect → reframe → cope ---- */
const S={step:'feeling',started:0,busy:0,moodSent:0};
const CRISIS=/(kill(ing)? myself|take my (own )?life|suicid|end (my life|it all)|want to die|wanna die|wish i (was|were) dead|hurt(ing)? myself|harm(ing)? myself|self[- ]?harm|cut(ting)? myself|no reason to live|better off dead|don't want to (live|be here|exist)|can't (go|keep) on(\s*[.!]*$| anymore| any more| like this| living))/;
const norm=t=>t.toLowerCase().replace(/[’‘]/g,"'");
const EM=[[/anx|worr|nervous|panic|afraid|scared/,'Anxiety can make your mind race. It makes sense that you feel this way.'],[/sad|down|cry|depress|low\b|hurt/,'I’m sorry you’re feeling low. Thank you for sharing it with me.'],[/stress|pressure|exam|deadline|school|project|defen[cs]e/,'That sounds like a lot of pressure. Feeling stressed is a normal response.'],[/lonely|alone|isolat|no friends/,'Feeling alone is painful, and I’m glad you reached out.'],[/overwhelm|too much|tired|exhaust|burn/,'It sounds like you’re carrying a lot right now. Let’s slow things down.'],[/angry|mad|annoy|frustrat/,'That sounds frustrating. Your feelings are valid.'],[/fail|useless|stupid|worthless|not good enough/,'That’s a heavy thing to feel about yourself. I’m here with you.']];
const DIST=[[/what if|going to|will (fail|go wrong|happen)/,'Fortune telling','A worry is a prediction, not a fact. What’s a more likely outcome, and how would you cope if the worst happened?'],[/always|never|nothing|everything/,'All-or-nothing thinking','Words like “always” and “never” can hide the exceptions. Try “sometimes” instead. Can you remember one time it wasn’t true?'],[/fail|useless|stupid|worthless|not good enough|idiot/,'Labelling','One setback is an event, not who you are. Would you call a friend a failure for the same thing?'],[/everyone|nobody|no one|they think|judge/,'Mind reading','We can’t always know what others think. What evidence do you have, and what else could be true?'],[/should|must|have to/,'“Should” thinking','Those “shoulds” can be harsh. What would you say to yourself if you were being kind?']];
const COPE=['Try the breathing exercise in the Calm tab for one minute.','Try 5-4-3-2-1 grounding: name 5 things you can see right now.','Drink some water and stretch or walk for five minutes.','Send a short message to someone you trust, even just “hi”.'];
let ci=0;
const HIST=[];async function ai(){try{const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:HIST.slice(-10)})});if(!r.ok)return null;const d=await r.json();return d.source==='ai'?d.reply:null}catch{return null}}
function bubble(t,cls,tag){const d=document.createElement('div');d.className='b '+cls;if(tag){const s=document.createElement('span');s.className='tag';s.textContent=tag;d.appendChild(s)}d.appendChild(document.createTextNode(t));$('#msgs').appendChild(d);$('#msgs').scrollTop=1e5}
function chips(a){$('#qr').innerHTML=a.map(x=>`<button class="chip" data-q="${x}">${x}</button>`).join('');requestAnimationFrame(()=>{$('#msgs').scrollTop=1e5})}
function track(){const L=['Acknowledge','Reflect','Reframe','Cope'];const i={feeling:0,thought:1,check:3,crisis:-1}[S.step];$('#tracker').innerHTML=L.map((l,k)=>`<span class="${S.step==='crisis'?'':k<i?'done':k===i?'act':''}">${l}</span>`).join('');$('#end').onclick=feedback}
function bot(parts,q,after,useAI){S.busy=1;chips([]);const t=document.createElement('div');t.className='b bot typing';t.innerHTML='<i></i><i></i><i></i>';$('#msgs').appendChild(t);$('#msgs').scrollTop=1e5;
  Promise.all([new Promise(r=>setTimeout(r,900)),useAI?ai():null]).then(([,txt])=>{t.remove();if(txt)parts=[[txt,parts[0][1]]];parts.forEach(p=>bubble(p[0],p[2]||'bot',p[1]));HIST.push({role:'assistant',content:parts.map(p=>p[0]).join(' ').slice(0,500)});S.busy=0;track();if(q)chips(q);after&&after()})}
function greet(){if(S.started)return;S.started=1;track();bot([[`Hi, I’m CalmAid. I’m here to listen and help you take a small step. How are you feeling right now?`,'Welcome']],['I feel anxious','I feel sad','I feel stressed','I feel overwhelmed'])}
function send(raw){const text=raw.trim();if(!text||S.busy)return;bubble(text,'me');HIST.push({role:'user',content:text.slice(0,500)});$('#inp').value='';const m=norm(text);
  if(CRISIS.test(m)){S.step='crisis';bot([[`I’m really glad you told me, and I’m concerned about your safety. Please reach out to a person right now: a trusted friend or family member, a counsellor, or the emergency contacts below. You don’t have to face this alone.`,'Your safety matters',' crisis bot']],['Open emergency contacts','I’m safe, continue'],()=>sheet('sos'));return}
  if(S.step==='crisis'){S.step='feeling';bot([[`I’m glad you’re safe. Let’s take this gently. What’s on your mind?`]],null);return}
  if(S.step==='feeling'){const e=EM.find(x=>x[0].test(m));bot([[e?e[1]:'Thank you for sharing that with me. Your feelings matter.','Acknowledge'],['What thought is running through your mind when you feel this way?','Reflect']],null,()=>{S.step='thought';track()},true)}
  else if(S.step==='thought'){const d=DIST.find(x=>x[0].test(m));const c=COPE[ci++%COPE.length];S.step='check';bot([[d?d[2]:'Thoughts feel true, but they aren’t always facts. Try listing one piece of evidence for it and one against it.','Reframe'+(d?' · '+d[1]:'')],[c,'Cope']],['I feel a bit better','Still struggling','Another worry'],null,true)}
  else{S.step='feeling';bot([['Tell me more about what’s on your mind.']],null,null,true)}}
$('#form').onsubmit=e=>{e.preventDefault();send($('#inp').value)};
$('#qr').onclick=e=>{const b=e.target.closest('button');if(!b||S.busy)return;const q=b.dataset.q;
  if(q==='Open emergency contacts')return sheet('sos');
  if(q==='I feel a bit better'){bubble(q,'me');chips([]);bot([['I’m glad to hear that. You took a real step by pausing and looking at your thoughts. Come back any time.','Well done']],null,()=>setTimeout(feedback,900));return}
  if(q==='Still struggling'){bubble(q,'me');S.step='thought';bot([['Thanks for being honest. Let’s try another angle: what would you tell a close friend who felt exactly like this?','Reflect']],['Try breathing','End chat']);return}
  if(q==='Another worry'){bubble(q,'me');S.step='feeling';bot([['Of course. What’s on your mind now?']],null);return}
  if(q==='Try breathing'){go('calm');return}if(q==='End chat'){feedback();return}
  send(q)};
/* ---- sheets ---- */
function sheet(kind){if($('.scrim'))return;const s=document.createElement('div');s.className='scrim';
  const body=kind==='sos'?`<div class="grab"></div><h2>You’re not alone</h2><p style="color:var(--mut);font-size:14px;margin:0">If you’re in danger or thinking of harming yourself, contact someone now.</p>
  <a class="call" href="tel:112"><div><b>National emergency</b><small>24 hours</small></div><em>112</em></a>
  <a class="call" href="tel:08000787746"><div><b>SURPIN helpline</b><small>Toll-free · suicide prevention</small></div><em>0800 078 7746</em></a>
  <div class="call" style="background:var(--hero)"><div><b>Tell someone you trust</b><small>A friend, family member, lecturer or campus counsellor</small></div></div>
  <button class="btn ghost" id="x" style="width:100%;margin-top:14px;min-height:52px">Close</button>`
  :`<div class="grab"></div><h2>How was CalmAid?</h2><p style="color:var(--mut);font-size:14px;margin:0 0 6px">Your rating helps evaluate the prototype. Nothing is stored.</p>${['Clarity','Usability','Helpfulness'].map(k=>`<div class="rate"><b>${k}</b><div>${[1,2,3,4,5].map(n=>`<button class="star" data-k="${k}" data-n="${n}" aria-label="${n}">★</button>`).join('')}</div></div>`).join('')}
  <button class="btn primary" id="sub">Submit feedback</button><button class="btn ghost" id="x" style="width:100%;margin-top:10px;min-height:48px">Skip</button>`;
  s.innerHTML=`<div class="sheet">${body}</div>`;app.appendChild(s);
  s.onclick=e=>{if(e.target===s)s.remove();const st=e.target.closest('.star');if(st){const n=+st.dataset.n;s.querySelectorAll(`.star[data-k="${st.dataset.k}"]`).forEach(x=>x.classList.toggle('on',+x.dataset.n<=n))}};
  s.querySelector('#x').onclick=()=>{s.remove();kind==='fb'&&reset()};
  const sub=s.querySelector('#sub');if(sub)sub.onclick=()=>{s.remove();toast('Thank you for your feedback');reset()}}
const feedback=()=>sheet('fb');
$('#sos').onclick=()=>sheet('sos');
function reset(){S.step='feeling';S.started=0;S.moodSent=0;ci=0;$('#msgs').innerHTML='';chips([]);go('home')}
function toast(t){const d=document.createElement('div');d.className='toast';d.textContent=t;app.appendChild(d);setTimeout(()=>d.remove(),2400)}
/* ---- breathing ---- */
let bt;function stopBreath(){clearInterval(bt);bt=0;$('#orb').classList.remove('run');$('#orb').textContent='Ready';$('#breathe').textContent='Start breathing'}
$('#breathe').onclick=()=>{if(bt)return stopBreath();const o=$('#orb');o.classList.add('run');$('#breathe').textContent='Stop';let i=0;const f=()=>{o.textContent=i++%2?'Breathe out':'Breathe in'};f();bt=setInterval(f,4000)};
go('home');
new ResizeObserver(()=>{$('#msgs').scrollTop=1e5}).observe($('#msgs'));$('#back').onclick=()=>go('home');$('#tocalm').onclick=()=>go('calm');$('#end').onclick=feedback;
const T={home:['CalmAid','CBT first-aid chat'],chat:['Chat','Private · nothing is saved'],calm:['Calm','Breathe and ground yourself']};
const _g=go;go=t=>{_g(t);$('#ttl').textContent=T[t][0];$('#sub').textContent=T[t][1];$('#back').hidden=t==='home';$('#logo').hidden=t!=='home';$('#end').hidden=t!=='chat'};go('home');
