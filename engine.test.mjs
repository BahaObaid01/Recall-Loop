import test from 'node:test';
import assert from 'node:assert/strict';
import {parseDeck,createSession,ensureOrder,answer,advance,reconcileSession,isComplete} from '../dist/engine.js';
const deck=parseDeck({title:'Test',questions:Array.from({length:5},(_,i)=>({question:'Question '+i,options:['Right','Wrong'],correctIndex:0,explanation:'Because.'}))});
test('misses return after three other cards without clearing or double submission',()=>{const s=createSession(deck,1,Math.random,{retryGap:3});ensureOrder(s,deck);const id=s.queue[0];assert.equal(answer(s,deck,1),true);assert.equal(answer(s,deck,0),false);assert.equal(s.attempts,1);assert.equal(s.cleared.length,0);advance(s,()=>.999);assert.equal(s.retryDue[id],5);assert.equal(s.queue.length,5);});
test('all cards must be answered correctly; completion terminates and survives serialization',()=>{let s=createSession(deck);while(s.queue.length){ensureOrder(s,deck);answer(s,deck,0);s=JSON.parse(JSON.stringify(s));advance(s);}assert.equal(s.cleared.length,5);assert.equal(new Set(s.cleared).size,5);assert.equal(s.attempts,5);assert.ok(s.completedAt);assert.equal(answer(s,deck,0),false);});
test('reinforce mode needs two consecutive correct attempts per card and mistakes reset its streak',()=>{const one=parseDeck({title:'One',questions:[deck.questions[0]]});const s=createSession(one,2);answer(s,one,0);advance(s);assert.equal(s.cleared.length,0);answer(s,one,1);advance(s);answer(s,one,0);advance(s);assert.equal(s.cleared.length,0);answer(s,one,0);advance(s);assert.equal(s.cleared.length,1);assert.equal(s.attempts,4);assert.equal(s.misses,1);});
test('unknown response requeues, and refresh after feedback preserves exactly one attempt',()=>{let s=createSession(deck);ensureOrder(s,deck);const order=[...s.order];answer(s,deck,null);s=JSON.parse(JSON.stringify(s));ensureOrder(s,deck);assert.deepEqual(s.order,order);assert.equal(answer(s,deck,0),false);advance(s);assert.equal(s.attempts,1);assert.equal(s.misses,1);assert.equal(s.queue.length,5);});
test('validation accepts fenced JSON but rejects invalid keys, duplicate answers and empty decks',()=>{assert.equal(parseDeck('```json\n'+JSON.stringify(deck)+'\n```').questions.length,5);assert.throws(()=>parseDeck({title:'No',questions:[]}));assert.throws(()=>parseDeck({title:'Bad',questions:[{question:'Q',options:['Yes','Yes'],correctIndex:0}]}));assert.throws(()=>parseDeck({title:'Bad',questions:[{question:'Q',options:['Yes','No'],correctIndex:2}]}));});
test('invalid answer does not mutate progress and shuffled choices retain correct answer index',()=>{const s=createSession(deck);ensureOrder(s,deck,()=>0);assert.deepEqual([...s.order].sort(),[0,1]);assert.equal(answer(s,deck,100),false);assert.equal(s.attempts,0);assert.equal(answer(s,deck,s.order.find(n=>n===0)),true);assert.equal(s.correct,1);});
test('mistakes retain wrong choices and unknowns after success and reload, without duplicate clicks',()=>{const one=parseDeck({title:'Review',questions:[deck.questions[0]]});let s=createSession(one);answer(s,one,1);answer(s,one,1);advance(s);answer(s,one,null);advance(s);answer(s,one,0);advance(s);s=JSON.parse(JSON.stringify(s));assert.deepEqual(s.mistakes.q1,{count:2,choices:[1,null]});assert.equal(s.cleared.length,1);assert.deepEqual(createSession(one).mistakes,{});});
test('legacy sessions preserve progress and record only new mistakes',()=>{const s=createSession(deck);delete s.mistakes;delete s.reviewStart;s.attempts=3;s.correct=2;s.misses=1;answer(s,deck,1);assert.equal(s.reviewStart,3);assert.equal(Object.values(s.mistakes)[0].count,1);assert.equal(s.attempts,4);});
test('shuffle can generate all six permutations of three cards exactly once across its random branches',async()=>{const {shuffle}=await import('../dist/engine.js');const permutations=new Set();for(let i=0;i<3;i++)for(let j=0;j<2;j++){let n=0;const values=[(i+.5)/3,(j+.5)/2];permutations.add(shuffle([0,1,2],()=>values[n++]).join(','));}assert.equal(permutations.size,6);});
test('JSON order preserves original first appearances while retries remain scheduled',()=>{const s=createSession(deck,1,()=>0,{sequence:'ordered',retryGap:3});assert.deepEqual(s.queue,deck.questions.map(q=>q.id));answer(s,deck,1);advance(s,()=>.999);assert.equal(s.queue[0],'q2');assert.equal(s.retryDue.q1,5);assert.deepEqual(deck.questions.map(q=>q.id),['q1','q2','q3','q4','q5']);});
test('retry gaps of 3, 7 and 10 place a missed card after the selected number of pending cards',()=>{const many=parseDeck({title:'Long',questions:Array.from({length:15},()=>deck.questions[0])});for(const gap of [3,7,10]){let s=createSession(many,1,Math.random,{sequence:'ordered',retryGap:gap});answer(s,many,1);advance(s,()=>.999);assert.equal(s.retryDue.q1,s.attempts+gap+1);s=JSON.parse(JSON.stringify(s));assert.equal(s.retryGap,gap);assert.equal(s.sequence,'ordered');assert.equal(new Set(s.queue).size,15);}});
test('seven is the default and short decks finish without artificial repeats',()=>{const s=createSession(deck);assert.equal(s.retryGap,7);const id=s.queue[0];answer(s,deck,1);advance(s,()=>.999);assert.equal(s.retryDue[id],s.attempts+5);while(s.queue.length){answer(s,deck,0);advance(s);}assert.equal(s.cleared.length,5);});

test('last card repeats indefinitely after mistakes, including refresh, for every gap and goal',()=>{
 for(const gap of [3,7,10])for(const target of [1,2]){
  const one=parseDeck({title:'Last',questions:[deck.questions[0]]});let s=createSession(one,target,Math.random,{retryGap:gap});
  for(let i=0;i<20;i++){answer(s,one,i%2?1:null);s=JSON.parse(JSON.stringify(s));reconcileSession(s,one);advance(s);assert.deepEqual(s.queue,['q1']);assert.equal(s.completedAt,null);assert.equal(isComplete(s,one),false);}
  for(let i=0;i<target;i++){answer(s,one,0);advance(s);}
  assert.equal(isComplete(s,one),true);
 }
});
test('a missing queue entry or false completed flag cannot drop an unanswered card',()=>{
 const s=createSession(deck);s.queue=[];s.completedAt=123;s.cleared=deck.questions.map(q=>q.id);s.streaks.q1=1;
 reconcileSession(s,deck);assert.deepEqual(s.cleared,['q1']);assert.deepEqual(s.queue,['q2','q3','q4','q5']);assert.equal(s.completedAt,null);assert.equal(isComplete(s,deck),false);
});
test('random retries respect their maximum despite consecutive mistakes, with no lost cards',()=>{
 const many=parseDeck({title:'Stress',questions:Array.from({length:40},()=>deck.questions[0])});
 for(const gap of [3,7,10])for(const target of [1,2])for(let seed=1;seed<=20;seed++){
  let n=seed;const rand=()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);
  let s=createSession(many,target,rand,{retryGap:gap});const pending=new Map();
  for(let step=0;step<250&&s.queue.length;step++){
   const id=s.queue[0];assert.ok(id);if(pending.has(id)){assert.ok(s.attempts-pending.get(id)<=gap);pending.delete(id);}
   for(const start of pending.values())assert.ok(s.attempts-start<=gap);
   const selected=rand()<.7?1:0;answer(s,many,selected);if(!s.feedback.cleared)pending.set(id,s.attempts);
   advance(s,rand);s=JSON.parse(JSON.stringify(s));reconcileSession(s,many);
   assert.equal(new Set([...s.queue,...s.cleared]).size,40);assert.equal(isComplete(s,many),many.questions.every(q=>(s.streaks[q.id]||0)>=target));
  }
  let guard=0;while(s.queue.length&&guard++<100){answer(s,many,0);advance(s,rand);reconcileSession(s,many);}assert.equal(isComplete(s,many),true);
 }
});
test('new cards keep JSON first-appearance order while missed cards return randomly',()=>{
 const s=createSession(deck,1,Math.random,{sequence:'ordered',retryGap:7});const first=[];let guard=0;
 while(s.queue.length&&guard++<50){const id=s.queue[0];if(!first.includes(id))first.push(id);answer(s,deck,(s.history[id]||0)===0?1:0);advance(s,()=>0);}
 assert.deepEqual(first,deck.questions.map(q=>q.id));assert.equal(isComplete(s,deck),true);
});
