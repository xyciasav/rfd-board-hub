import {createHash,randomBytes} from 'node:crypto';

const clean=value=>String(value??'').trim();
const id=()=>randomBytes(8).toString('hex');
const hash=value=>createHash('sha256').update(String(value)).digest('hex');
const validEmail=value=>/^\S+@\S+\.\S+$/.test(clean(value));

export function createVolunteerPortal({db,save,audit,sendEmail,websiteUrl=process.env.PUBLIC_WEBSITE_URL||'https://ragefordemocracy.com'}){
 db.volunteerOpportunities=Array.isArray(db.volunteerOpportunities)?db.volunteerOpportunities:[];
 db.volunteerCommitments=Array.isArray(db.volunteerCommitments)?db.volunteerCommitments:[];
 db.volunteerAuth=Array.isArray(db.volunteerAuth)?db.volunteerAuth:[];
 const reply=(res,status,data)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(data));};
 const read=async req=>{let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>20000)throw Error('Request too large')}return raw?JSON.parse(raw):{}};
 const shared=req=>{const expected=process.env.WEBSITE_SIGNUP_TOKEN||'',supplied=String(req.headers.authorization||'').replace(/^Bearer /,'');return Boolean(expected&&supplied===expected)};
 const current=req=>{const token=clean(req.headers['x-volunteer-session']);return db.volunteerAuth.find(item=>item.kind==='session'&&item.tokenHash===hash(token)&&new Date(item.expiresAt)>new Date())||null};
 const publicOpportunity=item=>{const taken=db.volunteerCommitments.filter(x=>x.opportunityId===item.id&&x.status!=='Cancelled').length,event=[...(db.websiteContent?.draft?.events||[]),...(db.websiteContent?.published?.events||[])].find(x=>x.id===item.eventId);return{...item,eventTitle:event?.title||'',taken,remaining:item.capacity?Math.max(0,item.capacity-taken):null,full:Boolean(item.capacity&&taken>=item.capacity)}};
 const profile=email=>{const signup=db.signups.find(item=>clean(item.email).toLowerCase()===email);return{email,firstName:signup?.firstName||'',lastName:signup?.lastName||'',phone:signup?.phone||'',contactId:signup?.id||''}};

 async function publicRoute(req,res,url){
  if(!url.startsWith('/api/public/volunteer-'))return false;
  if(!shared(req))return reply(res,401,{error:'Unauthorized'});
  if(url==='/api/public/volunteer-auth/request'&&req.method==='POST'){
   const body=await read(req),email=clean(body.email).toLowerCase().slice(0,200);if(!validEmail(email))return reply(res,400,{error:'Enter a valid email address.'});
   db.volunteerAuth=db.volunteerAuth.filter(item=>new Date(item.expiresAt)>new Date()&&!(item.kind==='login'&&item.email===email));const token=randomBytes(32).toString('hex'),expiresAt=new Date(Date.now()+20*60*1000).toISOString();db.volunteerAuth.push({id:id(),kind:'login',email,tokenHash:hash(token),expiresAt});await save();
   const link=new URL('/volunteer.html',websiteUrl);link.searchParams.set('token',token);await sendEmail({to:email,subject:'Sign in to the RFD volunteer portal',html:`<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#111"><h1>Volunteer with Rage for Democracy</h1><p>Use this secure link to see available opportunities and manage your commitments.</p><p><a href="${link.href}" style="display:inline-block;background:#e41e2b;color:#fff;padding:14px 20px;text-decoration:none;font-weight:bold">Open volunteer portal</a></p><p>This link expires in 20 minutes. If you did not request it, you can ignore this email.</p></div>`});
   return reply(res,200,{ok:true});
  }
  if(url==='/api/public/volunteer-auth/verify'&&req.method==='POST'){
   const body=await read(req),login=db.volunteerAuth.find(item=>item.kind==='login'&&item.tokenHash===hash(clean(body.token))&&new Date(item.expiresAt)>new Date());if(!login)return reply(res,401,{error:'This sign-in link is invalid or expired.'});
   const token=randomBytes(32).toString('hex'),expiresAt=new Date(Date.now()+30*86400000).toISOString();db.volunteerAuth=db.volunteerAuth.filter(item=>item!==login);db.volunteerAuth.push({id:id(),kind:'session',email:login.email,tokenHash:hash(token),expiresAt});await save();return reply(res,200,{session:token,profile:profile(login.email)});
  }
  const account=current(req);if(!account)return reply(res,401,{error:'Sign in to continue.'});
  if(url==='/api/public/volunteer-portal'&&req.method==='GET'){const opportunities=db.volunteerOpportunities.filter(item=>item.visible!==false&&(!item.date||item.date>=new Date().toISOString().slice(0,10))).sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.startTime).localeCompare(String(b.startTime))).map(publicOpportunity),commitments=db.volunteerCommitments.filter(item=>item.email===account.email&&item.status!=='Cancelled');return reply(res,200,{profile:profile(account.email),opportunities,commitments});}
  if(url==='/api/public/volunteer-commitments'&&req.method==='POST'){
   const body=await read(req),opportunity=db.volunteerOpportunities.find(item=>item.id===clean(body.opportunityId)&&item.visible!==false);if(!opportunity)return reply(res,404,{error:'That opportunity is no longer available.'});const state=publicOpportunity(opportunity);if(state.full)return reply(res,409,{error:'That shift is full.'});if(db.volunteerCommitments.some(item=>item.opportunityId===opportunity.id&&item.email===account.email&&item.status!=='Cancelled'))return reply(res,409,{error:'You already claimed this shift.'});const person=profile(account.email),item={id:id(),opportunityId:opportunity.id,email:account.email,firstName:person.firstName,lastName:person.lastName,phone:person.phone,status:'Confirmed',createdAt:new Date().toISOString()};db.volunteerCommitments.unshift(item);audit({name:`Volunteer: ${account.email}`},'volunteer.commitment',opportunity.title);await save();return reply(res,201,{ok:true,item});
  }
  const cancel=url.match(/^\/api\/public\/volunteer-commitments\/([a-f0-9]{16})$/);if(cancel&&req.method==='DELETE'){const item=db.volunteerCommitments.find(x=>x.id===cancel[1]&&x.email===account.email);if(!item)return reply(res,404,{error:'Commitment not found.'});item.status='Cancelled';item.cancelledAt=new Date().toISOString();await save();return reply(res,200,{ok:true});}
  return reply(res,404,{error:'Not found'});
 }

 async function manage(req,res,url,user){
  if(url==='/api/volunteer-portal'&&req.method==='GET')return reply(res,200,{opportunities:db.volunteerOpportunities.map(publicOpportunity),commitments:db.volunteerCommitments,events:(db.websiteContent?.draft?.events||[]).map(event=>({id:event.id,title:event.title,date:event.date}))});
  if(url==='/api/volunteer-opportunities'&&req.method==='POST'){const body=await read(req),item={id:id(),title:clean(body.title).slice(0,160),description:clean(body.description).slice(0,2000),program:clean(body.program).slice(0,160),eventId:clean(body.eventId).slice(0,100),date:clean(body.date).slice(0,10),startTime:clean(body.startTime).slice(0,5),endTime:clean(body.endTime).slice(0,5),location:clean(body.location).slice(0,300),capacity:Math.max(0,Math.min(1000,Number(body.capacity)||0)),visible:body.visible!==false,createdAt:new Date().toISOString()};if(!item.title||!item.date)return reply(res,400,{error:'Title and date are required.'});db.volunteerOpportunities.unshift(item);audit(user,'volunteer.opportunity.create',item.title);await save();return reply(res,201,item);}
  const opportunity=url.match(/^\/api\/volunteer-opportunities\/([a-f0-9]{16})$/);if(opportunity){const index=db.volunteerOpportunities.findIndex(x=>x.id===opportunity[1]);if(index<0)return reply(res,404,{error:'Opportunity not found'});if(req.method==='PUT'){const body=await read(req),old=db.volunteerOpportunities[index],next={...old,...body,id:old.id,title:clean(body.title??old.title).slice(0,160),description:clean(body.description??old.description).slice(0,2000),capacity:Math.max(0,Math.min(1000,Number(body.capacity??old.capacity)||0)),visible:body.visible!==false};db.volunteerOpportunities[index]=next;await save();return reply(res,200,next)}if(req.method==='DELETE'){db.volunteerOpportunities.splice(index,1);db.volunteerCommitments=db.volunteerCommitments.filter(x=>x.opportunityId!==opportunity[1]);await save();return reply(res,200,{ok:true})}}
  const commitment=url.match(/^\/api\/volunteer-commitments\/([a-f0-9]{16})$/);if(commitment&&req.method==='PUT'){const item=db.volunteerCommitments.find(x=>x.id===commitment[1]);if(!item)return reply(res,404,{error:'Commitment not found'});const body=await read(req),opportunity=db.volunteerOpportunities.find(x=>x.id===item.opportunityId);item.status=['Confirmed','Checked in','Completed','No-show','Cancelled'].includes(body.status)?body.status:item.status;item.minutes=Math.max(0,Math.min(1440,Number(body.minutes)||0));if(item.status==='Completed'&&!item.hoursRecordId){const record={id:id(),name:[item.firstName,item.lastName].filter(Boolean).join(' ')||item.email,email:item.email,date:opportunity?.date||new Date().toISOString().slice(0,10),organization:'Rage for Democracy',activity:opportunity?.title||'Volunteer service',minutes:item.minutes,verifiedBy:user.name,notes:`Recorded from volunteer portal shift${opportunity?.program?` · ${opportunity.program}`:''}`};db.volunteers.unshift(record);item.hoursRecordId=record.id}await save();return reply(res,200,item)}
  return false;
 }
 return{publicRoute,manage};
}
