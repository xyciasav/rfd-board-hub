import test from 'node:test';
import assert from 'node:assert/strict';
import {createWebsiteIntake} from '../website-intake.js';

const token='a-secure-website-intake-token-123456';
function request(body,{method='POST',authorization=`Bearer ${token}`,origin='https://ragefordemocracy.com'}={}){
  return {method,headers:{authorization,origin},async *[Symbol.asyncIterator](){if(body!==undefined)yield Buffer.from(JSON.stringify(body));}};
}
function response(){return {status:0,headers:{},payload:'',writeHead(status,headers){this.status=status;this.headers=headers;},end(payload=''){this.payload=payload;}};}
const valid={firstName:'Jane',lastName:'Member',email:'JANE@example.com',phone:'925-555-0100',postalCode:'94513',volunteer:true,updates:true,consent:true,interests:'Civic education'};

test('website intake creates and then updates one contact per email',async()=>{
  const db={signups:[]},actions=[],handler=createWebsiteIntake({db,token,save:async()=>{},audit:(...args)=>actions.push(args)});
  let res=response();await handler(request(valid),res);assert.equal(res.status,201);assert.equal(db.signups.length,1);assert.equal(db.signups[0].email,'jane@example.com');
  res=response();await handler(request({...valid,phone:'925-555-0199'}),res);assert.equal(res.status,200);assert.equal(db.signups.length,1);assert.equal(db.signups[0].phone,'925-555-0199');assert.equal(actions.length,2);
});

test('website intake rejects missing authentication and invalid contact data',async()=>{
  const db={signups:[]},handler=createWebsiteIntake({db,token,save:async()=>{},audit:()=>{}});
  let res=response();await handler(request(valid,{authorization:''}),res);assert.equal(res.status,401);
  res=response();await handler(request({...valid,postalCode:'garbage'}),res);assert.equal(res.status,400);assert.equal(db.signups.length,0);
});

test('website intake handles approved CORS preflight and rejects unknown origins',async()=>{
  const handler=createWebsiteIntake({db:{signups:[]},token,save:async()=>{},audit:()=>{}});
  let res=response();await handler(request(undefined,{method:'OPTIONS'}),res);assert.equal(res.status,204);assert.equal(res.headers['Access-Control-Allow-Origin'],'https://ragefordemocracy.com');
  res=response();await handler(request(valid,{origin:'https://example.com'}),res);assert.equal(res.status,403);
});

test('website intake sends one welcome email only for a new contact',async()=>{
  const db={signups:[]},sent=[],handler=createWebsiteIntake({db,token,save:async()=>{},audit:()=>{},sendWelcome:async item=>sent.push(item.email)});
  let res=response();await handler(request(valid),res);assert.equal(res.status,201);assert.deepEqual(sent,['jane@example.com']);
  res=response();await handler(request({...valid,phone:'925-555-0199'}),res);assert.equal(res.status,200);assert.deepEqual(sent,['jane@example.com']);
});

test('website intake keeps the signup when welcome email delivery fails',async()=>{
  const db={signups:[]},handler=createWebsiteIntake({db,token,save:async()=>{},audit:()=>{},sendWelcome:async()=>{throw Error('Email service unavailable')}});
  const res=response();await handler(request(valid),res);const result=JSON.parse(res.payload);assert.equal(res.status,201);assert.equal(db.signups.length,1);assert.equal(result.emailWarning,'Email service unavailable');
});

test('website intake stores donation choice and returns checkout configuration',async()=>{
  const db={signups:[],integrations:{donations:{oneTimeUrl:'https://square.example/once',recurringUrl:'https://square.example/monthly'}}},handler=createWebsiteIntake({db,token,save:async()=>{},audit:()=>{}});
  const res=response();await handler(request({...valid,donate:true,donationType:'recurring'}),res);const result=JSON.parse(res.payload);assert.equal(db.signups[0].donate,true);assert.equal(db.signups[0].donationType,'Recurring');assert.equal(result.donations.recurringUrl,'https://square.example/monthly');
});
