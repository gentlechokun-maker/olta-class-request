import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {readPublicData} from '../public/public-data.js';
const api='https://script.google.com/macros/s/public-example/exec';

test('public data omits Google cookies, follows CORS redirects and sends only a public GET',async()=>{
 let actual;const expected={bookingEnabled:true,classes:[],seminars:[]};
 const value=await readPublicData(api,{action:'bookings',scope:'seminar'},{fetchImpl:async(url,options)=>{actual={url,options};return {ok:true,json:async()=>expected};}});
 assert.equal(value,expected);assert.equal(actual.url,api+'?action=bookings&scope=seminar');
 assert.equal(actual.options.credentials,'omit');assert.equal(actual.options.mode,'cors');assert.equal(actual.options.method,'GET');assert.equal(actual.options.redirect,'follow');assert.equal(actual.options.cache,'no-store');assert.equal(actual.options.referrerPolicy,'no-referrer');assert.equal(actual.options.body,undefined);
});

test('public reader rejects private/admin queries and untrusted destinations without sending requests',async()=>{
 let requests=0;const options={fetchImpl:async()=>{requests++;}};
 for(const query of [{action:'admin'},{action:'bookings',token:'private'},{action:'bookings',phone:'private'}])await assert.rejects(readPublicData(api,query,options),/공개 조회/);
 await assert.rejects(readPublicData('https://example.test/exec',{action:'catalog'},options),/운영 서버/);assert.equal(requests,0);
});

test('HTTP errors, HTML login pages and malformed payloads never become connected data',async()=>{
 await assert.rejects(readPublicData(api,{action:'catalog'},{fetchImpl:async()=>({ok:false,status:403})}),/403/);
 await assert.rejects(readPublicData(api,{action:'catalog'},{fetchImpl:async()=>({ok:true,json:async()=>{throw new SyntaxError('HTML login page');}})}),/다른 응답/);
 for(const value of [null,[],true,'html'])await assert.rejects(readPublicData(api,{action:'catalog'},{fetchImpl:async()=>({ok:true,json:async()=>value})}),/형식/);
 await assert.rejects(readPublicData(api,{action:'catalog'},{fetchImpl:async()=>({ok:true,json:async()=>({error:'시간표 확인 필요'})})}),/시간표 확인 필요/);
});

test('network errors and aborted requests report a failure without executing returned scripts',async()=>{
 await assert.rejects(readPublicData(api,{action:'catalog'},{service:'시간표 서버',fetchImpl:async()=>{throw new TypeError('network');}}),/시간표 서버에 연결/);
 await assert.rejects(readPublicData(api,{action:'bookings'},{timeoutMs:5,fetchImpl:async(url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('abort'))))}),/응답이 늦습니다/);
});

test('short seminar routes lead directly to their matching session without changing registration semantics',()=>{
 const ids={'1112':'5cecc303-59cf-4fe5-9cfb-d70e04c09012','1119':'cf01a4cd-59fc-4f85-8b3f-93ba5889d929'};
 for(const [day,id] of Object.entries(ids)){
  const html=fs.readFileSync('public/olta-seminar/'+day+'/index.html','utf8'),target=html.match(/location\.replace\('([^']+)'\)/)[1];
  const url=new URL(target,'https://gentlechokun-maker.github.io/olta-class-request/olta-seminar/'+day+'/');
  assert.equal(url.pathname,'/olta-class-request/booking.html');assert.equal(url.searchParams.get('kind'),'seminar');assert.equal(url.searchParams.get('eventId'),id);assert.match(html,/http-equiv="refresh"/);
 }
});
