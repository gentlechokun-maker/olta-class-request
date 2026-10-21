// Pure formatting only. A file is saved only when the parent clicks its link.
export function receiptFileData({id,token,kind='absence',message='',portalUrl=''}){
 id=String(id||'');token=String(token||'');portalUrl=String(portalUrl||'');
 if(kind!=='absence'||!/^[a-zA-Z0-9-]{16,64}$/.test(id)||!/^[a-f0-9]{32,64}$/i.test(token))throw Error('보강 접수정보를 확인해 주세요.');
 if(!/^https:\/\/[a-zA-Z0-9.-]+(?:\/[^\s<>"'?#]*)?\/my-booking\.html#/.test(portalUrl))throw Error('보강 조회 주소를 확인해 주세요.');
 let link;try{link=JSON.parse(decodeURIComponent(portalUrl.slice(portalUrl.indexOf('#')+1)));}catch{}
 if(!link||link.id!==id||link.token!==token||link.kind!=='absence')throw Error('조회 주소와 접수정보가 일치하지 않습니다.');
 const text='\uFEFF'+['올타과학 · 결석·보강 예약 접수정보','','접수번호: '+id,'확인 코드: '+token,'','신청 안내:',String(message).replace(/\r?\n/g,'\r\n'),'','예약 상태 조회·취소:',portalUrl,'','저장 후 상태가 달라질 수 있습니다. 현재 확정·취소 상태는 위 조회 주소에서 확인해 주세요.','이 파일에는 본인 확인 정보가 들어 있습니다. 다른 사람에게 공유하지 마세요.',''].join('\r\n');
 return {text,filename:'olta-makeup-receipt-'+id.slice(0,8)+'.txt',href:'data:text/plain;charset=utf-8,'+encodeURIComponent(text)};
}
