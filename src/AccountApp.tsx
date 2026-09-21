import {useEffect,useRef,useState} from 'react';
import {GraduationCap,ArrowRight,WifiOff} from 'lucide-react';
import {Tabs,TabsList,TabsTrigger} from '@/components/ui/tabs';
import WorkspaceApp from './App';
import {api,jsonBody,ApiError,type Account} from '@/lib/api';
import {accountKey,syncKey,hydrateFiles,pendingCache,WorkspaceSync,type Snapshot,type SyncStatus} from '@/lib/sync';
import {seed,type Workspace} from '@/lib/workspace';
export default function AccountApp(){
 const [ready,setReady]=useState(false),[screen,setScreen]=useState<'auth'|'guest'|'account'>('auth'),[mode,setMode]=useState('Login'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [active,setActive]=useState<{user:Account;initial:Workspace;sync:WorkspaceSync;key:number}|null>(null);const [syncStatus,setSyncStatus]=useState<SyncStatus>({kind:'synced',message:'Saved to MongoDB'});const engine=useRef<WorkspaceSync|null>(null);
 async function openAccount(user:Account,discardPending=false){
  const snapshot=await api<Snapshot>('/workspace');const pending=discardPending?null:pendingCache(user.id);
  const workspace=pending?.workspace||snapshot.workspace||seed();if(!snapshot.workspace&&!pending)workspace.profile.name=user.name;
  if(!pending){await hydrateFiles(user.id,workspace);localStorage.setItem(syncKey(user.id),JSON.stringify({baseRevision:snapshot.revision,pending:false}));}
  const revision=pending?.revision??snapshot.revision;const conflict=!!pending&&revision!==snapshot.revision;
  engine.current?.dispose();setSyncStatus({kind:'synced',message:'Saved to MongoDB'});
  const sync=new WorkspaceSync(user,revision,setSyncStatus,snapshot.workspace,conflict);engine.current=sync;
  localStorage.setItem(accountKey(user.id),JSON.stringify(workspace));setActive({user,initial:workspace,sync,key:Date.now()});setScreen('account');
  if(!snapshot.workspace||pending)sync.enqueue(workspace);
 }
 useEffect(()=>{let cancelled=false;(async()=>{try{const session=await api<{user:Account}>('/auth/session');if(!cancelled)await openAccount(session.user);}catch(e){if(!cancelled&&(!(e instanceof ApiError)||e.status!==401))setError('Account service is unavailable. Start the backend and configure MongoDB, or continue offline.');}finally{if(!cancelled)setReady(true);}})();const retry=()=>void engine.current?.flush();window.addEventListener('online',retry);return()=>{cancelled=true;engine.current?.dispose();window.removeEventListener('online',retry)};},[]);
 async function authenticate(event:React.FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setError('');const fields=new FormData(event.currentTarget);try{const result=await api<{user:Account}>(mode==='Signup'?'/auth/signup':'/auth/login',{method:'POST',...jsonBody({name:fields.get('name'),email:fields.get('email'),password:fields.get('password')})});await openAccount(result.user);}catch(e){setError(e instanceof Error?e.message:'Unable to sign in.');}finally{setBusy(false)}}
 async function logout(){setBusy(true);try{await engine.current?.flush();await api('/auth/logout',{method:'POST'});engine.current?.dispose();engine.current=null;setActive(null);setMode('Login');setScreen('auth');setError('');}catch(e){setError(e instanceof Error?e.message:'Unable to sign out.');}finally{setBusy(false)}}
 if(!ready)return <div className="startup"><GraduationCap size={42}/><p>Opening your faculty workspace…</p></div>;
 if(screen==='guest')return <WorkspaceApp key="guest" onSignOut={()=>{setScreen('auth');return Promise.resolve()}}/>;
 if(screen==='account'&&active)return <><WorkspaceApp key={active.key} account={active.user} initialWorkspace={active.initial} sync={active.sync} syncStatus={syncStatus} onSignOut={logout} onRestore={async()=>{const previous=engine.current;previous?.dispose();await previous?.flush();try{await openAccount(active.user,true)}catch(error){previous?.resume();throw error;}}}/>{error&&<div className="toast" role="alert">{error}<button onClick={()=>setError('')}>Dismiss</button></div>}</>;
 return <main className="auth-page"><section className="auth-card"><div className="brand"><span className="brand-icon"><GraduationCap/></span><div>faculty<span>AI WORKSPACE</span></div></div><h1>{mode==='Signup'?'Create your faculty account':'Welcome back'}</h1><p>Keep your academic work together, across devices.</p><Tabs value={mode} onValueChange={v=>{setMode(String(v));setError('')}}><TabsList><TabsTrigger value="Login">Log in</TabsTrigger><TabsTrigger value="Signup">Sign up</TabsTrigger></TabsList></Tabs>{error&&<div className="error-banner" role="alert">{error}</div>}<form className="edit-form" onSubmit={authenticate}>{mode==='Signup'&&<label>Your name<input name="name" autoComplete="name" required maxLength={100}/></label>}<label>Email<input name="email" type="email" autoComplete="email" required maxLength={254}/></label><label>Password<input name="password" type="password" autoComplete={mode==='Signup'?'new-password':'current-password'} minLength={12} maxLength={128} required/></label><p className="hint">Use at least 12 characters. Your password is hashed on the server.</p><button className="primary" disabled={busy}>{busy?'Please wait…':mode==='Signup'?'Create account':'Log in'}<ArrowRight size={16}/></button></form><button className="secondary offline-entry" onClick={()=>setScreen('guest')} disabled={busy}><WifiOff size={16}/>Continue with this device’s offline workspace</button><p className="hint">Account storage requires the backend and MongoDB. The offline workspace stays separate from your account.</p></section></main>;
}

