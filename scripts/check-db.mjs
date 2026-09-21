import {MongoClient} from 'mongodb';
import {randomUUID} from 'node:crypto';
import {readConfig} from '../server/config.mjs';
const c=readConfig();if(!c.mongoUri){console.error('Set USE_LOCAL_MONGODB=true or set MONGODB_URI in .env before running db:check.');process.exit(1);}
const client=new MongoClient(c.mongoUri,{serverSelectionTimeoutMS:5000});const id=randomUUID();let collection;
try{await client.connect();const db=client.db(c.database);await db.command({ping:1});collection=db.collection('connection_checks');await collection.insertOne({_id:id,createdAt:new Date()});if(!(await collection.findOne({_id:id})))throw Error('Read check failed');await collection.deleteOne({_id:id});console.log('MongoDB ('+c.mongoMode+') ping, insert, read and delete checks passed. No workspace records were changed.');}catch{console.error(c.mongoMode==='community'?'Local MongoDB Community verification failed. Start the MongoDB service and check MONGODB_LOCAL_PORT.':'MongoDB verification failed. Check URI, credentials, IP access list and network. Connection secrets are not printed.');process.exitCode=1;}finally{if(collection)await collection.deleteOne({_id:id}).catch(()=>{});await client.close();}
