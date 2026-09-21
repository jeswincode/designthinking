import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../app.mjs';
import {readConfig} from '../config.mjs';
test('API handles health, missing login, blocked origins, bad input and missing MongoDB',async()=>{
 const config=readConfig({});const app=createApp(config);await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+app.server.address().port;
 try{
  assert.equal((await fetch(base+'/api/health')).status,200);
  assert.equal((await fetch(base+'/api/workspace')).status,401);
  assert.equal((await fetch(base+'/api/auth/session')).status,401);
  assert.equal((await fetch(base+'/api/health',{headers:{Origin:'https://untrusted.example'}})).status,403);
  const malformed=await fetch(base+'/api/auth/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'});assert.equal(malformed.status,400);
  const invalid=await fetch(base+'/api/auth/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Test',email:'x',password:'short'})});assert.equal(invalid.status,400);
  const unavailable=await fetch(base+'/api/auth/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Test',email:'a@example.test',password:'valid-test-password'})});assert.equal(unavailable.status,503);assert.equal((await unavailable.json()).error.code,'NOT_CONFIGURED');
 }finally{await app.close();}
});
