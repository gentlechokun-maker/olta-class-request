// POST through a hidden frame; only a nonce-matched server receipt confirms success.
export function submitInline(form,url,{timeoutMs=90000,onStatus=()=>{},pendingMessage='접수 중입니다. 잠시만 기다려 주세요.',timeoutMessage='접수 결과를 확인하지 못했습니다. 같은 내용으로 다시 눌러 확인하거나 학원으로 문의해 주세요. 동일 요청은 중복 등록되지 않습니다.',frameTitle='상담 접수 결과'}={}){
 return new Promise((resolve,reject)=>{
  const nonce=crypto.randomUUID().replaceAll('-',''),frame=document.createElement('iframe');frame.name='olta_receipt_'+nonce;frame.hidden=true;frame.title=frameTitle;
  const previousTarget=form.target,fields=[];let timer,settled=false;
  const cleanup=()=>{clearTimeout(timer);window.removeEventListener('message',receive);fields.forEach(f=>f.remove());frame.remove();form.target=previousTarget;};
  const finish=(error,result)=>{if(settled)return;settled=true;cleanup();error?reject(error):resolve(result);};
  const receive=event=>{if(!/^https:\/\/(?:script\.google\.com|(?:[a-z0-9-]+\.)?googleusercontent\.com)$/.test(event.origin))return;const r=event.data;if(!r||r.type!=='olta-request-receipt'||r.nonce!==nonce||typeof r.result?.ok!=='boolean')return;if(r.result.ok&&(!r.result.id||typeof r.result.id!=='string'))return;finish(r.result.ok?null:Error(r.result.message||'신청을 완료하지 못했습니다.'),r.result);};
  try{
   for(const [name,value] of Object.entries({_responseMode:'inline',_responseNonce:nonce,_responseOrigin:location.origin})){const f=document.createElement('input');f.type='hidden';f.name=name;f.value=value;form.append(f);fields.push(f);}
   window.addEventListener('message',receive);document.body.append(frame);form.target=frame.name;form.action=url;
   timer=setTimeout(()=>finish(Error(timeoutMessage)),timeoutMs);
   onStatus(pendingMessage);HTMLFormElement.prototype.submit.call(form);
  }catch(error){finish(error);}
 });
}
