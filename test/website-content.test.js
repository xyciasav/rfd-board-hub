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
 const content={events:[{title:'Living Loud',date:'2026-10-30',time:'18:00',location:'City Park',lineup:'Band One\nBand Two',showPopup:true,visible:true}],pages:[],civics:[],supporters:[],photos:[]};let res=response();await cms.manage(request({content},'PUT'),res,'/api/website-content/draft',editor);assert.equal(res.status,200);assert.equal(db.websiteContent.draft.events[0].location,'City Park');assert.equal(db.websiteContent.draft.events[0].showPopup,true);
 res=response();await cms.publicRoute(request(),res,'/api/public/website-content');assert.equal(JSON.parse(res.payload).content.events.length,0);
 res=response();await cms.manage(request(null,'POST'),res,'/api/website-content/publish',editor);assert.equal(res.status,403);
 res=response();await cms.manage(request(null,'POST'),res,'/api/website-content/publish',admin);assert.equal(res.status,200);
 res=response();await cms.publicRoute(request(),res,'/api/public/website-content');const published=JSON.parse(res.payload).content.events[0];assert.equal(published.title,'Living Loud');assert.equal(published.date,'2026-10-30T12:00:00');assert.equal(published.dateValue,'2026-10-30');
});
