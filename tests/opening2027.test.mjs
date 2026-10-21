import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function runtime(){const r=vm.createContext({console,Date});for(const f of ['public/domain.js','apps-script/Code.gs','apps-script/Year2027.gs'])vm.runInContext(fs.readFileSync(f,'utf8').replace(/^export /gm,''),r);return r;}
const resource=(teacher,extra={})=>({day:'목',start:'14:00',end:'15:00',room:'2교실',teacher,...extra});
function snapshot(r,resources,timestamp=new Date().toISOString()){
 r.read2027Snapshot_=()=>({updatedAt:timestamp,classes:[...resources,resource('조T',{day:'월',start:'09:00',end:'10:00',room:'3교실'})].map((x,i)=>({id:'y'+i,day:x.day,resources:JSON.stringify([x])}))});
}
test('opening candidates use 2027 occupancy and never use current-year classes or expose staff',()=>{
 const r=runtime();r.publicSchedule_=()=>({updatedAt:new Date().toISOString(),classes:[{...resource('신T'),id:'current'}]});r.classes_=()=>{throw Error('2026 must not generate 2027 openings');};r.read_=()=>[];
 snapshot(r,[resource('홍T')]);let catalog=r.publicCatalog_();assert.ok(catalog.slots.some(s=>s.day==='목'&&s.start==='14:00'&&s.end==='15:00'));
 assert.equal(catalog.openingYear,2027);assert.ok(catalog.slots.every(s=>s.id.startsWith('opening2027-')));assert.ok(!JSON.stringify(catalog.slots).includes('T'));
 snapshot(r,[resource('신T'),resource('홍T',{room:'3교실'})]);assert.ok(!r.publicCatalog_().slots.some(s=>s.day==='목'&&s.start==='14:00'));
});
test('paired elementary resources block both teachers at their own actual times',()=>{
 const r=runtime(),timestamp=new Date().toISOString();r.read2027Snapshot_=()=>({updatedAt:timestamp,classes:[{day:'화',resources:JSON.stringify([resource('신T',{day:'화',start:'16:00',end:'17:00'}),resource('홍T',{day:'화',start:'17:00',end:'18:00',room:'3교실'})])}]});
 const slots=r.opening2027Catalog_().slots;assert.ok(slots.some(s=>s.day==='화'&&s.start==='16:00'&&s.end==='17:00'));assert.ok(!slots.some(s=>s.day==='화'&&s.start==='16:00'&&s.end==='18:00'));
});
test('missing, malformed, stale and uncertain resource snapshots never imply free time',()=>{
 const r=runtime();snapshot(r,[resource('신T')],new Date(Date.now()-401*60000).toISOString());assert.equal(r.opening2027Catalog_().slots.length,0);
 r.read2027Snapshot_=()=>({updatedAt:new Date().toISOString(),classes:[{day:'목',resources:''}]});assert.equal(r.opening2027Catalog_().slots.length,0);
 snapshot(r,[resource('')]);assert.ok(!r.opening2027Catalog_().slots.some(s=>s.day==='목'&&s.start==='14:00'));
 snapshot(r,[resource('홍T',{end:''})]);assert.ok(!r.opening2027Catalog_().slots.some(s=>s.day==='목'));
});
test('2027 opening requests reject historical ids and changed rooms, preserving requested schedule privately',()=>{
 const r=runtime();snapshot(r,[resource('홍T')]);r.publicSchedule_=()=>({classes:[],updatedAt:new Date().toISOString()});const rows=[];r.read_=()=>rows;r.append_=(n,x)=>rows.push(x);r.SpreadsheetApp={flush(){}};
 const s=r.publicCatalog_().slots.find(s=>s.day==='목'&&s.start==='14:00'&&s.end==='15:00');assert.ok(s);
 const input={kind:'new',targetId:s.id,grade:'초3',student:'예시학생',phone:'01012345678',consent:'yes',privacyVersion:'2026-10-13',requestId:'opening-2027-test-0001',scheduleKey:JSON.stringify([s.id,s.day,s.start,s.end,s.room])};
 assert.throws(()=>r.submit_({...input,targetId:s.id.replace('opening2027-','opening-')}),/신청할 수 없는/);
 assert.throws(()=>r.submit_({...input,scheduleKey:JSON.stringify([s.id,s.day,s.start,s.end,'99교실'])}),/변경/);
 assert.equal(r.submit_(input).ok,true);assert.match(rows[0].note,/2027 신규 개설 요청/);assert.match(rows[0].note,/14:00–15:00/);assert.equal(r.submit_(input).duplicate,true);assert.equal(rows.length,1);
});
