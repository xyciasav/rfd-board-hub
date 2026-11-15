import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createWebsiteContent} from '../website-content.js';

const request=(body,method='GET')=>({method,async *[Symbol.asyncIterator](){if(body)yield Buffer.from(JSON.stringify(body));}});
const response=()=>({status:0,payload:'',writeHead(status){this.status=status},end(value=''){this.payload=value}});
test('website content keeps drafts private until an administrator publishes',async()=>{
 const db={},sent=[],dir=await mkdtemp(join(tmpdir(),'rfd-site-')),cms=createWebsiteContent({db,dataDir:dir,save:async()=>{},audit:()=>{},sendEmail:async email=>{sent.push(email);return{id:'sent'}}}),editor={name:'Editor',role:'editor'},admin={name:'Admin',role:'admin'};
 assert.equal(db.websiteContent.draft.pages.find(item=>item.status==='page-state:Night-of-the-Living-Loud.html')?.visible,false);
 const registrationNote=`Volunteer & Organization Signups\n\n${'Detailed signup instructions. '.repeat(80)}`;
 const content={events:[{title:'Living Loud',date:'2026-10-30',time:'18:00',location:'City Park',lineup:'Band One\nBand Two',link:'https://tickets.example',buttonLabel:'Reserve your spot',showtimes:[{label:'6:00 PM',url:'https://tickets.example/6'},{label:'8:00 PM',url:'https://tickets.example/8'}],showPopup:true,detailPage:true,registrationEnabled:true,registrationNote,visible:true}],pages:[],civics:[],supporters:[],photos:[],media:[]};let res=response();await cms.manage(request({content},'PUT'),res,'/api/website-content/draft',editor);assert.equal(res.status,200);assert.equal(db.websiteContent.draft.events[0].location,'City Park');assert.equal(db.websiteContent.draft.events[0].buttonLabel,'Reserve your spot');assert.equal(db.websiteContent.draft.events[0].showPopup,true);assert.equal(db.websiteContent.draft.events[0].detailPage,true);assert.equal(db.websiteContent.draft.events[0].showtimes.length,2);assert.equal(db.websiteContent.draft.events[0].registrationNote,registrationNote.trim());
 res=response();await cms.publicRoute(request(),res,'/api/public/website-content');assert.equal(JSON.parse(res.payload).content.events.length,0);
 res=response();await cms.manage(request(null,'POST'),res,'/api/website-content/publish',editor);assert.equal(res.status,403);
 res=response();await cms.manage(request(null,'POST'),res,'/api/website-content/publish',admin);assert.equal(res.status,200);
 res=response();await cms.publicRoute(request(),res,'/api/public/website-content');const published=JSON.parse(res.payload).content.events[0];assert.equal(published.title,'Living Loud');assert.equal(published.date,'2026-10-30T12:00:00');assert.equal(published.dateValue,'2026-10-30');assert.deepEqual(published.showtimes,[{label:'6:00 PM',url:'https://tickets.example/6'},{label:'8:00 PM',url:'https://tickets.example/8'}]);
 const eventId=db.websiteContent.draft.events[0].id;db.signups.push({id:'contact000000001',email:'JANE@example.com'});db.eventRegistrations.push({id:'1234567890abcdef',eventId,eventTitle:'Living Loud',eventDate:'2026-10-30',firstName:'Jane',lastName:'Member',email:'jane@example.com',guests:2,status:'Registered',createdAt:new Date().toISOString()});
 res=response();await cms.manage(request(),res,`/api/website-content/events/${eventId}/registrations`,editor);const registrationDesk=JSON.parse(res.payload);assert.equal(registrationDesk.items.length,1);assert.equal(registrationDesk.items[0].knownContact,true);assert.equal(registrationDesk.items[0].contactId,'contact000000001');
 res=response();await cms.manage(request({enabled:true,subject:'Welcome to {eventTitle}',message:'Hi {firstName}'},'PUT'),res,`/api/website-content/events/${eventId}/email`,editor);assert.equal(res.status,200);
 res=response();await cms.manage(request({subject:'Update: {eventTitle}',message:'Hi {firstName}, changed details.'},'POST'),res,`/api/website-content/events/${eventId}/email-update`,editor);assert.equal(res.status,200);assert.equal(JSON.parse(res.payload).sent,1);assert.equal(sent[0].to,'jane@example.com');assert.equal(sent[0].subject,'Update: Living Loud');
});
