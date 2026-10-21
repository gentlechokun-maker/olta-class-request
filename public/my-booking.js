import {submitInline} from './submission.js?v=20261021-portal';
import {weekLabel} from './booking-domain.js?v=20261020-seminars';
const $=s=>document.querySelector(s),form=$('#lookup-form'),cancelForm=$('#cancel-booking-form'),api=window.OLTA_CONFIG?.apiUrl;
let busy=false,verified=null;
const hints={접수:'보강 요청이 접수되었습니다. 관리자 확인 후 확정됩니다.',확정:'보강 예약이 확정되었습니다. 아래 날짜와 시간을 확인해 주세요.',완료:'보강 수업이 완료되었습니다.',패스:'결석과 보강 패스가 기록되어 있습니다.',취소:'취소된 예약입니다. 보강 자리는 확보되지 않습니다.'};
function clearResult(){verified=null;$('#booking-result').hidden=true;$('#cancel-status').textContent='';cancelForm.reset();}
function setBusy(value){busy=value;for(const el of [...form.elements,...cancelForm.elements,$('#refresh-booking')])el.disabled=value;}
function showBooking(booking){
 $('#booking-status').textContent=booking.status;$('#status-guide').textContent=hints[booking.status]||'학원에 예약 상태를 문의해 주세요.';
 const rows=[['학생',booking.student+' · '+booking.grade],['재원 수업',booking.regularClass],['결석 날짜',booking.absenceDate],['보강 대상 주차',weekLabel(booking.absenceWeek)],['보강 일정',booking.choice==='pass'?'보강 패스':[booking.date,booking.start+'–'+booking.end].join(' ')],['보강 진행 주차',booking.choice==='pass'?'—':weekLabel(booking.weekId)],['보강 방식',booking.choice==='pass'?'패스':booking.choice==='same'?'같은 주차 · 동일 학년 빈자리 수업':'다른 주차 · 수업 전이나 후 30분 이론']];
 if(booking.makeupClass)rows.push(['보강 수업',booking.makeupClass]);if(booking.room)rows.push(['교실',booking.room]);
 const list=$('#booking-details');list.replaceChildren();for(const [key,value] of rows){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=key;dd.textContent=value||'—';list.append(dt,dd);}
 cancelForm.hidden=!booking.canCancel;cancelForm.reset();$('#booking-result').hidden=false;$('#booking-result').focus();
}
async function lookup(){
 if(busy||!form.reportValidity())return;clearResult();$('#lookup-status').textContent='';
 if(!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(api||'')){$('#lookup-status').textContent='예약 조회 서버 주소를 확인해 주세요.';return;}
 const credentials={id:form.elements.id.value.trim(),token:form.elements.token.value.trim()};
 setBusy(true);try{
  // Disabled controls are excluded from a POST. Use a separate request form.
  const result=await post('makeup_lookup',credentials,'예약 상태를 조회하고 있습니다.');if(!result.booking||result.booking.id!==credentials.id)throw Error('조회 결과를 확인할 수 없습니다. 다시 시도해 주세요.');
  verified=credentials;showBooking(result.booking);$('#lookup-status').textContent='현재 예약 상태를 확인했습니다.';
 }catch(e){$('#lookup-status').textContent=e.message;}finally{setBusy(false);}
}
async function post(kind,credentials,message){
 const request=document.createElement('form');request.method='post';request.hidden=true;
 for(const [name,value] of Object.entries({kind,...credentials})){const input=document.createElement('input');input.type='hidden';input.name=name;input.value=value;request.append(input);}document.body.append(request);
 try{return await submitInline(request,api,{pendingMessage:message,timeoutMessage:'예약 서버의 응답을 확인하지 못했습니다. 조회 버튼으로 현재 상태를 다시 확인해 주세요.',frameTitle:'보강 예약 조회 결과',onStatus:text=>$(kind==='makeup_lookup'?'#lookup-status':'#cancel-status').textContent=text});}finally{request.remove();}
}
form.addEventListener('submit',e=>{e.preventDefault();lookup();});form.addEventListener('input',()=>{if(!busy)clearResult();});$('#refresh-booking').addEventListener('click',lookup);
cancelForm.addEventListener('submit',async e=>{
 e.preventDefault();if(busy||!verified||!cancelForm.reportValidity())return;const credentials={...verified,confirmCancel:'yes'};$('#cancel-status').textContent='';setBusy(true);
 try{const result=await post('makeup_cancel',credentials,'예약을 취소하고 있습니다.');if(!result.booking||result.booking.status!=='취소')throw Error('취소 결과를 확인할 수 없습니다. 현재 상태를 다시 조회해 주세요.');showBooking(result.booking);$('#cancel-status').textContent=result.message||'예약이 취소되었습니다.';}catch(e){$('#cancel-status').textContent=e.message;}finally{setBusy(false);}
});
// Secret links use a fragment, never a query string, referrer, or browser storage.
let receipt;try{receipt=JSON.parse(decodeURIComponent(location.hash.slice(1)));}catch{}
if(location.hash)history.replaceState(null,'',location.pathname);
if(receipt?.kind==='absence'&&/^[a-zA-Z0-9-]{16,64}$/.test(receipt.id||'')&&/^[a-f0-9]{32,64}$/i.test(receipt.token||'')){form.elements.id.value=receipt.id;form.elements.token.value=receipt.token;lookup();}
