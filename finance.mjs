import {fetch} from './local-api.mjs';
import {yuan} from './progression.mjs';
const el=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
const signed=n=>(n>=0?'+':'−')+yuan(Math.abs(n));
export function balancePoints(entries){if(!entries.length)return [];const ordered=[...entries].reverse();return [{balance:ordered[0].balance-ordered[0].amount,created:ordered[0].created,detail:{title:'期初余额'}},...ordered];}
export function initFinance(){
 const $=s=>document.querySelector(s),dialog=$('#finance-dialog');let data=null,busy=false;
 function chart(){
  const holder=$('#balance-chart');holder.replaceChildren();const points=balancePoints(data.entries);
  if(!points.length){holder.append(el('p','还没有交易记录。买一颗蛋，让曲线开始生长。','finance-empty'));return;}
  const values=points.map(p=>p.balance),low=Math.min(...values),high=Math.max(...values),span=Math.max(100,high-low),ns='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 700 240');svg.setAttribute('role','img');svg.setAttribute('aria-label','余额折线图，期初 '+yuan(values[0])+'，最新 '+yuan(values.at(-1))+'，最低 '+yuan(low)+'，最高 '+yuan(high));
  const make=(tag,attrs,text)=>{const n=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;svg.append(n);return n;};
  for(let i=0;i<4;i++){const y=24+i*54;make('line',{x1:80,x2:674,y1:y,y2:y,stroke:'#dce3d7','stroke-dasharray':'4 5'});make('text',{x:70,y:y+4,'text-anchor':'end',fill:'#84917e','font-size':12},yuan(low+span*(1-i/3)));}
  const coords=points.map((p,i)=>[80+i/(points.length-1)*594,186-(p.balance-low)/span*162]);
  make('path',{d:'M'+coords.map(p=>p.join(',')).join(' L')+' L674,186 L80,186 Z',fill:'#809879',opacity:'.12'});
  make('polyline',{points:coords.map(p=>p.join(',')).join(' '),fill:'none',stroke:'#617d5b','stroke-width':3,'stroke-linejoin':'round','stroke-linecap':'round'});
  coords.forEach(([x,y],i)=>{const dot=make('circle',{cx:x,cy:y,r:i===coords.length-1?5:3,fill:'#617d5b',tabindex:0});const title=document.createElementNS(ns,'title');title.textContent=points[i].detail.title+' · '+yuan(points[i].balance)+' · '+new Date(points[i].created).toLocaleString('zh-CN');dot.append(title);dot.setAttribute('aria-label',title.textContent);});
  make('text',{x:80,y:221,fill:'#84917e','font-size':12},'期初 '+yuan(values[0]));make('text',{x:674,y:221,'text-anchor':'end',fill:'#617d5b','font-size':12},'最新 '+yuan(values.at(-1)));
  holder.append(svg);const extrema=el('div',undefined,'finance-extrema');extrema.append(el('span','最低 '+yuan(low)),el('span','最高 '+yuan(high)));holder.append(extrema);
 }
 function entries(){
  const list=$('#finance-entries'),filter=$('#finance-filter').value;list.replaceChildren();
  const rows=data.entries.filter(r=>filter==='all'||filter==='income'&&r.amount>0||filter==='expense'&&r.amount<0||r.action===filter);
  if(!rows.length){list.append(el('p','暂无此类交易','finance-empty'));return;}
  for(const row of rows){const item=el('details',undefined,'finance-entry'),summary=el('summary'),info=el('div');info.append(el('strong',row.detail.title),el('small',new Date(row.created).toLocaleString('zh-CN')+' · 展开明细'));const money=el('div',undefined,row.amount>=0?'finance-in':'finance-out');money.append(el('strong',signed(row.amount)),el('small','余额 '+yuan(row.balance)));summary.append(info,money);item.append(summary);
   const detail=el('div',undefined,'finance-breakdown');
   const line=(label,value)=>{const n=el('div');n.append(el('span',label),el('b',value));detail.append(n);};
   if(row.action==='sell'){detail.append(el('p',row.detail.egg+' × '+row.detail.tea));for(const part of row.detail.lines)line(part.label,signed(part.amount));line('卖蛋收入',yuan(row.detail.price));line('对应进货成本','−'+yuan(row.detail.cost));line('本颗经营利润',signed(row.detail.profit));}
   else if(row.action==='buy'){detail.append(el('p',row.detail.egg+' × '+row.detail.tea));line('进货成本',yuan(-row.amount-(row.detail.fee??0)));if(row.detail.fee)line('指定原料费用',yuan(row.detail.fee));}
   else if(row.action==='talent'){line('点亮层数','第 '+row.detail.rank+' 层');line('技能投入',yuan(-row.amount));}
   else if(row.action==='redeem'){line('礼品码',row.detail.code);line('奖励到账',signed(row.amount));}
   item.append(detail);list.append(item);
  }
 }
 function render(){const t=data.totals,m=$('#finance-metrics');m.replaceChildren();for(const [label,value] of [['当前余额',data.money],['累计收入',t.income],['累计支出',t.expense],['卖蛋经营利润',t.profit]]){const card=el('div');card.append(el('small',label),el('strong',yuan(value)));m.append(card);}const a=$('#finance-analysis');a.replaceChildren();for(const [label,value] of [['已卖出',t.sold+' 颗'],['礼品奖励',yuan(t.gifts)],['进货投入',yuan(t.purchases)],['技能投入',yuan(t.skills)]]){const n=el('div');n.append(el('span',label),el('b',value));a.append(n);}chart();entries();$('#finance-content').hidden=false;}
 async function load(){if(busy)return;busy=true;$('#refresh-finance').disabled=true;$('#finance-status').textContent='正在翻开账本…';try{const r=await fetch('/api/finance',{cache:'no-store'});if(!r.ok)throw Error('账本暂时没有连上，请再试一次。');data=await r.json();render();$('#finance-status').textContent='';}catch(e){$('#finance-status').textContent=e.message;}finally{busy=false;$('#refresh-finance').disabled=false;}}
 $('#open-finance').onclick=()=>{dialog.showModal();void load();};$('#close-finance').onclick=()=>dialog.close();$('#refresh-finance').onclick=load;$('#finance-filter').onchange=()=>{if(data)entries();};
}
