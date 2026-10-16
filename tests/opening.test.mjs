import test from 'node:test';
import assert from 'node:assert/strict';
import {openingSlotAvailable,validateRequest} from '../public/domain.js';
const slot={id:'free',day:'월',start:'15:00',end:'16:00',room:'2교실',grades:['초3']};
const cls=(teacher,extra={})=>({...slot,room:'1교실',teacher,...extra});
test('new classes require either Shin or Hong and an empty room',()=>{
 assert.equal(openingSlotAvailable(slot,[cls('신T')]),true);
 assert.equal(openingSlotAvailable(slot,[cls('신T'),cls('홍T')]),false);
 assert.equal(openingSlotAvailable(slot,[cls('신T·홍T')]),false);
 assert.equal(openingSlotAvailable(slot,[cls('조T',{room:'2교실'})]),false);
 assert.equal(openingSlotAvailable(slot,[cls('조T',{room:'2교실(실험) → 3교실(이론)'})]),false);
 assert.equal(openingSlotAvailable(slot,[cls('신T',{end:'15:00',start:'14:00'})]),true);
});
test('Wednesday Shin and Friday Hong are unavailable',()=>{
 assert.equal(openingSlotAvailable({...slot,day:'수'},[cls('홍T',{day:'수'})]),false);
 assert.equal(openingSlotAvailable({...slot,day:'수'},[]),true);
 assert.equal(openingSlotAvailable({...slot,day:'금'},[cls('신T',{day:'금'})]),false);
 assert.equal(openingSlotAvailable({...slot,day:'금'},[]),true);
});
test('unknown resources and closing time fail closed',()=>{
 assert.equal(openingSlotAvailable(slot,[cls('확인 필요')]),false);
 assert.equal(openingSlotAvailable(slot,[cls('')]),false);
 assert.equal(openingSlotAvailable({...slot,end:'22:30'},[]),false);
 assert.equal(openingSlotAvailable({...slot,start:'21:00',end:'22:00'},[]),true);
});
test('existing class enrollment needs no visit date and full classes are rejected',()=>{
 const input={kind:'existing',targetId:'c1',grade:'초3',student:'예시학생',phone:'01012345678',consent:'yes',privacyVersion:'2026-10-13',requestId:'enrollment-test-0001'};
 assert.equal(validateRequest(input,{classes:[{id:'c1',grade:'초3',remaining:1}],slots:[]}).kind,'existing');
 assert.throws(()=>validateRequest(input,{classes:[{id:'c1',grade:'초3',remaining:0}],slots:[]}));
});
