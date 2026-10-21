import {readPublicData} from './public-data.js?v=20261020-year2027';
import {GRADES,COURSE_GRADES,courseGrade,gradeLabel,studentGrades,curriculum,classCapacity,normalizePhone,makeupWindow,validateMakeup,openingSlotAvailable} from './domain.js?v=20261021-opening2027';
import {submitInline} from './submission.js?v=20261020-receipt';
import {demoCatalog} from './demo.js';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const classTitle=c=>String(c.title||'').replaceAll('시작반','신규반');
const config=window.OLTA_CONFIG||{};
const upcoming={catalog:null,loading:false,error:''};
const state={tab:'existing',grade:'',day:'',catalog:null,loading:true};
const mobileState={grade:'초1',day:'',page:0};
const mobileMedia=window.matchMedia('(max-width: 700px)');
const validUrl=url=>/^https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9_-]+\/exec$/.test(url);
function connection(text,type=''){const el=$('#connection');el.className='connection '+type;el.textContent=text;}
function readCatalog(url){return readPublicData(url,{action:'catalog'},{service:'시간표 서버',timeoutMs:20000});}
async function load(){state.loading=true;connection('시간표를 확인하고 있습니다.');try{
  if(!config.apiUrl){state.catalog=demoCatalog();connection('미리보기 · 아래 수업·인원은 예시입니다. 실제 상담 신청은 아직 받지 않습니다.');}
  else{if(!validUrl(config.apiUrl))throw new Error('운영 서버 주소 설정을 확인해 주세요.');state.catalog=await readCatalog(config.apiUrl);if(!Array.isArray(state.catalog.classes)||!Array.isArray(state.catalog.slots))throw new Error('시간표 데이터 형식을 확인해 주세요.');connection('실시간 접수 연결 · 상담 신청 후 시간표 등록을 확인하여 확정합니다.','live');}
  $('#updated').textContent=state.catalog.updatedAt?'시간표 확인 '+new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(state.catalog.updatedAt)):'예시 화면 · 실제 시간표 미연결';
  renderPrivacy();
}catch(error){state.catalog={classes:[],slots:[],demand:{},mode:'error'};connection(error.message+' 신청은 일시 중지됩니다.','error');const retry=document.createElement('button');retry.textContent='다시 확인';retry.onclick=load;$('#connection').append(retry);}finally{state.loading=false;render();}}
function renderPrivacy(c=state.catalog){const days=Number(c.retentionDays)||90;const contact=c.privacyContact||'운영자 상담 담당';$('#consent-description').textContent=`수집 항목: 원생 이름·학년, 보호자 연락처, 결석 날짜·수업 내용, 보강 희망 일정·종류, 상담 참고 내용 / 목적: 수강·보강·반 개설 상담 및 연락 / 보관: 접수 후 ${days}일. 문의·삭제 요청: ${contact}`;$('#privacy-body').innerHTML=`<p><strong>처리 주체: 올타과학</strong></p><p>수집 항목: 원생 이름·학년, 보호자 연락처, 결석 날짜·수업 내용, 보강 희망 일정·종류, 상담 참고 내용</p><p>이용 목적: 수강·보강 상담, 희망 반 개설 검토 및 상담 연락</p><p>보관 기간: 접수일로부터 ${days}일. 기간이 지나면 신청 기록을 삭제합니다.</p><p>문의·삭제 요청: ${esc(contact)}</p><p>연락처는 비공개 운영 문서에 저장하며, 공개 GitHub 저장소에는 저장하지 않습니다.</p>`;}
function renderUpdated(){const c=state.catalog;if(!c)return;const opening=state.tab==='new'&&c.openingYear===2027;const timestamp=opening?c.openingUpdatedAt:c.updatedAt;$('#updated').textContent=timestamp?(opening?'2027 시간표 확인 ':'시간표 확인 ')+new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(timestamp)):opening?'2027 시간표 동기화 필요':'예시 화면 · 실제 시간표 미연결';}
function render(){
  renderUpdated();
  const data=state.catalog||{classes:[],slots:[],demand:{}};
  $('#grade-filters').innerHTML=['',...COURSE_GRADES].map(g=>`<button data-grade="${g}" class="${state.grade===g?'active':''}" aria-pressed="${state.grade===g}">${g?gradeLabel(g):'전체'}</button>`).join('');
  const days=['월','화','수','목','금','토','일'];
  const allFiltered=data.classes.filter(c=>(!state.grade||courseGrade(c.grade)===state.grade)&&(!state.day||c.day===state.day)).sort((a,b)=>days.indexOf(a.day)-days.indexOf(b.day)||a.start.localeCompare(b.start)||COURSE_GRADES.indexOf(a.grade)-COURSE_GRADES.indexOf(b.grade)||String(a.room).localeCompare(String(b.room),'ko'));
  const filtered=allFiltered.filter(c=>c.review||c.remaining>0);
  $('#class-count').textContent=`${state.grade?gradeLabel(state.grade)+' · ':''}${state.day?state.day+'요일 · ':''}${filtered.length}개 수업`;
  const classCard=c=>{
    const badge=c.review?'review':c.remaining===0?'full':'';
    const title=classTitle(c);
    const shortStatus=c.review?'확인 중':c.remaining===0?'마감':'신청 가능';
    return `<details class="compact-class ${badge}"><summary><span class="compact-main"><strong class="compact-time">${esc(c.start)}–${esc(c.end)}</strong></span><span class="compact-meta"><span class="compact-course">${esc(gradeLabel(c.grade))} · ${esc(title)}</span><span class="compact-status">${shortStatus}</span><span class="compact-chevron" aria-hidden="true">⌄</span></span></summary><div class="compact-detail"><h3>${esc(title)}</h3><p class="schedule">${esc(c.day)}요일 ${esc(c.start)}–${esc(c.end)}</p><p class="lesson-detail">${esc(c.lesson||curriculum(c.grade,c.day,data.semester||2)?.lesson||'수업 시간은 상담 시 안내')}</p><p class="teacher">${esc(c.room)} · 정원 ${Number(c.capacity)||classCapacity(c)}명</p><p class="compact-availability">${c.review?'관리자 확인 후 안내':'신청 가능'}</p>${c.review?'<button class="card-button" disabled>시간표 확인 중</button>':c.remaining===0?'<button class="card-button" data-tab="new">신규 수업 개설 신청 <span>↗</span></button>':`<button class="card-button" data-request="existing" data-id="${esc(c.id)}">이 반 수강 신청 <span>↗</span></button>`}</div></details>`;
  };
  $('#class-grid').innerHTML=filtered.length?(state.day?[state.day]:days).map(day=>{const lessons=filtered.filter(c=>c.day===day);return `<section class="weekday-column" aria-label="${day}요일 수업"><h3 class="weekday-heading">${day}요일</h3><div class="weekday-lessons">${lessons.length?lessons.map(classCard).join(''):'<p class="weekday-empty">신청 가능한<br>수업 없음</p>'}</div></section>`;}).join(''):`<div class="empty"><strong>${data.mode==='error'?'시간표를 불러오지 못했습니다.':'조건에 맞는 개설 반이 없습니다.'}</strong>${data.mode==='error'?'위의 다시 확인 버튼으로 재시도해 주세요.':'다른 학년·요일을 선택하거나 신규 수업 개설 신청을 확인해 주세요.'}</div>`;
  $('#makeup-grid').innerHTML=!data.makeupEnabled&&data.mode!=='demo'?'<div class="empty">보강 신청 기능을 준비 중입니다. 상담 연락처로 문의해 주세요.</div>':allFiltered.map(c=>`<article class="class-card"><span class="grade-label">${esc(c.grade)} · 재원생 보강</span><h3>${esc(classTitle(c))}</h3><p class="schedule">${esc(c.day)}요일 ${esc(c.start)}–${esc(c.end)}</p><p class="teacher">${esc(c.room)}</p><p>다른 주차 보강 30분<br>같은 수업 주차는 빈자리 수업 · 다른 주차는 수업 전후</p><button class="card-button" data-request="makeup" data-id="${esc(c.id)}" ${c.review?'disabled':''}>${c.review?'시간표 확인 중':'이 반 원생 보강 예약 ↗'}</button></article>`).join('')||'<div class="empty">조건에 맞는 정규반이 없습니다.</div>';
  $('#opening-basis').textContent=data.openingError||(data.openingYear===2027?'2027년 시간표 기준 · 기존에 지정한 개설 후보 시간에서 강사와 교실이 비어 있는 시간만 표시합니다. 학년은 2027년 기준입니다.':'개설 가능한 빈 시간대에 희망 학년을 알려주세요.');
  const slots=data.slots.filter(s=>(data.openingYear===2027||openingSlotAvailable(s,data.classes))&&(!state.grade||s.grades.map(courseGrade).includes(state.grade))&&(!state.day||s.day===state.day));
  $('#slot-grid').innerHTML=slots.length?slots.map(s=>{const grades=state.grade?[state.grade]:[...new Set(s.grades.map(courseGrade))];return `<article class="class-card"><div class="card-top"><span class="grade-label">개설 검토 가능 시간</span><span class="badge">희망자 모집</span></div><h3>${esc(s.day)}요일 ${esc(s.start)}</h3><p class="schedule">${esc(s.start)}–${esc(s.end)} · ${esc(s.room)}</p><p class="teacher">신청 가능 학년 ${s.grades.map(g=>esc(gradeLabel(g))).join(' · ')}</p><div class="demand">${grades.map(g=>{const n=Number(data.demand[s.id+'|'+g]||0);return `<div>${esc(gradeLabel(g))} · ${esc(curriculum(g,s.day,data.openingSemester||data.semester||2)?.name||'과학')} <strong>${n}명</strong> ${n>=3?'· 개설 검토 대상':'· 3명까지 '+(3-n)+'명'}</div>`;}).join('')}</div><button class="card-button" data-request="new" data-id="${esc(s.id)}">이 시간에 개설 요청 <span>↗</span></button></article>`;}).join(''):'<div class="empty"><strong>현재 신청 가능한 빈 시간대가 없습니다.</strong>다른 학년·요일을 확인해 주세요. 관리자가 강사·교실 일정을 확인한 시간대만 표시합니다.</div>';
  renderMobile();
}
function selectTab(tab){state.tab=tab;renderUpdated();mobileState.page=0;mobileState.day='';renderMobile();for(const t of ['existing','year2027','new','makeup']){const active=t===tab;$('#tab-'+t).setAttribute('aria-selected',String(active));$('#tab-'+t).tabIndex=active?0:-1;$('#panel-'+t).hidden=!active;}$('#filters').hidden=tab==='year2027';$('.mobile-controls').hidden=tab==='year2027';if(tab==='year2027')load2027();$('#classes').scrollIntoView({behavior:'smooth',block:'start'});}
function openRequest(kind,id){
  if(kind==='makeup'){location.href='./booking.html?kind=absence&targetId='+encodeURIComponent(id);return;}
  const catalog=kind==='year2027'?upcoming.catalog:state.catalog;if(!catalog)return;const target=(kind==='new'?catalog.slots:catalog.classes).find(c=>c.id===id);if(!target||(['existing','year2027'].includes(kind)&&(target.review||target.remaining<1)))return;
  const form=$('#request-form');if(form.dataset.sending==='true'){if(!$('#request-dialog').open)$('#request-dialog').showModal();return;}form.hidden=false;$('#request-result').hidden=true;form.reset();form.elements.kind.value=kind;form.elements.targetId.value=id;form.elements.scheduleKey.value=kind==='year2027'?JSON.stringify([target.id,target.grade,target.title,target.day,target.start,target.end,target.room]):kind==='new'&&catalog.openingYear===2027?JSON.stringify([target.id,target.day,target.start,target.end,target.room]):'';form.elements.requestId.value=crypto.randomUUID();
  const grades=kind==='year2027'?[target.grade]:studentGrades(kind==='new'?target.grades:[target.grade]);form.elements.grade.innerHTML=grades.map(g=>`<option>${esc(g)}</option>`).join('');const selectedGrade=mobileMedia.matches?mobileState.grade:state.grade;if(grades.includes(selectedGrade))form.elements.grade.value=selectedGrade;
  renderPrivacy(catalog);if(kind==='year2027')$('#consent-description').textContent=`수집 항목: 원생 이름·2027년 학년, 보호자 연락처, 상담 참고 내용 / 목적: 2027년 수강 상담 및 연락 / 보관: 접수 후 ${Number(catalog.retentionDays)||90}일. 문의·삭제 요청: ${catalog.privacyContact||'운영자 상담 담당'}`;$('#request-grade-label').textContent=kind==='year2027'||kind==='new'&&catalog.openingYear===2027?'2027년 기준 학년':'희망 학년';
  $('#request-title').textContent=kind==='year2027'?'27년 수업 및 특강 신청':kind==='makeup'?'결석·보강 예약':kind==='existing'?'수강 신청 및 변경':'신규 수업 개설 신청';
  $('#request-summary').textContent=`${kind==='year2027'?'2027년 '+target.grade+' · ':''}${kind==='new'?'':classTitle(target)+' · '}${target.day}요일 ${target.start}–${target.end} · ${target.room}${kind==='year2027'?' · 정원 '+(Number(target.capacity)||classCapacity(target))+'명':''}`;
  $('#makeup-fields').hidden=kind!=='makeup';$('#makeup-fields').disabled=kind!=='makeup';
  form.elements.absenceDate.max=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date());
  form.elements.date.min=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date());
  $('#demo-form-note').hidden=catalog.mode!=='demo';$('#form-status').textContent='';form.querySelector('[type=submit]').disabled=false;
  form.querySelector('.form-note').textContent=kind==='year2027'?'2027년 예상 시간표의 정규 수업 신청입니다. 보호자가 신청해 주세요. 상담 후 일정과 수강 등록을 확정하며, 신청만으로 자리가 확보되지는 않습니다.':kind==='makeup'?'보호자가 신청해 주세요. 신청만으로 보강이 확정되지 않으며, 결석 수업 내용과 재원 여부, 선생님·교실 일정을 확인한 뒤 연락드립니다.':'보호자가 신청해 주세요. 신청 후 상담을 거쳐 등록하며, 신청 시 자리가 확보되지는 않습니다.';
  form.querySelector('[type=submit]').textContent=catalog.mode==='demo'?'예시 신청 흐름 확인':kind==='makeup'?'보강 상담 요청하기 ↗':'상담 연락 요청하기 ↗';
  if(kind==='makeup')updateMakeupTime();$('#request-dialog').showModal();
}
function updateMakeupTime(){
  const f=$('#request-form');if(f.elements.kind.value!=='makeup')return;
  const cls=state.catalog.classes.find(c=>c.id===f.elements.targetId.value);
  let valid=0;for(const opt of f.elements.position.options){try{makeupWindow(cls,f.elements.makeupType.value,opt.value);opt.disabled=false;valid++;}catch{opt.disabled=true;}}
  if(f.elements.position.selectedOptions[0]?.disabled&&valid)f.elements.position.value=[...f.elements.position.options].find(o=>!o.disabled).value;
  try{const w=makeupWindow(cls,f.elements.makeupType.value,f.elements.position.value);$('#makeup-time').textContent=`${cls.day}요일 ${w.start}–${w.end} · ${w.minutes}분 (관리자 확인 후 확정)`;f.querySelector('[type=submit]').disabled=false;}
  catch(e){$('#makeup-time').textContent=e.message;f.querySelector('[type=submit]').disabled=true;}
}
$('#makeup-fields').addEventListener('change',updateMakeupTime);
document.addEventListener('click',event=>{const button=event.target.closest('button,[data-tab]');if(!button)return;if(button.dataset.tab)selectTab(button.dataset.tab);if(button.hasAttribute('data-grade')){state.grade=button.dataset.grade;render();}if(button.dataset.request)openRequest(button.dataset.request,button.dataset.id);if(button.hasAttribute('data-close'))button.closest('dialog').close();});
$('.tabs').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const tabs=['existing','year2027','new','makeup'];const tab=e.key==='Home'?tabs[0]:e.key==='End'?tabs[tabs.length-1]:tabs[(tabs.indexOf(state.tab)+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length];selectTab(tab);$('#tab-'+tab).focus();});
$('#day-filter').addEventListener('change',e=>{state.day=e.target.value;render();});
$('#privacy-button').onclick=()=>$('#privacy-dialog').showModal();
$('#request-form').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget;if(form.dataset.sending==='true')return;if(form.elements.kind.value==='makeup'){try{validateMakeup(Object.fromEntries(new FormData(form)),state.catalog);}catch(e){$('#form-status').textContent=e.message;return;}}if((form.elements.kind.value==='year2027'?upcoming.catalog:state.catalog)?.mode==='demo'){$('#form-status').textContent='예시 흐름 확인 완료. 실제 신청은 접수되지 않았고 입력 내용은 저장하지 않았습니다.';form.reset();return;}if(!validUrl(config.apiUrl))return;const phone=normalizePhone(form.elements.phone.value);if(!/^01[016789]\d{7,8}$/.test(phone)){$('#form-status').textContent='올바른 휴대전화 번호를 입력해 주세요.';return;}const button=form.querySelector('[type=submit]');form.dataset.sending='true';button.disabled=true;try{const result=await submitInline(form,config.apiUrl,{onStatus:message=>$('#form-status').textContent=message});const box=$('#request-result');box.querySelector('h3').textContent=result.duplicate?'이미 접수된 신청입니다.':'신청이 완료되었습니다.';box.querySelector('p').textContent=(result.duplicate?'기존 상담 요청을 확인했습니다.':'상담 요청이 정상 접수되었습니다.')+' 학원에서 확인 후 연락드리겠습니다. 수강 등록은 상담 후 별도로 확정됩니다.';box.querySelector('small').textContent='접수번호: '+result.id;box.hidden=false;form.hidden=true;$('#request-title').textContent='상담 요청 접수 완료';box.focus();}catch(error){$('#form-status').textContent=error.message;button.disabled=false;}finally{delete form.dataset.sending;}});
load().then(()=>{const params=new URLSearchParams(location.search);if(location.hash==='#new'||params.get('kind')==='new')selectTab('new');const id=params.get('classId');if(id&&state.catalog?.classes.some(c=>c.id===id&&!c.review&&c.remaining>0))openRequest('existing',id);});

function renderMobile(){
  const data=state.catalog||{classes:[],slots:[],demand:{}};
  if(state.tab==='year2027')return;
  const kind=state.tab==='new'?'new':'existing',days=['월','화','수','목','금','토','일'];
  const rows=(kind==='new'?data.slots.filter(s=>s.grades.map(courseGrade).includes(mobileState.grade)&&(data.openingYear===2027||openingSlotAvailable(s,data.classes))):data.classes.filter(c=>courseGrade(c.grade)===mobileState.grade&&(c.review||c.remaining>0))).sort((a,b)=>a.start.localeCompare(b.start)||a.end.localeCompare(b.end));
  const available=days.filter(day=>rows.some(r=>r.day===day));
  if(!mobileState.day)mobileState.day=available[0]||'월';
  $('#mobile-grade').innerHTML=COURSE_GRADES.map(g=>'<option '+(g===mobileState.grade?'selected':'')+'>'+esc(g)+'</option>').join('');
  $('#mobile-day').innerHTML=days.map(day=>'<option value="'+day+'" '+(day===mobileState.day?'selected':'')+'>'+day+'요일'+(available.includes(day)?'':' · 수업 없음')+'</option>').join('');
  const selected=rows.filter(r=>r.day===mobileState.day),pages=Math.max(1,Math.ceil(selected.length/4));mobileState.page=Math.min(mobileState.page,pages-1);
  const note=kind==='new'?(data.openingError||(data.openingYear===2027?'2027년 시간표 기준 · ':'')+'같은 학년·시간대 3명부터 개설을 검토합니다.'):'수업을 선택하면 수강 신청서를 작성할 수 있어요.';
  const cards=selected.slice(mobileState.page*4,mobileState.page*4+4).map(r=>{
    const title=kind==='new'?(curriculum(mobileState.grade,r.day,data.openingSemester||data.semester||2)?.name||'과학'):classTitle(r);
    const status=kind==='new'?'희망 '+Number(data.demand[r.id+'|'+mobileState.grade]||0)+'명 · 3명부터 검토':r.review?'시간표 확인 중':'신청 가능';
    return '<article class="mobile-class"><div><strong>'+esc(r.start)+'–'+esc(r.end)+'</strong><span>'+esc(title)+' · '+esc(r.room)+(kind==='existing'?' · 정원 '+(Number(r.capacity)||classCapacity(r))+'명':'')+'</span><small>'+esc(status)+'</small></div><button data-request="'+kind+'" data-id="'+esc(r.id)+'" '+(r.review?'disabled':'')+'>'+(r.review?'확인 중':kind==='new'?'개설 신청':'수강 신청')+'</button></article>';
  }).join('');
  $('#mobile-'+kind).innerHTML='<p class="mobile-note">'+esc(note)+'</p><div class="mobile-result-count" aria-live="polite">'+mobileState.grade+' · '+mobileState.day+'요일 · '+selected.length+'개 시간</div>'+(cards||'<p class="mobile-empty">'+(data.mode==='error'?'시간표 연결을 확인해 주세요.':'신청 가능한 시간이 없습니다. 다른 요일을 선택해 주세요.')+'</p>')+(pages>1?'<nav class="mobile-pages" aria-label="시간 목록 페이지"><button data-mobile-page="-1" '+(mobileState.page===0?'disabled':'')+'>이전</button><span>'+(mobileState.page+1)+' / '+pages+'</span><button data-mobile-page="1" '+(mobileState.page===pages-1?'disabled':'')+'>다음</button></nav>':'');
}
$('#mobile-grade').addEventListener('change',e=>{mobileState.grade=e.target.value;mobileState.day='';mobileState.page=0;renderMobile();});
$('#mobile-day').addEventListener('change',e=>{mobileState.day=e.target.value;mobileState.page=0;renderMobile();});
document.addEventListener('click',e=>{const b=e.target.closest('[data-mobile-page]');if(b){mobileState.page+=Number(b.dataset.mobilePage);renderMobile();}});


async function load2027(force=false){
  if(upcoming.loading)return;if(upcoming.catalog&&!force){render2027();return;}
  upcoming.loading=true;upcoming.error='';render2027();
  try{if(!validUrl(config.apiUrl))throw new Error('27년 수업 및 특강 신청 서버를 준비 중입니다.');
    const c=await readPublicData(config.apiUrl,{action:'year2027'},{service:'2027년 시간표 서버',timeoutMs:20000});
    if(c.year!==2027||!Array.isArray(c.classes))throw new Error('2027년 시간표를 준비 중입니다.');
    upcoming.catalog=c;
  }catch(e){upcoming.error=e.message;}finally{upcoming.loading=false;render2027();}
}
function render2027(){
  const status=$('#year2027-status'),grid=$('#year2027-grid');
  if(upcoming.loading){status.textContent='2027년 시간표를 확인하고 있습니다.';grid.innerHTML='';return;}
  if(upcoming.error){status.textContent=upcoming.error;grid.innerHTML='<button type="button" id="year2027-retry">다시 확인</button>';$('#year2027-retry').onclick=()=>load2027(true);return;}
  const classes=(upcoming.catalog?.classes||[]).filter(c=>!c.review&&Number(c.remaining)>0),select=$('#year2027-grade'),selected=select.value;
  const grades=[...new Set(classes.map(c=>c.grade))].sort((a,b)=>['초','중','고'].indexOf(a[0])-['초','중','고'].indexOf(b[0])||Number(a.slice(1))-Number(b.slice(1)));
  select.innerHTML='<option value="">전체 학년</option>'+grades.map(g=>'<option>'+esc(g)+'</option>').join('');select.value=selected;
  const day=$('#year2027-day').value,days=['월','화','수','목','금','토','일'];
  const filtered=classes.filter(c=>(!selected||c.grade===selected)&&(!day||c.day===day)).sort((a,b)=>days.indexOf(a.day)-days.indexOf(b.day)||a.start.localeCompare(b.start)||a.grade.localeCompare(b.grade));
  status.textContent='신청 가능한 2027년 수업 '+filtered.length+'개'+(upcoming.catalog?.updatedAt?' · 확인 '+new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(upcoming.catalog.updatedAt)):'');
  grid.innerHTML=filtered.map(c=>'<article class="upcoming-card"><span class="grade-label">2027년 '+esc(c.grade)+'</span><h3>'+esc(c.day)+'요일 '+esc(c.start)+'–'+esc(c.end)+'</h3><p>'+esc(c.title)+' · '+esc(c.room)+' · 정원 '+(Number(c.capacity)||classCapacity(c))+'명</p><button class="card-button" data-request="year2027" data-id="'+esc(c.id)+'">27년 수업 및 특강 신청 ↗</button></article>').join('')||'<p class="empty">조건에 맞는 수업이 없습니다. 다른 학년·요일을 선택해 주세요.</p>';
}
$('#year2027-grade').onchange=render2027;$('#year2027-day').onchange=render2027;
if(location.hash==='#year2027'||new URLSearchParams(location.search).get('year')==='2027')selectTab('year2027');
