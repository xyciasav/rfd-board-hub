import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createWebsiteContent} from '../website-content.js';

const request=(body,method='GET')=>({method,async *[Symbol.asyncIterator](){if(body)yield Buffer.from(JSON.stringify(body));}});
const response=()=>({status:0,payload:'',writeHead(status){this.status=status},end(value=''){this.payload=value}});
test('website content keeps drafts private until an administrator publishes',async()=>{
 const db={},dir=await mkdtemp(join(tmpdir(),'rfd-site-')),cms=createWebsiteContent({db,dataDir:dir,save:async()=>{},audit:()=>{}}),editor={name:'Editor',role:'editor'},admin={name:'Admin',role:'admin'};
 const content={events:[{title:'Living Loud',visible:true}],pages:[],civics:[],supporters:[],photos:[]};let res=response();await cms.manage(request({content},'PUT'),res,'/api/website-content/draft',editor);assert.equal(res.status,200);
 res=response();await cms.publicRoute(request(),res,'/api/public/website-content');assert.equal(JSON.parse(res.payload).content.events.length,0);
 res=response();await cms.manage(request(null,'POST'),res,'/api/website-content/publish',editor);assert.equal(res.status,403);
 res=response();await cms.manage(request(null,'POST'),res,'/api/website-content/publish',admin);assert.equal(res.status,200);
 res=response();await cms.publicRoute(request(),res,'/api/public/website-content');assert.equal(JSON.parse(res.payload).content.events[0].title,'Living Loud');
});
