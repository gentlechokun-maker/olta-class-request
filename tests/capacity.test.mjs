import test from 'node:test';
import assert from 'node:assert/strict';
import {classCapacity,makeupCapacity,capacity} from '../public/domain.js';
test('theory caps at ten; experiments and linked grade-six theory stay at six',()=>{
 for(const grade of ['중1','중2','중3','고1']){assert.equal(classCapacity({grade}),10);assert.deepEqual(capacity({registered:7,starting:2},classCapacity({grade})),{used:9,remaining:1,over:false});assert.equal(capacity({registered:10},classCapacity({grade})).remaining,0);assert.equal(capacity({registered:11},classCapacity({grade})).over,true);}
 for(const grade of ['초1','초5','초6'])assert.equal(classCapacity({grade}),6);
 assert.equal(classCapacity({grade:'초6',lessonType:'theory'}),6);
 assert.equal(makeupCapacity('theory','초6'),6);assert.equal(makeupCapacity('theory','중1'),10);assert.equal(makeupCapacity('experiment','중1'),6);
});
