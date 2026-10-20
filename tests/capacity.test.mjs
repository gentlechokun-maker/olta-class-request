import test from 'node:test';
import assert from 'node:assert/strict';
import {classCapacity,makeupCapacity,capacity} from '../public/domain.js';
test('theory caps at twelve for both years; experiments and linked grade-six theory stay at six',()=>{
 for(const grade of ['중1','중2','중3','고1','고2','고3']){assert.equal(classCapacity({grade}),12);assert.deepEqual(capacity({registered:9,starting:2},classCapacity({grade})),{used:11,remaining:1,over:false});assert.deepEqual(capacity({registered:12},classCapacity({grade})),{used:12,remaining:0,over:false});assert.equal(capacity({registered:13},classCapacity({grade})).over,true);}
 for(const grade of ['초1','초5','초6'])assert.equal(classCapacity({grade}),6);
 assert.equal(classCapacity({grade:'초6',lessonType:'theory'}),6);
 assert.equal(makeupCapacity('theory','초6'),6);assert.equal(makeupCapacity('theory','중1'),12);assert.equal(makeupCapacity('experiment','중1'),6);
});
