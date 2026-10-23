import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const domain=fs.readFileSync('public/domain.js','utf8').replace(/^export /gm,'');
const backend=fs.readFileSync('apps-script/Code.gs','utf8');
function runtime(){const sandbox={console,Date,Utilities:{getUuid:()=>crypto.randomUUID()},Session:{getActiveUser:()=>({getEmail:()=>''})}};vm.createContext(sandbox);vm.runInContext(domain+'\n'+backend,sandbox);return sandbox;}
test('public endpoint emits only a fixed anonymous catalog and validates callback',()=>{
  const r=runtime();r.locked_=f=>f();r.publicCatalog_=()=>({classes:[],slots:[],demand:{}});r.ContentService={MimeType:{JSON:'json',JAVASCRIPT:'js'},createTextOutput:text=>({text,setMimeType(){return this;}})};
  assert.equal(r.doGet({parameter:{callback:'alert(1)'}}).text,'{"error":"Invalid callback"}');
  assert.match(r.doGet({parameter:{callback:'olta_'+'a'.repeat(32)}}).text,/^olta_a+\(/);
});
test('anonymous user cannot invoke any admin mutation',()=>{
  const r=runtime();r.props_=()=>({getProperty:()=> 'owner@example.invalid'});
  for(const name of ['getAdminDashboard','syncTimetable','updateRequest','confirmFromTimetable','addMakeup','cancelMakeup','savePause','installTriggers'])assert.throws(()=>r[name](),/관리자/);
});
test('receipt escapes submitted errors; spreadsheet formulas are neutralized',()=>{
  const r=runtime();assert.equal(r.safeCell_('=IMPORTXML("url")'),"'=IMPORTXML(\"url\")");assert.equal(r.safeCell_('+8210'),"'+8210");assert.equal(r.escape_('<script>'), '&lt;script&gt;');
});
test('POST retry is idempotent, duplicate contacts stay private and no seats deducted',()=>{
  const r=runtime(),rows=[];r.publicCatalog_=()=>({classes:[{id:'c1',grade:'초3',remaining:1,review:false}],slots:[]});r.read_=()=>rows;r.append_=(name,row)=>rows.push(row);r.SpreadsheetApp={flush(){}};
  const input={kind:'existing',targetId:'c1',grade:'초3',student:'예시학생',phone:'01012345678',consent:'yes',privacyVersion:'2026-10-13',requestId:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'};
  const a=r.submit_(input),b=r.submit_(input),c=r.submit_({...input,requestId:'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'});
  assert.equal(a.ok,true);assert.equal(b.duplicate,true);assert.equal(c.duplicate,true);assert.equal(rows.length,1);assert.equal(rows[0].status,'접수');
  assert.throws(()=>r.submit_({...input,student:'다른학생'}),/식별자/);
});
test('confirmation requires a fresh unambiguous black/purple roster match',()=>{
  const r=runtime();r.admin_=()=>true;r.locked_=f=>f();r.syncTimetable_=()=>true;r.classes_=()=>[{id:'c1',grade:'초3'}];
  const tables={'신청':[{id:'r1',grade:'초3',status:'상담 중'}],'동기화':[{classId:'c1',review:'false'}],'원생':[{classId:'c1',name:'예시학생',status:'paused'}]};r.read_=name=>tables[name];r.write_=(name,rows)=>tables[name]=rows;r.audit_=()=>{};
  assert.throws(()=>r.confirmFromTimetable('r1','c1','예시학생'),/검정/);
  tables['원생'][0].status='starting';r.confirmFromTimetable('r1','c1','예시학생');assert.equal(tables['신청'][0].status,'시작 예정');
  tables['동기화'][0].review='true';assert.throws(()=>r.confirmFromTimetable('r1','c1','예시학생'),/점검/);
});
test('changed/paused roster moves a linked request to recheck, not automatic restoration',()=>{
  const r=runtime();let rows=[{id:'r1',status:'확정 등록',confirmedClassId:'c1',confirmedName:'예시학생'}];r.read_=()=>rows;r.write_=(n,x)=>rows=x;
  r.reconcileRequests_([{classId:'c1',name:'예시학생',status:'paused'}],[{classId:'c1',review:'false'}]);assert.equal(rows[0].status,'시간표 재확인');
});
test('GitHub artifact contains no server code or private records',()=>{
  const html=fs.readFileSync('public/index.html','utf8');assert.ok(!html.includes('SOURCE_SPREADSHEET_ID'));const config={};vm.runInNewContext(fs.readFileSync('public/config.js','utf8'),{window:config});assert.ok(!config.OLTA_CONFIG.apiUrl||/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(config.OLTA_CONFIG.apiUrl));assert.match(fs.readFileSync('.gitignore','utf8'),/\.local/);
});
test('public catalog excludes roster/contacts and fails closed on stale or edited mappings',()=>{
  const r=runtime(),c={id:'c1',grade:'초3',title:'아톰 1',day:'월',start:'14:00',end:'15:00',room:'2교실',teacher:'담당',teacherColor:'#e8eed8',sourceRange:'C10:C12'};
  const properties={LAST_SYNC:new Date().toISOString(),PRIVACY_CONTACT:'학원 연락처',RETENTION_DAYS:'90'};
  r.props_=()=>({getProperty:key=>properties[key]});r.classes_=()=>[c];r.opening2027Catalog_=()=>({slots:r.catalogStale_(properties.LAST_SYNC)?[]:r.generateOpeningSlots([c],1),openingYear:2027,openingUpdatedAt:properties.LAST_SYNC});
  const tables={'동기화':[{classId:'c1',registered:'4',starting:'1',paused:'2',review:'false',configKey:r.classKey_(c)}],'빈시간':[{id:'s1',day:'월',start:'16:00',end:'17:00',room:'2교실',grades:'초3',enabled:'TRUE'}],'신청':[{kind:'new',targetId:'s1',grade:'초3',student:'비공개이름',phone:'01012345678',status:'접수'}]};r.read_=name=>tables[name];
  const good=r.publicCatalog_();assert.equal(good.classes[0].remaining,1);assert.equal(good.classes[0].review,false);assert.ok(good.slots.length>0);assert.ok(!JSON.stringify(good).includes('비공개이름'));assert.ok(!JSON.stringify(good).includes('01012345678'));assert.ok(!JSON.stringify(good).includes('C10:C12'));
  c.sourceRange='D10:D12';assert.equal(r.publicCatalog_().classes[0].review,true);
  properties.LAST_SYNC=new Date(Date.now()-401*60000).toISOString();assert.equal(r.publicCatalog_().slots.length,0);
});
test('makeup capacity enforces date-specific six-seat limit and avoids counting blue names twice',()=>{
  const r=runtime();r.admin_=()=>true;r.locked_=f=>f();r.syncTimetable_=()=>true;r.today_=()=> '2026-10-13';r.audit_=()=>{};
  r.Utilities={getUuid:()=>crypto.randomUUID(),formatDate:d=>d.toISOString().slice(0,10)};
  r.classes_=()=>[{id:'c1',day:'수'}];const tables={'동기화':[{classId:'c1',registered:'4',starting:'1',review:'false'}],'원생':[{classId:'c1',name:'파란원생',status:'makeup'}],'보강':[]};r.read_=name=>tables[name];r.append_=(name,row)=>tables[name].push(row);
  r.addMakeup('c1','파란원생','2026-10-14');assert.equal(tables['보강'].length,1);
  assert.throws(()=>r.addMakeup('c1','다른원생','2026-10-14'),/6명/);
  r.addMakeup('c1','다른원생','2026-10-21');assert.equal(tables['보강'].length,2);
  assert.throws(()=>r.addMakeup('c1','다른원생','2026-10-21'),/이미 배정/);
  assert.throws(()=>r.addMakeup('c1','새로운원생','2026-10-15'),/요일/);
});



test('catalog cache bypasses locks on hits, invalidates, and rejects stale snapshots',()=>{
  const r=runtime();let stored=null,reads=0,locks=0;
  r.CacheService={getScriptCache:()=>({get:()=>stored,put:(key,value,ttl)=>{assert.equal(ttl,300);stored=value;},remove:()=>{stored=null;}})};
  r.locked_=fn=>{locks++;return fn();};r.publicCatalog_=()=>{reads++;return {updatedAt:new Date().toISOString(),classes:[],slots:[]};};
  r.cachedPublicCatalog_();r.cachedPublicCatalog_();assert.equal(reads,1);assert.equal(locks,1);
  r.invalidateCatalogCache_();r.cachedPublicCatalog_();assert.equal(reads,2);
  stored=JSON.stringify({updatedAt:new Date(Date.now()-401*60000).toISOString()});r.cachedPublicCatalog_();assert.equal(reads,3);
  const clock=runtime(),noon=Date.parse('2026-10-23T12:00:00+09:00');clock.Date=class extends Date{static now(){return noon;}};
  assert.equal(clock.catalogStale_(new Date(noon-90*60000).toISOString()),false);
  assert.equal(clock.catalogStale_(new Date(noon-110*60000).toISOString()),true);
  assert.equal(clock.catalogStale_('invalid'),true);
  clock.Date=class extends Date{static now(){return Date.parse('2026-10-23T09:30:00+09:00');}};
  assert.equal(clock.catalogStale_('2026-10-22T21:30:00+09:00'),false,'overnight pause does not stale the timetable');
  r.CacheService.getScriptCache=()=>{throw Error('cache unavailable');};r.cachedPublicCatalog_();assert.equal(reads,4);
});

test('trigger installation uses one hourly schedule with a night-time guard',()=>{
  const r=runtime(),created=[],deleted=[];r.admin_=()=>true;
  r.ScriptApp={getProjectTriggers:()=>['scheduledSync_','cleanup_','syncTimetable','unrelated'].map(name=>({getHandlerFunction:()=>name})),deleteTrigger:t=>deleted.push(t.getHandlerFunction()),newTrigger:handler=>{const spec={handler};const builder={};for(const method of ['timeBased','atHour','nearMinute','everyDays','everyHours','inTimezone'])builder[method]=value=>{spec[method]=value;return builder;};builder.create=()=>created.push(spec);return builder;}};
  r.installTriggers();assert.deepEqual(deleted,['scheduledSync_','cleanup_','syncTimetable']);
  assert.deepEqual(created.filter(x=>x.handler==='scheduledSync_').map(x=>x.everyHours),[1]);
  for(const spec of created)assert.equal(spec.inTimezone,'Asia/Seoul');
  assert.equal(created.find(x=>x.handler==='cleanup_').everyDays,1);
  assert.equal(created.filter(x=>x.handler==='cleanup_').length,1);
  let runs=0;r.Utilities={formatDate:()=>String(r.hour)};r.locked_=fn=>fn();r.syncAllTimetables_=()=>{runs++;return {};};r.syncSourceMakeups_=()=>({});
  for(const hour of [0,8,22,23]){r.hour=hour;assert.equal(r.scheduledSync_().skipped,true);}
  for(const hour of [9,12,21]){r.hour=hour;r.scheduledSync_();}assert.equal(runs,3);
});
