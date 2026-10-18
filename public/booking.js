import {BOOKING_VERSION,bookingToday,bookingDay,bookingCategory,bookingInstant,seminarDeadline,curriculumWeek,absenceWindow,validateSeminar,validateVisit,validateAbsence,academicPeriods,weekLabel} from './booking-domain.js?v=20261018-weeks';
import {demoCatalog} from './demo.js';
const $=s=>document.querySelector(s),f=$('#booking-form'),cf=$('#cancel-form'),config=window.OLTA_CONFIG||{};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const params=new URLSearchParams(location.search);
if(params.get('kind')==='visit'){location.replace(params.get('targetId')?'./?classId='+encodeURIComponent(params.get('targetId'))+'#classes':'./#new');}
let kind=params.get('kind')||'seminar',catalog=null;
let receipt=null;try{receipt=JSON.parse(decodeURIComponent(location.hash.slice(1)));if(receipt?.id&&receipt?.token){kind='cancel';const receiptScope=['seminar','visit','absence'].includes(receipt.kind)?receipt.kind:'seminar';history.replaceState(null,'',location.pathname+'?kind=cancel&bookingKind='+receiptScope);}}catch{}
if(!['seminar','visit','absence','cancel'].includes(kind))kind='seminar';
const requestedScope=kind==='cancel'?(receipt?.kind||params.get('bookingKind')||'seminar'):kind;
const scope=['seminar','visit','absence'].includes(requestedScope)?requestedScope:'seminar';
const scopeTitle={seminar:'설명회 안내',visit:'방문 상담 예약',absence:'결석·보강 예약'}[scope];
const cancelTitle={seminar:'설명회 신청 취소',visit:'방문 상담 예약 취소',absence:'결석·보강 예약 취소'}[scope];
$('#seminar-navigation').hidden=scope!=='seminar';
$('#page-heading').textContent=kind==='cancel'?cancelTitle:scopeTitle;
document.title=(kind==='cancel'?cancelTitle:scopeTitle)+' | 올타과학';
$('#cancel-link').href='./booking.html?kind=cancel&bookingKind='+scope;
$('#cancel-link').textContent=cancelTitle;
$('#cancel-link').hidden=kind==='cancel';
$('#cancel-heading').textContent=cancelTitle;
$('#cancel-guide').textContent='접수 결과에 표시된 접수번호와 확인 코드를 입력해 주세요.'+(scope==='seminar'?' 대면 설명회는 전날 14시까지 취소할 수 있습니다. 온라인 설명회에는 취소 기한이 없습니다.':'');
cf.elements.bookingKind.value=scope;
const val=n=>f.elements[n].value;
const classes=()=>catalog.classes.filter(c=>c.grade===val('grade')&&!c.review&&(kind!=='visit'||c.remaining>0));
const label=c=>`${c.grade} ${String(c.title||'').replaceAll('시작반','신규반')} · ${c.day} ${c.start}–${c.end} · ${c.room}`;
function select(el,rows,placeholder='선택해 주세요'){const old=el.value;el.innerHTML='<option value="">'+placeholder+'</option>'+rows.map(r=>`<option value="${esc(r.value)}" ${r.disabled?'disabled':''}>${esc(r.text)}</option>`).join('');if(rows.some(r=>r.value===old&&!r.disabled))el.value=old;}
function jsonp(){return new Promise((resolve,reject)=>{const name='olta_'+crypto.randomUUID().replaceAll('-',''),s=document.createElement('script');let timer;const cleanup=()=>{clearTimeout(timer);s.remove();delete window[name];};window[name]=r=>{cleanup();r.error?reject(Error(r.error)):resolve(r);};timer=setTimeout(()=>{cleanup();reject(Error('예약 서버 응답이 늦습니다. 다시 연결해 주세요.'));},45000);s.onerror=()=>{cleanup();reject(Error('예약 서버에 연결할 수 없습니다.'));};s.src=config.apiUrl+'?action=bookings&callback='+name;document.head.append(s);});}
function randomToken(){return [...crypto.getRandomValues(new Uint8Array(24))].map(n=>n.toString(16).padStart(2,'0')).join('');}
function showField(id,active){$(id).hidden=!active;$(id).disabled=!active;}
function refreshClasses(){select(f.elements.targetId,classes().map(c=>({value:c.id,text:label(c)})),'수업을 선택해 주세요');}
function refresh(){if(!catalog||kind==='cancel')return;
 if(kind==='seminar'){const e=catalog.seminars.find(e=>e.id===val('eventId'));$('#review-link').href='./review.html'+(e?'?eventId='+encodeURIComponent(e.id):'');$('#seminar-info').textContent=e?`${e.date} ${e.start}\n대면 잔여 ${e.remaining}명 / 20명 · ${e.location||'장소는 학원에 문의해 주세요.'}\n대면 취소: ${new Date(seminarDeadline(e.date,14)+9*3600000).toISOString().slice(0,10)} 14:00까지 / 신청: 같은 날 20:00까지\n온라인: 인원·신청 기한·취소 기한 제한 없음${e.onlineInfo?'\n'+e.onlineInfo:''}`:'설명회 일정을 선택해 주세요.';}
 if(kind==='visit'){let day='';try{day=bookingDay(val('visitDate'));}catch{}const category=val('grade')?bookingCategory(val('grade')):'';const times=['09:00','09:30','10:00','10:30','11:00','11:30'];select(f.elements.visitStart,times.map(time=>({value:time,text:time+' · 30분',disabled:!['월','화','수','목'].includes(day)||bookingInstant(val('visitDate'),time)<=Date.now()||catalog.visits.some(r=>r.date===val('visitDate')&&r.start===time&&r.category!==category)})),'상담 시간을 선택해 주세요');}
 if(kind==='absence')refreshAbsence();
}
async function load(){catalog=null;$('#application').hidden=true;$('#cancellation').hidden=true;$('#retry').hidden=true;$('#connection').textContent='일정을 불러오고 있습니다.';try{if(!config.apiUrl){catalog={...demoCatalog(),mode:'demo',bookingEnabled:true,weeks:await(await fetch('./calendar-2026.json')).json(),seminars:[{id:'sample',title:'예시 설명회',date:'2026-11-15',start:'14:00',location:'예시 강의실',enabled:'true',remaining:20}],visits:[],makeupSeats:{}};}else{if(!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(config.apiUrl))throw Error('운영 서버 주소를 확인해 주세요.');catalog=await jsonp();if(!catalog.bookingEnabled)throw Error('예약 기능 서버 업데이트가 필요합니다. 학원에 문의해 주세요.');}
 $('#connection').textContent=catalog.mode==='demo'?'미리보기 · 입력 내용은 저장되지 않습니다.':'예약 서버 연결됨 · 모든 시간은 한국 시간입니다.';
 if(kind==='cancel'){$('#cancellation').hidden=false;if(receipt){cf.elements.id.value=receipt.id;cf.elements.token.value=receipt.token;}return;}
 $('#application').hidden=false;f.elements.kind.value=kind;f.elements.requestId.value=crypto.randomUUID();f.elements.token.value=randomToken();f.elements.privacyVersion.value=BOOKING_VERSION;
 const grades=['초1','초2','초3','초4','초5','초6','중1','중2','중3','고1'];select(f.elements.grade,grades.map(g=>({value:g,text:g})));showField('#seminar-fields',kind==='seminar');showField('#class-fields',kind!=='seminar');showField('#visit-fields',kind==='visit');showField('#absence-fields',kind==='absence');
 $('#school-label').hidden=kind==='absence';f.elements.school.disabled=kind==='absence';f.elements.school.required=kind!=='absence';
 $('#title').textContent={seminar:'설명회 안내',visit:'30분 방문 상담 예약',absence:'결석·보강 예약'}[kind];$('#submit').textContent=kind==='seminar'?'설명회 참석 신청하기 ↗':'신청하기 ↗';$('#guide').textContent={seminar:'대면 설명회는 선착순 20명입니다. 온라인 설명회는 인원 제한 없이 신청하실 수 있습니다.',visit:'희망하는 반을 선택하고 방문 일정을 예약해 주세요. 수강 등록은 상담 후 시간표에 반영된 것을 확인하여 확정합니다.',absence:'결석한 수업 내용을 보강합니다. 같은 수업 주차는 동일 학년 빈자리 수업, 다른 주차는 재원 중인 수업 전후로 신청합니다. 보강은 관리자 확인 후 확정됩니다.'}[kind];
 select(f.elements.eventId,catalog.seminars.map(e=>({value:e.id,text:e.title+' · '+e.date+' '+e.start})),catalog.seminars.length?'설명회 선택':'현재 신청 가능한 설명회가 없습니다');
 const target=catalog.classes.find(c=>c.id===params.get('targetId'));if(target)f.elements.grade.value=target.grade;refreshClasses();if(target)f.elements.targetId.value=target.id;
 f.elements.visitDate.min=bookingToday();
 $('#privacy').textContent=`처리 주체: 올타과학 / 수집: 학부모 이름·연락처, 학생 이름·학년${kind==='absence'?'':'·학교'}, 신청 일정과 결석·보강 주차 / 목적: 설명회·상담·보강 예약 및 연락 / 보관: 접수일과 예약일 중 늦은 날부터 ${Number(catalog.retentionDays)||90}일 후 삭제 / 동의를 거부할 수 있으나 온라인 접수는 제한됩니다. 문의·삭제 요청: ${catalog.privacyContact||'010-5725-6442'}. 정보는 비공개 운영 문서에만 저장합니다.`;refresh();
 }catch(e){$('#connection').textContent=e.message+' 신청은 일시 중지됩니다.';$('#retry').hidden=false;}}
f.addEventListener('change',e=>{if(e.target.name==='grade')refreshClasses();refresh();});
f.addEventListener('submit',e=>{e.preventDefault();$('#form-status').textContent='';const input=Object.fromEntries(new FormData(f));if(kind==='visit'){input.date=input.visitDate;input.start=input.visitStart;}if(kind==='absence')input.date=input.choice==='pass'?'':input.makeupDate;
 try{if(kind==='seminar'){const event=catalog.seminars.find(e=>e.id===input.eventId);validateSeminar(input,event,[]);if(input.mode==='onsite'&&event.remaining<1)throw Error('대면 설명회 정원이 마감되었습니다.');}if(kind==='visit')validateVisit(input,catalog.classes.find(c=>c.id===input.targetId),catalog.visits);if(kind==='absence')validateAbsence(input,catalog);if(catalog.mode==='demo'){$('#form-status').textContent='예시 신청 확인 완료. 실제 접수되거나 저장되지 않았습니다.';return;}for(const n of ['date','start']){let el=f.querySelector(`input[type=hidden][name=${n}]`);if(!el){el=document.createElement('input');el.type='hidden';el.name=n;f.append(el);}el.value=input[n]||'';}f.action=config.apiUrl;HTMLFormElement.prototype.submit.call(f);$('#form-status').textContent='새 창의 접수 결과를 확인해 주세요. 성공 결과가 있어야 접수 완료입니다.';}catch(err){$('#form-status').textContent=err.message;}});
cf.addEventListener('submit',e=>{e.preventDefault();if(!catalog)return;if(catalog.mode==='demo'){$('#cancel-status').textContent='미리보기에서는 실제 취소되지 않습니다.';return;}cf.action=config.apiUrl;HTMLFormElement.prototype.submit.call(cf);$('#cancel-status').textContent='새 창에서 취소 결과를 확인해 주세요.';});
document.querySelector(`nav a[href="?kind=${kind}"]`)?.setAttribute('aria-current','page');$('#retry').onclick=load;load();


function refreshAbsence(){
 const cls=catalog.classes.find(c=>c.id===val('targetId')),periods=academicPeriods(val('grade'),catalog.weeks);
 const absencePeriods=cls?periods.filter(p=>p.dates.filter(d=>bookingDay(d)===cls.day).length===1):[];
 const makeupPeriods=periods.filter(p=>p.dates.some(d=>d>=bookingToday()));
 for(const [prefix,list] of [['absence',absencePeriods],['makeup',makeupPeriods]]){
  const months=[...new Set(list.map(p=>p.month))];select(f.elements[prefix+'Month'],months.map(m=>({value:m,text:m.slice(0,4)+'년 '+Number(m.slice(5))+'월'})),'월 선택');
  select(f.elements[prefix+'Period'],list.filter(p=>p.month===val(prefix+'Month')).map(p=>({value:p.id,text:weekLabel(p.id)})),'주차 선택');
 }
 const aw=absencePeriods.find(p=>p.id===val('absencePeriod')),mw=makeupPeriods.find(p=>p.id===val('makeupPeriod')),pass=val('makeupPlan')==='pass';
 f.elements.absenceDate.value=aw&&cls?aw.dates.filter(d=>bookingDay(d)===cls.day)[0]||'':'';
 f.elements.absenceWeek.value=aw?.id||'';f.elements.weekId.value=pass?'':mw?.id||'';
 $('#makeup-details').hidden=pass;for(const n of ['makeupMonth','makeupPeriod','makeupSession']){f.elements[n].disabled=pass;f.elements[n].required=!pass;}
 f.elements.choice.value=pass?'pass':aw&&mw?(aw.id===mw.id?'same':'adjacent'):'';
 const options=[];
 if(aw&&mw&&cls&&!pass)for(const date of mw.dates){
  if(date<bookingToday())continue;
  if(aw.id===mw.id){for(const c of catalog.classes.filter(c=>c.id!==cls.id&&c.grade===cls.grade&&!c.review&&c.day===bookingDay(date)&&c.end<='22:00')){const remaining=c.remaining-(catalog.makeupSeats?.[c.id+'|'+date]||0);if(remaining>0&&bookingInstant(date,c.start)>Date.now())options.push({value:c.id+'|'+date+'|same',text:date+' ('+c.day+') '+c.start+'–'+c.end+' · '+c.title+' · '+c.room});}}
  else if(bookingDay(date)===cls.day){for(const position of ['before','after']){try{const w=absenceWindow(cls,position);if(bookingInstant(date,w.start)>Date.now())options.push({value:cls.id+'|'+date+'|'+position,text:date+' ('+cls.day+') '+w.start+'–'+w.end+' · 수업 '+(position==='before'?'전':'후')+' 30분'});}catch{}}}
 }
 select(f.elements.makeupSession,options,options.length?'보강 시간 선택':'선택 가능한 보강 시간이 없습니다');
 const chosen=options.find(o=>o.value===val('makeupSession'));const parts=chosen?chosen.value.split('|'):[];
 f.elements.makeupClassId.value=pass?'':parts[0]||'';f.elements.makeupDate.value=pass?'':parts[1]||'';f.elements.position.value=pass?'':parts[2]||'';
 $('#week-info').textContent=!cls?'먼저 학년과 정규반을 선택해 주세요.':!aw?'결석할 수업의 월과 주차를 선택해 주세요.':weekLabel(aw.id)+' 수업 · 결석일 '+val('absenceDate')+(pass?' / 보강 패스':!mw?' / 보강할 월과 주차를 선택해 주세요.':aw.id===mw.id?' / 같은 학년의 빈자리 수업에서 보강합니다.':' / '+weekLabel(mw.id)+' 정규 수업 전후 30분으로 보강합니다.');
}
