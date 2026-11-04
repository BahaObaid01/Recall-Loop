export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}
export function parseDeck(raw) {
  if (typeof raw === 'string') {
    const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    try { raw = JSON.parse(cleaned); } catch { throw new Error('This is not valid JSON. Paste the complete question file, including its opening and closing braces.'); }
  }
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.questions)) throw new Error('Your file needs a title and a questions array. Download the example to see the format.');
  if (!raw.questions.length || raw.questions.length > 500) throw new Error('A deck must contain between 1 and 500 questions.');
  const clean = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
  const title = clean(raw.title, 160);
  if (!title) throw new Error('Give your deck a title.');
  const questions = raw.questions.map((q, i) => {
    const label = `Question ${i + 1}`;
    if (!q || !clean(q.question, 6000)) throw new Error(`${label} is missing its question text.`);
    if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 6 || q.options.some(o => !clean(o, 3000))) throw new Error(`${label} needs 2–6 nonempty answer choices.`);
    const options = q.options.map(o => clean(o, 3000));
    if (new Set(options.map(o => o.toLocaleLowerCase())).size !== options.length) throw new Error(`${label} has duplicate choices. Make every choice different.`);
    if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex >= options.length) throw new Error(`${label}: correctIndex must be a number from 0 to ${options.length - 1}.`);
    return {id: `q${i + 1}`, question:clean(q.question,6000), options, correctIndex:q.correctIndex, explanation:clean(q.explanation,10000), source:clean(q.source,3000), topic:clean(q.topic,120) || 'Practice'};
  });
  return {title,description:clean(raw.description,600),questions};
}
export function createSession(deck, target = 1, random = Math.random, settings = {}) {
  const sequence=settings.sequence==='ordered'?'ordered':'shuffle';
  const retryGap=[3,7,10].includes(settings.retryGap)?settings.retryGap:7;
  const ids=deck.questions.map(q=>q.id);
  return {allIds:ids,retryDue:{},sequence,retryGap,queue:sequence==='ordered'?ids:shuffle(ids,random), cleared:[], streaks:{}, attempts:0, correct:0, misses:0, history:{}, mistakes:{}, reviewStart:0, target:target === 2 ? 2 : 1, feedback:null, order:[], startedAt:Date.now(), completedAt:null};
}
export function ensureOrder(session, deck, random = Math.random) {
  const q = deck.questions.find(q=>q.id===session.queue[0]);
  if(q && !session.order.length) session.order = shuffle(q.options.map((_,i)=>i),random);
}
export function answer(session, deck, selected) {
  if (session.feedback || !session.queue.length) return false;
  const id=session.queue[0], q=deck.questions.find(q=>q.id===id);
  if (!q || (selected !== null && (!Number.isInteger(selected) || selected < 0 || selected >= q.options.length))) return false;
  if(!session.mistakes){session.mistakes={};session.reviewStart=session.attempts;}
  const correct=selected===q.correctIndex;
  if(!correct){
    const missed=session.mistakes[id]??{count:0,choices:[]};
    missed.count++;
    if(!missed.choices.includes(selected))missed.choices.push(selected);
    session.mistakes[id]=missed;
  }
  session.attempts++; session.correct+=Number(correct); session.misses+=Number(!correct);
  session.history[id]=(session.history[id]||0)+1;
  session.streaks[id]=correct ? (session.streaks[id]||0)+1 : 0;
  const cleared=correct && session.streaks[id]>=session.target;
  if(cleared && !session.cleared.includes(id)) session.cleared.push(id);
  session.feedback={id,selected,correct,cleared};
  return true;
}
// A completion screen requires evidence of the target streak on every deck card.
export function reconcileSession(session, deck) {
  session.allIds=deck.questions.map(q=>q.id);
  session.retryDue??={};
  const passed=new Set(session.allIds.filter(id=>(session.streaks[id]||0)>=session.target));
  session.cleared=session.allIds.filter(id=>passed.has(id));
  session.queue=[...new Set(session.queue)].filter(id=>session.allIds.includes(id)&&(!passed.has(id)||session.feedback?.id===id));
  for(const id of session.allIds)if(!passed.has(id)&&!session.queue.includes(id))session.queue.push(id);
  if(session.feedback)session.feedback.cleared=session.feedback.correct&&passed.has(session.feedback.id);
  if(session.queue.length||session.cleared.length!==session.allIds.length)session.completedAt=null;
  for(const id of Object.keys(session.retryDue))if(!session.queue.includes(id))delete session.retryDue[id];
}
export function isComplete(session, deck) {
  return !session.feedback&&!session.queue.length&&deck.questions.every(q=>(session.streaks[q.id]||0)>=session.target);
}
export function advance(session, random = Math.random) {
  if(!session.feedback)return false;
  const {id,correct}=session.feedback;
  const cleared=correct&&(session.streaks[id]||0)>=session.target;
  session.queue=session.queue.filter(q=>q!==id);
  session.retryDue??={};delete session.retryDue[id];
  if(!cleared){
    session.cleared=session.cleared.filter(q=>q!==id);
    const cap=Math.min([3,7,10].includes(session.retryGap)?session.retryGap:7,session.queue.length);
    const occupied=new Set(Object.values(session.retryDue));
    let gaps=Array.from({length:Math.max(0,cap-1)},(_,i)=>i+2).filter(g=>!occupied.has(session.attempts+g+1));
    // Near the end, or when other retry slots are reserved, return sooner.
    if(!gaps.length)gaps=Array.from({length:cap+1},(_,i)=>i).filter(g=>!occupied.has(session.attempts+g+1));
    const gap=gaps[Math.min(gaps.length-1,Math.floor(random()*gaps.length))]??0;
    session.retryDue[id]=session.attempts+gap+1;
    session.queue.push(id);
  }
  session.feedback=null;session.order=[];
  // Reserve retries by attempt number so later mistakes cannot keep pushing them back.
  const due=session.queue.filter(id=>session.retryDue[id]).sort((a,b)=>session.retryDue[a]-session.retryDue[b]);
  const fresh=session.queue.find(id=>!session.retryDue[id]);
  const next=due.length&&session.retryDue[due[0]]<=session.attempts+1?due[0]:fresh??due[0];
  if(next){session.queue=session.queue.filter(id=>id!==next);session.queue.unshift(next);}
  const all=session.allIds||[...new Set([...session.queue,...session.cleared])];
  session.completedAt=!session.queue.length&&all.every(id=>(session.streaks[id]||0)>=session.target)?Date.now():null;
  return true;
}
