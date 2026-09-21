import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {MongoMemoryServer} from 'mongodb-memory-server';
import {MongoClient} from 'mongodb';
import {createApp} from '../app.mjs';
import {readConfig} from '../config.mjs';
import {seed,makeRecord} from '../../lib/workspace.ts';
test('real MongoDB: signup, isolated workspaces/files, revisions, logout/login, persistence', {timeout:240000},async()=>{
 const mongo=await MongoMemoryServer.create({binary:{downloadDir:path.resolve('.cache/mongodb')}});
 const config=readConfig({MONGODB_URI:mongo.getUri(),MONGODB_DB:'faculty_test'});let app=createApp(config);await new Promise(r=>app.server.listen(0,'127.0.0.1',r));let base='http://127.0.0.1:'+app.server.address().port;const clients={alice:'',bob:''};
 async function call(who,url,method='GET',body){const res=await fetch(base+url,{method,headers:{...(clients[who]?{Cookie:clients[who]}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{})},body:body===undefined?undefined:JSON.stringify(body)});const cookie=res.headers.get('set-cookie');if(cookie){assert.match(cookie,/HttpOnly/);assert.match(cookie,/SameSite=Lax/);clients[who]=cookie.split(';')[0];}return {status:res.status,body:await res.json()};}
 const password='A-long-test-password-123';
 try{
  const alice=await call('alice','/api/auth/signup','POST',{name:'Alice Faculty',email:'Alice@example.test',password});assert.equal(alice.status,200);assert.ok(alice.body.user.id);assert.equal(alice.body.user.passwordHash,undefined);
  assert.equal((await call('bob','/api/auth/signup','POST',{name:'Bob Faculty',email:'bob@example.test',password})).status,200);
  assert.equal((await call('bob','/api/auth/signup','POST',{name:'Alice Again',email:'ALICE@example.test',password})).status,409);
  assert.equal((await call('alice','/api/workspace')).body.revision,0);
  const workspace=seed();workspace.profile.name='Alice Faculty';workspace.records.push(makeRecord('document','Private attachment',{fileId:'test-file',fileName:'private.txt',mime:'text/plain'}));
  assert.equal((await call('alice','/api/workspace','PUT',{workspace,expectedRevision:0})).body.error.code,'MISSING_FILES');
  const bytes=Buffer.from('Private teaching resource');assert.equal((await fetch(base+'/api/files/test-file',{method:'PUT',headers:{Cookie:clients.alice,'Content-Type':'application/octet-stream'},body:bytes})).status,200);
  assert.equal((await call('alice','/api/workspace','PUT',{workspace,expectedRevision:0})).body.revision,1);
  assert.equal((await call('alice','/api/workspace')).body.workspace.profile.name,'Alice Faculty');assert.equal((await call('bob','/api/workspace')).body.workspace,null);
  assert.equal((await fetch(base+'/api/files/test-file',{headers:{Cookie:clients.bob}})).status,404);
  const got=await fetch(base+'/api/files/test-file',{headers:{Cookie:clients.alice}});assert.equal(await got.text(),bytes.toString());
  workspace.records[0].done=true;assert.equal((await call('alice','/api/workspace','PUT',{workspace,expectedRevision:1})).body.revision,2);
  assert.equal((await call('alice','/api/workspace','PUT',{workspace,expectedRevision:1})).status,409);
  assert.equal((await call('alice','/api/workspace','PUT',{workspace:{records:[null]},expectedRevision:2})).status,400);
  const sessionBeforeLogout=clients.alice;assert.equal((await call('alice','/api/auth/logout','POST')).status,200);assert.equal((await fetch(base+'/api/workspace',{headers:{Cookie:sessionBeforeLogout}})).status,401);
  assert.equal((await call('alice','/api/auth/login','POST',{email:'alice@example.test',password:'incorrect-long-password'})).status,401);
  assert.equal((await call('alice','/api/auth/login','POST',{email:'alice@example.test',password})).status,200);
  await app.close();app=createApp(config);await new Promise(r=>app.server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+app.server.address().port;
  assert.equal((await call('alice','/api/auth/session')).status,200);assert.equal((await call('alice','/api/workspace')).body.revision,2);assert.equal((await call('alice','/api/workspace')).body.workspace.records[0].done,true);
  const client=new MongoClient(mongo.getUri());await client.connect();const stored=await client.db('faculty_test').collection('users').findOne({email:'alice@example.test'});assert.notEqual(stored.passwordHash,password);assert.equal(stored.password,undefined);assert.equal(stored.passwordHash.length,128);await client.close();
 }finally{await app.close();await mongo.stop();}
});
