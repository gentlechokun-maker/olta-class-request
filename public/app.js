import {GRADES,COURSE_GRADES,courseGrade,gradeLabel,studentGrades,curriculum,classCapacity,normalizePhone,makeupWindow,validateMakeup} from './domain.js?v=20261015-capacity12';
import {demoCatalog} from './demo.js';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const classTitle=c=>String(c.title||'').replaceAll('시작반','신규반');
const config=window.OLTA_CONFIG||{};
const state={tab:'existing',grade:'',day:'',catalog:null,loading:true};
const validUrl=url=>/^https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9_-]+\/exec$/.test(url);
function connection(text,type=''){const el=$('#connection');el.className='connection '+type;el.textContent=text;}
function jsonp(url){return new Promise((resolve,reject)=>{const callback='olta_'+crypto.randomUUID().replaceAll('-','');const script=document.createElement('script');const cleanup=()=>{clearTimeout(timer);delete window[callback];script.remove();};const timer=setTimeout(()=>{cleanup();reject(new Error('시간표 서버 응답이 늦습니다. 잠시 후 다시 시도해 주세요.'));},20000);window[callback]=data=>{cleanup();data.error?reject(new Error(data.error)):resolve(data);};script.onerror=()=>{cleanup();reject(new Error('시간표 서버에 연결할 수 없습니다.'));};script.src=url+'?action=catalog&callback='+callback;document.head.append(script);});}
async function load(){state.loading=true;connection('시간표를 확인하고 있습니다.');try{
  if(!config.apiUrl){state.catalog=demoCatalog();connection('미리보기 · 아래 수업·인원은 예시입니다. 실제 상담 신청은 아직 받지 않습니다.');}
  else{if(!validUrl(config.apiUrl))throw new Error('운영 서버 주소 설정을 확인해 주세요.');state.catalog=await jsonp(config.apiUrl);if(!Array.isArray(state.catalog.classes)||!Array.isArray(state.catalog.slots))throw new Error('시간표 데이터 형식을 확인해 주세요.');connection('실시간 접수 연결 · 상담 신청 후 시간표 등록을 확인하여 확정합니다.','live');}
  $('#updated').textContent=state.catalog.updatedAt?'시간표 확인 '+new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(state.catalog.updatedAt)):'예시 화면 · 실제 시간표 미연결';
  renderPrivacy();
}catch(error){state.catalog={classes:[],slots:[],demand:{},mode:'error'};connection(error.message+' 신청은 일시 중지됩니다.','error');const retry=document.createElement('button');retry.textContent='다시 확인';retry.onclick=load;$('#connection').append(retry);}finally{state.loading=false;render();}}
function renderPrivacy(){const c=state.catalog;const days=Number(c.retentionDays)||90;const contact=c.privacyContact||'운영자 상담 담당';$('#consent-description').textContent=`수집 항목: 원생 이름·학년, 보호자 연락처, 결석 날짜·수업 내용, 보강 희망 일정·종류, 상담 참고 내용 / 목적: 수강·보강·반 개설 상담 및 연락 / 보관: 접수 후 ${days}일. 문의·삭제 요청: ${contact}`;$('#privacy-body').innerHTML=`<p><strong>처리 주체: 올타과학</strong></p><p>수집 항목: 원생 이름·학년, 보호자 연락처, 결석 날짜·수업 내용, 보강 희망 일정·종류, 상담 참고 내용</p><p>이용 목적: 수강·보강 상담, 희망 반 개설 검토 및 상담 연락</p><p>보관 기간: 접수일로부터 ${days}일. 기간이 지나면 신청 기록을 삭제합니다.</p><p>문의·삭제 요청: ${esc(contact)}</p><p>연락처는 비공개 운영 문서에 저장하며, 공개 GitHub 저장소에는 저장하지 않습니다.</p>`;}
function render(){
  const data=state.catalog||{classes:[],slots:[],demand:{}};
  $('#grade-filters').innerHTML=['',...COURSE_GRADES].map(g=>`<button data-grade="${g}" class="${state.grade===g?'active':''}" aria-pressed="${state.grade===g}">${g?gradeLabel(g):'전체'}</button>`).join('');
  const days=['월','화','수','목','금','토','일'];
  const filtered=data.classes.filter(c=>(!state.grade||courseGrade(c.grade)===state.grade)&&(!state.day||c.day===state.day)).sort((a,b)=>days.indexOf(a.day)-days.indexOf(b.day)||a.start.localeCompare(b.start)||COURSE_GRADES.indexOf(a.grade)-COURSE_GRADES.indexOf(b.grade)||String(a.room).localeCompare(String(b.room),'ko'));
  $('#class-count').textContent=`${state.grade?gradeLabel(state.grade)+' · ':''}${state.day?state.day+'요일 · ':''}${filtered.length}개 수업`;
  $('#class-grid').innerHTML=filtered.length?filtered.map(c=>{
    const badge=c.review?'review':c.remaining===0?'full':'';
    const limit=c.capacity||classCapacity(c);
    const title=classTitle(c);
    const shortStatus=c.review?'확인 중':c.remaining===0?'마감':c.remaining===1?'1자리':'상담 가능';
    return `<details class="compact-class ${badge}"><summary><span class="compact-main"><strong class="compact-time">${esc(c.day)} ${esc(c.start)}</strong><span class="compact-capacity" aria-label="${c.review?'인원 확인 중':'현재 '+esc(c.used)+'명 / 정원 '+limit+'명'}">${c.review?'확인 중':esc(c.used)+'/'+limit+'명'}</span></span><span class="compact-meta"><span class="compact-course">${esc(gradeLabel(c.grade))} · ${esc(title)}</span><span class="compact-status">${shortStatus}</span><span class="compact-chevron" aria-hidden="true">⌄</span></span></summary><div class="compact-detail"><h3>${esc(title)}</h3><p class="schedule">${esc(c.day)}요일 ${esc(c.start)}–${esc(c.end)}</p><p class="lesson-detail">${esc(c.lesson||curriculum(c.grade,c.day,data.semester||2)?.lesson||'수업 시간은 상담 시 안내')}</p><p class="teacher">${esc(c.room)}</p><p class="compact-availability">${c.review?'관리자 확인 후 안내':`정원 ${limit}명 · ${c.remaining}자리 남음`}</p>${c.review?'<button class="card-button" disabled>시간표 확인 중</button>':c.remaining===0?'<button class="card-button" data-tab="new">신규반 개설 요청 <span>↗</span></button>':`<button class="card-button" data-request="existing" data-id="${esc(c.id)}">이 반 상담 신청 <span>↗</span></button>`}</div></details>`;
  }).join(''):`<div class="empty"><strong>${data.mode==='error'?'시간표를 불러오지 못했습니다.':'조건에 맞는 개설 반이 없습니다.'}</strong>${data.mode==='error'?'위의 다시 확인 버튼으로 재시도해 주세요.':'다른 학년·요일을 선택하거나 신규반 개설 요청을 확인해 주세요.'}</div>`;
  $('#makeup-grid').innerHTML=!data.makeupEnabled&&data.mode!=='demo'?'<div class="empty">보강 신청 기능을 준비 중입니다. 상담 연락처로 문의해 주세요.</div>':filtered.map(c=>`<article class="class-card"><span class="grade-label">${esc(c.grade)} · 재원생 보강</span><h3>${esc(classTitle(c))}</h3><p class="schedule">${esc(c.day)}요일 ${esc(c.start)}–${esc(c.end)}</p><p class="teacher">${esc(c.room)}</p><p>초등 30분 / 중·고등 1시간<br>같은 수업 주차는 빈자리 수업 · 다른 주차는 수업 전후</p><button class="card-button" data-request="makeup" data-id="${esc(c.id)}" ${c.review?'disabled':''}>${c.review?'시간표 확인 중':'이 반 원생 보강 신청 ↗'}</button></article>`).join('')||'<div class="empty">조건에 맞는 정규반이 없습니다.</div>';
  const slots=data.slots.filter(s=>(!state.grade||s.grades.map(courseGrade).includes(state.grade))&&(!state.day||s.day===state.day));
  $('#slot-grid').innerHTML=slots.length?slots.map(s=>{const grades=state.grade?[state.grade]:[...new Set(s.grades.map(courseGrade))];return `<article class="class-card"><div class="card-top"><span class="grade-label">개설 검토 가능 시간</span><span class="badge">희망자 모집</span></div><h3>${esc(s.day)}요일 ${esc(s.start)}</h3><p class="schedule">${esc(s.start)}–${esc(s.end)} · ${esc(s.room)}</p><p class="teacher">신청 가능 학년 ${s.grades.map(g=>esc(gradeLabel(g))).join(' · ')}</p><div class="demand">${grades.map(g=>{const n=Number(data.demand[s.id+'|'+g]||0);return `<div>${esc(gradeLabel(g))} · ${esc(curriculum(g,s.day,data.semester||2)?.name||'과학')} <strong>${n}명</strong> ${n>=3?'· 개설 검토 대상':'· 3명까지 '+(3-n)+'명'}</div>`;}).join('')}</div><button class="card-button" data-request="new" data-id="${esc(s.id)}">이 시간에 개설 요청 <span>↗</span></button></article>`;}).join(''):'<div class="empty"><strong>등록된 빈 시간대가 없습니다.</strong>다른 학년·요일을 확인해 주세요. 관리자가 강사·교실 일정을 확인한 시간대만 표시합니다.</div>';
}
function selectTab(tab){state.tab=tab;for(const t of ['existing','new','makeup']){const active=t===tab;$('#tab-'+t).setAttribute('aria-selected',String(active));$('#tab-'+t).tabIndex=active?0:-1;$('#panel-'+t).hidden=!active;}$('#classes').scrollIntoView({behavior:'smooth',block:'start'});}
function openRequest(kind,id){
  if(kind==='existing'||kind==='makeup'){location.href='./booking.html?kind='+(kind==='existing'?'visit':'absence')+'&targetId='+encodeURIComponent(id);return;}
  const catalog=state.catalog,target=(kind==='new'?catalog.slots:catalog.classes).find(c=>c.id===id);if(!target)return;
  const form=$('#request-form');form.reset();form.elements.kind.value=kind;form.elements.targetId.value=id;form.elements.requestId.value=crypto.randomUUID();
  const grades=studentGrades(kind==='new'?target.grades:[target.grade]);form.elements.grade.innerHTML=grades.map(g=>`<option>${esc(g)}</option>`).join('');if(grades.includes(state.grade))form.elements.grade.value=state.grade;
  $('#request-title').textContent=kind==='makeup'?'보강 수업 신청':kind==='existing'?'이 반 상담 신청':'신규반 개설 요청';
  $('#request-summary').textContent=`${kind==='new'?'':classTitle(target)+' · '}${target.day}요일 ${target.start}–${target.end} · ${target.room}`;
  $('#makeup-fields').hidden=kind!=='makeup';$('#makeup-fields').disabled=kind!=='makeup';
  form.elements.absenceDate.max=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date());
  form.elements.date.min=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date());
  $('#demo-form-note').hidden=catalog.mode!=='demo';$('#form-status').textContent='';form.querySelector('[type=submit]').disabled=false;
  form.querySelector('.form-note').textContent=kind==='makeup'?'보호자가 신청해 주세요. 신청만으로 보강이 확정되지 않으며, 결석 수업 내용과 재원 여부, 선생님·교실 일정을 확인한 뒤 연락드립니다.':'보호자가 신청해 주세요. 신청 후 상담을 거쳐 등록하며, 신청 시 자리가 확보되지는 않습니다.';
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
document.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;if(button.dataset.tab)selectTab(button.dataset.tab);if(button.hasAttribute('data-grade')){state.grade=button.dataset.grade;render();}if(button.dataset.request)openRequest(button.dataset.request,button.dataset.id);if(button.hasAttribute('data-close'))button.closest('dialog').close();});
$('.tabs').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const tabs=['existing','new','makeup'];const tab=e.key==='Home'?tabs[0]:e.key==='End'?tabs[2]:tabs[(tabs.indexOf(state.tab)+(e.key==='ArrowRight'?1:2))%3];selectTab(tab);$('#tab-'+tab).focus();});
$('#day-filter').addEventListener('change',e=>{state.day=e.target.value;render();});
$('#privacy-button').onclick=()=>$('#privacy-dialog').showModal();
$('#request-form').addEventListener('submit',event=>{event.preventDefault();const form=event.currentTarget;if(form.elements.kind.value==='makeup'){try{validateMakeup(Object.fromEntries(new FormData(form)),state.catalog);}catch(e){$('#form-status').textContent=e.message;return;}}if(state.catalog.mode==='demo'){$('#form-status').textContent='예시 흐름 확인 완료. 실제 신청은 접수되지 않았고 입력 내용은 저장하지 않았습니다.';form.reset();return;}if(!validUrl(config.apiUrl))return;const phone=normalizePhone(form.elements.phone.value);if(!/^01[016789]\d{7,8}$/.test(phone)){$('#form-status').textContent='올바른 휴대전화 번호를 입력해 주세요.';return;}form.action=config.apiUrl;form.rel='noopener';form.submit();$('#form-status').textContent='새 창에서 접수 성공 또는 오류 결과를 확인해 주세요. 결과 확인 전에는 접수가 완료된 것으로 간주하지 않습니다.';});
load();
