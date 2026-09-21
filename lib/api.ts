export type Account={id:string;name:string;email:string};
export class ApiError extends Error{constructor(message:string,public status:number,public code:string){super(message)}}
export async function request(path:string,init:RequestInit={}){
 const response=await fetch('/api'+path,{...init,credentials:'same-origin',signal:init.signal||AbortSignal.timeout(45000)});
 if(!response.ok){const body=await response.json().catch(()=>null);throw new ApiError(body?.error?.message||'Backend unavailable. Start the server and check its configuration.',response.status,body?.error?.code||'BACKEND_ERROR')}
 return response;
}
export async function api<T>(path:string,init:RequestInit={}):Promise<T>{return (await request(path,init)).json()}
export const jsonBody=(value:unknown)=>({headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});
