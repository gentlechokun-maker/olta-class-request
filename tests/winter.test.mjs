import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {winter2027Course,winter2027Grade,bundleWinter2027,scheduleKey2027,excludedWeekendRoom2027} from '../public/winter-courses.js';
const mid={id:'y2027-F5',grade:'초6',title:'겨울방학 초6 예비 중등 특강',day:'월',start:'10:00',end:'12:00',room:'3교실',remaining:6,capacity:6,review:false};
const high={...mid,id:'y2027-M5',grade:'중3',title:'겨울방학 고등 3모 대비 특강',day:'화'};
test('winter eligibility uses explicit year and rejects unrelated grades',()=>{
 assert.equal(winter2027Grade(mid,'2026:초6').grade,'중1');
 assert.equal(winter2027Grade(mid,'2027:중1').grade,'중1');
 for(const value of ['초6','중1','2027:초6','2026:중1','2027:고1'])assert.equal(winter2027Grade(mid,value),null);
 for(const value of ['2026:중2','2026:중3','2027:중3','2027:고1'])assert.ok(winter2027Grade(high,value));
 assert.equal(winter2027Grade(high,'2027:중2'),null);
 assert.equal(winter2027Course({...mid,id:'other'}),null);
 assert.equal(winter2027Course({...mid,title:'퀀텀 2'}),null);
 assert.equal(winter2027Grade({...mid,id:'regular'},'초6').grade,'초6');
});
const midWed={...mid,id:'y2027-U5',day:'수'},highThu={...high,id:'y2027-F51',day:'목'};
const sessions=[mid,midWed,high,highThu];
const bundles=bundleWinter2027(sessions);
function runtime(){const r={console,Date,SpreadsheetApp:{flush(){}}};vm.createContext(r);for(const file of ['public/domain.js','apps-script/Code.gs','apps-script/Year2027.gs'])vm.runInContext(fs.readFileSync(file,'utf8').replace(/^export /gm,''),r);r.read2027Snapshot_=()=>({classes:sessions});r.public2027Catalog_=()=>({});return r;}
function input(c,grade){return {kind:'year2027',targetId:c.id,grade,student:'테스트학생',phone:'01000000000',consent:'yes',privacyVersion:'2026-10-13',requestId:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',scheduleKey:scheduleKey2027(c)};}
test('server accepts winter applications now and preserves selected year in private notes',()=>{
 const r=runtime();
 for(const c of bundles)for(const option of winter2027Course(c).options){const result=r.validate2027_(input(c,option.value));assert.equal(result.grade,option.grade);assert.ok(result.note.includes(option.label));assert.ok(result.note.includes(winter2027Course(c).title));}
 assert.throws(()=>r.validate2027_(input(bundles[0],'2027:고1')),/학년/);
 assert.throws(()=>r.validate2027_({...input(bundles[1],'2027:고1'),scheduleKey:'old'}),/시간이 변경/);
 r.read2027Snapshot_=()=>({classes:[{...mid,remaining:0}]});assert.throws(()=>r.validate2027_(input(bundles[0],'2026:초6')));
 r.read2027Snapshot_=()=>({classes:[{...mid,review:true}]});assert.throws(()=>r.validate2027_(input(bundles[0],'2026:초6')));
});
test('equivalent current and upcoming grades do not create duplicate applications',()=>{
 const r=runtime(),rows=[];r.read_=()=>rows;r.append_=(table,row)=>{assert.equal(table,'신청');rows.push(row);};
 assert.equal(r.submit2027_(input(bundles[0],'2026:초6')).ok,true);
 assert.equal(r.submit2027_({...input(bundles[0],'2027:중1'),requestId:'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'}).duplicate,true);
 assert.equal(rows.length,1);assert.equal(rows[0].grade,'중1');assert.match(rows[0].note,/2026년 초6/);
});
test('browser and server share the exact eligibility rules',()=>{const r=runtime();for(const c of [mid,high,{...mid,id:'regular'}])assert.deepEqual(JSON.parse(JSON.stringify(r.winter2027Course(c))),winter2027Course(c));});

test('weekly sessions form two courses; both dates determine seats and eligibility',()=>{
 assert.equal(bundles.length,2);assert.equal(bundles[0].day,'월·수');assert.equal(bundles[1].day,'화·목');
 assert.deepEqual(bundles[0].sessions.map(c=>c.id),['y2027-F5','y2027-U5']);
 const oneFull=bundleWinter2027([mid,{...midWed,remaining:0}])[0];assert.equal(oneFull.remaining,0);
 assert.equal(bundleWinter2027([mid])[0].review,true);
 assert.equal(bundleWinter2027([mid,{...midWed,review:true}])[0].remaining,0);
 const r=runtime();assert.throws(()=>r.validate2027_(input(mid,'2026:초6')),/학년/);
 assert.throws(()=>r.validate2027_(input(midWed,'2026:초6')),/학년/);
 r.read2027Snapshot_=()=>({classes:[mid,{...midWed,start:'11:00',end:'13:00'},high,highThu]});
 assert.throws(()=>r.validate2027_(input(bundles[0],'2026:초6')),/시간이 변경/);
});
test('weekend room two is excluded but weekday room two and weekend room twelve survive',()=>{
 const base={id:'normal',grade:'중1',title:'니들',day:'토',room:'2교실'};
 for(const room of ['2교실','2 교실','2교실 → 3교실'])assert.ok(excludedWeekendRoom2027({...base,room}));
 assert.equal(excludedWeekendRoom2027({...base,room:'12교실'}),false);
 assert.equal(excludedWeekendRoom2027({...base,day:'월'}),false);
 const inputRows=[base,{...base,id:'sunday',day:'일'},{...base,id:'monday',day:'월'},{...base,id:'twelve',room:'12교실'}];
 assert.deepEqual(bundleWinter2027(inputRows).map(c=>c.id),['monday','twelve']);
 const r=runtime();r.read2027Snapshot_=()=>({classes:[{...base,start:'10:00',end:'12:00',remaining:6,review:false}]});
 assert.throws(()=>r.validate2027_(input(base,'중1')),/학년/);
});
test('public bundled fields contain both schedules and no private resource or roster metadata',()=>{
 const r=runtime();r.props_=()=>({getProperty:k=>k==='PRIVACY_CONTACT'?'학원':null});
 r.read2027Snapshot_=()=>({classes:sessions.map(c=>({...c,teacher:'PRIVATE_TEACHER',names:['PRIVATE_STUDENT']}))});
 // Restore original catalog method replaced by fixture.
 vm.runInContext(fs.readFileSync('apps-script/Year2027.gs','utf8').match(/function public2027Catalog_\(\)\{[\s\S]*?\n\}/)[0],r);
 const result=r.public2027Catalog_();assert.equal(result.classes.length,2);assert.ok(!JSON.stringify(result).includes('PRIVATE'));
 assert.equal(result.classes[0].sessions.length,2);assert.ok(!result.classes.some(c=>c.id==='y2027-F5'));
});

test('eight additional courses keep January-only and January–February eligibility separate',()=>{
 const cases=[
  ['special2027-debate-3','초3 올치 토론·창의력 특강','월','14:00','17:00',['초3'],'2027년 1~2월'],
  ['special2027-debate-4','초4 올치 토론·창의력 특강','화','14:00','17:00',['초4'],'2027년 1~2월'],
  ['special2027-debate-56','초5·초6 올치 토론·창의력 특강','금','14:00','17:00',['초5','초6'],'2027년 1~2월'],
  ['special2027-navigator-1','대입 네비게이터 특강 1','금','16:00','19:00',['중3','고1','고2'],'2027년 1~2월'],
  ['special2027-navigator-2','대입 네비게이터 특강 2','금','19:00','21:00',['중3','고1','고2'],'2027년 1~2월'],
  ['special2027-experiment-12','초1·초2 올치 실험 특강','화','13:00','14:00',['초1','초2'],'2027년 1월'],
  ['special2027-experiment-34','초3·초4 올치 실험 특강','수','13:00','14:00',['초3','초4'],'2027년 1월'],
  ['special2027-experiment-56','초5·초6 올치 실험 특강','목','13:00','14:00',['초5','초6'],'2027년 1월']
 ];
 const r=runtime();
 for(const [id,title,day,start,end,grades,period] of cases){
  const c={id,title,grade:grades[0],day,start,end,room:'3교실',capacity:6,remaining:6,review:false};
  const profile=winter2027Course(c);
  assert.equal(profile.period,period);assert.deepEqual(profile.options.map(o=>o.grade),grades);
  assert.deepEqual(JSON.parse(JSON.stringify(r.winter2027Course(c))),profile);
  assert.equal(bundleWinter2027([c])[0].id,id,'single-day specials must not be bundled or dropped');
  for(const grade of grades){r.read2027Snapshot_=()=>({classes:[c]});const result=r.validate2027_(input(c,'2027:'+grade));assert.equal(result.grade,grade);assert.match(result.note,new RegExp(period));}
  assert.equal(winter2027Grade(c,'2027:초6')?.grade,grades.includes('초6')?'초6':undefined);
  assert.equal(winter2027Grade(c,'2026:'+grades[0]),null);
 }
});
