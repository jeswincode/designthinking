import {readConfig} from './config.mjs';
import {createApp} from './app.mjs';
let app;
try{
 const config=readConfig();app=createApp(config);
 app.server.listen(config.port,config.host,()=>console.log(`Faculty backend: http://${config.host}:${config.port}. Secrets are loaded only on the server.`));
 app.server.on('error',e=>{console.error(`Backend could not start (${e.code||'configuration error'}).`);process.exitCode=1;});
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await app.close();process.exit(0);});
}catch{console.error('Backend configuration is invalid. Review .env against .env.example.');process.exitCode=1;}
