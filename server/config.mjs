import path from 'node:path';

function number(env,key,fallback,min,max,valueOverride){
  const raw=valueOverride??env[key]??fallback;
  const n=Number(raw);
  if(!Number.isInteger(n)||n<min||n>max)throw new Error(`Invalid ${key}`);
  return n;
}

export function readConfig(env=process.env){
  const localToggle=env.USE_LOCAL_MONGODB||'false';
  if(!['true','false'].includes(localToggle))throw new Error('Invalid USE_LOCAL_MONGODB: use true or false');
  const mongoMode=localToggle==='true'?'community':'connection-string';
  const mongoUri=mongoMode==='community'
    ? 'mongodb://127.0.0.1:'+number(env,'MONGODB_LOCAL_PORT',27017,1,65535)
    : (env.MONGODB_URI||'');
  const model=env.GEMINI_MODEL||'gemini-2.5-flash-lite';
  if(!/^[a-zA-Z0-9._-]+$/.test(model))throw new Error('Invalid GEMINI_MODEL');

  // Hosted platforms such as Railway provide PORT and require the server to
  // listen on all interfaces. Keep SERVER_PORT as an explicit override.
  const configuredPort=env.SERVER_PORT??env.PORT;
  const port=number(env,'SERVER_PORT',8787,1,65535,configuredPort);
  const host=env.SERVER_HOST||'0.0.0.0';

  return {
    host,
    port,
    cookieSecure:env.COOKIE_SECURE==='true',
    mongoUri,
    mongoMode,
    database:env.MONGODB_DB||'faculty_workspace',
    origins:(env.ALLOWED_ORIGINS||'http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:8787,http://localhost:8787')
      .split(',').map(v=>v.trim()).filter(Boolean),
    geminiEnabled:env.GEMINI_ENABLED==='true',
    geminiKey:env.GEMINI_API_KEY||'',
    model,
    rpm:number(env,'GEMINI_MAX_REQUESTS_PER_MINUTE',5,1,100),
    rpd:number(env,'GEMINI_MAX_REQUESTS_PER_DAY',20,1,10000),
    maxOutputTokens:number(env,'GEMINI_MAX_OUTPUT_TOKENS',1024,128,4096),
    usageFile:path.resolve(env.GEMINI_USAGE_FILE||'.data/gemini-usage.json'),
    dist:path.resolve('dist')
  };
}
