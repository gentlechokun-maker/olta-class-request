import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function runtime(){
 const html=fs.readFileSync('apps-script/Admin.html','utf8');
 const script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
 const start=script.indexOf('(()=>{')+'(()=>{'.length;
 const ctx=vm.createContext({document:{querySelector:()=>({})}});
 vm.runInContext(script.slice(start,script.indexOf('function render()',start)),ctx);
 return ctx;
}
const row=(id,eventId='first',mode='onsite',status='예약')=>({
 id:String(id),eventId,mode,status,createdAt:new Date(Date.UTC(2026,9,20,0,0,Number(id))).toISOString(),
 parent:'예시 보호자',phone:'01000000000',student:'예시 학생',grade:'초1',school:'예시 학교',token:'private-confirmation-token'
});

test('seminar management numbers each session and attendance mode in receipt order',()=>{
 const ctx=runtime();
 const input=[row(3),row(2,'second'),row(1),row(4,'first','online'),row(5)];
 const before=JSON.stringify(input),result=ctx.seminarRows(input);
 const numbers=Object.fromEntries(result.map(r=>[r.id,r.registrationNumber]));
 assert.deepEqual(numbers,{'1':1,'2':1,'3':2,'4':1,'5':3});
 assert.deepEqual(Array.from(result.filter(r=>r.eventId==='first'&&r.mode==='onsite'),r=>r.id),['1','3','5']);
 assert.equal(JSON.stringify(input),before);
 assert.equal(result.find(r=>r.id==='1').token,'private-confirmation-token');
});

test('cancellation removes a number and new reservations follow remaining applicants',()=>{
 const ctx=runtime(),rows=Array.from({length:20},(_,i)=>row(i+1));
 rows[4].status='취소';rows[10].status='참석';rows.push(row(21));
 const result=ctx.seminarRows(rows),active=result.filter(r=>r.status!=='취소');
 assert.deepEqual(Array.from(active,r=>r.registrationNumber),Array.from({length:20},(_,i)=>i+1));
 assert.equal(active.find(r=>r.id==='6').registrationNumber,5);
 assert.equal(active.find(r=>r.id==='21').registrationNumber,20);
 assert.equal(ctx.seminarNumber(result.at(-1)),'—');
 assert.equal(result.at(-1).id,'5');
 assert.equal(ctx.seminarNumber(active.at(-1)),'20번');
});

test('same-time receipts keep sheet order, online is unlimited, and excess onsite rows are flagged',()=>{
 const ctx=runtime(),rows=[row(2),row(1)];
 rows[1].createdAt=rows[0].createdAt;
 assert.deepEqual(Array.from(ctx.seminarRows(rows),r=>r.id),['2','1']);
 rows[0].createdAt='';
 assert.deepEqual(Array.from(ctx.seminarRows(rows),r=>r.id),['2','1']);
 const online=ctx.seminarRows(Array.from({length:21},(_,i)=>row(i+1,'first','online')));
 assert.equal(ctx.seminarNumber(online.at(-1)),'온라인 21번');
 assert.equal(ctx.seminarNumber({...online.at(-1),mode:'onsite'}),'정원 확인');
});

test('seminar identity display hides internal IDs without losing names or action identifiers',()=>{
 const ctx=runtime(),r={...row(1),id:'private-receipt-id'};
 assert.ok(!ctx.person(r,false).includes(r.id));
 assert.ok(!ctx.person(r,false).includes(r.token));
 assert.ok(ctx.person(r,false).includes('예시 보호자'));
 assert.ok(ctx.person(r).includes(r.id),'other booking management remains unchanged');
 assert.ok(ctx.buttons('seminar',r,['참석','취소']).includes('data-id="private-receipt-id"'));
});
