import {renderInsightsPage as renderBase} from './insights-rich.js';

const metric=(summary,key)=>summary.totals[key]??null;
const fmt=value=>new Intl.NumberFormat('en-US',{notation:Math.abs(value)>=10000?'compact':'standard',maximumFractionDigits:1}).format(value||0);

export async function renderInsightsPage(api,escapeHtml){
  let latest;
  const capture=async(path,options)=>{const result=await api(path,options);if(path.startsWith('/api/insights?'))latest=result.data;return result};
  await renderBase(capture,escapeHtml);
  if(!latest)return;
  await installAutomaticGoals(latest,api);
}

async function installAutomaticGoals(data,api){
  const holder=document.querySelector('#goal-content'),edit=document.querySelector('#edit-targets');
  if(!holder||!edit)return;
  const result=await api('/api/insights-targets'),saved=result.targets||{},days=Math.max(1,data.days||30);
  const values={engagements:data.current.derived.engagements,reach:metric(data.current,'reach')||metric(data.current,'impressions')||0,follows:metric(data.current,'follows')||0,clicks:metric(data.current,'clicks')||0,posts:data.current.postCount};
  const labels={engagements:'Engagements',reach:'Reach',follows:'New follows',clicks:'Clicks',posts:'Posts'};
  const suggested=Object.fromEntries(Object.entries(values).map(([key,value])=>[key,Math.max(1,Math.ceil(value/days*30*1.1))]));
  let targets={...suggested,...Object.fromEntries(Object.entries(saved).filter(([,value])=>Number(value)>0))};
  const render=()=>{holder.innerHTML=`<p class="auto-goal-note">${Object.values(saved).some(Number)?'Using saved 30-day goals.':'Automatic goals are 10% above the current 30-day pace.'}</p>`+Object.keys(labels).map(key=>{const target=targets[key]*days/30,progress=target?values[key]/target*100:0;return`<div class="goal"><span><b>${labels[key]}</b><small>${fmt(values[key])} of ${fmt(target)}</small></span><strong>${progress.toFixed(0)}%</strong><i><em style="width:${Math.min(progress,100)}%"></em></i></div>`}).join('')};
  render();
  edit.onclick=()=>{holder.innerHTML=`<form id="target-form" class="target-form">${Object.entries(labels).map(([key,label])=>`<label>${label}<input type="number" min="0" name="${key}" value="${targets[key]}"></label>`).join('')}<div class="target-actions"><button type="button" id="auto-targets" class="secondary">Use automatic</button><button type="button" id="cancel-targets" class="secondary">Cancel</button><button type="submit">Save goals</button></div></form>`;document.querySelector('#cancel-targets').onclick=render;document.querySelector('#auto-targets').onclick=()=>{targets={...suggested};render()};document.querySelector('#target-form').onsubmit=async event=>{event.preventDefault();const response=await api('/api/insights-targets',{method:'PUT',body:JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))});Object.assign(saved,response.targets);targets={...suggested,...response.targets};render()}};
}
