// Public GET requests must not carry the browser's Google login cookies.
// Administrator pages and all booking writes keep their existing authorization.
export async function readPublicData(apiUrl,query,{service='서버',timeoutMs=20000,fetchImpl=fetch}={}){
 if(!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(apiUrl))throw Error('운영 서버 주소를 확인해 주세요.');
 if(!['catalog','bookings','reviews','year2027'].includes(query.action)||Object.keys(query).some(k=>!['action','scope'].includes(k)))throw Error('공개 조회 종류를 확인해 주세요.');
 const url=new URL(apiUrl);for(const [key,value] of Object.entries(query))url.searchParams.set(key,value);
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  let response;
  try{response=await fetchImpl(url.href,{method:'GET',mode:'cors',credentials:'omit',redirect:'follow',cache:'no-store',referrerPolicy:'no-referrer',headers:{Accept:'application/json'},signal:controller.signal});}
  catch(error){throw Error(controller.signal.aborted?service+' 응답이 늦습니다. 다시 연결해 주세요.':service+'에 연결할 수 없습니다. 시크릿 창에서도 같은지 확인해 주세요.');}
  if(!response.ok)throw Error(service+' 응답 오류 ('+response.status+'). 다시 연결해 주세요.');
  let data;try{data=await response.json();}catch(error){throw Error(controller.signal.aborted?service+' 응답이 늦습니다. 다시 연결해 주세요.':'일정 데이터 대신 다른 응답이 도착했습니다. 시크릿 창에서 다시 확인해 주세요.');}
  if(!data||typeof data!=='object'||Array.isArray(data))throw Error('서버 데이터 형식을 확인해 주세요.');
  if(data.error)throw Error(String(data.error));
  return data;
 }finally{clearTimeout(timer);}
}
