const assert=require('node:assert/strict');
const {request}=require('gaxios');
const {initializeApp,cert}=require('firebase-admin/app');
const {getAuth}=require('firebase-admin/auth');
const {getFirestore,FieldValue}=require('firebase-admin/firestore');
const {Storage}=require('@google-cloud/storage');
(async()=>{
  assert.equal(typeof initializeApp,'function');assert.equal(typeof cert,'function');
  assert.equal(typeof getAuth,'function');assert.equal(typeof getFirestore,'function');
  assert.equal(typeof FieldValue.increment,'function');assert.equal(typeof Storage,'function');
  let contentType='';
  const result=await request({url:'https://example.test/upload',method:'POST',
    multipart:[{headers:{'Content-Type':'text/plain'},body:'hello'}],
    fetchImplementation:async(_url,options)=>{
      contentType=options.headers['Content-Type'];
      return new Response('{"ok":true}',{status:200,headers:{'Content-Type':'application/json'}});
    }});
  assert.match(contentType,/^multipart\/related; boundary=[\w-]+$/);
  assert.equal(result.data.ok,true);
  console.log('Firebase modular imports and gaxios multipart compatibility passed');
})().catch(error=>{console.error(error);process.exitCode=1});
