import {MongoClient,GridFSBucket} from 'mongodb';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {createHash,randomUUID,randomBytes,scrypt as scryptCallback,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {AppError,unavailable} from './errors.mjs';
import {validWorkspace} from '../lib/workspace.ts';
const scrypt=promisify(scryptCallback);
export function validateWorkspace(value){
 try{if(!validWorkspace(value))return false;const ids=new Set();
 for(const r of value.records){
  if(ids.has(r.id)||r.id.length>100||r.title.length>200||r.notes.length>60000||!/^\d{4}-\d{2}-\d{2}$/.test(r.date))return false;ids.add(r.id);
  for(const key of ['time','end','location','repeat','url','author','tags','subtasks','fileId','fileName','mime','status','created'])if(r[key]!==undefined&&(typeof r[key]!=='string'||r[key].length>60000))return false;
  if(r.fileId&&!/^[a-zA-Z0-9_-]{1,100}$/.test(r.fileId))return false;
  if(r.kind==='event'&&(!/^\d{2}:\d{2}$/.test(r.time||'')||!/^\d{2}:\d{2}$/.test(r.end||'')||r.end<=r.time))return false;
 }return true;}catch{return false;}
}
const publicUser=user=>({id:user._id,name:user.name,email:user.email});
const digest=value=>createHash('sha256').update(value).digest('hex');
export function createMongoStore(config){
 let client,connecting;
 async function db(){
  if(!config.mongoUri||config.mongoUri.includes('<')||config.mongoUri.includes('CHANGE_ME'))throw unavailable('Set USE_LOCAL_MONGODB=true for local Community, or set MONGODB_URI in the server .env, then restart the backend.');
  if(!connecting){client=new MongoClient(config.mongoUri,{serverSelectionTimeoutMS:5000,connectTimeoutMS:5000,socketTimeoutMS:15000,maxPoolSize:5});
   connecting=(async()=>{await client.connect();const d=client.db(config.database);await d.collection('users').createIndex({email:1},{unique:true});await d.collection('sessions').createIndex({expiresAt:1},{expireAfterSeconds:0});return d;})().catch(async()=>{await client.close().catch(()=>{});connecting=null;throw unavailable(config.mongoMode==='community'?'Local MongoDB Community is unavailable. Start the MongoDB service and check MONGODB_LOCAL_PORT.':'MongoDB is unavailable. Check the connection string, database credentials and network access.');});
  }return await connecting;
 }
 async function newSession(d,user){const token=randomBytes(32).toString('base64url');await d.collection('sessions').insertOne({_id:digest(token),userId:user._id,expiresAt:new Date(Date.now()+7*86400000)});return {token,user:publicUser(user)};}
 function credentials(value,signup){if(!value||typeof value.email!=='string'||!/^\S+@\S+\.\S+$/.test(value.email.trim())||value.email.length>254||typeof value.password!=='string'||value.password.length<12||value.password.length>128||(signup&&(typeof value.name!=='string'||!value.name.trim()||value.name.length>100)))throw new AppError(400,'INVALID_CREDENTIALS','Enter a valid email and a password of 12–128 characters. Signup also requires your name.');return {email:value.email.trim().toLowerCase(),password:value.password};}
 return {
  async signup(value){const c=credentials(value,true);const d=await db();const salt=randomBytes(16).toString('hex');const hash=(await scrypt(c.password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024})).toString('hex');const user={_id:randomUUID(),email:c.email,name:value.name.trim(),salt,passwordHash:hash,createdAt:new Date()};try{await d.collection('users').insertOne(user);}catch(e){if(e.code===11000)throw new AppError(409,'EMAIL_EXISTS','An account with that email already exists. Log in instead.');throw e;}return newSession(d,user);},
  async login(value){const c=credentials(value,false);const d=await db();const user=await d.collection('users').findOne({email:c.email});const hash=await scrypt(c.password,user?.salt||'00000000000000000000000000000000',64,{N:32768,r:8,p:1,maxmem:64*1024*1024});const expected=Buffer.from(user?.passwordHash||'0'.repeat(128),'hex');if(!timingSafeEqual(hash,expected)||!user)throw new AppError(401,'INVALID_LOGIN','Email or password is incorrect.');return newSession(d,user);},
  async session(token){if(!token)return null;const d=await db();const s=await d.collection('sessions').findOne({_id:digest(token),expiresAt:{$gt:new Date()}});if(!s)return null;const user=await d.collection('users').findOne({_id:s.userId});return user?publicUser(user):null;},
  async logout(token){if(token){const d=await db();await d.collection('sessions').deleteOne({_id:digest(token)});}},
  async status(){try{const d=await db();await d.command({ping:1});return {configured:true,connected:true,mode:config.mongoMode};}catch{return {configured:!!config.mongoUri,connected:false,mode:config.mongoMode};}},
  async read(userId){const d=await db();const row=await d.collection('workspaces').findOne({_id:userId});return row?{workspace:row.workspace,revision:row.revision,updatedAt:row.updatedAt}:{workspace:null,revision:0};},
  async save(userId,workspace,expectedRevision){
   if(!validateWorkspace(workspace)||!Number.isSafeInteger(expectedRevision)||expectedRevision<0)throw new AppError(400,'INVALID_WORKSPACE','The workspace or revision is invalid.');
   const d=await db();const ids=[...new Set(workspace.records.map(r=>r.fileId).filter(Boolean))].map(id=>userId+':'+id);
   if(ids.length&&await d.collection('uploads.files').countDocuments({_id:{$in:ids}})!==ids.length)throw new AppError(409,'MISSING_FILES','Upload all referenced files before saving the workspace.');
   const updatedAt=new Date().toISOString();
   if(expectedRevision===0){try{await d.collection('workspaces').insertOne({_id:userId,workspace,revision:1,updatedAt});return {revision:1,updatedAt};}catch(e){if(e.code===11000)throw new AppError(409,'REVISION_CONFLICT','Your database workspace changed. Export local changes, then restore the database copy.');throw e;}}
   const row=await d.collection('workspaces').findOneAndUpdate({_id:userId,revision:expectedRevision},{$set:{workspace,updatedAt},$inc:{revision:1}},{returnDocument:'after'});
   if(!row)throw new AppError(409,'REVISION_CONFLICT','The database changed on another device. Export local changes, then restore the latest database workspace.');return {revision:row.revision,updatedAt};
  },
  async putFile(userId,id,buffer,mime){const d=await db();const key=userId+':'+id;const hash=digest(buffer);const existing=await d.collection('uploads.files').findOne({_id:key});if(existing){if(existing.metadata?.sha256!==hash)throw new AppError(409,'FILE_CONFLICT','Different file content already exists for this ID.');return {id,size:existing.length};}const bucket=new GridFSBucket(d,{bucketName:'uploads'});const stream=bucket.openUploadStreamWithId(key,id,{metadata:{userId,mime,sha256:hash}});try{await pipeline(Readable.from(buffer),stream);}catch(error){await stream.abort().catch(()=>{});throw error;}return {id,size:buffer.length};},
  async getFile(userId,id){const d=await db();const key=userId+':'+id;const file=await d.collection('uploads.files').findOne({_id:key,'metadata.userId':userId});if(!file)throw new AppError(404,'FILE_NOT_FOUND','This file is not in your database workspace.');return {stream:new GridFSBucket(d,{bucketName:'uploads'}).openDownloadStream(key),size:file.length};},
  async close(){if(client)await client.close();connecting=null;}
 };
}
