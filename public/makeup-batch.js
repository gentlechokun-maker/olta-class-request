import {bookingIdentity,validateAbsence,validateFutureAbsence,weekLabel} from './booking-domain.js?v=20261027-makeup2';

export function makeupBatchItems(value){
 let items;try{items=typeof value==='string'?JSON.parse(value):value;}catch{throw Error('결석 날짜 목록을 확인해 주세요.');}
 if(!Array.isArray(items)||!items.length||items.length>24)throw Error('결석할 수업을 1~24회 선택해 주세요.');
 const dates=new Set();return items.map(item=>{
  if(!item||typeof item!=='object'||Array.isArray(item)||!/^\d{4}-\d{2}-\d{2}$/.test(item.absenceDate||'')||dates.has(item.absenceDate))throw Error('결석 날짜가 중복되거나 올바르지 않습니다.');
  dates.add(item.absenceDate);return Object.fromEntries(['absenceDate','choice','date','makeupClassId','position'].map(k=>[k,String(item[k]||'')]));
 }).sort((a,b)=>a.absenceDate.localeCompare(b.absenceDate));
}
export function makeupBatchSignature(input,items){
 const identity=bookingIdentity(input,false);
 return JSON.stringify([identity.parent,identity.phone,identity.student,identity.grade,identity.note,String(input.targetId||''),makeupBatchItems(items)]);
}
export function checkStudentMakeupConflict(candidate,rows){
 if(!candidate.date||['pass','wait'].includes(candidate.choice))return;
 if(rows.some(r=>(!candidate.id||r.id!==candidate.id)&&r.status!=='취소'&&r.student===candidate.student&&r.phone===candidate.phone&&r.date===candidate.date&&r.start<candidate.end&&candidate.start<r.end))throw Error('학생의 다른 보강 예약과 시간이 겹칩니다. 다른 시간을 선택해 주세요.');
}
export function validateMakeupBatch(input,catalog,now=Date.now()){
 const items=makeupBatchItems(input.items),identity=bookingIdentity(input,false),cls=catalog.classes.find(c=>c.id===input.targetId),checked=[];
 for(const item of items){
  try{const request={...identity,...input,...item,absenceWeek:'',weekId:''};validateFutureAbsence(request,cls,now);const row=validateAbsence(request,catalog,now);checkStudentMakeupConflict(row,checked);checked.push(row);}
  catch(error){throw Error(item.absenceDate+' 결석: '+error.message);}
 }
 return checked;
}
export function makeupItemSummary(r){
 return r.absenceDate+' · '+weekLabel(r.absenceWeek)+' → '+(r.choice==='pass'?'보강 패스':r.choice==='wait'?'보강 미예약':r.choice==='recording'?'녹화본 발송 요청':r.date+' '+r.start+'–'+r.end)+' ['+r.status+']';
}
