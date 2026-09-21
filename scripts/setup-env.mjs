import {readFile,writeFile} from 'node:fs/promises';
try{await writeFile('.env',await readFile('.env.example','utf8'),{flag:'wx',mode:0o600});console.log('Created .env. Add MONGODB_URI and GEMINI_API_KEY when ready.');}catch(e){if(e.code==='EEXIST')console.log('.env already exists; left unchanged.');else throw e;}
