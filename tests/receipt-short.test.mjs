import test from 'node:test';
import assert from 'node:assert/strict';
import {receiptFileData} from '../public/receipt-file.js';
test('short receipt TXT retains leading zeros and rejects long or mismatched credentials',()=>{
 const data={id:'010203',token:'02호기도01',kind:'absence'},portalUrl='https://example.com/my-booking.html#'+encodeURIComponent(JSON.stringify(data));
 const result=receiptFileData({...data,portalUrl});assert.match(result.text,/접수번호: 010203/);assert.match(result.text,/확인 코드: 02호기도01/);
 assert.throws(()=>receiptFileData({...data,token:'02다른학생01',portalUrl}));
 assert.throws(()=>receiptFileData({...data,id:'a'.repeat(32),token:'b'.repeat(32),portalUrl}));
});
