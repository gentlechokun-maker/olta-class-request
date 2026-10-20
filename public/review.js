import {readPublicData} from './public-data.js?v=20261020-anonymous';
import {REVIEW_VERSION,validateReview} from './review-domain.js';
const $=s=>document.querySelector(s),form=$('#review-form'),config=window.OLTA_CONFIG||{};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const params=new URLSearchParams(location.search);let link=null,catalog=null;
try{link=JSON.parse(decodeURIComponent(location.hash.slice(1)));if(link?.registrationId&&link?.registrationToken)history.replaceState(null,'',location.pathname+'?eventId='+encodeURIComponent(link.eventId||''));else link=null;}catch{}
function readCatalog(){return readPublicData(config.apiUrl,{action:'reviews'},{service:'후기 서버',timeoutMs:45000});}
async function load(){document.getElementById('linked-event')?.remove();$('#review-event').disabled=false;form.hidden=true;$('#retry').hidden=true;$('#connection').textContent='설명회 정보를 확인하고 있습니다.';try{
 if(!config.apiUrl)catalog={mode:'demo',reviewEnabled:true,events:[{id:'sample',title:'학부모 설명회 · 미리보기',date:'2026-10-15',start:'10:00',open:true}],retentionDays:90,privacyContact:'010-5725-6442'};
 else{if(!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(config.apiUrl))throw Error('운영 서버 주소를 확인해 주세요.');catalog=await readCatalog();if(!catalog.reviewEnabled)throw Error('후기 기능을 준비 중입니다. 잠시 후 다시 접속해 주세요.');}
 const events=catalog.events.filter(e=>e.open),selected=link?.eventId||params.get('eventId');$('#review-event').innerHTML='<option value="">'+(events.length?'설명회를 선택해 주세요':'후기 작성 가능한 설명회가 없습니다')+'</option>'+events.map(e=>`<option value="${esc(e.id)}">${esc(e.title+' · '+e.date)}</option>`).join('');if(events.some(e=>e.id===selected))$('#review-event').value=selected;
 form.elements.requestId.value=crypto.randomUUID();form.elements.privacyVersion.value=REVIEW_VERSION;
 if(link){form.elements.registrationId.value=link.registrationId;form.elements.registrationToken.value=link.registrationToken;$('#identity-fields').hidden=true;$('#identity-fields').disabled=true;$('#linked-note').hidden=false;$('#review-event').disabled=true;const hidden=document.createElement('input');hidden.type='hidden';hidden.id='linked-event';hidden.name='eventId';hidden.value=link.eventId;form.append(hidden);}
 $('#connection').textContent=catalog.mode==='demo'?'미리보기 · 입력 내용은 실제로 저장되지 않습니다.':events.length?'설명회 후기 접수 연결됨':'설명회가 시작된 뒤 후기를 작성하실 수 있습니다.';
 $('#privacy').textContent=`처리 주체: 올타과학 / 수집: 설명회 신청 정보와 연결되는 후기 답변·만족도 / 목적: 설명회 개선 및 학부모 의견 확인 / 보관: 접수일과 설명회 날짜 중 늦은 날부터 ${Number(catalog.retentionDays)||90}일 / 문의·삭제 요청: ${catalog.privacyContact||'010-5725-6442'}. 동의를 거부할 수 있으며, 거부 시 후기 접수는 제한됩니다.`;
 form.hidden=false;$('#submit').disabled=!events.length||Boolean(link&&!events.some(e=>e.id===link.eventId));
 }catch(e){$('#connection').textContent=e.message;$('#retry').hidden=false;}}
function selectScore(){const score=Number($('#vas-score').value).toFixed(1);form.elements.satisfaction.value=score;$('#vas-value').textContent=score+' / 10';$('#vas-score').setAttribute('aria-valuetext',score+'점 / 10점');$('#vas-score').style.setProperty('--vas-fill',Number(score)*10+'%');$('#vas-score').classList.add('selected');}
$('#vas-score').addEventListener('input',selectScore);$('#vas-score').addEventListener('pointerup',selectScore);$('#vas-score').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectScore();}});
form.addEventListener('submit',e=>{e.preventDefault();$('#form-status').textContent='';try{validateReview(Object.fromEntries(new FormData(form)));if(catalog.mode==='demo'){$('#form-status').textContent='미리보기 확인 완료. 후기는 실제로 전송·저장되지 않았습니다.';return;}form.action=config.apiUrl;HTMLFormElement.prototype.submit.call(form);$('#form-status').textContent='새 창에서 후기 접수 결과를 확인해 주세요.';}catch(err){$('#form-status').textContent=err.message;if(!form.elements.satisfaction.value)$('#vas-score').focus();}});
$('#retry').onclick=load;load();
