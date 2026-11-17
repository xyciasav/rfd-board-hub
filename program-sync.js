const clean=value=>String(value??'').trim();
const key=value=>clean(value).toLowerCase().replace(/[^a-z0-9]+/g,'');

const websiteItem=(program,existing={})=>({
 ...existing,
 id:clean(program.websiteId)||clean(existing.id)||clean(program.id),
 title:clean(program.title).slice(0,160),
 subtitle:clean(program.subtitle).slice(0,240),
 body:clean(program.description).slice(0,8000),
 image:clean(program.image).slice(0,1000),
 link:clean(program.link).slice(0,1000),
 buttonLabel:clean(program.buttonLabel).slice(0,80),
 visible:program.visible!==false,
 order:Number.isFinite(Number(program.order))?Number(program.order):Number(existing.order)||0
});

export function reconcilePrograms(db){
 db.programs=Array.isArray(db.programs)?db.programs:[];
 const draft=db.websiteContent?.draft;if(!draft)return false;
 draft.programs=Array.isArray(draft.programs)?draft.programs:[];
 let changed=false;
 for(const site of [...draft.programs]){
  let program=db.programs.find(item=>clean(item.websiteId)===site.id||clean(item.id)===site.id||key(item.title)===key(site.title));
  if(!program){program={id:site.id,title:site.title,description:site.body||'',documents:[],websiteId:site.id,subtitle:site.subtitle||'',image:site.image||'',link:site.link||'',buttonLabel:site.buttonLabel||'',visible:site.visible!==false,order:Number(site.order)||0};db.programs.push(program);changed=true;}
  else{const additions={websiteId:site.id,subtitle:program.subtitle??site.subtitle??'',description:program.description||site.body||'',image:program.image??site.image??'',link:program.link??site.link??'',buttonLabel:program.buttonLabel??site.buttonLabel??'',visible:program.visible??site.visible??true,order:Number.isFinite(Number(program.order))?Number(program.order):Number(site.order)||0};for(const [name,value] of Object.entries(additions))if(program[name]!==value){program[name]=value;changed=true;}}
  const next=websiteItem(program,site),index=draft.programs.findIndex(item=>item.id===site.id);if(JSON.stringify(draft.programs[index])!==JSON.stringify(next)){draft.programs[index]=next;changed=true;}
 }
 for(const program of db.programs){if(!draft.programs.some(item=>item.id===program.websiteId||key(item.title)===key(program.title))){const item=websiteItem(program);program.websiteId=item.id;draft.programs.push(item);changed=true;}}
 draft.programs.sort((a,b)=>Number(a.order)-Number(b.order)||a.title.localeCompare(b.title));
 return changed;
}

export function syncProgramToWebsite(db,program){
 const list=db.websiteContent?.draft?.programs;if(!Array.isArray(list))return;
 const index=list.findIndex(item=>item.id===program.websiteId||item.id===program.id||key(item.title)===key(program.title)),existing=index>=0?list[index]:{};
 const next=websiteItem(program,existing);program.websiteId=next.id;
 if(index>=0)list[index]=next;else list.push(next);
 list.sort((a,b)=>Number(a.order)-Number(b.order)||a.title.localeCompare(b.title));
 db.websiteContent.draftUpdatedAt=new Date().toISOString();
}

export function removeProgramFromWebsite(db,program){
 const list=db.websiteContent?.draft?.programs;if(!Array.isArray(list))return;
 db.websiteContent.draft.programs=list.filter(item=>item.id!==program.websiteId&&item.id!==program.id&&key(item.title)!==key(program.title));
 db.websiteContent.draftUpdatedAt=new Date().toISOString();
}
