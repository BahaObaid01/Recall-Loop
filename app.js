import {parseDeck,createSession,ensureOrder,answer,advance,reconcileSession,isComplete} from './engine.js';
import {sampleDecks} from './decks.js';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={cards:'<rect x="6" y="5" width="14" height="16" rx="2"/><path d="M4 17H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h12"/>',grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',plus:'<path d="M12 5v14M5 12h14"/>',arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',loop:'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 7a7.5 7.5 0 0 1 12.5-2L20 8M4 16l2 3a7.5 7.5 0 0 0 12.5-2"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v.1"/>',code:'<path d="m8 6-6 6 6 6m8-12 6 6-6 6m-2-15-4 18"/>',upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5"/>',download:'<path d="M12 3v13m-5-5 5 5 5-5M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5"/>',trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',copy:'<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',check:'<path d="m5 12 4 4L19 6"/>',spark:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/>'};
const icon=name=>`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.cards}</svg>`;
function icons(){ $$('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon)); }
const uid=()=>typeof crypto.randomUUID==='function'?crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint32Array(4)),n=>n.toString(16)).join('-');
const storageKey='recall-loop-v1';
const demos=sampleDecks.map(d=>({...parseDeck(d),id:d.id,icon:d.icon,color:d.color,demo:true}));
let state={version:1,decks:demos,sessions:{},activeId:demos[0].id,view:'practice'};
let restoreNotice='';
try{
 const loaded=JSON.parse(localStorage.getItem(storageKey)||'null');
 if(loaded?.version===1 && Array.isArray(loaded.decks)&&loaded.decks.length){
  const restored=loaded.decks.map(d=>({...parseDeck(d),id:typeof d.id==='string'?d.id:uid(),icon:d.icon||'cards',color:['mint','lavender','lime'].includes(d.color)?d.color:'lime',demo:!!d.demo}));
  state={version:1,decks:restored,sessions:{},activeId:restored.some(d=>d.id===loaded.activeId)?loaded.activeId:restored[0].id,view:loaded.view==='decks'?'decks':'practice'};
  for(const d of restored){ const s=loaded.sessions?.[d.id];if(validSession(s,d)){if(!s.mistakes){s.mistakes={};s.reviewStart=s.attempts;}state.sessions[d.id]=s;} }
 }
}catch{restoreNotice='Saved data could not be loaded. The sample decks are ready to use.';}
function validSession(s,d){
 if(!s||![1,2].includes(s.target)||!Array.isArray(s.queue)||!Array.isArray(s.cleared)||!Array.isArray(s.order)||!s.history||!s.streaks)return false;
 const ids=d.questions.map(q=>q.id);
 if([...s.queue,...s.cleared].some(id=>!ids.includes(id))||new Set(s.queue).size!==s.queue.length||new Set(s.cleared).size!==s.cleared.length)return false;
 // Missing pending cards are restored from per-card streaks by reconcileSession.
 if(![s.attempts,s.correct,s.misses].every(n=>Number.isInteger(n)&&n>=0)||s.correct+s.misses!==s.attempts)return false;
 const q=d.questions.find(q=>q.id===s.queue[0]);
 if(q&&s.order.length&&(s.order.length!==q.options.length||new Set(s.order).size!==q.options.length||s.order.some(n=>!Number.isInteger(n)||n<0||n>=q.options.length)))return false;
 if(s.feedback&&(!q||s.feedback.id!==q.id||typeof s.feedback.correct!=='boolean'||typeof s.feedback.cleared!=='boolean'))return false;
 return true;
}
function save(){try{localStorage.setItem(storageKey,JSON.stringify(state));}catch{$('.local-status').innerHTML='Saving unavailable · export your decks';toast('Browser storage is full or unavailable. Export your decks to keep a copy.');}}
let toastTimer;
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),4500);}
function activeDeck(){return state.decks.find(d=>d.id===state.activeId)||state.decks[0];}
function sessionFor(d){const s=state.sessions[d.id]??(state.sessions[d.id]=createSession(d));s.sequence=s.sequence==='ordered'?'ordered':'shuffle';s.retryGap=[3,7,10].includes(s.retryGap)?s.retryGap:7;reconcileSession(s,d);return s;}
let comfort={theme:'night',large:false,focus:false,breaks:false};
try{const saved=JSON.parse(localStorage.getItem('recall-loop-comfort')||'null');if(saved)comfort={theme:saved.theme==='paper'?'paper':'night',large:!!saved.large,focus:!!saved.focus,breaks:!!saved.breaks};}catch{}
let settingsOpen=false, studySeconds=0, lastStudyTick=Date.now();
function applyComfort(){document.body.dataset.theme=comfort.theme;document.body.classList.toggle('large-reading',comfort.large);document.body.classList.toggle('focus-study',comfort.focus&&state.view==='practice');try{localStorage.setItem('recall-loop-comfort',JSON.stringify(comfort));}catch{}}
function comfortBar(){return `<div class="comfort-bar" aria-label="Reading preferences"><span class="comfort-label">YOUR STUDY SPACE</span><div class="comfort-actions"><button id="theme-toggle" aria-pressed="${comfort.theme==='paper'}" title="Switch reading theme">${comfort.theme==='paper'?'☀ Paper':'☾ Night'}</button><button id="text-toggle" aria-pressed="${comfort.large}" title="Larger question and answer text">Aa <span>Larger text</span></button><button id="focus-toggle" aria-pressed="${comfort.focus}">${icon('grid')} ${comfort.focus?'Exit focus':'Focus'}</button><button id="break-toggle" aria-pressed="${comfort.breaks}" title="Gentle reminder after 25 minutes of active study">${comfort.breaks?'✓ ':''}Break reminder</button></div></div>`;}
setInterval(()=>{const now=Date.now(),elapsed=Math.min(5,(now-lastStudyTick)/1000);lastStudyTick=now;if(comfort.breaks&&!document.hidden&&state.view==='practice'&&sessionFor(activeDeck()).queue.length){studySeconds+=elapsed;if(studySeconds>=1500){studySeconds=0;$('#break-note').hidden=false;}}},1000);
function render(){
 const d=activeDeck();
 $('#nav-practice').classList.toggle('active',state.view==='practice');$('#nav-decks').classList.toggle('active',state.view==='decks');
 $('#breadcrumb').textContent=state.view==='practice'?'Practice':'Your decks';$('#crumb-deck').textContent=state.view==='practice'?d.title:`${state.decks.length} study decks`;$('#deck-count').textContent=state.decks.length;
 $('#quick-decks').innerHTML=state.decks.slice(-5).map(d=>`<button class="quick-deck" data-deck="${esc(d.id)}"><span class="quick-marker ${esc(d.color)}"></span><span>${esc(d.title)}</span></button>`).join('');
 $('#main').innerHTML=state.view==='decks'?renderDecks():renderPractice(d);
 applyComfort();icons();save();
}
function heading(title,subtitle,extra='') {return `<div class="page-heading"><div><div class="eyebrow">${icon('spark')} YOUR DAILY DOSE OF PROGRESS</div><h1>${esc(title)}</h1><p class="muted">${esc(subtitle)}</p></div>${extra}</div>`;}
function renderPractice(d){
 const s=sessionFor(d);ensureOrder(s,d);
 const count=s.cleared.length,total=d.questions.length,percent=Math.round(count/total*100);
 const mode=`<div class="mode-wrap"><label class="mode-label" for="mode">SESSION GOAL</label><select class="mode-select" id="mode"><option value="1" ${s.target===1?'selected':''}>Quick · 1 correct</option><option value="2" ${s.target===2?'selected':''}>Reinforce · 2 correct</option></select></div>`;
 const controls=`<div class="session-settings">${mode}<div class="mode-wrap"><label class="mode-label" for="card-order">CARD ORDER</label><select id="card-order" class="mode-select"><option value="shuffle" ${s.sequence==='shuffle'?'selected':''}>Shuffle</option><option value="ordered" ${s.sequence==='ordered'?'selected':''}>JSON order</option></select></div><div class="mode-wrap"><label class="mode-label" for="retry-gap">MAX RETRY GAP</label><select id="retry-gap" class="mode-select">${[3,7,10].map(n=>`<option value="${n}" ${s.retryGap===n?'selected':''}>Up to ${n} cards${n===7?' · Default':''}</option>`).join('')}</select></div></div><p class="settings-note">${s.sequence==='ordered'?'New cards follow JSON order; retries return between them.':'New cards are shuffled; answer choices are shuffled in both modes.'} Retries usually return after 2–${s.retryGap} other cards, sooner near the end. Every card must be correct to finish.</p>`;
 const head=comfortBar()+heading(d.title,'One question at a time. Make room for what you want to learn.')+`<details class="study-settings" ${settingsOpen?'open':''}><summary>Session settings <span>${s.target===2?'Reinforce':'Quick'} · ${s.sequence==='ordered'?'JSON order':'Shuffle'} · Retries ≤ ${s.retryGap}</span></summary>${controls}</details>`;
 const progress=`<section class="progress-panel" aria-label="Session progress"><div class="progress-top"><div class="progress-title"><strong>${count}<span> / ${total}</span></strong> cards cleared this session</div><span class="progress-percent">${percent}%</span></div><div class="progress-track" role="progressbar" aria-label="Questions cleared" aria-valuenow="${count}" aria-valuemin="0" aria-valuemax="${total}"><div class="progress-fill" style="width:${percent}%"></div></div><div class="progress-bottom"><span>${s.attempts} attempt${s.attempts===1?'':'s'}<span class="dot-sep">·</span>${s.correct} correct<span class="dot-sep">·</span>${s.misses} missed</span><span>${total-count} remaining · ${d.questions.filter(q=>s.mistakes?.[q.id]&&!s.cleared.includes(q.id)).length} to retry</span></div></section>`;
 if(isComplete(s,d))return head+progress+renderComplete(s,d);
 const q=d.questions.find(q=>q.id===s.queue[0]),f=s.feedback;
 const revealAnswer=!!f&&(f.correct||f.selected===null);
 let question=esc(q.question);
 if(d.id==='demo-js'&&q.question.includes('\n\n')){const [text,...code]=q.question.split('\n\n');question=esc(text)+`<code class="code-block">${esc(code.join('\n\n'))}</code>`;}
 const options=s.order.map((index,displayIndex)=>{
  let cls='';if(f)cls=revealAnswer&&index===q.correctIndex?'correct':index===f.selected?'wrong':'dimmed';
  const status=revealAnswer&&index===q.correctIndex?'✓':f&&index===f.selected?'×':'';
  return `<button class="option ${cls}" data-answer="${index}" ${f?'disabled':''}><span class="option-key">${String.fromCharCode(65+displayIndex)}</span><span class="option-text" dir="auto">${esc(q.options[index])}</span>${status?`<span class="option-state" aria-label="${index===q.correctIndex?'Correct answer':'Incorrect answer'}">${status}</span>`:''}</button>`;
 }).join('');
 const pendingRetries=d.questions.filter(card=>s.mistakes?.[card.id]&&!s.cleared.includes(card.id)).length;
 let feedback='';
 if(f){const title=f.correct?(f.cleared?'Got it. Card cleared!':'Correct. One more practice to go.'):(f.selected===null?'Now you know. Try it again soon.':'Not quite. Let’s bring this one back.');
 feedback=`<div class="feedback ${f.correct?'':'missed'}" role="status"><div class="feedback-title">${icon(f.correct?'check':'loop')}${title}</div><p dir="auto">${revealAnswer?esc(q.explanation||`The correct answer is: ${q.options[q.correctIndex]}.`):(s.queue.length===1?'This is the last remaining card. It will repeat until you answer correctly.':'This card stays in your session and will return. All cards must be correct to finish. The answer stays hidden.')}</p>${revealAnswer&&q.source?`<details><summary>View source</summary><p dir="auto">${esc(q.source)}</p></details>`:''}</div>`;}
 const footer=f?`<span class="shortcut-hint">Press <kbd>Enter</kbd> to continue</span><button class="button primary" id="next-card">${s.queue.length===1&&f.cleared?'See results':s.queue.length===1?'Try this card again':'Next question'}${icon('arrow')}</button>`:`<span class="shortcut-hint">Use <kbd>1</kbd>–<kbd>${q.options.length}</kbd> to choose</span><button class="text-button" id="dont-know">I don’t know ${icon('arrow')}</button>`;
 return head+progress+`<section class="study-card" aria-label="Question card"><div class="card-meta"><span class="topic-tag">${esc(q.topic.toUpperCase())}</span><span class="card-meta-right">${(s.history[q.id]||0)>(f?1:0)?'<span class="retry-pill">BACK IN THE LOOP</span>':''}Card ${d.questions.indexOf(q)+1} of ${total}</span></div><h2 class="question" dir="auto">${question}</h2><div class="options">${options}</div>${feedback}<div class="card-footer ${f?'answer-actions':''}">${footer}</div></section><div class="loop-note"><div>${icon('loop')}<div><strong>${s.target===2?'Build your recall, one attempt at a time.':pendingRetries?`${pendingRetries} missed card${pendingRetries===1?'':'s'} still to clear.`:'Every card counts.'}</strong><p>${s.target===2?'Each card needs two consecutive correct attempts.':'The session ends only when every card is answered correctly.'}</p></div></div><button class="restart" id="restart">${icon('loop')}Restart</button></div>`;
}
function renderComplete(s,d){return `<section class="complete-card"><div class="complete-icon" aria-hidden="true">✓</div><div class="eyebrow" style="color:#aec58b;margin-bottom:12px">LOOP COMPLETE</div><h2>Every card. You got it.</h2><p>You cleared all ${d.questions.length} questions${s.target===2?' with two consecutive correct answers each':''}.</p><div class="complete-stats"><div><strong>${d.questions.length}</strong><small>cards cleared</small></div><div><strong>${s.attempts}</strong><small>total attempts</small></div><div><strong>${Math.round(s.correct/s.attempts*100)||0}%</strong><small>answer accuracy</small></div></div><div class="complete-actions"><button class="button secondary" id="review-mistakes" aria-expanded="false" aria-controls="mistakes-review">Review mistakes (${Object.keys(s.mistakes||{}).length})</button><button class="button primary" id="restart">${icon('loop')}Practise again</button><button class="button secondary" id="all-decks">Choose another deck ${icon('arrow')}</button></div></section>${renderMistakes(s,d)}<p class="completion-note">Every card met your session goal. Accuracy includes earlier mistakes.<br>Come back another day to see what you remember.<br>Clearing a session is a step toward learning, not a guarantee of long-term recall.</p>`;}
function renderMistakes(s,d){
 const missed=d.questions.filter(q=>s.mistakes?.[q.id]);
 return `<section id="mistakes-review" class="mistakes-review" hidden aria-labelledby="review-heading"><h2 id="review-heading">Your mistakes, revisited.</h2><p class="muted small">Questions you missed during this session, even if you later answered them correctly.</p>${s.reviewStart?'<div class="note">This session started before mistake tracking was added. Only mistakes recorded after the update appear here.</div>':''}${missed.length?missed.map(q=>{const m=s.mistakes[q.id];return `<article class="review-card"><div class="card-meta"><span class="topic-tag">${esc(q.topic)}</span><span class="muted small">Card ${d.questions.indexOf(q)+1} · ${m.count} missed attempt${m.count===1?'':'s'}</span></div><h3 dir="auto">${esc(q.question)}</h3><div class="review-wrong"><strong>Your missed choices</strong><ul>${m.choices.map(i=>`<li dir="auto">${i===null?'I don’t know':esc(q.options[i])}</li>`).join('')}</ul></div><div class="review-correct"><strong>Correct answer</strong><p dir="auto">${esc(q.options[q.correctIndex])}</p></div>${q.explanation?`<p dir="auto" class="review-explanation">${esc(q.explanation)}</p>`:''}${q.source?`<details><summary>View source</summary><p dir="auto">${esc(q.source)}</p></details>`:''}</article>`;}).join(''):`<div class="note">${s.reviewStart?'No new mistakes have been recorded since the update.':'No mistakes in this session. Nice work!'}</div>`}</section>`;
}
function renderDecks(){return heading('Your next “I get it” starts here.','A place for everything you want to learn.')+`<div class="deck-grid">${state.decks.map(d=>{const s=state.sessions[d.id],cleared=s?.cleared.length||0;return `<article class="deck-tile"><div class="deck-tile-top"><div class="deck-icon ${esc(d.color)}">${icon(d.icon)}</div><span class="badge">${d.demo?'SAMPLE DECK':'YOUR DECK'}</span></div><h3 dir="auto">${esc(d.title)}</h3><p dir="auto">${esc(d.description||'Your questions, your pace. Keep practising until you clear them all.')}</p><div class="deck-meta">${d.questions.length} questions <span class="dot-sep">·</span> ${cleared} cleared${s?.target===2?' · Reinforce':''}</div><div class="deck-actions"><button class="button primary" data-deck="${esc(d.id)}">${s?.completedAt?'View results':s?.attempts?'Continue learning':'Start learning'}${icon('arrow')}</button><div class="deck-mini-actions"><button class="icon-button" data-export="${esc(d.id)}" aria-label="Export ${esc(d.title)}" title="Export questions">${icon('download')}</button><button class="icon-button" data-delete="${esc(d.id)}" aria-label="Delete ${esc(d.title)}" title="Delete deck">${icon('trash')}</button></div></div></article>`;}).join('')}<button class="new-deck-tile" id="new-deck-tile"><span>${icon('plus')}</span><strong>Something new to learn?</strong><small>Import questions or write your own</small></button></div><p class="decks-note">${icon('info')}Decks and progress stay in this browser. Export your questions to keep a backup.</p>`;}
function chooseDeck(id){state.activeId=id;state.view='practice';render();window.scrollTo({top:0,behavior:'smooth'});}
function showDecks(){state.view='decks';render();window.scrollTo({top:0,behavior:'smooth'});}
function doAnswer(index){const d=activeDeck(),s=sessionFor(d);if(answer(s,d,index)){render();$('#next-card')?.focus({preventScroll:true});$('.feedback')?.scrollIntoView({behavior:'smooth',block:'nearest'});}}
function nextCard(){if(advance(sessionFor(activeDeck()))){render();$('.option')?.focus({preventScroll:true});$('.study-card, .complete-card')?.scrollIntoView({behavior:'smooth',block:'nearest'});}}
let confirmedAction;
function confirmAction(title,body,action,button='Start again'){ $('#confirm-title').textContent=title;$('#confirm-body').textContent=body;$('#confirm-action').textContent=button;confirmedAction=action;$('#confirm-dialog').showModal();$('#cancel-confirm').focus();}
function restart(target,settings={}){const d=activeDeck();const current=sessionFor(d);confirmAction('Start a fresh loop?',`This resets the progress for “${d.title}” in this browser. Your questions stay in the deck.`,()=>{state.sessions[d.id]=createSession(d,target??current.target,Math.random,{sequence:current.sequence,retryGap:current.retryGap,...settings});render();});}
function addDeck(raw){const parsed=parseDeck(raw);const d={...parsed,id:'deck-'+uid(),icon:'cards',color:'lime',demo:false};state.decks.push(d);state.activeId=d.id;state.view='practice';render();$('#add-dialog').close();$('#json-input').value='';$('#file-input').value='';toast(`${d.questions.length} question${d.questions.length===1?'':'s'} added. Your loop is ready.`);}
function download(data,name){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function deckExport(d){return {title:d.title,description:d.description,questions:d.questions.map(({id,...q})=>q)};}
function exportDeck(id){const d=state.decks.find(d=>d.id===id);download(deckExport(d),d.title.replace(/[^a-z0-9_-]/gi,'-').replace(/-+/g,'-').slice(0,90)+'.json');}
function deleteDeck(id){const d=state.decks.find(d=>d.id===id);confirmAction('Remove this deck?',`“${d.title}” and its progress will be removed from this browser. Export it first if you want to keep its questions.`,()=>{state.decks=state.decks.filter(d=>d.id!==id);delete state.sessions[id];if(!state.decks.length)state.decks=[{...demos[1]}];if(state.activeId===id)state.activeId=state.decks[0].id;state.view='decks';render();toast('Deck removed.');},'Remove deck');}
function selectTab(name){$$('[data-tab]').forEach(b=>{const active=b.dataset.tab===name;b.setAttribute('aria-selected',active);b.tabIndex=active?0:-1;$('#panel-'+b.dataset.tab).hidden=!active;});}
function openAdd(tab='import'){selectTab(tab);$('#import-error').textContent='';$('#write-error').textContent='';$('#add-dialog').showModal();}
const prompt=`Use the attached PDF, notes, or topic to create a multiple-choice study deck. For an attached source, use only its contents and stay within the pages I specify. Ask me to clarify anything unreadable; do not invent missing facts. For a topic without notes, agree on the level and scope and use reliable sources. Cover the key concepts without repeating the same fact.

Default: 20 questions, English, mixed difficulty. Include four distinct choices with one unambiguously correct answer, a short teaching explanation, a topic tag, and a source page or reference. Check that correctIndex matches the right option. It is zero-based: 0 = first option, 1 = second, 2 = third, 3 = fourth.

Return a downloadable UTF-8 JSON file using exactly this structure (or paste only the JSON if a file is not available):
{"title":"My study deck","description":"What this deck covers","questions":[{"question":"Question text","options":["Choice A","Choice B","Choice C","Choice D"],"correctIndex":0,"explanation":"Why the correct answer is right.","source":"PDF page number and supporting passage, or a source reference","topic":"Concept name"}]}

My pages, topic, level, language, and preferences: [fill in here]`;
$('#pdf-prompt').value=prompt;
let draftCount=0;
function addDraft(){const n=++draftCount;const el=document.createElement('div');el.className='draft-card';el.dataset.n=n;el.innerHTML=`<div class="draft-top"><span>QUESTION ${n}</span><button class="text-button remove-draft" type="button" aria-label="Remove question ${n}">Remove</button></div><label class="sr-only" for="question-${n}">Question ${n}</label><textarea id="question-${n}" class="draft-question" rows="2" placeholder="What would you like to ask?"></textarea>${[0,1,2,3].map(i=>`<div class="draft-option"><input type="radio" name="correct-${n}" value="${i}" ${i===0?'checked':''} aria-label="Mark choice ${String.fromCharCode(65+i)} as correct for question ${n}"><label class="sr-only" for="option-${n}-${i}">Choice ${String.fromCharCode(65+i)}</label><input id="option-${n}-${i}" type="text" class="draft-answer" placeholder="Choice ${String.fromCharCode(65+i)}"></div>`).join('')}<label class="field-label" for="explanation-${n}">EXPLANATION</label><textarea id="explanation-${n}" rows="2" class="draft-explanation" placeholder="Why is this answer correct?"></textarea><label class="field-label" for="source-${n}">SOURCE (OPTIONAL)</label><input id="source-${n}" type="text" class="draft-source" placeholder="e.g. Lecture notes, page 8">`;$('#draft-cards').append(el);}
async function readFile(file){if(!file)return;if(file.size>5*1024*1024){$('#import-error').textContent='Choose a file smaller than 5 MB.';return;}if(/\.pdf$/i.test(file.name)){selectTab('pdf');toast('Use this guide to turn your PDF into a question file.');return;}try{const raw=await file.text();addDeck(raw);}catch(e){$('#import-error').textContent=e.message;}finally{$('#file-input').value='';}}
document.addEventListener('click',e=>{
 const button=e.target.closest('button');if(!button)return;
 if(button.dataset.deck)chooseDeck(button.dataset.deck);
 else if(button.hasAttribute('data-answer'))doAnswer(Number(button.dataset.answer));
 else if(button.dataset.export)exportDeck(button.dataset.export);
 else if(button.dataset.delete)deleteDeck(button.dataset.delete);
 else if(button.dataset.tab)selectTab(button.dataset.tab);
 else if(button.classList.contains('remove-draft')){if($$('.draft-card').length>1)button.closest('.draft-card').remove();else toast('Keep at least one question in your deck.');}
 else switch(button.id){
 case 'theme-toggle':comfort.theme=comfort.theme==='night'?'paper':'night';render();break;
 case 'text-toggle':comfort.large=!comfort.large;render();break;
 case 'focus-toggle':comfort.focus=!comfort.focus;render();break;
 case 'break-toggle':comfort.breaks=!comfort.breaks;studySeconds=0;render();toast(comfort.breaks?'A gentle reminder will appear after 25 minutes of active study.':'Break reminder off.');break;
 case 'dismiss-break':$('#break-note').hidden=true;break;
 case 'nav-practice':state.view='practice';render();break;
 case 'nav-decks':case 'all-decks':case 'footer-decks':showDecks();break;
 case 'add-top':case 'sidebar-add':case 'new-deck-tile':openAdd();break;
 case 'close-dialog':$('#add-dialog').close();break;
 case 'help-btn':$('#help-dialog').showModal();break;
 case 'close-help':$('#help-dialog').close();break;
 case 'dont-know':doAnswer(null);break;
 case 'next-card':nextCard();break;
 case 'restart':restart();break;
 case 'review-mistakes':{const panel=$('#mistakes-review');panel.hidden=!panel.hidden;button.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden)panel.scrollIntoView({behavior:'smooth',block:'start'});break;}
 case 'cancel-confirm':case 'cancel-confirm-x':$('#confirm-dialog').close();break;
 case 'confirm-action':$('#confirm-dialog').close();confirmedAction?.();break;
 case 'import-button':try{addDeck($('#json-input').value);}catch(e){$('#import-error').textContent=e.message;}break;
 case 'download-template':download(deckExport(demos[1]),'recall-loop-example.json');break;
 case 'go-import':selectTab('import');break;
 case 'copy-prompt':copyPrompt();break;
 case 'add-draft-card':addDraft();break;
 case 'save-written':saveDraft();break;
 }
});
function saveDraft(){try{const raw={title:$('#deck-title').value,description:'A deck made by you.',questions:$$('.draft-card').map(el=>({question:el.querySelector('.draft-question').value,options:[...el.querySelectorAll('.draft-answer')].map(e=>e.value),correctIndex:Number(el.querySelector('input[type=radio]:checked').value),explanation:el.querySelector('.draft-explanation').value,source:el.querySelector('.draft-source').value}))};addDeck(raw);$('#deck-title').value='';$('#draft-cards').innerHTML='';draftCount=0;addDraft();}catch(e){$('#write-error').textContent=e.message;}}
async function copyPrompt(){try{await navigator.clipboard.writeText(prompt);toast('Prompt copied. Attach your material in ChatGPT and paste it.');}catch{$('#pdf-prompt').focus();$('#pdf-prompt').select();toast('Select and copy the highlighted prompt with Ctrl+C.');}}
$('#file-input').addEventListener('change',e=>readFile(e.target.files[0]));
const dz=$('#dropzone');['dragenter','dragover'].forEach(type=>dz.addEventListener(type,e=>{e.preventDefault();dz.classList.add('dragover');}));['dragleave','drop'].forEach(type=>dz.addEventListener(type,e=>{e.preventDefault();dz.classList.remove('dragover');}));dz.addEventListener('drop',e=>readFile(e.dataTransfer.files[0]));
$('#main').addEventListener('change',e=>{
 if(!['mode','card-order','retry-gap'].includes(e.target.id))return;
 const d=activeDeck(),s=sessionFor(d);
 if(e.target.id==='retry-gap'){s.retryGap=Number(e.target.value);render();toast('Maximum retry gap updated for future retries. Existing retries keep their scheduled turn.');return;}
 const target=e.target.id==='mode'?Number(e.target.value):s.target;
 const sequence=e.target.id==='card-order'?e.target.value:s.sequence;
 if(s.attempts){e.target.value=String(e.target.id==='mode'?s.target:s.sequence);restart(target,{sequence});}
 else{state.sessions[d.id]=createSession(d,target,Math.random,{sequence,retryGap:s.retryGap});render();}
});
$('#brand').addEventListener('click',e=>{e.preventDefault();showDecks();});
document.addEventListener('keydown',e=>{
 if(e.ctrlKey||e.metaKey||e.altKey||e.repeat)return;
 if(e.target.matches('[role=tab]')&&['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){const tabs=$$('[data-tab]');let i=tabs.indexOf(e.target);i=e.key==='Home'?0:e.key==='End'?2:(i+(e.key==='ArrowRight'?1:-1)+3)%3;e.preventDefault();selectTab(tabs[i].dataset.tab);tabs[i].focus();return;}
 if($$('dialog[open]').length||state.view!=='practice'||e.target.matches('input,textarea,select'))return;
 const s=sessionFor(activeDeck());
 if(/^[1-6]$/.test(e.key)&&!s.feedback){const i=Number(e.key)-1;if(i<s.order.length){e.preventDefault();doAnswer(s.order[i]);}}
 if(e.key==='Enter'&&s.feedback&&(!e.target.closest('button')||e.target.closest('#next-card'))){e.preventDefault();nextCard();}
});
$$('dialog').forEach(dialog=>dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}}));
$('.page-footer').insertAdjacentHTML('afterbegin',`<button id="footer-decks">${icon('grid')}Your decks</button>`);
document.body.insertAdjacentHTML('beforeend','<aside id="break-note" class="break-note" role="status" hidden><div><strong>A little breathing room.</strong><p>You have studied for 25 minutes. Stretch, look away, or take a short break. Your progress is saved.</p></div><button id="dismiss-break" class="button">Got it</button></aside>');
$('#main').addEventListener('toggle',e=>{if(e.target.classList.contains('study-settings'))settingsOpen=e.target.open;},true);
addDraft();render();if(restoreNotice)toast(restoreNotice);
