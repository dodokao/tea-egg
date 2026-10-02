import {eggKinds,teaKinds} from './catalog.mjs';
import {stampArt} from './stamps.mjs?v=20261002-fast';
import {talents,rarityOrder} from './progression.mjs';
const $=s=>document.querySelector(s);let kind='egg';
$('#catalog-summary').textContent=`${eggKinds.length} 种蛋 · ${teaKinds.filter(item=>!item.retired).length} 种茶。这里展示每一枚印章的完整样子。`;
function render(){
  const items=kind==='egg'?eggKinds:teaKinds,grade=$('#rarity-filter').value,search=$('#stamp-search').value.trim();
  const shown=items.filter(item=>!item.retired&&(!grade||item.rarity===grade)&&item.name.includes(search)).sort((a,b)=>rarityOrder.indexOf(a.rarity)-rarityOrder.indexOf(b.rarity));
  $('#all-stamps').replaceChildren(...shown.map(item=>{
    const entry=document.createElement('article');entry.className='catalog-entry';
    entry.innerHTML=`<div class="stamp catalog-stamp" data-rarity="${item.rarity}" style="--stamp-fill:${kind==='egg'?item.stampColor:item.color}"><span class="stamp-art">${stampArt(kind,item,'lazy')}</span><span class="stamp-name">${item.name}</span><b class="rarity">${item.rarity}</b></div><p class="stamp-intro">${item.description}</p>`;
    if(item.unlockTalent){const note=document.createElement('small');note.textContent=`点亮「${talents[item.unlockTalent].name}」后可随机进货`;entry.append(note);}
    return entry;
  }));
  if(!shown.length)$('#all-stamps').textContent='还没找到这枚印章，换个名字看看。';
}
document.querySelectorAll('[data-kind]').forEach(button=>button.onclick=()=>{kind=button.dataset.kind;document.querySelectorAll('[data-kind]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));render();});
$('#rarity-filter').onchange=render;$('#stamp-search').oninput=render;render();
