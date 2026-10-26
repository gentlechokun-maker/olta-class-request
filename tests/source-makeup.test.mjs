import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('a blue makeup name with a duration note creates one student record',()=>{
 const context=vm.createContext({Utilities:{formatDate:date=>date.toISOString().slice(0,10)}});
 vm.runInContext(fs.readFileSync('apps-script/SourceMakeup.gs','utf8'),context);
 const values=Array.from({length:45},()=>Array(19).fill(''));
 const colors=Array.from({length:45},()=>Array(19).fill('#000000'));
 const rich=Array.from({length:45},()=>Array(19).fill(null));
 values[43][17]='김재아 11/14 한시간';
 rich[43][17]={getRuns:()=>[{getText:()=>values[43][17],getTextStyle:()=>({getForegroundColor:()=>'#0000ff'})}]};
 const records=context.parseSourceMakeups_(values,colors,rich,[],{'#0000ff':'makeup'},1756153808,'2026년 9~10월');
 assert.equal(records.length,1);
 assert.equal(records[0].student,'김재아');
 assert.equal(records[0].date,'2026-11-14');
 assert.equal(records[0].status,'확정');
});
