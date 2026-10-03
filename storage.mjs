import {eggKinds,teaKinds} from './catalog.mjs';
import {salePrice,yuan} from './progression.mjs?v=20261002-peel';
import {stampArt} from './stamps.mjs?v=20261002-fast';

const el=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};

export function initStorage(getState,onAction,toast){
 const $=selector=>document.querySelector(selector),dialog=$('#storage-dialog'),list=$('#storage-list'),status=$('#storage-status');let busy=false;
 function refresh(){
  const state=getState(),inventory=state?.inventory??[],ready=inventory.filter(pair=>pair.phase==='peeled').length;
  $('#storage-count').textContent=inventory.length;$('#mobile-storage-count').textContent=inventory.length;$('#mobile-storage-count').hidden=!inventory.length;
  $('#open-storage').setAttribute('aria-label','储存室，存着 '+inventory.length+' 颗蛋');
  document.querySelector('[data-open="open-storage"]').setAttribute('aria-label','储存室，存着 '+inventory.length+' 颗蛋');
  if(!dialog.open)return;
  $('#storage-summary').textContent=state?'存着 '+inventory.length+' 颗 · 待剥 '+(inventory.length-ready)+' 颗 · 可卖 '+ready+' 颗':'正在打开储存室…';
  $('#storage-swap-note').hidden=!state?.active;list.replaceChildren();
  if(!inventory.length){list.append(el('p',state?'这里还空着。手上的蛋可以暂存，剥好的蛋也能留下慢慢卖。':'稍等一下，小摊正在打开。','storage-empty'));return;}
  for(const pair of inventory){
   const peeled=pair.phase==='peeled',egg=eggKinds[pair.egg],tea=teaKinds[pair.tea],percent=peeled?100:Math.max(0,Math.min(100,Number(pair.progress?.percent)||0));
   const card=el('article',undefined,'storage-card'),head=el('div',undefined,'storage-card-head');card.setAttribute('aria-label',egg.name+' · '+tea.name);card.dataset.phase=peeled?'peeled':'unfinished';
   head.append(el('strong',peeled?'剥好啦':'还在慢慢剥'),el('span',peeled?'可以出售':'暂存中','storage-state'));card.append(head);
   const stamps=el('div',undefined,'storage-stamps');
   for(const [kind,item] of [['egg',egg],['tea',tea]]){
    const stamp=el('div',undefined,'finish-stamp storage-stamp'),art=el('span',undefined,'stamp-art');stamp.dataset.rarity=item.rarity;art.innerHTML=stampArt(kind,item,'lazy');
    stamp.append(art,el('span',item.name,'stamp-name'),el('b',item.rarity,'rarity'));stamps.append(stamp);
   }
   card.append(stamps);
   const progress=el('progress');progress.max=100;progress.value=percent;progress.setAttribute('aria-label','剥壳进度 '+percent+'%');card.append(progress);
   const details=el('div',undefined,'storage-progress');details.append(el('span','剥壳进度 '+percent+'%'),el('span',(pair.progress?.clicks??pair.clicks??0)+' 次轻点'));card.append(details);
   if(peeled){const price=el('p',undefined,'storage-price');price.append(el('span','当前售价'),el('b',yuan(salePrice(pair,state.counts,state.talents,pair.repeat))));card.append(price);}
   else card.append(el('p','继续剥完，才能卖出这颗蛋。','storage-help'));
   const actions=el('div',undefined,'storage-card-actions');
   const actionButton=(action,text,className)=>{const button=el('button',text,className);button.type='button';button.dataset.storageAction=action;button.dataset.id=pair.id;button.disabled=busy||action==='sell'&&!state.talents[0];actions.append(button);return button;};
   actionButton('take',peeled?'取出这颗':'继续剥壳','order-button');
   if(peeled){actionButton('sell','卖出这颗','primary-button');if(!state.talents[0])card.append(el('p','先解锁开摊入门，即可卖蛋。','storage-unlock'));}
   card.append(actions);list.append(card);
  }
 }
 list.addEventListener('click',async event=>{
  const button=event.target.closest('button[data-storage-action]');if(!button||button.disabled||busy)return;
  const action=button.dataset.storageAction,id=button.dataset.id;busy=true;status.textContent=action==='sell'?'正在卖出这颗蛋…':'正在取出这颗蛋…';refresh();
  try{await onAction(action,id);status.textContent='';if(action==='take'){dialog.close();$('#game')?.focus({preventScroll:true});}toast(action==='sell'?'这颗蛋卖出啦，零钱已到账。':'已取出这颗蛋。');}
  catch(error){status.textContent=error.message||'暂时没有完成，请再试一次。';toast(status.textContent);}
  finally{busy=false;refresh();if(dialog.open)list.querySelector('button:not(:disabled)')?.focus({preventScroll:true});}
 });
 $('#open-storage').onclick=()=>{status.textContent='';if(!dialog.open)dialog.showModal();refresh();};
 $('#close-storage').onclick=()=>dialog.close();
 dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();});
 refresh();return refresh;
}
