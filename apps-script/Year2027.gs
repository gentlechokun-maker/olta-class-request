/** Private source -> private snapshot -> anonymous class metadata. Never publish names. */
const YEAR2027_SOURCE_={spreadsheetId:'1omBPwVh6sDcH3kF7V22V1ZK8HGWsxsQA22OsAqHPDQE',sheetId:74444574};
const YEAR2027_TABLES_={
 '2027반설정':['id','grade','title','day','start','end','room','teacher','sourceCell','registered','capacity','remaining','review','issues','updatedAt','resources'],
 '2027원생':['classId','name','status','sourceCell','updatedAt'],
 '2027확인필요':['sourceCell','day','start','end','room','header','issue','updatedAt']
};
function a1Year2027_(row,col){let s='';for(let n=col+1;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s+(row+1);}
function minuteYear2027_(n){return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');}
function headingYear2027_(text){
 const s=String(text||'').normalize('NFKC').trim();
 const grade=s.match(/(?:^|[\s(\[·])((?:초[1-6]|중[1-3]|고[1-3]))(?=$|[\s)·]|[가-힣])/);
 const teacher=s.match(/([가-힣]{1,4})\s*[Tt](?=$|[\s(·])/);
 const excluded=/보강|직보|클리닉|회의/.test(s);
 const course=s.match(/통합과학|물리학\s*1|물리|화학|실험|이론|빅뱅|아톰\s*[12]?|퀀텀\s*[12]?|니들|스레드|네비게이터|내신대비|세페이드|셀파/);
 return {s,grade:grade?grade[1]:'',teacher:teacher?teacher[1]+'T':'',course:course?course[0]:'',excluded,header:!!(grade||teacher||course||excluded)};
}
function namesYear2027_(text){
 const names=[],issues=[];
 const s=String(text||'').normalize('NFKC').replace(/\([^)]*\)/g,' ').replace(/[\[\]{}]/g,' ');
 for(const token of s.split(/[\s,，/]+/).filter(Boolean)){
  // Explicit school/grade notes are not student names. Keep unfamiliar notes reviewable.
  if(/^(?:소현|서원|정평|이현|성서|성복|다산)(?:초|중|고)[1-6]?$/.test(token))continue;
  const word=token.replace(/매주지각$/,'');
  if(/^(?:이동|결석|휴원|화학|물리|과학|이론|실험|매주지각|서술형|분일찍|까지옴)$/.test(word)||/^\d/.test(word))continue;
  const match=word.match(/^([가-힣]{2,4})(?=\d|$)/);
  if(match)names.push(match[1]);else issues.push('원생 이름과 메모 분리 필요');
 }
 return {names,issues};
}
function parse2027Timetable_(values,backgrounds){
 const get=(r,c)=>String(values[r]?.[c]||'').trim(),bg=(r,c)=>String(backgrounds[r]?.[c]||'#ffffff').toLowerCase();
 const dayRows=[];for(let r=0;r<values.length;r++){const days=[];for(let c=0;c<(values[r]||[]).length;c++)if(/^[월화수목금토일]$/.test(get(r,c)))days.push({day:get(r,c),col:c});if(days.length>=2)dayRows.push({r,days});}
 if(dayRows.length!==2||dayRows.flatMap(x=>x.days.map(d=>d.day)).join('')!=='월화수목금토일')throw Error('2027 원본의 요일 머리글 배치를 확인하세요.');
 const classes=[],reviews=[],roster=[],ignored={dated:0,special:0,namesOnly:0};
 const review=(c,issue)=>reviews.push({sourceCell:c.sourceCell,day:c.day,start:c.start,end:c.end,room:c.room,header:c.header,issue});
 for(let b=0;b<dayRows.length;b++){
  const band=dayRows[b],endBand=b+1<dayRows.length?dayRows[b+1].r:values.length;
  for(let d=0;d<band.days.length;d++){
   const day=band.days[d],endCol=band.days[d+1]?.col||Math.min(23,Math.max(...values.map(x=>x.length)));
   let timeCol=day.col-1;
   // Sunday shares Saturday's hour column, while the rooms remain separate.
   if(!values.slice(band.r+2,endBand).some(row=>/^\d{1,2}(?:시)?$/.test(String(row?.[timeCol]||'').trim())))timeCol=band.days[d-1]?.col-1;
   const anchors=[];for(let r=band.r+2;r<endBand;r++){const label=get(r,timeCol)||(!['토','일'].includes(day.day)?get(r,band.days[0].col-1):''),m=label.match(/^(\d{1,2})(?:시)?$/);if(m){let h=Number(m[1]);if(!anchors.length&&h<10&&!(['토','일'].includes(day.day)&&h===9))h+=12;while(anchors.length&&h*60<=anchors[anchors.length-1].time)h+=12;anchors.push({r,time:h*60});}}
   const timeAt=r=>{let a;for(const x of anchors)if(x.r<=r)a=x;if(!a)return null;const next=anchors.find(x=>x.r>a.r);if(next&&(next.r-a.r!==4||next.time-a.time!==60))return r===a.r?a.time:null;return a.time+(r-a.r)*15;};
   for(let col=day.col;col<endCol;col++){
    const room=get(band.r+1,col);if(!/^\d+교실$/.test(room)||excludedWeekendRoom2027({day:day.day,room}))continue;
    let r=band.r+2;
    while(r<endBand){
     const h=headingYear2027_(get(r,col));if(!h.header){if(h.s)ignored.namesOnly++;r++;continue;}
     const startRow=r,color=bg(r,col);let stop=r+1;
     while(stop<endBand&&(!headingYear2027_(get(stop,col)).header||get(stop,col)===h.course)&&bg(stop,col)===color)stop++;
     r=stop;
     const startMinute=timeAt(startRow),endMinute=timeAt(stop);
     const c={id:'y2027-'+a1Year2027_(startRow,col),sourceCell:a1Year2027_(startRow,col),grade:h.grade,day:day.day,room,teacher:h.teacher,header:h.s,start:startMinute===null?'':minuteYear2027_(startMinute),end:endMinute===null?'':minuteYear2027_(endMinute),title:'',names:[],issues:[],column:col,segment:h.course};
     // Dated one-off entries, including undated continuation lines in that block, never form a regular class.
     const dated=/(?:\d{1,2}\s*월\s*\d{1,2}\s*일|\d{1,2}[/.]\d{1,2})/.test(h.s);
     if(dated&&(h.excluded||!h.grade)){ignored.dated++;continue;}
     if(dated)c.issues.push('날짜 표시가 있는 정규반인지 확인 필요');
     if(/[\r\n]/.test(h.s))c.issues.push('수업 제목과 원생 이름을 별도 셀로 분리 필요');
     if(h.excluded){ignored.special++;continue;}
     if(!h.grade)c.issues.push('학년 확인 필요');
     if(startMinute===null||endMinute===null||startMinute>=endMinute||endMinute>1320||startMinute%30||endMinute%30)c.issues.push('시작·종료 시간 확인 필요');
     if(color==='#ffffff'){c.issues.push('수업 시간 영역 확인 필요');c.end='';}
     if(/^초[1-5]$/.test(h.grade)&&endMinute-startMinute!==60)c.issues.push('초1~초5 1시간 편성 확인 필요');
     if(['중1','중2','고1','고2'].includes(h.grade)&&endMinute-startMinute!==(/스레드/.test(h.course)?180:120))c.issues.push(h.grade+' 이론 수업 시간 확인 필요');
     const basic={'초1':'빅뱅','초2':'빅뱅','초3':'아톰 1','초4':'아톰 2','초5':'퀀텀 1','초6':'퀀텀 2','중1':'니들','중2':'니들','중3':'스레드'};
     c.title=h.course?(h.grade==='초6'?'퀀텀 2 · ':'')+h.course:basic[h.grade]||'과학';
     if(c.grade==='중2'){
      const schools={'금':'이현·성서','수':'서원','토':'소현·서원·정평'}[c.day];
      if(schools)c.title+=' · 학교: '+schools;
     }
     const seen=new Set();
     for(let nr=startRow+1;h.grade&&nr<stop;nr++){
      const text=get(nr,col);if(!text||text===h.course)continue;
      const parsed=namesYear2027_(text);c.issues.push(...parsed.issues);
      for(const name of parsed.names){if(seen.has(name))c.issues.push('동명이인 또는 중복 이름 확인 필요');seen.add(name);c.names.push({name,sourceCell:a1Year2027_(nr,col)});}
     }
     classes.push(c);
    }
   }
  }
 }
 // Grade-six experiment/theory must be an unambiguous consecutive pair in the same source room.
 const paired=new Set(),combined=[];
 for(const c of classes){
  if(paired.has(c.id))continue;
  if(c.grade==='초6'&&/^(실험|이론)$/.test(c.segment)){
   const matches=classes.filter(x=>x!==c&&x.grade==='초6'&&x.day===c.day&&x.segment!==c.segment&&/^(실험|이론)$/.test(x.segment)&&(x.start===c.end||x.end===c.start));
   if(matches.length===1){const p=matches[0],names=c.names.map(x=>x.name).sort().join('|'),other=p.names.map(x=>x.name).sort().join('|');
    if(names===other&&!paired.has(p.id)&&durationMinutes(c.start,c.end)===60&&durationMinutes(p.start,p.end)===60){const first=c.start<p.start?c:p,last=first===c?p:c;combined.push({...first,title:'퀀텀 2 · 실험·이론',end:last.end,room:first.room===last.room?first.room:first.room+' → '+last.room,parts:[first,last],sourceCell:first.sourceCell+'+'+last.sourceCell,issues:[...c.issues,...p.issues]});paired.add(c.id);paired.add(p.id);continue;}
   }
   c.issues.push('초6 실험·이론 연계반 확인 필요');
  }
  combined.push(c);
 }
 for(const c of combined){
  c.capacity=classCapacity(c);c.registered=new Set(c.names.map(p=>p.name)).size;c.remaining=Math.max(0,c.capacity-c.registered);
  if(c.registered>c.capacity)c.issues.push('확정 등록 인원이 정원 초과');
  if(combined.some(x=>x!==c&&(x.parts||[x]).some(a=>(c.parts||[c]).some(z=>a.day===z.day&&a.room===z.room&&a.start<z.end&&z.start<a.end))))c.issues.push('동일 교실 수업 시간 겹침 확인 필요');
  c.issues=[...new Set(c.issues)];c.review=c.issues.length>0;
  c.issues.forEach(issue=>review(c,issue));
  for(const p of c.names)roster.push({classId:c.id,name:p.name,status:'registered',sourceCell:p.sourceCell});
 }
 return {classes:combined,roster,reviews,ignored};
}
function ensure2027Tables_(){
 Object.assign(TABLES_,YEAR2027_TABLES_);const db=db_();
 for(const [name,headers] of Object.entries(YEAR2027_TABLES_)){
  let s=db.getSheetByName(name);if(!s)s=db.insertSheet(name);
  if(!s.getLastRow()){s.getRange(1,1,1,headers.length).setValues([headers]).setFontWeight('bold').setBackground('#e5eddc');s.setFrozenRows(1);s.setColumnWidth(1,150);s.setColumnWidth(headers.indexOf('issues')+1||headers.indexOf('issue')+1||1,300);}
  else{const actual=s.getRange(1,1,1,headers.length).getDisplayValues()[0];if(name==='2027반설정'&&headers.slice(0,-1).every((h,i)=>actual[i]===h)&&!actual[headers.length-1])s.getRange(1,headers.length).setValue('resources');else if(!headers.every((h,i)=>actual[i]===h))throw Error(name+' 시트의 열 제목을 확인하세요.');}
 }
}
function sync2027Timetable(){admin_();return locked_(()=>sync2027Timetable_());}
function sync2027Timetable_(){
 const p=props_(),id=p.getProperty('SOURCE_2027_SPREADSHEET_ID')||YEAR2027_SOURCE_.spreadsheetId,sheetId=Number(p.getProperty('SOURCE_2027_SHEET_ID')||YEAR2027_SOURCE_.sheetId);
 const source=SpreadsheetApp.openById(id).getSheets().find(s=>s.getSheetId()===sheetId);if(!source)throw Error('2027 원본 시간표 탭을 찾을 수 없습니다.');
 if(source.getLastRow()>300||source.getLastColumn()>32)throw Error('2027 시간표 범위가 변경되었습니다. 판독 범위를 확인하세요.');
 const range=source.getRange(1,1,Math.max(100,source.getLastRow()),Math.max(23,source.getLastColumn()));
 const values=range.getDisplayValues(),result=applyConfirmed2027_(parse2027Timetable_(values,range.getBackgrounds()),values,readConfirmed2027_()),timestamp=now_();
 if(!result.classes.length)throw Error('2027 정규 수업을 읽지 못했습니다. 원본 배치를 확인하세요.');
 ensure2027Tables_();
 write_('2027반설정',result.classes.map(c=>({...c,review:String(c.review),issues:c.issues.join('\n'),updatedAt:timestamp,resources:JSON.stringify((c.parts||[c]).map(x=>({day:x.day,start:x.start,end:(x.issues||[]).some(issue=>/시작·종료 시간 확인|수업 시간 영역 확인/.test(issue))?'':x.end,room:x.room,teacher:x.teacher})))})));
 write_('2027원생',result.roster.map(r=>({...r,updatedAt:timestamp})));
 write_('2027확인필요',result.classes.filter(c=>c.review).map(c=>({sourceCell:c.sourceCell,day:c.day,start:c.start,end:c.end,room:c.room,header:c.header,issue:c.issues.join('\n'),updatedAt:timestamp})));
 for(const [name,headers] of Object.entries(YEAR2027_TABLES_)){const sheet=db_().getSheetByName(name);if(sheet.getLastRow()>1)sheet.getRange(2,1,sheet.getLastRow()-1,headers.length).setVerticalAlignment('top').setWrap(true);}
 SpreadsheetApp.flush();p.setProperties({YEAR2027_LAST_SYNC:timestamp,YEAR2027_IGNORED:JSON.stringify(result.ignored)});
 console.log(JSON.stringify({year:2027,classes:result.classes.length,available:result.classes.filter(c=>!c.review&&c.remaining>0).length,review:result.classes.filter(c=>c.review).length,ignored:result.ignored,updatedAt:timestamp}));
 return {classes:result.classes.length,review:result.classes.filter(c=>c.review).length,updatedAt:timestamp};
}
function read2027Snapshot_(){
 Object.assign(TABLES_,YEAR2027_TABLES_);const timestamp=props_().getProperty('YEAR2027_LAST_SYNC');if(!timestamp)throw Error('2027 시간표를 동기화한 뒤 신청할 수 있습니다.');
 const rows=read_('2027반설정').filter(c=>!excludedWeekendRoom2027(c));if(!rows.length||rows.some(c=>c.updatedAt!==timestamp))throw Error('2027 시간표 동기화 상태를 확인 중입니다.');
 const stale=catalogStale_(timestamp);
 return {updatedAt:timestamp,classes:rows.map(c=>({...c,capacity:Number(c.capacity),registered:Number(c.registered),remaining:stale?0:Number(c.remaining),review:stale||c.review!=='false'}))};
}
function public2027Catalog_(){
 const p=props_();if(!p.getProperty('PRIVACY_CONTACT'))throw Error('상담 연락처를 준비 중입니다.');
 const snapshot=read2027Snapshot_();
 return {year:2027,mode:'live',updatedAt:snapshot.updatedAt,classes:bundleWinter2027(snapshot.classes.filter(c=>c.grade)).map(c=>({id:c.id,grade:c.grade,title:c.title,day:c.day,start:c.start,end:c.end,room:c.room,capacity:c.capacity,remaining:c.review?0:c.remaining,review:c.review,...(c.bundle?{bundle:true,days:c.days,sessions:c.sessions}:{})})),retentionDays:Number(p.getProperty('RETENTION_DAYS')||90),privacyContact:p.getProperty('PRIVACY_CONTACT'),sourceTitle:'2027 1~2월'};
}
// Use the private 2027 snapshot only; never send teacher resources to the browser.
function opening2027Catalog_(){
 try{
  const snapshot=read2027Snapshot_();if(catalogStale_(snapshot.updatedAt))throw Error('2027 시간표 동기화가 필요합니다.');
  const resources=snapshot.classes.flatMap(c=>{const rows=JSON.parse(c.resources||'null');if(!Array.isArray(rows)||!rows.length||rows.some(x=>!x||x.day!==c.day||typeof x.start!=='string'||typeof x.end!=='string'||typeof x.room!=='string'||typeof x.teacher!=='string'))throw Error('2027 수업 점유 정보를 동기화하세요.');return rows;});
  const slots=generateOpeningSlots(resources,1).map(s=>({...s,id:s.id.replace(/^opening-/,'opening2027-')}));
  return {slots,openingYear:2027,openingSemester:1,openingUpdatedAt:snapshot.updatedAt};
 }catch(error){console.error('2027 opening slots unavailable: '+error.message);return {slots:[],openingYear:2027,openingSemester:1,openingUpdatedAt:'',openingError:'2027 시간표 확인 후 개설 가능 시간을 표시합니다. 관리자에게 동기화를 요청해 주세요.'};}
}
function cached2027Catalog_(){
 let cache;try{cache=CacheService.getScriptCache();const raw=cache.get('public-2027-v2');if(raw){const v=JSON.parse(raw);if(!catalogStale_(v.updatedAt))return v;}}catch(e){}
 return locked_(()=>{const value=public2027Catalog_();if(cache)try{cache.put('public-2027-v2',JSON.stringify(value),60);}catch(e){}return value;});
}
function admin2027Snapshot_(){
 try{const snapshot=read2027Snapshot_();return {upcoming:snapshot.classes,upcomingReviews:read_('2027확인필요'),upcomingLastSync:snapshot.updatedAt};}catch(error){return {upcoming:[],upcomingReviews:[],upcomingLastSync:'',upcomingError:error.message};}
}
function syncAllTimetables_(){
 const results={},errors=[];try{results.current=syncTimetable_();}catch(e){errors.push('현재 시간표: '+e.message);}try{results.year2027=sync2027Timetable_();}catch(e){errors.push('2027 시간표: '+e.message);}
 if(errors.length)throw Error(errors.join('\n'));return results;
}

// Confirmed corrections remain in the private operations sheet across six-hour refreshes.
const YEAR2027_CONFIRM_HEADERS_=['enabled','id','sourceCells','grade','title','day','start','end','room','teacher','rosterRanges','public','anchorPattern','issues'];
function readConfirmed2027_(){
 const sheet=db_().getSheetByName('2027확정수업');if(!sheet||sheet.getLastRow()<2)return [];
 if(sheet.getLastRow()>101)throw Error('2027확정수업은 최대 100개까지 읽습니다.');
 const rows=sheet.getRange(1,1,sheet.getLastRow(),YEAR2027_CONFIRM_HEADERS_.length).getDisplayValues();
 if(!YEAR2027_CONFIRM_HEADERS_.every((h,i)=>rows[0][i]===h))throw Error('2027확정수업 열 제목을 확인하세요.');
 return rows.slice(1).filter(r=>r[0]==='true'||r[0]==='TRUE').map(row=>Object.fromEntries(YEAR2027_CONFIRM_HEADERS_.map((h,i)=>[h,row[i]])));
}
function applyConfirmed2027_(result,values,confirmed){
 if(!confirmed.length)return result;
 let classes=result.classes.filter(c=>!excludedWeekendRoom2027(c));const claimed=new Set();
 const cell=ref=>{const m=String(ref).match(/^([A-W])([1-9]\d?)$/);if(!m)throw Error('2027 확정 수업의 셀 주소를 확인하세요: '+ref);return {row:Number(m[2])-1,col:m[1].charCodeAt(0)-65};};
 for(const spec of confirmed){
  if(excludedWeekendRoom2027(spec))continue;
  const ids=String(spec.sourceCells).split(',').map(x=>x.trim());if(!ids.length||ids.some(id=>claimed.has(id)))throw Error('확정 수업의 원본 셀이 중복됩니다.');ids.forEach(id=>claimed.add(id));
  const anchor=cell(ids[0]),text=String(values[anchor.row]?.[anchor.col]||'');
  const issues=String(spec.issues||'').split('\n').filter(Boolean);
  if(!spec.anchorPattern||!new RegExp(spec.anchorPattern).test(text))issues.push('원본 제목 변경: 확정 수업 연결 확인 필요');
  if(!/^[월화수목금토일]$/.test(spec.day)||!/^\d+교실$/.test(spec.room)||!/^([01]\d|2[01]):[03]0$/.test(spec.start)||!/^([01]\d|2[0-2]):[03]0$/.test(spec.end)||spec.end>'22:00'||spec.start>=spec.end)issues.push('확정 수업 요일·시간·교실 확인 필요');
  if(spec.public!=='false'&&!/^(초[1-6]|중[1-3]|고[12])$/.test(spec.grade))issues.push('확정 수업 학년 확인 필요');
  const names=[],seen=new Set();
  for(const range of String(spec.rosterRanges||'').split(';').filter(Boolean)){
   const [a,b=a]=range.split(':'),first=cell(a),last=cell(b);
   if(first.col!==last.col||first.row>last.row)throw Error('확정 원생 범위는 같은 열의 연속 셀로 지정하세요.');
   for(let row=first.row;row<=last.row;row++){
    const raw=String(values[row]?.[first.col]||'');if(headingYear2027_(raw).header){issues.push('원생 범위에 수업 제목 포함: '+a1Year2027_(row,first.col));continue;}
    const parsed=namesYear2027_(raw);issues.push(...parsed.issues);
    for(const name of parsed.names)if(!seen.has(name)){seen.add(name);names.push({name,sourceCell:a1Year2027_(row,first.col)});}
   }
  }
  classes=classes.filter(c=>!String(c.sourceCell).split('+').some(id=>ids.includes(id)));
  classes.push({id:'y2027-'+spec.id,sourceCell:ids.join('+'),grade:spec.public==='false'?'':spec.grade,title:spec.title,day:spec.day,start:spec.start,end:spec.end,room:spec.room,teacher:spec.teacher,header:text,names,issues,confirmed:true});
 }
 for(const c of classes){
  c.issues=(c.issues||[]).filter(x=>x!=='동일 교실 수업 시간 겹침 확인 필요');
  c.capacity=classCapacity(c);c.registered=new Set(c.names.map(x=>x.name)).size;c.remaining=Math.max(0,c.capacity-c.registered);
  if(c.registered>c.capacity)c.issues.push('확정 등록 인원이 정원 초과');
  if(classes.some(x=>x!==c&&(x.parts||[x]).some(a=>(c.parts||[c]).some(b=>a.day===b.day&&a.room===b.room&&a.start<b.end&&b.start<a.end))))c.issues.push('동일 교실 수업 시간 겹침 확인 필요');
  if(classes.some(x=>x!==c&&(x.parts||[x]).some(a=>(c.parts||[c]).some(b=>a.teacher&&a.teacher===b.teacher&&a.day===b.day&&a.start<b.end&&b.start<a.end))))c.issues.push('동일 강사 수업 시간 겹침 확인 필요');
  c.issues=[...new Set(c.issues)];c.review=c.issues.length>0;
 }
 return {...result,classes,roster:classes.flatMap(c=>c.names.map(p=>({classId:c.id,name:p.name,status:'registered',sourceCell:p.sourceCell}))),reviews:classes.flatMap(c=>c.issues.map(issue=>({sourceCell:c.sourceCell,day:c.day,start:c.start,end:c.end,room:c.room,header:c.header,issue})))};
}

// Shared with public/winter-courses.js; checked by regression tests.
// Public course rules; no teacher or student records belong here.
function winter2027Course(c){
  if(!c||!/겨울방학|네비게이터/.test(c.title||''))return null;
  const middle=['y2027-F5','y2027-U5','winter2027-middle'].includes(c.id);
  const high=['y2027-M5','y2027-F51','winter2027-high'].includes(c.id);
  if(!middle&&!high)return null;
  const pairs=middle?[[2026,'초6','중1'],[2027,'중1','중1']]:[[2026,'중2','중3'],[2026,'중3','고1'],[2027,'중3','중3'],[2027,'고1','고1']];
  return {key:middle?'middle':'high',title:middle?'중등 네비게이터':'고등 네비게이터',
    audience:middle?'2026년 초6 · 2027년 중1':'2026년 중2·중3 · 2027년 중3·고1',
    options:pairs.map(([year,grade,nextGrade])=>({value:year+':'+grade,label:year+'년 '+grade,grade:nextGrade}))};
}
function winter2027Grade(c,value){
  const special=winter2027Course(c);
  if(!special)return value===c.grade?{grade:value,label:'2027년 '+value}:null;
  return special.options.find(o=>o.value===value)||null;
}

function excludedWeekendRoom2027(c){
  return ['토','일'].includes(c.day)&&/(?:^|[^0-9])2\s*교실(?:$|[^0-9])/.test(String(c.room||''));
}
function scheduleKey2027(c){
  const base=[c.id,c.grade,c.title,c.day,c.start,c.end,c.room];
  if(c.bundle)base.push(c.sessions.map(s=>[s.id,s.day,s.start,s.end,s.room]));
  return JSON.stringify(base);
}
// A course is available only when both weekly sessions are unambiguous and have seats.
function bundleWinter2027(classes){
  const allowed=classes.filter(c=>!excludedWeekendRoom2027(c));
  const result=allowed.filter(c=>!winter2027Course(c));
  for(const [key,ids,days] of [['middle',['y2027-F5','y2027-U5'],['월','수']],['high',['y2027-M5','y2027-F51'],['화','목']]]){
    const sessions=ids.map(id=>allowed.find(c=>c.id===id&&winter2027Course(c)));
    if(!sessions.some(Boolean))continue;
    const first=sessions.find(Boolean),profile=winter2027Course(first);
    const invalid=sessions.some((s,i)=>!s||s.review||s.day!==days[i]||!s.start||s.start>=s.end||s.end>'22:00'||!Number.isFinite(Number(s.capacity))||!Number.isFinite(Number(s.remaining)));
    const publicSessions=sessions.filter(Boolean).map(s=>({id:s.id,day:s.day,start:s.start,end:s.end,room:s.room}));
    const capacity=invalid?0:Math.min(...sessions.map(s=>Number(s.capacity)));
    result.push({id:'winter2027-'+key,grade:key==='middle'?'중1':'중3',title:profile.title+' · 주 2회',day:days.join('·'),days,
      start:first.start,end:first.end,room:[...new Set(publicSessions.map(s=>s.room))].join(' / '),capacity,
      remaining:invalid?0:Math.max(0,Math.min(...sessions.map(s=>Number(s.remaining)))),review:invalid,bundle:true,sessions:publicSessions});
  }
  return result;
}
function scheduleLabel2027(c){
  return c.bundle?c.sessions.map(s=>s.day+'요일 '+s.start+'–'+s.end).join(' / ')+' · 주 2회':c.day+'요일 '+c.start+'–'+c.end;
}
