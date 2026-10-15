import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {makeupWindow,validateMakeup} from '../public/domain.js';
const cls={id:'c1',grade:'초6',day:'목',start:'19:00',end:'21:00',remaining:0,review:false,teacher:'홍T',room:'2교실'};
const input={kind:'makeup',targetId:'c1',student:'예시학생',grade:'초6',phone:'01012345678',consent:'yes',privacyVersion:'2026-10-13',requestId:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',date:'2099-10-15',absenceDate:'2026-10-08',missedTopic:'전기 회로 실험',makeupType:'theory',position:'after'};
const catalog={classes:[cls],slots:[]};
test('makeup duration and adjacent windows; 22:00 is allowed, 22:01 is forbidden',()=>{
  assert.deepEqual(makeupWindow(cls,'experiment','before'),{start:'18:30',end:'19:00',minutes:30});
  assert.deepEqual(makeupWindow(cls,'theory','before'),{start:'18:00',end:'19:00',minutes:60});
  assert.deepEqual(makeupWindow(cls,'theory','after'),{start:'21:00',end:'22:00',minutes:60});
  assert.equal(makeupWindow({...cls,end:'21:30'},'experiment','after').end,'22:00');
  assert.throws(()=>makeupWindow({...cls,end:'21:31'},'experiment','after'),/10시/);
  assert.throws(()=>makeupWindow({...cls,end:'22:00'},'theory','after'),/10시/);
  assert.throws(()=>makeupWindow({...cls,start:'00:20'},'experiment','before'),/10시/);
});
test('makeup permits full regular classes but validates grade, consent, real date, weekday, past times and review',()=>{
  assert.equal(validateMakeup(input,catalog).end,'22:00');
  for(const patch of [{absenceDate:''},{absenceDate:'2099-10-15'},{missedTopic:''},{date:'2099-02-30'},{date:'2099-10-16'},{date:'2020-10-15'},{grade:'초5'},{consent:''},{makeupType:'fake'},{position:'fake'}])assert.throws(()=>validateMakeup({...input,...patch},catalog));
  assert.throws(()=>validateMakeup(input,{classes:[{...cls,review:true}]}));
  assert.throws(()=>validateMakeup(input,catalog,new Date('2099-10-15T21:00:00+09:00')),/지난/);
});
function runtime(){const r={Date,console};vm.createContext(r);vm.runInContext(fs.readFileSync('public/domain.js','utf8').replace(/^export /gm,'')+'\n'+fs.readFileSync('apps-script/Code.gs','utf8'),r);r.locked_=f=>f();r.admin_=()=>true;r.audit_=()=>{};r.ensureMakeupTable_=()=>{};r.syncTimetable_=()=>{};r.publicCatalog_=()=>catalog;r.classes_=()=>[cls];return r;}
test('makeup submit stores derived time, idempotent retry, separate dates and no regular seat change',()=>{
  const r=runtime(),rows=[];r.makeupRequests_=()=>rows;r.ensureMakeupTable_=()=>{};r.read_=()=>[];r.append_=(name,row)=>{assert.equal(name,'보강신청');rows.push(row);};r.SpreadsheetApp={flush(){}};
  assert.equal(r.submitMakeup_({...input,start:'23:00'}).ok,true);assert.equal(rows[0].start,'21:00');
  assert.equal(r.submitMakeup_(input).duplicate,true);
  assert.throws(()=>r.submitMakeup_({...input,position:'before'}),/식별자/);
  r.submitMakeup_({...input,date:'2099-10-22',requestId:'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'});assert.equal(rows.length,2);
  assert.equal(cls.remaining,0);
});
test('makeup approval requires identity confirmation, registered roster, no conflicts and capacity <=6',()=>{
  const r=runtime();let rows=[{...input,id:input.requestId,consentVersion:'2026-10-13',start:'21:00',end:'22:00',status:'접수'}];r.makeupRequests_=()=>rows;
  r.read_=()=>[{classId:'c1',name:input.student,status:'registered'}];r.write_=(n,v)=>{rows=v;};
  assert.throws(()=>r.reviewMakeupRequest(input.requestId,'확정','홍T','2교실',false),/확인/);
  assert.throws(()=>r.reviewMakeupRequest(input.requestId,'확정','오타','2교실',true),/표기/);
  r.classes_=()=>[cls,{day:'목',start:'21:00',end:'22:00',teacher:'홍T',room:'3교실'}];
  assert.throws(()=>r.reviewMakeupRequest(input.requestId,'확정','홍T','2교실',true),/겹칩니다/);
  r.classes_=()=>[cls];
  for(let i=0;i<6;i++)rows.push({...rows[0],id:'other'+i,student:'다른원생'+i,status:'확정',teacher:'홍T',room:'2교실'});
  assert.throws(()=>r.reviewMakeupRequest(input.requestId,'확정','홍T','2교실',true),/6명/);
  rows.pop();r.reviewMakeupRequest(input.requestId,'확정','홍T','2교실',true);assert.equal(rows[0].status,'확정');
});
test('makeup admin endpoints reject unauthenticated visitors',()=>{
  const r=runtime();r.admin_=()=>{throw new Error('관리자');};
  assert.throws(()=>r.getMakeupRequests(),/관리자/);assert.throws(()=>r.reviewMakeupRequest(),/관리자/);
});
