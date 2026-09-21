import test from 'node:test';
import assert from 'node:assert/strict';
import {readConfig} from '../server/config.mjs';

test('local MongoDB toggle uses Community and ignores a saved alternate URI',()=>{
 const config=readConfig({USE_LOCAL_MONGODB:'true',MONGODB_URI:'mongodb://alternate.invalid:27017',MONGODB_DB:'selected_database'});
 assert.equal(config.mongoMode,'community');assert.equal(config.mongoUri,'mongodb://127.0.0.1:27017');assert.equal(config.database,'selected_database');
 assert.equal(readConfig({USE_LOCAL_MONGODB:'true',MONGODB_LOCAL_PORT:'27019'}).mongoUri,'mongodb://127.0.0.1:27019');
});
test('connection-string mode preserves the env URI and supports existing configurations',()=>{
 const uri='mongodb://user:password@127.0.0.1:27017/?authSource=admin';
 for(const toggle of [undefined,'false']){const config=readConfig({USE_LOCAL_MONGODB:toggle,MONGODB_URI:uri});assert.equal(config.mongoMode,'connection-string');assert.equal(config.mongoUri,uri);}
 assert.equal(readConfig({USE_LOCAL_MONGODB:'false'}).mongoUri,'');
});
test('invalid database toggles and local ports fail without silent fallback',()=>{
 assert.throws(()=>readConfig({USE_LOCAL_MONGODB:'yes'}),/Invalid USE_LOCAL_MONGODB/);
 for(const port of ['-1','65536','abc'])assert.throws(()=>readConfig({USE_LOCAL_MONGODB:'true',MONGODB_LOCAL_PORT:port}),/Invalid MONGODB_LOCAL_PORT/);
});
