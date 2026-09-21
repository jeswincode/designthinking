import {api,jsonBody,request,ApiError,type Account} from './api';
import {fileStore,validWorkspace,type Workspace} from './workspace';
export type SyncStatus={kind:'saving'|'synced'|'pending'|'conflict';message:string};
export type Snapshot={workspace:Workspace|null;revision:number;updatedAt?:string};
export const accountKey=(id:string)=>'faculty-workspace-v1:'+id;
export const syncKey=(id:string)=>'faculty-sync-v1:'+id;
export async function hydrateFiles(userId:string,workspace:Workspace){for(const r of workspace.records){if(r.fileId&&!await fileStore('get',userId+':'+r.fileId)){const response=await request('/files/'+encodeURIComponent(r.fileId));await fileStore('put',userId+':'+r.fileId,await response.blob())}}}
export function pendingCache(userId:string){try{const meta=JSON.parse(localStorage.getItem(syncKey(userId))||'null');const workspace=JSON.parse(localStorage.getItem(accountKey(userId))||'null');if(meta?.pending&&validWorkspace(workspace)&&Number.isSafeInteger(meta.baseRevision))return {workspace,revision:meta.baseRevision};}catch{}return null;}
export class WorkspaceSync{
 private waiters:Array<()=>void>=[];private queued:Workspace|null=null;private timer:ReturnType<typeof setTimeout>|undefined;private running=false;private stopped=false;private blocked=false;private knownFiles=new Set<string>();
 constructor(private account:Account,private revision:number,private notify:(status:SyncStatus)=>void,remote:Workspace|null,conflict=false){for(const r of remote?.records||[])if(r.fileId)this.knownFiles.add(r.fileId);this.blocked=conflict;if(conflict)this.notify({kind:'conflict',message:'Local changes and database changes overlap. Export a local backup, then restore the database copy.'});}
 private mark(pending:boolean){localStorage.setItem(syncKey(this.account.id),JSON.stringify({baseRevision:this.revision,pending}));}
 enqueue(workspace:Workspace){if(this.stopped)return;this.queued=structuredClone(workspace);try{this.mark(true)}catch{this.notify({kind:'pending',message:'Changes are local; sync metadata could not be saved. Export a backup.'});return;}if(this.blocked)return;this.notify({kind:'saving',message:'Saved on this device. Saving to MongoDB…'});clearTimeout(this.timer);this.timer=setTimeout(()=>void this.flush(),750);}
 async flush(){clearTimeout(this.timer);if(this.running){await new Promise<void>(resolve=>this.waiters.push(resolve));return;}if(this.stopped||this.blocked)return;this.running=true;
  try{while(this.queued&&!this.stopped){const next=this.queued;this.queued=null;try{
   for(const r of next.records){if(r.fileId&&!this.knownFiles.has(r.fileId)){const blob=await fileStore('get',this.account.id+':'+r.fileId);if(!blob)throw new Error('An attached file is missing on this device. Re-upload it before syncing.');await request('/files/'+encodeURIComponent(r.fileId),{method:'PUT',headers:{'Content-Type':'application/octet-stream'},body:blob});this.knownFiles.add(r.fileId);}}
   const saved=await api<{revision:number}>('/workspace',{method:'PUT',...jsonBody({workspace:next,expectedRevision:this.revision})});this.revision=saved.revision;this.mark(!!this.queued);if(!this.stopped)this.notify({kind:'synced',message:'Saved to MongoDB'});
  }catch(e){this.queued=this.queued||next;this.blocked=e instanceof ApiError&&e.code==='REVISION_CONFLICT';if(!this.stopped)this.notify({kind:this.blocked?'conflict':'pending',message:(e instanceof Error?e.message:'Sync failed')+' Local changes are retained.'});break;}}}finally{this.running=false;for(const done of this.waiters.splice(0))done();}}
 resume(){this.stopped=false;void this.flush();}
 dispose(){this.stopped=true;clearTimeout(this.timer);}
}
