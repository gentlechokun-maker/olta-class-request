import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function runtime(){const r=vm.createContext({console,Date});for(const file of ['public/domain.js','apps-script/Code.gs','apps-script/Year2027.gs'])vm.runInContext(fs.readFileSync(file,'utf8').replace(/^export /gm,''),r);return r;}
function fixture(){
 const values=Array.from({length:100},()=>Array(23).fill('')),backgrounds=values.map(row=>row.map(()=>'#ffffff'));
 for(const [row,days] of [[2,[[2,'월'],[9,'화'],[16,'수']]],[44,[[2,'목'],[9,'금'],[16,'토'],[19,'일']]]]){
  for(const [col,day] of days)values[row][col]=day;
  for(const col of [2,3,4,5,6,7,9,10,11,12,13,14,16,17,18,19,20,21])values[row+1][col]=col===2?'2교실':col===4?'5교실':col===12?'3교실':col===18?'6교실':(col+1)+'교실';
 }
 for(const col of [1,8,15])for(let i=0;i<9;i++)values[8+i*4][col]=String(i+1);
 values[4][1]='10시';
 for(const col of [1,8]){values[46][col]='10시';for(let i=0;i<10;i++)values[51+i*4][col]=String(i+1);}
 values[46][15]='9';for(let i=0;i<10;i++)values[51+i*4][15]=String((10+i-1)%12+1);
 const block=(row,col,height,heading,names=[],color='#aabbcc')=>{values[row-1][col-1]=heading;for(let i=0;i<height;i++)backgrounds[row-1+i][col-1]=color;names.forEach((s,i)=>values[row+i][col-1]=s);};
 return {values,backgrounds,block};
}
test('source axes preserve Friday half-hours, Saturday mornings and 22:00 endings',()=>{
 const r=runtime(),f=fixture();f.block(37,5,8,'고2 물리');f.block(58,13,4,'신T 초5',['가학생 나학생']);f.block(56,19,4,'신T 중1 이론',['다학생']);f.block(80,19,8,'고2 화학',['화학']);
 const c=r.parse2027Timetable_(f.values,f.backgrounds).classes,at=id=>c.find(x=>x.id==='y2027-'+id);
 assert.deepEqual([at('M58').start,at('M58').end],['14:30','15:30']);
 assert.deepEqual([at('S80').start,at('S80').end,at('S80').review],['17:00','19:00',false]);
 assert.deepEqual([at('S56').start,at('S56').end],['11:00','12:00']);assert.equal(at('S56').review,true,'one-hour middle-school course needs review');
 assert.equal(at('E37').end,'22:00');assert.ok(!c.some(x=>x.sourceCell==='S81'),'course-name continuation is not another class');
});
test('all roster text counts as confirmed while dated makeups and name-only cells are excluded',()=>{
 const r=runtime(),f=fixture();f.block(13,3,4,'홍T 초4',['[가학생] 나학생(학교)','다학생10월휴원','라학생']);f.block(21,3,4,'신T 10/24 보강',['마학생']);f.block(29,3,4,'바학생',['사학생']);
 const result=r.parse2027Timetable_(f.values,f.backgrounds);
 assert.equal(result.classes.length,1);assert.equal(result.classes[0].registered,4);assert.equal(result.classes[0].remaining,2);
 assert.ok(result.roster.every(p=>p.status==='registered'));assert.equal(result.ignored.dated,1);assert.ok(!JSON.stringify(result.roster).includes('마학생'));assert.ok(!JSON.stringify(result.roster).includes('바학생'));
});
test('ambiguous grades, duplicates and over-capacity groups fail closed',()=>{
 const r=runtime(),f=fixture();f.block(13,3,4,'신T 기타');f.block(21,3,4,'홍T 초3',['가학생 가학생']);f.block(29,3,4,'신T 초4',['가학생 나학생 다학생','라학생 마학생 바학생','사학생']);
 const result=r.parse2027Timetable_(f.values,f.backgrounds);
 assert.ok(result.classes.every(c=>c.review));assert.ok(result.reviews.some(x=>x.issue.includes('학년')));assert.ok(result.reviews.some(x=>x.issue.includes('동명')));assert.ok(result.reviews.some(x=>x.issue.includes('정원 초과')));
});
test('grade-six paired courses allow different rooms but reject ambiguous membership',()=>{
 const r=runtime(),f=fixture();f.block(13,3,4,'홍T 초6 실험',['가학생']);f.block(17,5,4,'신T 초6 이론',['가학생']);
 const first=r.parse2027Timetable_(f.values,f.backgrounds).classes;
 assert.equal(first.length,1);assert.deepEqual([first[0].start,first[0].end,first[0].registered,first[0].capacity,first[0].review],['14:00','16:00',1,6,false]);assert.match(first[0].room,/2교실 → 5교실/);
 f.values[17][4]='나학생';assert.ok(r.parse2027Timetable_(f.values,f.backgrounds).classes.every(c=>c.review));
});
test('public snapshot omits identities and teachers, and never uses partially written or stale snapshots',()=>{
 const r=runtime(),timestamp=new Date().toISOString();let stored=timestamp;
 r.props_=()=>({getProperty:k=>({YEAR2027_LAST_SYNC:stored,PRIVACY_CONTACT:'상담 전화'})[k]});
 r.read_=name=>{assert.equal(name,'2027반설정');return [{id:'y2027-C13',grade:'초4',title:'아톰 2',day:'월',start:'14:00',end:'15:00',room:'2교실',teacher:'PRIVATE_TEACHER',registered:'PRIVATE_NAME',capacity:'6',remaining:'1',review:'false',updatedAt:timestamp}];};
 const result=r.public2027Catalog_();assert.ok(!JSON.stringify(result).includes('PRIVATE'));assert.equal(result.classes[0].remaining,1);
 stored='2026-01-01T00:00:00Z';assert.throws(()=>r.read2027Snapshot_(),/동기화 상태/);
 r.read_=()=>[{id:'y2027-C13',grade:'초4',remaining:'1',review:'false',updatedAt:stored}];assert.equal(r.public2027Catalog_().classes[0].remaining,0);assert.equal(r.public2027Catalog_().classes[0].review,true);
});
test('scheduled synchronization attempts both years even if the first timetable fails',()=>{
 const r=runtime(),calls=[];r.syncTimetable_=()=>{calls.push(2026);throw Error('source unavailable');};r.sync2027Timetable_=()=>{calls.push(2027);return true;};
 assert.throws(()=>r.syncAllTimetables_(),/현재 시간표/);assert.deepEqual(calls,[2026,2027]);
});
test('public display uses snapshots and explicit administrator synchronization reads the designated source',()=>{
 const r=runtime(),f=fixture(),calls=[],writes=[],props={PRIVACY_CONTACT:'학원 상담'};f.block(13,3,4,'신T 초4',['가학생']);
 r.props_=()=>({getProperty:k=>props[k],setProperties:x=>Object.assign(props,x)});r.ensure2027Tables_=()=>{};r.write_=(name,rows)=>writes.push({name,rows});
 r.SpreadsheetApp={flush(){calls.push('flush');},openById:id=>{calls.push(id);return {getSheets:()=>[{getSheetId:()=>74444574,getLastRow:()=>88,getLastColumn:()=>23,getRange:()=>({getDisplayValues:()=>f.values,getBackgrounds:()=>f.backgrounds})}]};}};
 r.db_=()=>({getSheetByName:()=>({getLastRow:()=>1})});r.sync2027Timetable_();assert.equal(writes.length,3);assert.equal(writes[0].name,'2027반설정');assert.equal(writes[1].rows[0].status,'registered');assert.ok(props.YEAR2027_LAST_SYNC);assert.ok(calls.includes('1omBPwVh6sDcH3kF7V22V1ZK8HGWsxsQA22OsAqHPDQE'));
 r.read_=name=>writes.find(x=>x.name===name).rows;r.SpreadsheetApp.openById=()=>{throw Error('Public requests must not read the source');};assert.equal(r.public2027Catalog_().classes.length,1);
});

test('a dated regular-class heading is reviewed rather than silently treated as a makeup',()=>{
 const r=runtime(),f=fixture();f.block(13,3,4,'신T 초4 10/24 시작',['가학생']);
 const result=r.parse2027Timetable_(f.values,f.backgrounds);assert.equal(result.classes.length,1);assert.equal(result.ignored.dated,0);assert.equal(result.classes[0].review,true);assert.match(result.classes[0].issues.join(' '),/정규반/);
});
