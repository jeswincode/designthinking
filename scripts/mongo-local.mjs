import {MongoMemoryServer} from 'mongodb-memory-server';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
const dbPath=path.resolve('.data/local-mongo');await mkdir(dbPath,{recursive:true});
const mongo=await MongoMemoryServer.create({binary:{downloadDir:path.resolve('.cache/mongodb')},instance:{port:27018,ip:'127.0.0.1',dbPath,storageEngine:'wiredTiger',dbName:'faculty_workspace'}});
console.log('Local MongoDB is ready at mongodb://127.0.0.1:27018. Data persists in .data/local-mongo. Use only for local development.');
let closing=false;for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{if(closing)return;closing=true;await mongo.stop({doCleanup:false});process.exit(0);});
