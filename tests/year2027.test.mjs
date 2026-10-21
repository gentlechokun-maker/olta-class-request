import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {readPublicData} from '../public/public-data.js';

test('2027 catalog is an allowed anonymous request, with no personal query fields',async()=>{
  let requested;
  const result=await readPublicData('https://script.google.com/macros/s/example/exec',{action:'year2027'},{fetchImpl:async(url,options)=>{requested={url,options};return {ok:true,json:async()=>({year:2027,classes:[]})};}});
  assert.equal(result.year,2027);assert.match(requested.url,/\?action=year2027$/);assert.equal(requested.options.credentials,'omit');
});

function runtime(){
  const r={console,Date,SpreadsheetApp:{flush(){}}};vm.createContext(r);
  vm.runInContext(fs.readFileSync('public/domain.js','utf8').replace(/^export /gm,'')+'\n'+fs.readFileSync('apps-script/Code.gs','utf8')+'\n'+fs.readFileSync('apps-script/Year2027.gs','utf8'),r);
  r.props_=()=>({getProperty:k=>({PRIVACY_CONTACT:'학원 상담',RETENTION_DAYS:'90'})[k]});
  r.read2027Snapshot_=()=>({updatedAt:new Date().toISOString(),classes:[{id:'y2027-C13',grade:'초4',title:'아톰 2',day:'월',start:'14:00',end:'15:00',room:'2교실',capacity:6,remaining:1,review:false},{id:'y2027-E37',grade:'고2',title:'물리',day:'월',start:'20:00',end:'22:00',room:'5교실',capacity:12,remaining:12,review:false}]});
  return r;
}
const input={kind:'year2027',targetId:'y2027-C13',grade:'초4',student:'예시학생',phone:'010-1234-5678',note:'',consent:'yes',privacyVersion:'2026-10-13',requestId:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'};
test('2027 public endpoint reads no private roster and emits only approved class fields',()=>{
  const r=runtime();r.locked_=fn=>fn();r.read_=()=>{throw Error('Must not read students');};r.publicCatalog_=()=>{throw Error('2026 may be unavailable');};
  r.ContentService={MimeType:{JSON:'json'},createTextOutput:text=>({text,setMimeType(){return this;}})};
  const catalog=JSON.parse(r.doGet({parameter:{action:'year2027'}}).text);
  assert.equal(catalog.year,2027);
  for(const c of catalog.classes){
    assert.deepEqual(Object.keys(c).sort(),['capacity','day','end','grade','id','remaining','review','room','start','title']);
    assert.equal(c.capacity,/^[중고]/.test(c.grade)?12:6);
  }
});
test('2027 validation rejects mismatched grades, current classes, incomplete courses and missing consent',()=>{
  const r=runtime();assert.equal(r.validate2027_(input).phone,'01012345678');
  for(const change of [{grade:'초5'},{targetId:'current-class'},{targetId:'y2027-L64'},{consent:''},{kind:'existing'},{website:'spam'},{phone:'123'},{privacyVersion:'old'}])assert.throws(()=>r.validate2027_({...input,...change}));
  assert.equal(r.validate2027_({...input,targetId:'y2027-E37',grade:'고2'}).grade,'고2');
});
test('2027 submission uses private requests with idempotency, duplicate detection and throttling',()=>{
  const r=runtime(),rows=[];r.read_=()=>rows;r.append_=(table,row)=>{assert.equal(table,'신청');rows.push(row);};
  assert.equal(r.submit2027_(input).ok,true);
  assert.equal(rows[0].kind,'year2027');assert.equal(rows[0].status,'접수');
  assert.equal(r.submit2027_(input).duplicate,true);
  assert.equal(r.submit2027_({...input,requestId:'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'}).duplicate,true);
  assert.equal(rows.length,1);
  assert.throws(()=>r.submit2027_({...input,student:'다른학생'}),/식별자/);
  for(let i=0;i<4;i++)rows.push({id:'recent'+i,phone:'01012345678',createdAt:new Date().toISOString()});
  assert.throws(()=>r.submit2027_({...input,student:'다른학생',requestId:'cccccccc-cccc-cccc-cccc-cccccccccccc'}),/5건/);
});
test('2027 POST returns inline receipt and routes independently from current-year requests',()=>{
  const r=runtime();r.locked_=f=>f();r.inlineReceipt_=(result)=>result;r.submit2027_=()=>({ok:true,id:'2027'});r.submit_=()=>{throw Error('Wrong route');};
  assert.equal(r.doPost({parameter:{...input,_responseMode:'inline'}}).id,'2027');
});
test('2027 review requires admin and cannot change current-year requests or claim enrollment',()=>{
  const r=runtime();r.Session={getActiveUser:()=>({getEmail:()=>''})};
  assert.throws(()=>r.review2027Request('x','상담 중'),/관리자/);
  r.admin_=()=>true;r.locked_=f=>f();r.audit_=()=>{};
  const rows=[{id:'old',kind:'existing',status:'접수'},{id:'next',kind:'year2027',status:'접수'}];r.read_=()=>rows;r.write_=()=>{};
  assert.throws(()=>r.review2027Request('old','상담 중'),/찾을/);
  assert.throws(()=>r.review2027Request('next','확정'),/상태/);
  r.review2027Request('next','상담 완료');assert.equal(rows[1].status,'상담 완료');
  r.review2027Request('next','취소');assert.throws(()=>r.review2027Request('next','상담 중'),/찾을/);
});
