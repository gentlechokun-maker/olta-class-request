import {readPublicData} from './public-data.js?v=20261020-anonymous';
import {BOOKING_VERSION,bookingToday,bookingDay,bookingCategory,bookingInstant,seminarDeadline,curriculumWeek,absenceWindow,validateSeminar,validateVisit,validateAbsence,academicPeriods,weekLabel,consultationSlots,validateConsultation,absenceDates,makeupChoices,validateFutureAbsence,seminarModes} from './booking-domain.js?v=20261020-seminars';
import {demoCatalog} from './demo.js';
const $=s=>document.querySelector(s),f=$('#booking-form'),cf=$('#cancel-form'),config=window.OLTA_CONFIG||{};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const params=new URLSearchParams(location.search);
if(params.get('kind')==='visit'){location.replace(params.get('targetId')?'./?classId='+encodeURIComponent(params.get('targetId'))+'#classes':'./#new');}
let kind=params.get('kind')||'seminar',catalog=null;
let receipt=null;try{receipt=JSON.parse(decodeURIComponent(location.hash.slice(1)));if(receipt?.id&&receipt?.token){kind='cancel';const receiptScope=['seminar','visit','absence','consultation'].includes(receipt.kind)?receipt.kind:'seminar';history.replaceState(null,'',location.pathname+'?kind=cancel&bookingKind='+receiptScope);}}catch{}
if(!['seminar','visit','absence','consultation','cancel'].includes(kind))kind='seminar';
const requestedScope=kind==='cancel'?(receipt?.kind||params.get('bookingKind')||'seminar'):kind;
const scope=['seminar','visit','absence','consultation'].includes(requestedScope)?requestedScope:'seminar';
const scopeTitle={seminar:'설명회 신청',visit:'방문 상담 예약',absence:'결석·보강 예약',consultation:'상담 신청'}[scope];
const cancelTitle={seminar:'설명회 신청 취소',visit:'방문 상담 예약 취소',absence:'결석·보강 예약 취소',consultation:'상담 예약 취소'}[scope];
$('#seminar-navigation').hidden=scope!=='seminar';
$('#page-heading').textContent=kind==='cancel'?cancelTitle:scopeTitle;
$('#note-label').textContent=kind==='seminar'?'간단히 자녀의 과학 공부에 대한 고민을 들려주세요. 고민들을 모아 실질적인 도움이 되도록 하겠습니다.':'상담 참고 내용 (선택)';
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
function readCatalog(){return readPublicData(config.apiUrl,{action:'bookings',scope:kind},{service:'예약 서버',timeoutMs:45000});}
function randomToken(){return [...crypto.getRandomValues(new Uint8Array(24))].map(n=>n.toString(16).padStart(2,'0')).join('');}
function showField(id,active){$(id).hidden=!active;$(id).disabled=!active;}
function refreshClasses(){select(f.elements.targetId,classes().map(c=>({value:c.id,text:label(c)})),'수업을 선택해 주세요');}
function refresh(){if(!catalog||kind==='cancel')return;
 if(kind==='seminar'){const e=catalog.seminars.find(e=>e.id===val('eventId'));$('#selected-seminar').textContent=e?e.title+' · '+e.date+' '+e.start:'';if(e){const allowed=seminarModes(e),old=val('mode');$('#guide').textContent=allowed.length===2?'선착순 20명 대면 참석이나 온라인 참석이 가능한 설명회입니다.':allowed[0]==='onsite'?'본 설명회는 선착순 20명 대면 참석만 가능한 설명회입니다.':allowed[0]==='online'?'인원 제한 없는 온라인 참석만 가능한 설명회입니다.':'설명회 참석 방식을 확인 중입니다.';f.elements.mode.innerHTML=allowed.map(m=>'<option value="'+m+'">'+(m==='onsite'?'대면 참석 · 1건당 1명':'온라인 참석')+'</option>').join('');f.elements.mode.value=allowed.includes(old)?old:allowed[0]||'';}$('#seminar-info').textContent=e?`${e.date} ${e.start}\n${seminarModes(e).includes('onsite')?'대면 잔여 '+e.remaining+'명 / 20명 · ':''}${e.location||'장소는 학원에 문의해 주세요.'}${seminarModes(e).includes('onsite')?'\n대면 취소: '+new Date(seminarDeadline(e.date,14)+9*3600000).toISOString().slice(0,10)+' 14:00까지 / 신청: 같은 날 20:00까지':''}\n${seminarModes(e).includes('online')?'온라인: 인원·신청 기한·취소 기한 제한 없음':''}${e.onlineInfo?'\n'+e.onlineInfo:''}`:'설명회 일정을 선택해 주세요.';}
 if(kind==='visit'){let day='';try{day=bookingDay(val('visitDate'));}catch{}const category=val('grade')?bookingCategory(val('grade')):'';const times=['09:00','09:30','10:00','10:30','11:00','11:30'];select(f.elements.visitStart,times.map(time=>({value:time,text:time+' · 30분',disabled:!['월','화','수','목'].includes(day)||bookingInstant(val('visitDate'),time)<=Date.now()||catalog.visits.some(r=>r.date===val('visitDate')&&r.start===time&&r.category!==category)})),'상담 시간을 선택해 주세요');}
 if(kind==='absence')refreshAbsence();if(kind==='consultation')refreshConsultation();
}
async function load(){catalog=null;$('#application').hidden=true;$('#seminar-catalog').hidden=true;$('#cancellation').hidden=true;$('#retry').hidden=true;$('#connection').textContent='일정을 불러오고 있습니다.';try{if(!config.apiUrl){catalog={...demoCatalog(),mode:'demo',bookingEnabled:true,weeks:await(await fetch('./calendar-2026.json')).json(),seminars:[{id:'sample',title:'예시 설명회',date:'2026-11-15',start:'14:00',location:'예시 강의실',enabled:'true',remaining:20}],visits:[],makeupSeats:{},consultationEnabled:true,consultationBusy:[],shinBusy:[]};}else{if(!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(config.apiUrl))throw Error('운영 서버 주소를 확인해 주세요.');catalog=await readCatalog();if(!catalog.bookingEnabled)throw Error('예약 기능 서버 업데이트가 필요합니다. 학원에 문의해 주세요.');}
 $('#connection').textContent=catalog.mode==='demo'?'미리보기 · 입력 내용은 저장되지 않습니다.':'예약 서버 연결됨 · 모든 시간은 한국 시간입니다.';
 if(kind==='cancel'){$('#cancellation').hidden=false;if(receipt){cf.elements.id.value=receipt.id;cf.elements.token.value=receipt.token;}return;}
 $('#application').hidden=kind==='seminar';$('#seminar-catalog').hidden=kind!=='seminar';$('#change-seminar').hidden=kind!=='seminar';f.elements.kind.value=kind;f.elements.requestId.value=crypto.randomUUID();f.elements.token.value=randomToken();f.elements.privacyVersion.value=BOOKING_VERSION;
 const grades=['초1','초2','초3','초4','초5','초6','중1','중2','중3','고1'];select(f.elements.grade,grades.map(g=>({value:g,text:g})));showField('#seminar-fields',kind==='seminar');showField('#class-fields',['visit','absence'].includes(kind));showField('#visit-fields',kind==='visit');showField('#absence-fields',kind==='absence');showField('#consultation-fields',kind==='consultation');
 $('#student-grade-label').textContent=kind==='seminar'?'학생 학년(2027년 3월 기준)':'학생 학년';$('#student-grade-guide').hidden=kind!=='seminar';$('#student-grade-guide').textContent=kind==='seminar'?'2027년 3월에 올라가는 새 학년을 선택해 주세요.':'';
 $('#school-label').hidden=['absence','consultation'].includes(kind);f.elements.school.disabled=['absence','consultation'].includes(kind);f.elements.school.required=!['absence','consultation'].includes(kind);
 $('#title').textContent={seminar:'설명회 신청',visit:'30분 방문 상담 예약',absence:'결석·보강 예약',consultation:'상담 신청'}[kind];$('#submit').textContent=kind==='seminar'?'설명회 참석 신청하기 ↗':'신청하기 ↗';$('#guide').textContent={seminar:'참석할 설명회를 선택해 주세요.',visit:'희망하는 반을 선택하고 방문 일정을 예약해 주세요. 수강 등록은 상담 후 시간표에 반영된 것을 확인하여 확정합니다.',consultation:'원장 전화 상담 또는 재원생 방문·전화 상담을 선택해 주세요.',absence:'결석한 수업 내용을 보강합니다. 같은 수업 주차는 동일 학년 빈자리 수업, 다른 주차는 재원 중인 수업 전후로 신청합니다. 보강은 관리자 확인 후 확정됩니다.'}[kind];
 if(kind==='seminar'){renderSeminarCards();const id=new URLSearchParams(location.search).get('eventId');if(catalog.seminars.some(e=>e.id===id))openSeminar(id,false);}
 const target=catalog.classes.find(c=>c.id===params.get('targetId'));if(target)f.elements.grade.value=target.grade;refreshClasses();if(target)f.elements.targetId.value=target.id;
 f.elements.visitDate.min=bookingToday();f.elements.consultationDate.min=bookingToday();
 $('#privacy').textContent=`처리 주체: 올타과학 / 수집: 학부모 이름·연락처, 학생 이름·학년${['absence','consultation'].includes(kind)?'':'·학교'}, ${kind==='consultation'?'상담 종류·예약 일정·참고 내용':'신청 일정과 결석·보강 주차'} / 목적: 설명회·상담·보강 예약 및 연락 / 보관: 접수일과 예약일 중 늦은 날부터 ${Number(catalog.retentionDays)||90}일 후 삭제 / 동의를 거부할 수 있으나 온라인 접수는 제한됩니다. 문의·삭제 요청: ${catalog.privacyContact||'010-5725-6442'}. 정보는 비공개 운영 문서에만 저장합니다.`;refresh();
 }catch(e){$('#connection').textContent=e.message+' 신청은 일시 중지됩니다.';$('#retry').hidden=false;}}
f.addEventListener('change',e=>{if(e.target.name==='grade')refreshClasses();refresh();});
f.addEventListener('submit',e=>{e.preventDefault();$('#form-status').textContent='';const input=Object.fromEntries(new FormData(f));if(kind==='consultation'){input.date=input.consultationDate;input.start=input.consultationStart;}if(kind==='visit'){input.date=input.visitDate;input.start=input.visitStart;}if(kind==='absence')input.date=input.choice==='pass'?'':input.makeupDate;
 try{if(kind==='consultation')validateConsultation(input,catalog);if(kind==='seminar'){const event=catalog.seminars.find(e=>e.id===input.eventId);validateSeminar(input,event,[]);if(input.mode==='onsite'&&event.remaining<1)throw Error('대면 설명회 정원이 마감되었습니다.');}if(kind==='visit')validateVisit(input,catalog.classes.find(c=>c.id===input.targetId),catalog.visits);if(kind==='absence'){validateFutureAbsence(input,catalog.classes.find(c=>c.id===input.targetId));validateAbsence(input,catalog);}if(catalog.mode==='demo'){$('#form-status').textContent='예시 신청 확인 완료. 실제 접수되거나 저장되지 않았습니다.';return;}for(const n of ['date','start']){let el=f.querySelector(`input[type=hidden][name=${n}]`);if(!el){el=document.createElement('input');el.type='hidden';el.name=n;f.append(el);}el.value=input[n]||'';}f.action=config.apiUrl;HTMLFormElement.prototype.submit.call(f);$('#form-status').textContent='새 창의 접수 결과를 확인해 주세요. 성공 결과가 있어야 접수 완료입니다.';}catch(err){$('#form-status').textContent=err.message;}});
cf.addEventListener('submit',e=>{e.preventDefault();if(!catalog)return;if(catalog.mode==='demo'){$('#cancel-status').textContent='미리보기에서는 실제 취소되지 않습니다.';return;}cf.action=config.apiUrl;HTMLFormElement.prototype.submit.call(cf);$('#cancel-status').textContent='새 창에서 취소 결과를 확인해 주세요.';});
document.querySelector(`nav a[href="?kind=${kind}"]`)?.setAttribute('aria-current','page');$('#retry').onclick=load;load();



function refreshConsultation(){const type=val('consultationType');$('#consultation-guide').textContent=type==='director-phone'?'원장 상담 · 전화만 가능 · 오전 10~11시 / 오후 8~9시':type==='student-visit'?'재원생 방문 상담 · 오전 10시~정오 12시':'재원생 전화 상담 · 오후 2~10시 중 수업 및 다른 상담 일정과 겹치지 않는 시간';const slots=consultationSlots(type,val('consultationDate'),catalog);select(f.elements.consultationStart,slots.map(s=>({value:s.start,text:s.start+'–'+s.end})),val('consultationDate')?'상담 시간 선택 (가능한 시간만 표시)':'먼저 날짜를 선택해 주세요');if(val('consultationDate')&&!slots.length)$('#consultation-guide').textContent+=' / 선택한 날짜에는 예약 가능한 시간이 없습니다.';}

const calendarView={absence:'',makeup:''};
function dateWeek(date){try{return curriculumWeek(date,val('grade'),catalog.weeks);}catch{return '';}}
function dateText(date){return Number(date.slice(5,7))+'월 '+Number(date.slice(8))+'일 ('+bookingDay(date)+')';}
function drawCalendar(prefix,allowed,originalWeek){
 const today=bookingToday(),dates=[...new Set(catalog.weeks.map(w=>w.date))].filter(d=>d>=today).sort(),months=[...new Set(dates.map(d=>d.slice(0,7)))];
 if(!months.includes(calendarView[prefix]))calendarView[prefix]=months[0]||'';
 const month=calendarView[prefix],chosen=val(prefix+'Date'),monthEl=$('#'+prefix+'-calendar-month');
 monthEl.innerHTML=months.map(m=>`<option value="${m}">${m.slice(0,4)}년 ${Number(m.slice(5))}월</option>`).join('');monthEl.value=month;monthEl.disabled=!months.length;
 const buttons=document.querySelectorAll('[data-calendar-nav="'+prefix+'"]');buttons.forEach(b=>b.disabled=!month||(Number(b.dataset.step)<0?months.indexOf(month)<=0:months.indexOf(month)>=months.length-1));
 let html=['일','월','화','수','목','금','토'].map(d=>'<span class="calendar-weekday">'+d+'</span>').join('');
 if(month){const [year,m]=month.split('-').map(Number),first=new Date(Date.UTC(year,m-1,1)).getUTCDay(),last=new Date(Date.UTC(year,m,0)).getUTCDate();html+='<span aria-hidden="true"></span>'.repeat(first);
  for(let day=1;day<=last;day++){const date=month+'-'+String(day).padStart(2,'0');if(date<today){html+='<span class="calendar-past" aria-hidden="true"></span>';continue;}
   const week=dateWeek(date),match=/-W([1-4])$/.exec(week),same=originalWeek&&week===originalWeek,relation=prefix==='makeup'&&originalWeek&&week?(same?'same':'different'):'',available=allowed.has(date),label=dateText(date)+' · '+(week?weekLabel(week):'휴원 또는 주차 확인 필요')+(relation?(same?' · 같은 수업 월·주차':' · 다른 수업 월·주차'):'')+(available?'':' · 선택 불가');
   html+=`<button type="button" class="calendar-day ${match?'week-'+match[1]:'week-closed'} ${relation}" data-calendar="${prefix}" data-date="${date}" aria-label="${esc(label)}" aria-pressed="${date===chosen}" ${available?'':'disabled'}><strong>${day}</strong><small>${match?Number(week.slice(5,7))+'월 '+match[1]+'주':'휴원/확인'}</small>${relation?'<span class="relation-symbol" aria-hidden="true">'+(same?'●':'◆')+'</span>':''}</button>`;
  }
 }
 $('#'+prefix+'-calendar').innerHTML=html;
 const selected=$('#'+prefix+'-selected');selected.className='date-selected '+(chosen?'week-'+(dateWeek(chosen).match(/-W([1-4])$/)?.[1]||'closed'):'');selected.textContent=chosen?dateText(chosen)+' · '+weekLabel(dateWeek(chosen)):'날짜를 선택해 주세요.';
}
function refreshAbsence(){
 const cls=catalog.classes.find(c=>c.id===val('targetId')),allowed=new Set(absenceDates(cls,catalog.weeks)),pass=val('makeupPlan')==='pass';
 if(!allowed.has(val('absenceDate')))f.elements.absenceDate.value='';
 const absence=val('absenceDate'),originalWeek=absence?dateWeek(absence):'';
 const candidateDates=[...new Set(catalog.weeks.map(w=>w.date))].filter(d=>d>=bookingToday());
 const makeupDates=new Set(absence?candidateDates.filter(d=>makeupChoices(cls,absence,d,catalog).length):[]);
 if(pass||!makeupDates.has(val('makeupDate')))f.elements.makeupDate.value='';
 const date=val('makeupDate'),week=date?dateWeek(date):'';
 f.elements.absenceWeek.value=originalWeek;f.elements.weekId.value=week;f.elements.choice.value=pass?'pass':originalWeek&&week?(originalWeek===week?'same':'adjacent'):'';
 $('#makeup-details').hidden=pass;f.elements.makeupSession.disabled=pass;f.elements.makeupSession.required=!pass;
 drawCalendar('absence',allowed,'');drawCalendar('makeup',makeupDates,originalWeek);
 const choices=date&&absence&&!pass?makeupChoices(cls,absence,date,catalog):[];
 const options=choices.map(c=>({value:c.classId+'|'+c.position,text:c.start+'–'+c.end+(c.choice==='same'?' · '+c.title+' · '+c.room:' · 수업 '+(c.position==='before'?'전':'후')+' 30분')}));
 select(f.elements.makeupSession,options,options.length?'보강 시간 선택':'먼저 보강 가능한 날짜를 선택해 주세요');
 const chosen=choices.find(c=>c.classId+'|'+c.position===val('makeupSession'));f.elements.makeupClassId.value=chosen?.classId||'';f.elements.position.value=chosen?.position||'';
 $('#week-info').textContent=!cls?'먼저 학년과 재원 중인 정규반을 선택해 주세요.':!absence?'결석할 수업 날짜를 선택해 주세요.':weekLabel(originalWeek)+' 수업 · '+dateText(absence)+' 결석'+(pass?' / 보강 패스':!date?' / 보강할 날짜를 선택해 주세요.':originalWeek===week?' / 같은 수업 월·주차입니다. 결석하는 정규반을 제외한 같은 학년 빈자리 수업에서 보강합니다.':' / '+weekLabel(week)+'입니다. 다른 수업 월·주차이므로 정규 수업 전후 30분으로 보강합니다.');
}
f.addEventListener('click',e=>{const day=e.target.closest('[data-calendar]'),nav=e.target.closest('[data-calendar-nav]');if(day&&!day.disabled){f.elements[day.dataset.calendar+'Date'].value=day.dataset.date;refreshAbsence();}if(nav&&!nav.disabled){const prefix=nav.dataset.calendarNav,opts=[...$('#'+prefix+'-calendar-month').options].map(o=>o.value);calendarView[prefix]=opts[opts.indexOf(calendarView[prefix])+Number(nav.dataset.step)];refreshAbsence();}});
for(const prefix of ['absence','makeup'])$('#'+prefix+'-calendar-month').addEventListener('change',e=>{calendarView[prefix]=e.target.value;refreshAbsence();});
let dateBoundary=bookingToday();function refreshDateBoundary(){if(catalog&&kind==='absence'&&bookingToday()!==dateBoundary){dateBoundary=bookingToday();refreshAbsence();}}
document.addEventListener('visibilitychange',refreshDateBoundary);setInterval(refreshDateBoundary,60000);

function renderSeminarCards(){
 const events=[...catalog.seminars].sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start));
 $('#seminar-cards').innerHTML=events.length?events.map(e=>{
  const closed=Date.now()>seminarDeadline(e.date,20)||e.remaining<1,allowed=seminarModes(e),canApply=allowed.includes('online')||allowed.includes('onsite')&&!closed;
  const status=allowed.map(m=>m==='onsite'?(closed?'대면 접수 마감':'대면 신청 가능 · 선착순 20명'):'온라인 신청 가능 · 인원 제한 없음').join(' · ');
  return '<article class="seminar-card"><p class="seminar-date">'+esc(e.date)+' ('+bookingDay(e.date)+') '+esc(e.start)+'</p><h3>'+esc(e.title)+'</h3><p>'+esc(e.location||'장소 문의')+'</p><p class="seminar-status">'+esc(status)+'</p><button type="button" data-seminar="'+esc(e.id)+'" aria-label="'+esc(e.date+' '+e.title+' 신청서 작성')+'" '+(canApply?'':'disabled')+'>'+(canApply?'이 설명회 신청하기 ↗':'대면 접수 마감')+'</button></article>';
 }).join(''):'<p class="notice">현재 공개된 설명회가 없습니다. 일정이 개설되면 이곳에서 신청할 수 있습니다.</p>';
}
function openSeminar(id,updateUrl=true){if(!catalog.seminars.some(e=>e.id===id))return;f.reset();f.elements.kind.value='seminar';f.elements.eventId.value=id;f.elements.requestId.value=crypto.randomUUID();f.elements.token.value=randomToken();f.elements.privacyVersion.value=BOOKING_VERSION;$('#form-status').textContent='';$('#application').hidden=false;$('#seminar-catalog').hidden=true;if(updateUrl){const u=new URL(location.href);u.searchParams.set('eventId',id);history.replaceState(null,'',u.pathname+u.search);}refresh();$('#application').scrollIntoView({behavior:'smooth',block:'start'});$('#selected-seminar').setAttribute('tabindex','-1');$('#selected-seminar').focus();}
$('#seminar-cards').addEventListener('click',e=>{const b=e.target.closest('[data-seminar]');if(b)openSeminar(b.dataset.seminar);});
$('#change-seminar').onclick=()=>{$('#application').hidden=true;$('#seminar-catalog').hidden=false;const u=new URL(location.href);u.searchParams.delete('eventId');history.replaceState(null,'',u.pathname+u.search);$('#seminar-list-heading').setAttribute('tabindex','-1');$('#seminar-list-heading').focus();};
