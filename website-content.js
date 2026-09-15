import {mkdir,readFile,writeFile,unlink} from 'node:fs/promises';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';

const id=()=>randomBytes(8).toString('hex'),clean=v=>String(v??'').trim();
const sections=['events','pages','civics','supporters','photos'];
const blank=()=>Object.fromEntries(sections.map(section=>[section,[]]));
const safeItem=(value={})=>({id:clean(value.id)||id(),title:clean(value.title).slice(0,160),subtitle:clean(value.subtitle).slice(0,240),body:clean(value.body).slice(0,8000),link:clean(value.link).slice(0,1000),image:clean(value.image).slice(0,1000),date:clean(value.date).slice(0,40),visible:value.visible!==false,order:Number.isFinite(Number(value.order))?Number(value.order):0});
const safeContent=value=>Object.fromEntries(sections.map(section=>[section,(Array.isArray(value?.[section])?value[section]:[]).slice(0,200).map(safeItem)]));

export function createWebsiteContent({db,save,audit,dataDir}){
  db.websiteContent=db.websiteContent&&typeof db.websiteContent==='object'?db.websiteContent:{draft:blank(),published:blank(),history:[]};
  db.websiteContent.draft=safeContent(db.websiteContent.draft);db.websiteContent.published=safeContent(db.websiteContent.published);db.websiteContent.history=Array.isArray(db.websiteContent.history)?db.websiteContent.history:[];
  const reply=(res,status,data,headers={})=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store',...headers});res.end(JSON.stringify(data));};
  async function publicRoute(req,res,url){
    if(url==='/api/public/website-content'&&req.method==='GET')return reply(res,200,{publishedAt:db.websiteContent.publishedAt||null,content:db.websiteContent.published},{'access-control-allow-origin':'*','cache-control':'public, max-age=60'});
    const match=url.match(/^\/api\/public\/website-assets\/([a-f0-9]{16}\.(?:jpg|png|webp|pdf))$/);if(match&&req.method==='GET'){try{const bytes=await readFile(join(dataDir,'website-assets',match[1])),ext=match[1].split('.').pop(),mime={jpg:'image/jpeg',png:'image/png',webp:'image/webp',pdf:'application/pdf'}[ext];res.writeHead(200,{'content-type':mime,'content-length':bytes.length,'cache-control':'public, max-age=86400','x-content-type-options':'nosniff'});return res.end(bytes)}catch{return reply(res,404,{error:'Asset not found'})}}
    return false;
  }
  async function manage(req,res,url,user){
    if(url==='/api/website-content'&&req.method==='GET')return reply(res,200,db.websiteContent);
    if(url==='/api/website-content/draft'&&req.method==='PUT'){const body=await readJson(req);db.websiteContent.draft=safeContent(body.content);db.websiteContent.draftUpdatedAt=new Date().toISOString();db.websiteContent.draftUpdatedBy=user.name;audit(user,'website.draft','Website content');await save();return reply(res,200,db.websiteContent)}
    if(url==='/api/website-content/publish'&&req.method==='POST'){if(user.role!=='admin')return reply(res,403,{error:'Administrator access is required to publish the website.'});const now=new Date().toISOString();if(db.websiteContent.publishedAt)db.websiteContent.history.unshift({id:id(),publishedAt:db.websiteContent.publishedAt,publishedBy:db.websiteContent.publishedBy||'Board member',content:db.websiteContent.published});db.websiteContent.history=db.websiteContent.history.slice(0,10);db.websiteContent.published=structuredClone(db.websiteContent.draft);db.websiteContent.publishedAt=now;db.websiteContent.publishedBy=user.name;audit(user,'website.publish','Website content');await save();return reply(res,200,db.websiteContent)}
    const restore=url.match(/^\/api\/website-content\/restore\/([a-f0-9]{16})$/);if(restore&&req.method==='POST'){if(user.role!=='admin')return reply(res,403,{error:'Administrator access is required to restore a version.'});const version=db.websiteContent.history.find(x=>x.id===restore[1]);if(!version)return reply(res,404,{error:'Version not found'});db.websiteContent.draft=structuredClone(version.content);db.websiteContent.draftUpdatedAt=new Date().toISOString();db.websiteContent.draftUpdatedBy=user.name;audit(user,'website.restore',version.publishedAt);await save();return reply(res,200,db.websiteContent)}
    if(url==='/api/website-content/assets'&&req.method==='POST'){const body=await readJson(req),mime=clean(body.mime).toLowerCase(),extensions={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','application/pdf':'pdf'},ext=extensions[mime];if(!ext)return reply(res,400,{error:'Assets must be JPG, PNG, WebP, or PDF.'});const bytes=Buffer.from(clean(body.data).replace(/^data:[^;]+;base64,/,''),'base64');if(!bytes.length||bytes.length>20_000_000)return reply(res,400,{error:'Asset must be 20 MB or smaller.'});const stored=`${id()}.${ext}`;await mkdir(join(dataDir,'website-assets'),{recursive:true});await writeFile(join(dataDir,'website-assets',stored),bytes);return reply(res,201,{url:`/api/public/website-assets/${stored}`,name:clean(body.name).slice(0,180),mime,size:bytes.length})}
    const asset=url.match(/^\/api\/website-content\/assets\/([a-f0-9]{16}\.(?:jpg|png|webp|pdf))$/);if(asset&&req.method==='DELETE'){await unlink(join(dataDir,'website-assets',asset[1])).catch(()=>{});return reply(res,200,{ok:true})}
    return false;
  }
  return {publicRoute,manage};
}
async function readJson(req){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>30_000_000)throw Error('Request too large')}return raw?JSON.parse(raw):{}}
