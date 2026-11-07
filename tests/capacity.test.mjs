import test from 'node:test';
import assert from 'node:assert/strict';
import {classCapacity,makeupCapacity,capacity} from '../public/domain.js';
test('named experiment courses cap at six and every other course caps at twelve',()=>{
 for(const grade of ['중1','중2','중3','고1','고2','고3']){assert.equal(classCapacity({grade}),12);assert.deepEqual(capacity({registered:9,starting:2},classCapacity({grade})),{used:11,remaining:1,over:false});assert.deepEqual(capacity({registered:12},classCapacity({grade})),{used:12,remaining:0,over:false});assert.equal(capacity({registered:13},classCapacity({grade})).over,true);}
 for(const title of ['빅뱅E','빅뱅O','아톰 1','아톰 2','퀀텀 1','퀀텀 2 · 실험·이론','초1·초2 올치 실험 특강'])assert.equal(classCapacity({title}),6,title);
 for(const title of ['초6 올치 창의력·경시 특강','일반 선택 고등 물리','니들','스레드'])assert.equal(classCapacity({title}),12,title);
 assert.equal(makeupCapacity('theory','초6'),12);assert.equal(makeupCapacity('theory','중1'),12);assert.equal(makeupCapacity('experiment','중1'),6);
});
