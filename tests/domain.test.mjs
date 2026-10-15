import test from 'node:test';
import assert from 'node:assert/strict';
import {capacity,parseColoredCell,validateRequest,aggregateDemand,overlaps,normalizePhone,GRADES,COURSE_GRADES,studentGrades,curriculum,durationMinutes} from '../public/domain.js';
test('black and purple reserve seats; paused and consultation do not',()=>{
  assert.deepEqual(capacity({registered:'3',starting:'2',paused:8,makeup:1,consultation:7}),{used:5,remaining:1,over:false});
  assert.deepEqual(capacity({registered:6,starting:1}),{used:7,remaining:0,over:true});
});
test('mixed rich-text cell reads each student, not the cell font',()=>{
  const text='김가람 이나래 박다온 최라온 정마루';
  const colors=['#000000','#ff0000','#0000ff','#008000','#800080'];
  const parsed=parseColoredCell(text,colors.map((color,i)=>({start:i*4,end:i*4+3,color})));
  assert.equal(parsed.issues.length,0);
  assert.deepEqual(parsed.people.map(p=>p.status),['registered','paused','makeup','consultation','starting']);
  assert.equal(capacity(Object.fromEntries(parsed.people.map(p=>[p.status,1]))).remaining,4);
});
test('unknown color, mixed name color and notes cannot silently create free seats',()=>{
  assert.equal(parseColoredCell('김가람',[{start:0,end:3,color:'#123456'}]).issues.length,1);
  assert.equal(parseColoredCell('김가람',[{start:0,end:1,color:'#ff0000'},{start:1,end:3,color:'#000000'}]).issues.length,1);
  assert.ok(parseColoredCell('김가람 10월시작',[]).issues.length);
});
test('bracketed names and parenthesized annotations preserve offsets',()=>{
  const result=parseColoredCell('[김가람] 이나래(매봉)',[{start:0,end:6,color:'#000000'},{start:6,end:14,color:'#800080'}]);
  assert.deepEqual(result.people.map(p=>[p.name,p.status]),[['김가람','registered'],['이나래','starting']]);
});
const catalog={classes:[{id:'c1',grade:'초3',remaining:1,review:false}],slots:[{id:'s1',grades:['초3','초4']}]};
const input={kind:'existing',targetId:'c1',grade:'초3',student:'예시학생',phone:'010-1234-5678',consent:'yes',privacyVersion:'2026-10-13',requestId:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'};
test('valid request is normalized without reserving a seat',()=>{assert.equal(validateRequest(input,catalog).phone,'01012345678');assert.equal(catalog.classes[0].remaining,1);});
test('reject forged grade, full class, unresolved count, missing consent, invalid phone',()=>{
  assert.throws(()=>validateRequest({...input,grade:'초4'},catalog));
  assert.throws(()=>validateRequest(input,{...catalog,classes:[{...catalog.classes[0],remaining:0}]}));
  assert.throws(()=>validateRequest(input,{...catalog,classes:[{...catalog.classes[0],review:true}]}));
  assert.throws(()=>validateRequest({...input,consent:''},catalog));
  assert.throws(()=>validateRequest({...input,phone:'123'},catalog));
  assert.throws(()=>validateRequest({...input,website:'spam'},catalog));
  assert.throws(()=>validateRequest({...input,privacyVersion:'old'},catalog));
});
test('new-class demand counts distinct students per grade and slot, excludes cancelled/confirmed',()=>{
  const base={kind:'new',targetId:'s1',grade:'초3',student:'예시학생',phone:'01012345678',status:'접수'};
  const rows=[base,{...base,phone:'010-1234-5678'},{...base,student:'다른학생'}, {...base,student:'세번째',status:'상담 중'},{...base,student:'취소학생',status:'취소'},{...base,student:'확정학생',status:'확정 등록'},{...base,targetId:'s2'},{...base,grade:'초4'}];
  assert.deepEqual(aggregateDemand(rows),{'s1|초3':3,'s2|초3':1,'s1|초4':1});
});
test('overlapping classrooms block new slots, adjacent times remain valid',()=>{
  const a={day:'월',room:'2교실',start:'14:00',end:'15:00'};
  assert.equal(overlaps(a,{...a,start:'14:30',end:'15:30'}),true);
  assert.equal(overlaps(a,{...a,start:'15:00',end:'16:00'}),false);
  assert.equal(overlaps(a,{...a,room:'3교실'}),false);
});
test('Korean international mobile format normalizes',()=>assert.equal(normalizePhone('+82 10 1234 5678'),'01012345678'));
test('Big Bang uses same curriculum but keeps classes and demand separate by actual grade',()=>{
  const bigbang={classes:[{id:'b1',grade:'초1',remaining:2,review:false}],slots:[{id:'s1',grades:['초1','초2','초3']}]};
  assert.equal(validateRequest({...input,targetId:'b1',grade:'초1'},bigbang).grade,'초1');
  assert.throws(()=>validateRequest({...input,targetId:'b1',grade:'초2'},bigbang));
  for(const grade of ['초1','초2'])assert.equal(validateRequest({...input,kind:'new',targetId:'s1',grade},bigbang).grade,grade);
  assert.deepEqual(studentGrades(['초1']),['초1']);
  const base={kind:'new',targetId:'s1',phone:'01000000000',status:'접수'};
  assert.deepEqual(aggregateDemand([{...base,student:'가원생',grade:'초1'},{...base,student:'나원생',grade:'초2'},{...base,student:'다원생',grade:'초2'}]),{'s1|초1':1,'s1|초2':2});
});
test('high school grades 2 and 3 cannot be selected or forged at the server',()=>{
  for(const grade of ['고2','고3']){assert.ok(!GRADES.includes(grade));assert.ok(!COURSE_GRADES.includes(grade));assert.throws(()=>validateRequest({...input,grade},catalog));}
});
test('elementary grades 1-5 are one hour and grade 6 combines two hours',()=>{
  ['빅뱅','빅뱅','아톰 1','아톰 2','퀀텀 1','퀀텀 2'].forEach((name,i)=>assert.deepEqual(curriculum('초'+(i+1),'월'),{name,minutes:i===5?120:60,lesson:i===5?'실험 1시간 + 이론 1시간':'주 1회 · 1시간'}));
});
test('middle-school semester transition and Saturday grade-3 exception',()=>{
  assert.equal(curriculum('중1','월',2).name,'니들');
  assert.equal(curriculum('중2','월',1).name,'니들');
  assert.equal(curriculum('중2','월',2).name,'스레드');
  assert.equal(curriculum('중2','월',2).minutes,180);
  assert.equal(curriculum('중3','금',2).minutes,180);
  assert.deepEqual(curriculum('중3','토',2),{name:'통합과학',minutes:120,lesson:'주 1회 · 2시간'});
  assert.equal(curriculum('고1','월',2),null);
});
test('preview session lengths match the curriculum without mixed-grade classes',async()=>{
  const {demoCatalog}=await import('../public/demo.js');
  for(const c of demoCatalog().classes){assert.ok(GRADES.includes(c.grade));assert.equal(durationMinutes(c.start,c.end),curriculum(c.grade,c.day,2).minutes);}
});
