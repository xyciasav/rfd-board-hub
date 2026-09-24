import { timingSafeEqual, createHash, randomBytes } from 'node:crypto';

export function createWebsiteIntake({db,save,audit,sendWelcome=async()=>{},token=process.env.WEBSITE_SIGNUP_TOKEN,allowedOrigins=process.env.WEBSITE_SIGNUP_ORIGINS||'https://ragefordemocracy.com,https://www.ragefordemocracy.com'}) {
  let queue=Promise.resolve();
  const origins=new Set(String(allowedOrigins).split(',').map(x=>x.trim()).filter(Boolean));
  return async function websiteIntake(req,res) {
    const origin=String(req.headers.origin||''),cors=origin&&origins.has(origin)?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'}:{};
    const reply=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store',...cors});res.end(data===undefined?'':JSON.stringify(data));};
    if(origin&&!origins.has(origin))return reply(403,{error:'Origin not allowed'});
    if(req.method==='OPTIONS')return reply(204);
    if(req.method!=='POST')return reply(405,{error:'Method not allowed'});
    if(!token||token.length<32)return reply(503,{error:'Website signup is not configured'});
    const supplied=String(req.headers.authorization||'').replace(/^Bearer /,'');
    const digest=x=>createHash('sha256').update(x).digest();
    if(!timingSafeEqual(digest(supplied),digest(token)))return reply(401,{error:'Unauthorized'});
    let raw='';
    let b;
    try{
      for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>12000)return reply(413,{error:'Request too large'});}
      b=JSON.parse(raw);
    }catch{return reply(400,{error:'Invalid JSON request.'});}
    try{
      const str=(v,n)=>typeof v==='string'?v.trim().slice(0,n):'';
      const firstName=str(b.firstName,100),lastName=str(b.lastName,100),email=str(b.email,200).toLowerCase(),phone=str(b.phone,30),postalCode=str(b.postalCode,10);
      if(!firstName||!lastName||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||b.consent!==true||!(b.volunteer===true||b.updates===true))return reply(400,{error:'Name, email, consent, and at least one interest are required.'});
      if(phone&&(!/^[0-9()+.\-\s]+$/.test(phone)||phone.replace(/\D/g,'').length<10||phone.replace(/\D/g,'').length>15))return reply(400,{error:'Enter a valid phone number.'});
      if(postalCode&&!/^\d{5}(-\d{4})?$/.test(postalCode))return reply(400,{error:'Enter a valid ZIP code.'});
      const interests=[b.volunteer===true?'Volunteering':'',b.updates===true?'Email updates':'',str(b.interests,500)].filter(Boolean).join('; ');
      const operation=queue.then(async()=>{
        const existing=db.signups.find(x=>String(x.email||'').toLowerCase()===email);
        const consentAt=new Date().toISOString();
        const fields={firstName,lastName,email,phone,postalCode,interests,volunteer:b.volunteer===true,updates:b.updates===true,consent:b.updates===true,contactConsent:true,consentAt,source:'website',capturedBy:'RFD website'};
        let old;
        if(existing){old={...existing};Object.assign(existing,fields);}
        else db.signups.unshift({...fields,id:randomBytes(8).toString('hex'),createdAt:consentAt,donate:false,donationType:'One-time'});
        try{audit({name:'RFD website'},existing?'website signup updated':'website signup added',`${firstName} ${lastName}`);await save();}catch(error){if(existing)Object.assign(existing,old);else db.signups.shift();throw error;}
        return !existing;
      });
      queue=operation.catch(()=>{});const created=await operation;
      let emailWarning='';
      if(created){try{await sendWelcome(db.signups.find(x=>String(x.email||'').toLowerCase()===email));}catch(error){emailWarning=error.message||'Welcome email could not be sent.';}}
      return reply(created?201:200,{ok:true,created,emailWarning});
    }catch(error){console.error('Website signup failed',error);return reply(500,{error:'Unable to save signup. Please try again.'});}
  };
}
