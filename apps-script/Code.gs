/** Bind this project to a NEW PRIVATE operations spreadsheet. Never to the public timetable. */
const TABLES_ = {
  '반설정':['id','grade','title','day','start','end','room','teacher','teacherColor','sourceRange','enabled'],
  '운영명단':['classId','name','status'],
  '빈시간':['id','day','start','end','room','grades','enabled'],
  '색상':['hex','status'],
  '신청':['id','createdAt','kind','targetId','student','grade','phone','note','status','consentVersion','consentAt','confirmedClassId','confirmedName','confirmedAt'],
  '동기화':['classId','registered','starting','paused','makeup','consultation','review','issues','updatedAt','configKey'],
  '원생':['classId','name','status','sourceCell','updatedAt'],
  '보강':['id','classId','student','date','status'],
  '보강신청':['id','createdAt','targetId','student','grade','phone','date','makeupType','position','start','end','note','status','teacher','room','consentVersion','consentAt','confirmedAt','absenceDate','missedTopic'],
  '휴원연락':['classId','student','pauseStart','pauseEnd','followUp','contactedAt','note'],
  '감사':['time','actor','action','recordId']
};
function onOpen(){SpreadsheetApp.getUi().createMenu('올타 상담 앱').addItem('처음 설정','setup').addItem('관리 화면','openAdmin').addItem('설명회·방문상담·결석보강','openBookingAdmin').addItem('예약 기능·2026 달력 설정','setupBookings').addItem('시간표 동기화','syncTimetable').addItem('5분 동기화·매일 정리 설치','installTriggers').addToUi();}
function props_(){return PropertiesService.getScriptProperties();}
let DB_HANDLE_=null;
function db_(){if(DB_HANDLE_)return DB_HANDLE_;const id=props_().getProperty('DB_ID');if(!id)throw new Error('운영 저장소 설정이 필요합니다.');DB_HANDLE_=SpreadsheetApp.openById(id);return DB_HANDLE_;}
function admin_(){const email=Session.getActiveUser().getEmail().toLowerCase();const allowed=(props_().getProperty('ADMIN_EMAILS')||'').toLowerCase().split(',').map(v=>v.trim());if(!email||!allowed.includes(email))throw new Error('등록된 관리자 계정으로 비공개 운영 문서에서 실행해 주세요.');return email;}
function setup(){
  const active=SpreadsheetApp.getActiveSpreadsheet();if(!active)throw new Error('비공개 운영 스프레드시트에서 확장 프로그램 > Apps Script로 시작하세요.');
  const email=Session.getActiveUser().getEmail();if(!email)throw new Error('관리자 Google 계정으로 실행하세요.');
  if(props_().getProperty('ADMIN_EMAILS'))admin_();
  props_().setProperties({DB_ID:active.getId(),ADMIN_EMAILS:props_().getProperty('ADMIN_EMAILS')||email,RETENTION_DAYS:'90'});
  for(const [name,headers] of Object.entries(TABLES_)){let sheet=active.getSheetByName(name);if(!sheet)sheet=active.insertSheet(name);if(sheet.getLastRow()===0){sheet.getRange(1,1,1,headers.length).setValues([headers]).setFontWeight('bold').setBackground('#e5eddc');sheet.setFrozenRows(1);sheet.getRange(2,1,Math.max(1,sheet.getMaxRows()-1),headers.length).setNumberFormat('@');}}
  const palette=active.getSheetByName('색상');if(palette.getLastRow()===1){const rows=Object.entries(PALETTE);palette.getRange(2,1,rows.length,2).setValues(rows);}
  SpreadsheetApp.getUi().alert('비공개 운영 시트가 준비되었습니다. 프로젝트 설정의 스크립트 속성과 반설정·빈시간을 입력한 뒤 시간표를 동기화하세요.');
}
function openAdmin(){admin_();SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutputFromFile('Admin').setWidth(1180).setHeight(760),'올타과학 · 상담과 운영');}
function read_(name){const sheet=db_().getSheetByName(name);if(!sheet)throw new Error('운영 시트를 초기화하세요.');const values=sheet.getDataRange().getDisplayValues(),headers=values.shift();return values.filter(row=>row.some(Boolean)).map(row=>Object.fromEntries(headers.map((key,i)=>[key,row[i]||''])));}
function safeCell_(value){const s=String(value??'');return /^[=+@\-]/.test(s)?"'"+s:s;}
function write_(name,rows){const sheet=db_().getSheetByName(name),headers=TABLES_[name];if(sheet.getLastRow()>1)sheet.getRange(2,1,sheet.getLastRow()-1,headers.length).clearContent();if(rows.length){if(sheet.getMaxRows()<rows.length+1)sheet.insertRowsAfter(sheet.getMaxRows(),rows.length+1-sheet.getMaxRows());sheet.getRange(2,1,rows.length,headers.length).setNumberFormat('@').setValues(rows.map(r=>headers.map(k=>safeCell_(r[k]))));}}
function append_(name,row){const sheet=db_().getSheetByName(name),headers=TABLES_[name];const n=sheet.getLastRow()+1;if(n>sheet.getMaxRows())sheet.insertRowAfter(sheet.getMaxRows());sheet.getRange(n,1,1,headers.length).setNumberFormat('@').setValues([headers.map(k=>safeCell_(row[k]))]);}
function locked_(fn){const lock=LockService.getScriptLock();if(!lock.tryLock(20000))throw new Error('다른 신청을 처리하고 있습니다. 잠시 후 다시 시도해 주세요.');try{return fn();}finally{lock.releaseLock();}}
function now_(){return new Date().toISOString();}
function today_(){return Utilities.formatDate(new Date(),'Asia/Seoul','yyyy-MM-dd');}
function enabled_(v){return /^(true|1|yes|사용)$/i.test(String(v).trim());}
function semester_(){return props_().getProperty('SEMESTER')==='1'?1:2;}
function classes_(){return read_('반설정').filter(c=>enabled_(c.enabled)).map(c=>{const profile=classCurriculum(c,semester_());return {...c,title:profile?profile.name:c.title,capacity:classCapacity(c),lesson:profile?profile.lesson:''};});}
function audit_(action,id){append_('감사',{time:now_(),actor:Session.getActiveUser().getEmail()||'public',action,recordId:id});}
function configIssues_(rows){
  const result={};const ids=new Set();
  rows.forEach(c=>{const issues=[];if(!/^[a-zA-Z0-9_-]{1,50}$/.test(c.id)||ids.has(c.id))issues.push('반 ID 누락 또는 중복');ids.add(c.id);if(!COURSE_GRADES.includes(courseGrade(c.grade)))issues.push('학년 확인');if(!['월','화','수','목','금','토','일'].includes(c.day))issues.push('요일 확인');if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(c.start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(c.end)||c.start>=c.end)issues.push('시작·종료 시간 확인');if(!c.room||!c.title||!c.teacher)issues.push('교실·수업명·선생님 확인');if(c.sourceRange!=='운영명단'&&!/^[A-Z]+[1-9]\d*(?::[A-Z]+[1-9]\d*)?$/.test(c.sourceRange))issues.push('원생 이름 범위 확인');if(rows.some(other=>other!==c&&overlaps(c,other)))issues.push('동일 교실 수업 시간 겹침');const profile=classCurriculum(c,semester_());if(profile&&durationMinutes(c.start,c.end)!==profile.minutes)issues.push('수업 시간 확인: '+profile.name+' '+profile.minutes+'분');result[c.id]=issues;});return result;
}
function classKey_(c){return JSON.stringify([c.id,c.grade,c.title,c.day,c.start,c.end,c.room,c.sourceRange,semester_()]);}
function syncTimetable(){admin_();return locked_(()=>syncTimetable_());}
function scheduledSync_(){return locked_(()=>syncTimetable_());}
function syncTimetable_(){
  const sourceId=props_().getProperty('SOURCE_SPREADSHEET_ID'),sheetId=Number(props_().getProperty('SOURCE_SHEET_ID'));
  if(!sourceId||!Number.isFinite(sheetId))throw new Error('SOURCE_SPREADSHEET_ID, SOURCE_SHEET_ID를 설정하세요.');
  const source=SpreadsheetApp.openById(sourceId).getSheets().find(s=>s.getSheetId()===sheetId);if(!source)throw new Error('시간표 탭을 찾을 수 없습니다.');
  const classes=classes_(),configuration=configIssues_(classes),palette={};
  read_('색상').forEach(p=>{if(/^#[a-f0-9]{6}$/i.test(p.hex)&&STATUS[p.status])palette[p.hex.toLowerCase()]=p.status;});
  const timestamp=now_(),roster=[],summaries=[],operationsRoster=classes.some(c=>c.sourceRange==='운영명단')?read_('운영명단'):[];
  for(const c of classes){const counts={registered:0,starting:0,paused:0,makeup:0,consultation:0},issues=[...configuration[c.id]],names=new Set();
    if(issues.length===0){try{
      if(c.sourceRange==='운영명단'){
        for(const person of operationsRoster.filter(p=>p.classId===c.id)){
          const name=normalizeName(person.name);
          if(!name||!STATUS[person.status]||names.has(name)){issues.push('운영명단 이름·상태·중복 확인');continue;}
          names.add(name);counts[person.status]++;roster.push({classId:c.id,name,status:person.status,sourceCell:'운영명단',updatedAt:timestamp});
        }
        if(!names.size)issues.push('운영명단 누락 확인');
      }else{
      const range=source.getRange(c.sourceRange);if(range.getNumRows()*range.getNumColumns()>500)throw new Error('반당 이름 범위는 500셀 이내로 지정하세요.');
      const texts=range.getDisplayValues(),rich=range.getRichTextValues(),colors=range.getFontColors();
      for(let r=0;r<texts.length;r++)for(let col=0;col<texts[r].length;col++){
        const text=texts[r][col],value=rich[r][col],cell=range.getCell(r+1,col+1).getA1Notation();
        const runs=value?value.getRuns().map(run=>({start:run.getStartIndex(),end:run.getEndIndex(),color:run.getTextStyle().getForegroundColor()||colors[r][col]||'#000000'})):[{start:0,end:text.length,color:colors[r][col]||'#000000'}];
        const parsed=parseColoredCell(text,runs,palette);issues.push(...parsed.issues.map(i=>cell+' '+i));
        for(const person of parsed.people){if(names.has(person.name)){issues.push('동명이인 또는 중복 이름 확인: '+person.name);continue;}names.add(person.name);counts[person.status]++;roster.push({classId:c.id,name:person.name,status:person.status,sourceCell:cell,updatedAt:timestamp});}
      }
      }
      if(capacity(counts,classCapacity(c)).over)issues.push('확정 등록·시작 예정 인원이 정원 '+classCapacity(c)+'명 초과');
    }catch(error){issues.push('원본 범위 읽기 실패: '+error.message);}}
    summaries.push({classId:c.id,...counts,review:issues.length?'true':'false',issues:issues.join('\n'),updatedAt:timestamp,configKey:classKey_(c)});
  }
  write_('원생',roster);write_('동기화',summaries);
  const reminders=read_('휴원연락');for(const p of roster.filter(p=>p.status==='paused'))if(!reminders.some(r=>r.classId===p.classId&&r.student===p.name))reminders.push({classId:p.classId,student:p.name,pauseStart:today_()});write_('휴원연락',reminders);
  props_().setProperty('LAST_SYNC',timestamp);reconcileRequests_(roster,summaries);SpreadsheetApp.flush();return {classes:classes.length,review:summaries.filter(s=>s.review==='true').length,updatedAt:timestamp};
}
function reconcileRequests_(roster,summaries){const requests=read_('신청');let changed=false;for(const r of requests){if(!r.confirmedClassId||!r.confirmedName||r.status==='취소')continue;const matches=roster.filter(p=>p.classId===r.confirmedClassId&&p.name===r.confirmedName),summary=summaries.find(s=>s.classId===r.confirmedClassId);const p=matches.length===1?matches[0]:null;const next=summary&&summary.review!=='true'&&p&&['registered','starting'].includes(p.status)?STATUS[p.status]:'시간표 재확인';if(r.status!==next){r.status=next;changed=true;}}if(changed)write_('신청',requests);}
function publicCatalog_(){
  const p=props_(),last=p.getProperty('LAST_SYNC');if(!last||!p.getProperty('PRIVACY_CONTACT'))throw new Error('운영자가 시간표와 상담 연락처를 준비 중입니다.');
  const stale=Date.now()-Date.parse(last)>15*60000,classes=classes_(),summaries=read_('동기화'),configuration=configIssues_(classes);
  const visible=classes.filter(c=>COURSE_GRADES.includes(courseGrade(c.grade))).map(c=>{const s=summaries.find(s=>s.classId===c.id),counts=s?capacity(s,classCapacity(c)):{used:0,remaining:0,over:false};return {id:c.id,grade:courseGrade(c.grade),title:c.title,lesson:classCurriculum(c,semester_())?.lesson||'',day:c.day,start:c.start,end:c.end,room:c.room,teacher:c.teacher,teacherColor:/^#[a-f0-9]{6}$/i.test(c.teacherColor)?c.teacherColor:'#e6ecd9',capacity:classCapacity(c),used:counts.used,remaining:counts.remaining,review:stale||!s||counts.over||!Number.isFinite(counts.used)||counts.used<0||s.configKey!==classKey_(c)||s.review==='true'||configuration[c.id].length>0};});
  const slots=read_('빈시간').filter(s=>enabled_(s.enabled)&&/^[a-zA-Z0-9_-]{1,50}$/.test(s.id)&&['월','화','수','목','금','토','일'].includes(s.day)&&/^([01]\d|2[0-3]):[0-5]\d$/.test(s.start)&&/^([01]\d|2[0-3]):[0-5]\d$/.test(s.end)&&s.start<s.end&&s.room&&!classes.some(c=>overlaps(s,c))).map(s=>({id:s.id,day:s.day,start:s.start,end:s.end,room:s.room,grades:[...new Set(s.grades.split(',').map(g=>courseGrade(g.trim())).filter(g=>COURSE_GRADES.includes(g)&&(!curriculum(g,s.day,semester_())||curriculum(g,s.day,semester_()).minutes===durationMinutes(s.start,s.end))))]})).filter(s=>s.grades.length);
  const requests=read_('신청');return {makeupEnabled:true,mode:'live',semester:semester_(),updatedAt:last,classes:visible,slots:stale?[]:slots,demand:aggregateDemand(requests),retentionDays:Number(p.getProperty('RETENTION_DAYS')||90),privacyContact:p.getProperty('PRIVACY_CONTACT')};
}
function doGet(e){
  if(e&&e.parameter&&['admin','legacyAdmin'].includes(e.parameter.action))return bookingAdminPage_(e.parameter.action);
  const callback=String(e&&e.parameter&&e.parameter.callback||'');if(callback&&!/^olta_[a-f0-9]{32}$/.test(callback))return ContentService.createTextOutput('{"error":"Invalid callback"}').setMimeType(ContentService.MimeType.JSON);
  let result;try{result=locked_(()=>e&&e.parameter&&e.parameter.action==='bookings'?bookingCatalog_():publicCatalog_());}catch(error){console.error('Catalog read failed: '+error.message);result={error:'시간표를 준비 중이거나 연결을 확인 중입니다. 잠시 후 다시 시도해 주세요.'};}
  const json=JSON.stringify(result).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');return ContentService.createTextOutput(callback?callback+'('+json+');':json).setMimeType(callback?ContentService.MimeType.JAVASCRIPT:ContentService.MimeType.JSON);
}
function doPost(e){let result;try{result=locked_(()=>{const input=e&&e.parameter||{};return ['seminar','visit','absence','booking_cancel'].includes(input.kind)?submitBooking_(input):input.kind==='makeup'?submitMakeup_(input):submit_(input);});}catch(error){result={ok:false,message:error.message};}return e&&e.parameter&&['seminar','visit','absence','booking_cancel'].includes(e.parameter.kind)?bookingReceipt_(result):receipt_(result);}
function submit_(input){
  const catalog=publicCatalog_(),r=validateRequest(input,catalog),rows=read_('신청');
  const sameId=rows.find(x=>x.id===r.requestId);if(sameId){if(sameId.student!==r.student||sameId.phone!==r.phone||sameId.targetId!==r.targetId||sameId.grade!==r.grade||sameId.kind!==r.kind)throw new Error('신청 식별자가 일치하지 않습니다. 화면을 다시 열어 주세요.');return {ok:true,id:sameId.id,duplicate:true};}
  const duplicate=rows.find(x=>x.kind===r.kind&&x.targetId===r.targetId&&normalizeName(x.student)===r.student&&x.grade===r.grade&&x.phone===r.phone&&x.status!=='취소');
  if(duplicate)return {ok:true,id:duplicate.id,duplicate:true};
  const recent=rows.filter(x=>x.phone===r.phone&&Date.now()-Date.parse(x.createdAt)<3600000);if(recent.length>=5)throw new Error('연락처당 한 시간에 최대 5건까지 신청할 수 있습니다.');
  if(rows.filter(x=>Date.now()-Date.parse(x.createdAt)<86400000).length>=300)throw new Error('오늘 온라인 접수량이 많습니다. 학원으로 문의해 주세요.');
  const timestamp=now_();append_('신청',{id:r.requestId,createdAt:timestamp,kind:r.kind,targetId:r.targetId,student:r.student,grade:r.grade,phone:r.phone,note:r.note,status:'접수',consentVersion:'2026-10-13',consentAt:timestamp});SpreadsheetApp.flush();return {ok:true,id:r.requestId};
}
function escape_(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function receipt_(result){const site=props_().getProperty('SITE_URL')||'',link=/^https:\/\/[a-zA-Z0-9.-]+(?:\/[^\s<>"']*)?$/.test(site)?site:'';return HtmlService.createHtmlOutput('<!doctype html><html lang="ko"><head><meta name="referrer" content="no-referrer"></head><body style="font:16px/1.8 system-ui,sans-serif;background:#f7f8f2;color:#174c3e;padding:35px"><main style="max-width:560px;margin:50px auto;background:white;border:1px solid #e0e6dd;border-radius:18px;padding:32px"><p>올타과학 · 상담 신청</p><h1 style="font-size:27px">'+(result.ok?(result.duplicate?'이미 접수된 신청입니다.':'상담 요청이 접수되었습니다.'):'신청을 완료하지 못했습니다.')+'</h1><p>'+(result.ok?(result.makeup?'보강 신청은 확정이 아닙니다. 담당 선생님과 교실 일정을 확인한 뒤 연락드립니다.':'신청은 자리 확보가 아닙니다. 상담 후 시간표 등록을 확인하여 수강을 확정합니다.'):'접수되지 않았습니다. '+escape_(result.message))+'</p>'+(result.ok?'<p>접수번호: '+escape_(result.id)+'</p>':'')+(link?'<a target="_top" href="'+escape_(link)+'">수업 안내로 돌아가기 →</a>':'<p>이 창을 닫고 이전 수업 안내 화면으로 돌아가세요.</p>')+'</main></body></html>').setTitle('올타과학 · 접수 결과').addMetaTag('viewport','width=device-width, initial-scale=1');}
function getAdminDashboard(){admin_();return locked_(()=>{const catalog=(()=>{try{return publicCatalog_();}catch{return {classes:[],slots:[],demand:{}};}})();return {requests:read_('신청'),classes:classes_(),summaries:read_('동기화'),roster:read_('원생'),makeups:read_('보강'),pauses:read_('휴원연락'),catalog,today:today_(),lastSync:props_().getProperty('LAST_SYNC')||''};});}
function updateRequest(id,status){admin_();if(!['상담 중','취소'].includes(status))throw new Error('허용되지 않은 상태입니다. 확정은 시간표 확인 기능을 사용하세요.');return locked_(()=>{const rows=read_('신청'),r=rows.find(r=>r.id===id);if(!r)throw new Error('신청을 찾을 수 없습니다.');if(status==='상담 중'&&r.confirmedClassId)throw new Error('시간표에 연결된 신청은 상담 중으로 되돌릴 수 없습니다.');r.status=status;write_('신청',rows);audit_(status,id);return true;});}
function confirmFromTimetable(id,classId,student){admin_();return locked_(()=>{syncTimetable_();const rows=read_('신청'),r=rows.find(r=>r.id===id),cls=classes_().find(c=>c.id===classId),summary=read_('동기화').find(c=>c.classId===classId);if(!r||r.status==='취소'||!cls||!summary||summary.review==='true')throw new Error('신청과 시간표 확인 상태를 점검해 주세요.');if(courseGrade(cls.grade)!==courseGrade(r.grade))throw new Error('신청 학년과 반 학년이 다릅니다.');const matches=read_('원생').filter(p=>p.classId===classId&&p.name===student&&['registered','starting'].includes(p.status));if(matches.length!==1)throw new Error('시간표에서 검정·보라색 등록 원생을 정확히 확인할 수 없습니다.');if(rows.some(x=>x.id!==id&&x.status!=='취소'&&x.confirmedClassId===classId&&x.confirmedName===student))throw new Error('이 시간표 원생은 이미 다른 신청과 연결되어 있습니다.');r.confirmedClassId=classId;r.confirmedName=student;r.confirmedAt=now_();r.status=STATUS[matches[0].status];write_('신청',rows);audit_('시간표 확인 후 '+r.status,id);return true;});}
function addMakeup(classId,student,date){admin_();return locked_(()=>{syncTimetable_();const c=classes_().find(c=>c.id===classId),s=read_('동기화').find(s=>s.classId===classId);if(!c||!s||s.review==='true')throw new Error('시간표를 먼저 확인하세요.');if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date<today_())throw new Error('오늘 이후의 보강 날짜를 입력하세요.');const parsed=new Date(date+'T12:00:00+09:00');if(Utilities.formatDate(parsed,'Asia/Seoul','yyyy-MM-dd')!==date||['일','월','화','수','목','금','토'][parsed.getUTCDay()]!==c.day)throw new Error('수업 요일과 보강 날짜가 다릅니다.');student=normalizeName(student);if(student.length<2||student.length>30)throw new Error('원생 이름을 확인하세요.');const roster=read_('원생').filter(p=>p.classId===classId);if(roster.some(p=>p.name===student&&['registered','starting'].includes(p.status)))throw new Error('정규 등록 원생입니다. 보강으로 중복 배정할 수 없습니다.');const rows=read_('보강');if(rows.some(m=>m.classId===classId&&m.student===student&&m.date===date&&m.status==='배정'))throw new Error('이미 배정된 보강입니다.');const named=new Set(roster.filter(p=>p.status==='makeup'&&!rows.some(m=>m.classId===classId&&m.student===p.name&&m.status==='배정'&&m.date>=today_())).map(p=>p.name));rows.filter(m=>m.classId===classId&&m.date===date&&m.status==='배정').forEach(m=>named.add(m.student));named.add(student);const pending=typeof bookingRead_==='function'?bookingRead_('결석보강').filter(x=>x.makeupClassId===classId&&x.date===date&&x.choice==='same'&&x.status!=='취소').length:0;if(capacity(s,classCapacity(c)).used+named.size+pending>classCapacity(c))throw new Error('해당 날짜의 수업 정원 '+classCapacity(c)+'명을 초과합니다.');const id=Utilities.getUuid();append_('보강',{id,classId,student,date,status:'배정'});audit_('보강 배정',id);return true;});}
function cancelMakeup(id){admin_();return locked_(()=>{const rows=read_('보강'),r=rows.find(r=>r.id===id);if(!r)throw new Error('보강 기록을 찾을 수 없습니다.');r.status='취소';write_('보강',rows);audit_('보강 취소',id);return true;});}

function makeupRequests_(){return db_().getSheetByName('보강신청')?read_('보강신청'):[];}
function ensureMakeupTable_(){
  const existing=db_().getSheetByName('보강신청');if(existing){const headers=TABLES_['보강신청'];existing.getRange(1,1,1,headers.length).setValues([headers]);return;}
  const sheet=db_().insertSheet('보강신청'),headers=TABLES_['보강신청'];
  sheet.getRange(1,1,1,headers.length).setValues([headers]).setFontWeight('bold').setBackground('#e5eddc');sheet.setFrozenRows(1);
}
function submitMakeup_(input){
  const r=validateMakeup(input,publicCatalog_()),rows=makeupRequests_();
  const same=rows.find(x=>x.id===r.requestId);
  const equal=x=>['student','phone','targetId','grade','date','makeupType','position','start','end','absenceDate','missedTopic'].every(k=>x[k]===r[k]);
  if(same){if(!equal(same))throw new Error('신청 식별자가 일치하지 않습니다.');return {ok:true,id:same.id,duplicate:true,makeup:true};}
  const duplicate=rows.find(x=>x.status!=='취소'&&equal(x));if(duplicate)return {ok:true,id:duplicate.id,duplicate:true,makeup:true};
  const all=rows.concat(read_('신청'));
  if(all.filter(x=>x.phone===r.phone&&Date.now()-Date.parse(x.createdAt)<3600000).length>=5)throw new Error('연락처당 한 시간에 최대 5건까지 신청할 수 있습니다.');
  if(all.filter(x=>Date.now()-Date.parse(x.createdAt)<86400000).length>=300)throw new Error('오늘 온라인 접수량이 많습니다. 학원으로 문의해 주세요.');
  ensureMakeupTable_();const timestamp=now_();append_('보강신청',{...r,id:r.requestId,createdAt:timestamp,status:'접수',consentVersion:'2026-10-13',consentAt:timestamp});SpreadsheetApp.flush();return {ok:true,id:r.requestId,makeup:true};
}
function getMakeupRequests(){admin_();return locked_(()=>makeupRequests_());}
function reviewMakeupRequest(id,status,teacher,room,verified){
  admin_();return locked_(()=>{
    if(!['상담 중','확정','취소'].includes(status))throw new Error('보강 처리 상태를 확인하세요.');
    const rows=makeupRequests_(),r=rows.find(x=>x.id===id);if(!r||r.status==='취소')throw new Error('처리할 보강 신청이 없습니다.');
    if(status==='상담 중'&&r.status==='확정')throw new Error('확정된 보강은 취소 후 다시 신청하세요.');
    if(status==='확정'){
      if(verified!==true)throw new Error('재원 여부와 담당 선생님·교실 일정을 확인하세요.');
      syncTimetable_();const cls=publicCatalog_().classes.find(c=>c.id===r.targetId);
      const checked=validateMakeup({...r,requestId:r.id,consent:'yes',privacyVersion:r.consentVersion},{classes:cls?[cls]:[],slots:[]});
      if(checked.start!==r.start||checked.end!==r.end)throw new Error('정규 수업 시간이 변경되었습니다. 상담 후 다시 신청하세요.');
      if(read_('원생').filter(p=>p.classId===r.targetId&&p.name===r.student&&['registered','starting'].includes(p.status)).length!==1)throw new Error('정규반의 등록 원생을 정확히 확인할 수 없습니다.');
      teacher=String(teacher||'').trim();room=String(room||'').trim();
      if(!teacher||!room||teacher.length>40||room.length>40)throw new Error('실제 보강 담당 선생님과 교실을 입력하세요.');
      const resources=classes_(),tokens=value=>String(value||'').split(/[\/→()\s]+/).filter(Boolean);
      if(!resources.some(c=>tokens(c.teacher).includes(teacher))||!resources.some(c=>tokens(c.room).includes(room)))throw new Error('반설정에 있는 선생님·교실 표기와 동일하게 입력하세요.');
      const collision=x=>r.start<x.end&&x.start<r.end;
      if(classes_().some(c=>c.day===cls.day&&collision(c)&&(c.teacher.includes(teacher)||c.room.includes(room))))throw new Error('담당 선생님 또는 교실의 정규 수업 시간과 겹칩니다.');
      const assigned=rows.filter(x=>x.id!==r.id&&x.date===r.date&&x.status==='확정'&&collision(x));if(typeof bookingRead_==='function'&&bookingRead_('결석보강').some(x=>x.date===r.date&&['확정','완료'].includes(x.status)&&collision(x)&&(x.teacher===teacher||x.room===room)))throw new Error('새 결석보강 일정과 겹칩니다.');
      if(assigned.some(x=>x.student===r.student&&x.phone===r.phone))throw new Error('원생의 다른 보강 시간과 겹칩니다.');
      const shared=assigned.filter(x=>x.teacher===teacher||x.room===room);
      if(shared.some(x=>x.teacher!==teacher||x.room!==room||x.start!==r.start||x.end!==r.end||x.grade!==r.grade||x.makeupType!==r.makeupType||x.absenceDate!==r.absenceDate||x.missedTopic!==r.missedTopic))throw new Error('다른 보강의 담당 선생님 또는 교실 일정과 겹칩니다.');
      if(shared.length>=makeupCapacity(r.makeupType,r.grade))throw new Error('보강 수업 정원 '+makeupCapacity(r.makeupType,r.grade)+'명을 초과합니다.');
      r.teacher=teacher;r.room=room;r.confirmedAt=now_();
    }
    r.status=status;ensureMakeupTable_();write_('보강신청',rows);audit_('보강 신청 '+status,id);return true;
  });
}
function savePause(input){admin_();return locked_(()=>{const rows=read_('휴원연락'),r=rows.find(r=>r.classId===input.classId&&r.student===input.student);if(!r)throw new Error('휴원 기록을 찾을 수 없습니다.');for(const key of ['pauseStart','pauseEnd','followUp']){const value=String(input[key]||'');if(value&&!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new Error('날짜 형식을 확인하세요.');r[key]=value;}if(r.pauseStart&&r.pauseEnd&&r.pauseStart>r.pauseEnd)throw new Error('휴원 종료일을 확인하세요.');r.note=String(input.note||'').slice(0,300);if(input.contacted)r.contactedAt=now_();write_('휴원연락',rows);audit_('휴원 연락 기록 수정',r.classId);return true;});}
function installTriggers(){admin_();const handlers=['scheduledSync_','cleanup_'];ScriptApp.getProjectTriggers().filter(t=>handlers.includes(t.getHandlerFunction())).forEach(t=>ScriptApp.deleteTrigger(t));ScriptApp.newTrigger('scheduledSync_').timeBased().everyMinutes(5).create();ScriptApp.newTrigger('cleanup_').timeBased().everyDays(1).atHour(3).inTimezone('Asia/Seoul').create();return '설치 완료';}
function cleanup_(){return locked_(()=>{const days=Number(props_().getProperty('RETENTION_DAYS')||90);if(!Number.isFinite(days)||days<1||days>365)throw new Error('보관 기간은 1~365일이어야 합니다.');const cutoff=Date.now()-days*86400000;cleanupBookings_(cutoff);if(db_().getSheetByName('보강신청'))write_('보강신청',makeupRequests_().filter(r=>Date.parse(r.createdAt)>=cutoff));write_('신청',read_('신청').filter(r=>Date.parse(r.createdAt)>=cutoff));write_('감사',read_('감사').filter(r=>Date.parse(r.time)>=cutoff));write_('보강',read_('보강').filter(r=>Date.parse(r.date+'T23:59:59+09:00')>=cutoff));});}


