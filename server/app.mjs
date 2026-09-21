import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {pipeline} from 'node:stream/promises';
import {AppError} from './errors.mjs';
import {createMongoStore} from './mongo.mjs';
import {createGemini} from './gemini.mjs';

function json(res,status,body){
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
  res.end(JSON.stringify(body));
}

function body(req,max){
  return new Promise((resolve,reject)=>{
    let total=0;
    const chunks=[];
    req.on('data',chunk=>{
      total+=chunk.length;
      if(total<=max)chunks.push(chunk);
    });
    req.on('end',()=>total>max?reject(new AppError(413,'TOO_LARGE','Request body exceeds the allowed size.')):resolve(Buffer.concat(chunks)));
    req.on('error',reject);
  });
}

async function readJson(req){
  if(!req.headers['content-type']?.startsWith('application/json'))throw new AppError(415,'CONTENT_TYPE','Send application/json.');
  try{return JSON.parse((await body(req,4*1024*1024)).toString('utf8'));}
  catch(e){
    if(e instanceof AppError)throw e;
    throw new AppError(400,'INVALID_JSON','Request JSON is malformed.');
  }
}

function sessionToken(req){
  return /(?:^|;\s*)faculty_session=([A-Za-z0-9_-]+)/.exec(req.headers.cookie||'')?.[1]||'';
}

function setCookie(res,token,secure){
  res.setHeader('Set-Cookie',`faculty_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${token?604800:0}${secure?'; Secure':''}`);
}

function originAllowed(req,origin,configuredOrigins){
  if(!origin)return true;
  if(configuredOrigins.includes(origin))return true;
  // When the API and frontend are served by this same Node process, the
  // public origin may be unknown at startup. Accept only the request host.
  const forwarded=req.headers['x-forwarded-proto'];
  const protocol=(typeof forwarded==='string'?forwarded.split(',')[0].trim():'')||'http';
  return origin===`${protocol}://${req.headers.host||''}`;
}

export function createApp(config,{store=createMongoStore(config),gemini=createGemini(config)}={}){
  const attempts=new Map();
  const server=createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    try{
      const url=new URL(req.url,'http://localhost');
      const api=url.pathname.startsWith('/api/');
      if(api){
        const origin=req.headers.origin;
        if(!originAllowed(req,origin,config.origins))throw new AppError(403,'ORIGIN_DENIED','This origin is not allowed by the backend.');
        if(origin){
          res.setHeader('Access-Control-Allow-Origin',origin);
          res.setHeader('Access-Control-Allow-Credentials','true');
          res.setHeader('Vary','Origin');
        }
        if(req.method==='OPTIONS'){
          res.writeHead(204,{'Access-Control-Allow-Methods':'GET, PUT, POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type'});
          return res.end();
        }
        if(url.pathname==='/api/health'&&req.method==='GET')return json(res,200,{ok:true,service:'faculty-workspace'});
        if(['/api/auth/signup','/api/auth/login'].includes(url.pathname)&&req.method==='POST'){
          const key=req.socket.remoteAddress||'unknown';
          const recent=(attempts.get(key)||[]).filter(t=>t>Date.now()-60000);
          if(recent.length>=10)throw new AppError(429,'AUTH_RATE_LIMIT','Too many login attempts. Wait a minute.',60);
          if(attempts.size>1000)attempts.clear();
          attempts.set(key,[...recent,Date.now()]);
          const result=url.pathname.endsWith('signup')?await store.signup(await readJson(req)):await store.login(await readJson(req));
          setCookie(res,result.token,config.cookieSecure);
          return json(res,200,{user:result.user});
        }
        if(url.pathname==='/api/auth/logout'&&req.method==='POST'){
          await store.logout(sessionToken(req));
          setCookie(res,'',config.cookieSecure);
          return json(res,200,{ok:true});
        }
        const user=await store.session(sessionToken(req));
        if(!user)throw new AppError(401,'UNAUTHORIZED','Log in to use your database workspace or Gemini.');
        if(url.pathname==='/api/auth/session'&&req.method==='GET')return json(res,200,{user});
        if(url.pathname==='/api/status'&&req.method==='GET')return json(res,200,{database:await store.status(),gemini:gemini.status()});
        if(url.pathname==='/api/workspace'&&req.method==='GET')return json(res,200,await store.read(user.id));
        if(url.pathname==='/api/workspace'&&req.method==='PUT'){
          const value=await readJson(req);
          return json(res,200,await store.save(user.id,value?.workspace,value?.expectedRevision));
        }
        if(url.pathname==='/api/ai/generate'&&req.method==='POST')return json(res,200,await gemini.generate(await readJson(req)));
        const file=/^\/api\/files\/([a-zA-Z0-9_-]{1,100})$/.exec(url.pathname);
        if(file&&req.method==='PUT'){
          const buffer=await body(req,25*1024*1024);
          return json(res,200,await store.putFile(user.id,file[1],buffer,String(req.headers['content-type']||'application/octet-stream').slice(0,200)));
        }
        if(file&&req.method==='GET'){
          const value=await store.getFile(user.id,file[1]);
          res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Length':value.size,'Content-Disposition':'attachment','Cache-Control':'no-store'});
          await pipeline(value.stream,res);
          return;
        }
        throw new AppError(404,'NOT_FOUND','Unknown API route.');
      }

      if(req.method!=='GET'&&req.method!=='HEAD')throw new AppError(405,'METHOD_NOT_ALLOWED','Method not allowed.');
      const pathname=decodeURIComponent(url.pathname);
      const target=path.resolve(config.dist,'.'+(pathname==='/'?'/index.html':pathname));
      if(!target.startsWith(config.dist+path.sep)||pathname.split('/').some(p=>p.startsWith('.')))throw new AppError(404,'NOT_FOUND','Not found.');

      let meta=await stat(target).catch(()=>null);
      // Support client-side routes when the production server is serving the SPA.
      if(!meta?.isFile()&&!path.extname(pathname)){
        const spa=path.resolve(config.dist,'index.html');
        meta=await stat(spa).catch(()=>null);
        if(meta?.isFile()){
          res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache','Content-Length':meta.size});
          return res.end(req.method==='HEAD'?undefined:await readFile(spa));
        }
      }
      if(!meta?.isFile())throw new AppError(404,'NOT_FOUND','Build the React app with npm run build before serving it here.');
      const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.json':'application/json'}[path.extname(target)]||'application/octet-stream';
      res.writeHead(200,{'Content-Type':mime,'Cache-Control':pathname.startsWith('/assets/')?'public, max-age=31536000, immutable':'no-cache','Content-Length':meta.size});
      res.end(req.method==='HEAD'?undefined:await readFile(target));
    }catch(e){
      if(res.headersSent){res.destroy();return;}
      if(e.retryAfter)res.setHeader('Retry-After',String(e.retryAfter));
      json(res,e instanceof AppError?e.status:503,{error:{code:e instanceof AppError?e.code:'SERVICE_UNAVAILABLE',message:e instanceof AppError?e.message:'The backend service is unavailable. Check the database connection and server configuration.'}});
    }
  });
  server.requestTimeout=45000;
  server.headersTimeout=15000;
  return {server,store,async close(){await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});await store.close();}};
}
