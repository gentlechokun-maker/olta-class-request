import test from 'node:test';
import assert from 'node:assert/strict';
import {classCurriculum,classCapacity} from '../public/domain.js';
test('confirmed special classes use two hours while ordinary Thread stays three',()=>{
 for(const c of [{grade:'중3',title:'중3 내신대비반',day:'월'},{grade:'중2',title:'물리대회 대비반 물리학',day:'일'}]){assert.equal(classCurriculum(c).minutes,120);assert.equal(classCurriculum(c).name,c.title);assert.equal(classCapacity(c),12);}
 assert.equal(classCurriculum({grade:'중2',title:'스레드',day:'일'}).minutes,180);
});
