import test from 'node:test';
import assert from 'node:assert/strict';
import {createGoogleCalendar,encryptRefreshToken,decryptRefreshToken,mapGoogleEvent} from '../google-calendar.mjs';

const config={googleClientId:'client-id',googleClientSecret:'client-secret',googleRedirectUri:'https://faculty.example/api/google-calendar/callback',googleTokenEncryptionKey:'0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'};

test('Google refresh tokens encrypt and decrypt without exposing plaintext',()=>{
 const encrypted=encryptRefreshToken(config,'refresh-secret');
 assert.notEqual(encrypted,'refresh-secret');
 assert.equal(decryptRefreshToken(config,encrypted),'refresh-secret');
 assert.throws(()=>decryptRefreshToken(config,encrypted.slice(0,-1)+'x'));
});

test('Google event mapping preserves Faculty metadata and converts times',()=>{
 const mapped=mapGoogleEvent({id:'evt-1',summary:'Faculty meeting',description:'Discuss <b>course</b>&amp; assessment',start:{dateTime:'2026-09-21T09:00:00Z'},end:{dateTime:'2026-09-21T10:30:00Z'},location:'Room 1',htmlLink:'https://calendar.google.com/event/1',updated:'2026-09-21T08:00:00Z'},'primary','Asia/Kolkata',{id:'local-1',kind:'event',title:'old',category:'Teaching',notes:'old',date:'2026-09-21',priority:'High',done:true,created:'2026-01-01T00:00:00Z',tags:'Teaching'});
 assert.equal(mapped.id,'local-1');
 assert.equal(mapped.title,'Faculty meeting');
 assert.equal(mapped.time,'14:30');
 assert.equal(mapped.end,'16:00');
 assert.equal(mapped.done,true);
 assert.equal(mapped.priority,'High');
 assert.match(mapped.tags,'Teaching');
 assert.match(mapped.tags,'Google Calendar');
 assert.equal(mapped.readOnly,true);
});

test('Google connection builds OAuth URL and rejects wrong state',async()=>{
 const states=[];
 const store={
  async getGoogleCalendarConnection(){return null;},
  async createGoogleOAuthState(v){states.push(v);},
  async consumeGoogleOAuthState(){return null;}
 };
 const google=createGoogleCalendar(config,{store,now:()=>Date.parse('2026-09-21T00:00:00Z')});
 const url=await google.start({id:'user-1',email:'teacher@example.com'});
 const parsed=new URL(url);
 assert.equal(parsed.origin,'https://accounts.google.com');
 assert.equal(parsed.searchParams.get('client_id'),'client-id');
 assert.equal(parsed.searchParams.get('scope'),'https://www.googleapis.com/auth/calendar.readonly');
 assert.equal(parsed.searchParams.get('access_type'),'offline');
 assert.equal(parsed.searchParams.get('state'),states[0].state);
 await assert.rejects(()=>google.callback({id:'user-1'},states[0].state,'code'),e=>e.code==='GOOGLE_STATE');
});

test('Google sync imports events, updates them, and removes cancelled events',async()=>{
 let connection={calendarId:'primary',calendarSummary:'Primary',timeZone:'Asia/Kolkata',refreshTokenEnc:encryptRefreshToken(config,'refresh'),syncToken:null};
 let workspace={version:1,records:[{id:'old',kind:'event',title:'Old',category:'Meeting',notes:'',date:'2026-09-21',time:'12:00',end:'13:00',priority:'Medium',done:false,created:'2026-01-01T00:00:00Z',source:'google',googleCalendarId:'primary',googleEventId:'evt-old'}],profile:{name:'',department:'',interests:''},reminders:true,weekStart:'Monday',readAlerts:[],sample:false};
 const saved=[];
 const store={async getGoogleCalendarConnection(){return connection;},async setGoogleCalendarConnection(_,v){connection=v;},async read(){return {workspace,revision:1};},async save(_,w){workspace=w;saved.push(w);return {revision:2,updatedAt:new Date().toISOString()};}};
 let eventCall=0;
 const fetchImpl=async(url,options={})=>{
  const target=String(url);
  if(target.includes('oauth2.googleapis.com/token'))return new Response(JSON.stringify({access_token:'access'}),{status:200,headers:{'Content-Type':'application/json'}});
  eventCall++;
  const items=eventCall===1?[{id:'evt-new',summary:'New class',start:{dateTime:'2026-09-21T09:00:00Z'},end:{dateTime:'2026-09-21T10:00:00Z'}},{id:'evt-old',summary:'Updated old',start:{dateTime:'2026-09-21T10:00:00Z'},end:{dateTime:'2026-09-21T11:00:00Z'}}]:[{id:'evt-new',status:'cancelled'}];
  return new Response(JSON.stringify({items,nextSyncToken:'sync-2'}),{status:200,headers:{'Content-Type':'application/json'}});
 };
 const google=createGoogleCalendar(config,{store,fetchImpl,now:()=>Date.parse('2026-09-21T12:00:00Z')});
 const first=await google.sync('u');
 assert.equal(first.imported,1);assert.equal(first.updated,1);assert.equal(first.removed,0);assert.equal(workspace.records.filter(r=>r.source==='google').length,2);
 const second=await google.sync('u');
 assert.equal(second.removed,1);assert.equal(workspace.records.filter(r=>r.source==='google').length,1);assert.equal(saved.length,2);
});
