import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {REVIEW_VERSION,validateReview} from '../public/review-domain.js';
const registration={id:'registration-0000001',eventId:'event1',token:'a'.repeat(48),parent:'테스트보호자',phone:'01012345678',student:'테스트학생',grade:'초4',school:'예시학교',status:'예약'};
const input={requestId:'review-request-00001',eventId:'event1',parent:registration.parent,phone:registration.phone,consent:'yes',privacyVersion:REVIEW_VERSION,satisfaction:'7.5',answer1:'새롭게 알게 된 이야기'};
function runtime(){
  const tables={'설명회':[{id:'event1',title:'예시 설명회',date:'2026-10-15',start:'14:00',enabled:'FALSE'}],'설명회신청':[{...registration}],'설명회후기':[]};
  const context=vm.createContext({Date:class extends Date{static now(){return new Date('2026-10-16T12:00:00+09:00').getTime();}},SpreadsheetApp:{flush(){}},TABLES_:{},props_:()=>({getProperty:k=>({SITE_URL:'https://gentlechokun-maker.github.io/olta-class-request/',RETENTION_DAYS:'90',PRIVACY_CONTACT:'학원 문의'}[k]||'')}),now_:()=> '2026-10-16T03:00:00.000Z'});
  for(const file of ['public/booking-domain.js','public/review-domain.js','apps-script/Reviews.gs'])vm.runInContext(fs.readFileSync(file,'utf8').replace(/^export /gm,''),context);
  context.bookingRead_=context.read_=n=>tables[n]||[];context.reviewRead_=()=>tables['설명회후기'];context.ensureReviews_=()=>{};context.append_=(n,row)=>tables[n].push(row);context.write_=(n,rows)=>tables[n]=rows;context.db_=()=>({getSheetByName:()=>true});
  return {context,tables};
}
test('VAS requires an explicit selection; zero, ten, and fractional scores are preserved',()=>{
  for(const score of ['0','10','0.1','7.5','10.0'])assert.equal(validateReview({...input,satisfaction:score}).satisfaction,Number(score));
  for(const score of ['',null,' ',undefined,'-1','10.1','7.55','NaN','Infinity'])assert.throws(()=>validateReview({...input,satisfaction:score}),/VAS/);
});
test('free answers are optional and bounded; identity and consent remain required',()=>{
  assert.equal(validateReview(input).answer4,'');assert.throws(()=>validateReview({...input,answer1:'a'.repeat(2001)}),/2,000/);
  for(const change of [{parent:''},{phone:'123'},{consent:''},{website:'bot'},{privacyVersion:'old'}])assert.throws(()=>validateReview({...input,...change}));
});
test('a receipt link verifies its secret without requiring the parent to enter identity again',()=>{
  const {context,tables}=runtime();const result=context.submitReview_({...input,parent:'',phone:'',registrationId:registration.id,registrationToken:registration.token});assert.equal(result.ok,true);assert.equal(tables['설명회후기'][0].parent,registration.parent);assert.equal(tables['설명회후기'][0].satisfaction,7.5);
  assert.throws(()=>context.submitReview_({...input,registrationId:registration.id,registrationToken:'b'.repeat(48)}),/일치하지/);
});
test('manual identity is linked to a single uncancelled registration',()=>{
  const {context,tables}=runtime();assert.throws(()=>context.submitReview_({...input,parent:'다른이름'}),/일치하지/);assert.equal(tables['설명회후기'].length,0);
  tables['설명회신청'][0].status='취소';assert.throws(()=>context.submitReview_(input),/일치하지/);tables['설명회신청'][0].status='예약';assert.equal(context.submitReview_(input).ok,true);
});
test('a past hidden seminar accepts feedback; a future seminar cannot accept feedback',()=>{
  const {context,tables}=runtime();tables['설명회'][0].date='2026-10-17';assert.throws(()=>context.submitReview_(input),/시작된 뒤/);tables['설명회'][0].date='2026-10-15';assert.equal(context.submitReview_(input).ok,true);
});
test('repeat POST is idempotent and each registration can leave only one review',()=>{
  const {context,tables}=runtime();assert.equal(context.submitReview_(input).ok,true);assert.equal(context.submitReview_(input).duplicate,true);assert.equal(tables['설명회후기'].length,1);
  assert.throws(()=>context.submitReview_({...input,answer1:'변경된 답변'}),/접수번호/);assert.throws(()=>context.submitReview_({...input,requestId:'another-request-0001'}),/이미/);
});
test('public review metadata never includes registration secrets or review answers',()=>{
  const {context}=runtime();context.submitReview_(input);const result=context.publicReviewCatalog_();assert.equal(result.reviewEnabled,true);assert.equal(result.events[0].open,true);
  const json=JSON.stringify(result);for(const secret of [registration.parent,registration.phone,registration.student,registration.token,input.answer1,'registrationId','answer1'])assert.equal(json.includes(secret),false);
});
test('review links keep applicant secrets in the fragment, not the query string',()=>{
  const {context}=runtime();const link=context.reviewLink_(registration);const url=new URL(link);assert.equal(url.search,'');assert.equal(url.pathname,'/olta-class-request/review.html');const payload=JSON.parse(decodeURIComponent(url.hash.slice(1)));assert.equal(payload.registrationToken,registration.token);assert.equal(payload.eventId,registration.eventId);
});
test('retention cleanup removes old review records without removing recent responses',()=>{
  const {context,tables}=runtime();tables['설명회후기']=[{createdAt:'2026-01-01',eventDate:'2026-01-02'},{createdAt:'2026-10-16',eventDate:'2026-10-15'}];context.cleanupReviews_(Date.parse('2026-07-01'));assert.equal(tables['설명회후기'].length,1);assert.equal(tables['설명회후기'][0].createdAt,'2026-10-16');
});
test('review administration script parses and keeps answers escaped',()=>{
  const html=fs.readFileSync('apps-script/BookingAdmin.html','utf8');for(const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g))assert.doesNotThrow(()=>new vm.Script(match[1]));assert.ok(html.includes("esc(r['answer'+n]||'(미작성)')"));
});
