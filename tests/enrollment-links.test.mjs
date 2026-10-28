import test from 'node:test';
import assert from 'node:assert/strict';
import {enrollmentRoute,enrollmentPath,enrollmentLinks,YEAR2027_GRADES,yearGradeLabel} from '../public/enrollment-links.js';
test('22 distinct links open the intended tab and grade without whole-list links',()=>{
 const links=enrollmentLinks();assert.equal(links.length,22);assert.equal(new Set(links.map(x=>x.path)).size,22);
 assert.equal(links.filter(x=>x.tab==='existing').length,10);assert.equal(links.filter(x=>x.tab==='year2027').length,11);
 for(const link of links){const url=new URL(link.path,'https://example.com/');assert.deepEqual(enrollmentRoute(url.search,url.hash),{tab:link.tab,grade:link.grade});}
});
test('year grade labels and invalid grade links are explicit and bounded',()=>{
 for(const grade of YEAR2027_GRADES)assert.equal(yearGradeLabel(grade),grade+' (27년 기준)');
 assert.deepEqual(enrollmentRoute('?grade=h2','#classes'),{tab:'existing',grade:''});
 assert.deepEqual(enrollmentRoute('?grade=e3','#winter'),{tab:'winter',grade:''});
 assert.equal(enrollmentPath('year2027','<script>'),'#year2027');
});
