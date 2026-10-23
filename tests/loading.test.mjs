import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function runtime(){
 let time=Date.parse('2026-10-20T03:00:00Z'),locks=0;
 const store=new Map(),puts=[],reads=[];
 const secret={id:'PRIVATE_ID',parent:'PRIVATE_PARENT',student:'PRIVATE_STUDENT',phone:'PRIVATE_PHONE',token:'PRIVATE_TOKEN',eventId:'event',mode:'onsite',status:'예약',date:'2026-11-12',start:'10:00',end:'10:30',teacher:'신T',choice:'same',makeupClassId:'c'};
 const tables={'설명회':[{id:'event',title:'설명회',date:'2026-11-12',start:'10:00',enabled:'TRUE',attendanceMode:'onsite'}],'설명회신청':[{...secret}],'상담예약':[{...secret}],'방문상담':[{...secret}],'결석보강':[{...secret,status:'확정'}],'보강신청':[],'수업주차':[{date:'2026-11-12',grade:'전체',weekId:'2026-11-W2'}]};
 const r=vm.createContext({console,Date:class extends Date{static now(){return time;}},CacheService:{getScriptCache:()=>({get:k=>store.get(k),put:(k,v,ttl)=>{store.set(k,v);puts.push({k,ttl});},remove:k=>store.delete(k)})},LockService:{getScriptLock:()=>({tryLock:()=>{locks++;return true;},releaseLock(){}})},Session:{getActiveUser:()=>({getEmail:()=>''})},SpreadsheetApp:{flush(){}}});
 for(const file of ['public/domain.js','public/booking-domain.js','apps-script/Code.gs','apps-script/Booking.gs'])vm.runInContext(fs.readFileSync(file,'utf8').replace(/^export /gm,''),r);
 r.props_=()=>({getProperty:key=>({PRIVACY_CONTACT:'010-0000-0000',RETENTION_DAYS:'90'}[key])});
 r.bookingRead_=name=>{reads.push(name);return (tables[name]||[]).map(x=>({...x}));};
 r.publicSchedule_=()=>({updatedAt:new Date(time-1000).toISOString(),classes:[{id:'c',day:'월',teacher:'신T',remaining:1,review:false}]});
 return {r,tables,reads,store,puts,advance:ms=>time+=ms,locks:()=>locks};
}

test('booking scopes avoid unrelated sheets and redact all parent identities',()=>{
 for(const scope of ['seminar','consultation','absence','visit','cancel']){
  const {r,reads,store}=runtime();let schedules=0;const schedule=r.publicSchedule_;r.publicSchedule_=()=>{schedules++;return schedule();};
  const result=r.cachedBookingPage_(scope),output=JSON.stringify(result);
  for(const text of ['PRIVATE_','phone','token','parent','student'])assert.ok(!output.includes(text),scope+': '+text);
  for(const value of store.values())assert.ok(!value.includes('PRIVATE_'));
  if(scope==='seminar'){assert.equal(schedules,0);assert.deepEqual(reads.sort(),['설명회','설명회신청'].sort());assert.equal(result.seminars[0].remaining,19);assert.equal(result.classes.length,0);}
  if(scope==='consultation'){assert.equal(schedules,1);assert.ok(!reads.includes('수업주차'));assert.ok(!reads.includes('설명회'));assert.equal(result.consultationBusy.length,2);}
  if(scope==='absence'){assert.equal(schedules,1);assert.deepEqual(reads.sort(),['수업주차','결석보강'].sort());assert.equal(result.makeupSeats['c|2026-11-12'],1);}
  if(scope==='visit')assert.deepEqual(reads,['방문상담']);
  if(scope==='cancel'){assert.equal(schedules,0);assert.equal(reads.length,0);}
 }
});

test('display cache skips locks and sheet reads on hits, expires and invalidates after mutations',()=>{
 const {r,reads,tables,locks,puts,advance}=runtime();r.cachedBookingPage_('seminar');const count=reads.length;
 r.cachedBookingPage_('seminar');assert.equal(reads.length,count);assert.equal(locks(),1);assert.equal(puts[0].ttl,60);
 tables['설명회신청'].push({...tables['설명회신청'][0]});r.invalidateCatalogCache_('설명회신청');assert.equal(r.cachedBookingPage_('seminar').seminars[0].remaining,18);
 advance(61000);r.cachedBookingPage_('seminar');assert.equal(locks(),3);
 r.CacheService.getScriptCache=()=>{throw Error('unavailable');};assert.equal(r.cachedBookingPage_('seminar').seminars[0].remaining,18);
 assert.throws(()=>r.cachedBookingPage_('registrations'),/종류/);
});

test('cache double-check avoids repeating work after a competing builder finishes',()=>{
 const {r,store}=runtime();let builds=0;r.bookingPageCatalog_=()=>{builds++;return {bookingEnabled:true,classes:[]};};
 r.locked_=fn=>{store.set('public-booking-v4:seminar',JSON.stringify({expiresAt:Date.parse('2026-10-20T03:01:00Z'),data:{bookingEnabled:true,classes:[],seminars:[]}}));return fn();};
 assert.equal(r.cachedBookingPage_('seminar').bookingEnabled,true);assert.equal(builds,0);
});

test('expired timetable snapshots cannot become available through the display cache',()=>{
 const {r,advance}=runtime();const first=r.cachedBookingPage_('absence');advance(401*60000);
 let builds=0;r.bookingPageCatalog_=()=>{builds++;return {...first,classes:[{id:'c',remaining:0,review:true}]};};
 assert.equal(r.cachedBookingPage_('absence').classes[0].review,true);assert.equal(builds,1);
});

test('academic calendar is reused separately and invalidated by calendar edits',()=>{
 const {r,reads,puts,advance}=runtime();r.cachedBookingPage_('absence');advance(61000);r.cachedBookingPage_('absence');
 assert.equal(reads.filter(n=>n==='수업주차').length,1);assert.ok(puts.some(p=>p.k==='public-booking-weeks-v1'&&p.ttl===21600));
 r.invalidateCatalogCache_('수업주차');r.cachedBookingPage_('absence');assert.equal(reads.filter(n=>n==='수업주차').length,2);
});

test('warm public cache never authorizes the final seminar seat',()=>{
 const {r,tables}=runtime();r.cachedBookingPage_('seminar');
 tables['설명회신청']=Array.from({length:20},(_,i)=>({...tables['설명회신청'][0],id:'id-'+i}));
 r.ensureBookings_=()=>{};
 const input={kind:'seminar',eventId:'event',mode:'onsite',parent:'보호자',phone:'01012345678',student:'학생명',grade:'초4',school:'예시학교',consent:'yes',privacyVersion:'2026-10-15',requestId:'request-1234567890',token:'a'.repeat(48)};
 assert.throws(()=>r.locked_(()=>r.submitBooking_(input)),/20명/);
 assert.equal(r.cachedBookingPage_('seminar').seminars[0].remaining,19);
});

test('one execution reads each sheet once, isolates edits, rereads after writes and next execution',()=>{
 const {r}=runtime();let reads=0,rows=[['c','학생','registered']];const headers=['classId','name','status'];
 r.db_=()=>({getSheetByName:()=>({getDataRange:()=>({getDisplayValues:()=>{reads++;return [headers,...rows].map(x=>[...x]);}}),getLastRow:()=>rows.length+1,getMaxRows:()=>100,getRange:(start,col,height,width)=>({clearContent:()=>{rows=[];},setNumberFormat(){return this;},setValues:values=>{if(start===2)rows=values.map(x=>[...x]);else rows.push(...values.map(x=>[...x]));}})})});
 r.locked_(()=>{const first=r.read_('운영명단');first[0].name='수정중';assert.equal(r.read_('운영명단')[0].name,'학생');assert.equal(reads,1);r.write_('운영명단',[{classId:'c',name:'저장됨',status:'starting'}]);assert.equal(r.read_('운영명단')[0].name,'저장됨');assert.equal(reads,2);r.append_('운영명단',{classId:'d',name:'추가됨',status:'registered'});assert.equal(r.read_('운영명단').length,2);assert.equal(reads,3);});
 rows[0][1]='외부변경';r.locked_(()=>assert.equal(r.read_('운영명단')[0].name,'외부변경'));assert.equal(reads,4);
});

test('public JSONP routes explicit scope and preserves legacy unscoped requests',()=>{
 const {r}=runtime();const calls=[];r.cachedBookingPage_=scope=>{calls.push(scope);return {bookingEnabled:true};};
 r.ContentService={MimeType:{JSON:'json',JAVASCRIPT:'js'},createTextOutput:text=>({text,setMimeType(){return this;}})};
 assert.match(r.doGet({parameter:{action:'bookings',scope:'seminar',callback:'olta_'+'a'.repeat(32)}}).text,/^olta_a+\(/);
 r.doGet({parameter:{action:'bookings'}});assert.deepEqual(calls,['seminar',undefined]);
});

test('sheet writes are committed before unlocking, even on an application error',()=>{
 const {r}=runtime(),events=[];
 r.LockService={getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>events.push('unlock')})};r.SpreadsheetApp.flush=()=>events.push('flush');
 r.db_=()=>({getSheetByName:()=>({getLastRow:()=>1,getMaxRows:()=>10,getRange:()=>({setNumberFormat(){return this;},setValues(){events.push('write');}})})});
 assert.throws(()=>r.locked_(()=>{r.append_('운영명단',{});throw Error('stop');}),/stop/);assert.deepEqual(events,['write','flush','unlock']);
 events.length=0;r.locked_(()=>true);assert.deepEqual(events,['unlock']);
});
