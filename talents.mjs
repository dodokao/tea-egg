import {talents,routes,yuan,eggCost} from './progression.mjs';
const talentIcons={
  store:'M3 10h18l-2-6H5l-2 6Zm2 0v10h14V10M9 20v-6h6v6M3 10q2 4 4 0 2 4 5 0 2 4 5 0 2 4 4 0',
  hammer:'m5 20 9-9m-4-4 4-4 7 7-4 4-7-7Z',
  split:'M12 3c-5 0-8 8-8 12a8 8 0 0 0 16 0c0-4-3-12-8-12Zm0 0-2 6 4 3-4 4 2 7',
  layers:'m12 3 10 5-10 5L2 8l10-5Zm-9 10 9 5 9-5M3 18l9 5 9-5',
  unlink:'m9 15-2 2a4 4 0 0 1-5-5l3-3m10 0 2-2a4 4 0 0 1 5 5l-3 3M8 3v3M3 8h3m10 10v3m2-5h3',
  link:'m8 13 5-5m-3 8-2 2a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m0 8a4 4 0 0 0 6 0l4-4a4 4 0 0 0-6-6l-2 2',
  search:'M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0Zm-2 5 7 7',
  egg:'M12 3c-5 0-8 8-8 12a8 8 0 0 0 16 0c0-4-3-12-8-12Z',
  bird:'M3 18c5 2 14 0 14-7V7l4-1-4-2c-4-3-8 1-8 5l-6 9Zm6-6 5-3m-4 10-1 3m6-4 1 4m-1-16h.1',
  leaf:'M4 20C1 8 10 3 21 3c0 11-5 20-17 17Zm0 0L17 7m-8 9v-5m4 1h5',
  sparkles:'m12 3 3 6 6 3-6 3-3 6-3-6-6-3 6-3 3-6Zm-8 0v4M2 5h4m14 13v4m-2-2h4',
  coins:'M17 7a7 4 0 1 1-14 0 7 4 0 0 1 14 0ZM3 7v6c0 5 14 5 14 0V7m0 5c7 0 7 5 0 5m-7 0v3c0 4 11 4 11 0v-6',
  'badge-dollar-sign':'m12 2 3 3 4 1 1 4 2 2-2 3-1 4-4 1-3 2-3-2-4-1-1-4-2-3 2-2 1-4 4-1 3-3Zm0 5v10m3-8c-5-3-8 2-3 3s2 6-3 3',
  crown:'m3 6 5 5 4-8 4 8 5-5-2 13H5L3 6Zm2 10h14',
  'cup-soda':'M5 7h12l-2 14H7L5 7Zm3-3h9M13 7l3-5m1 8h2c4 0 3 7-3 7',
  award:'M17 8a5 5 0 1 1-10 0 5 5 0 0 1 10 0Zm-9 4-2 10 6-3 6 3-2-10',
  stamp:'M8 3h8v6l-2 3v3H10v-3L8 9V3Zm-3 13h14v5H5v-5Zm-2 6h18',
  'book-open':'M12 6C8 3 4 3 2 4v15c4-1 7 0 10 2 3-2 6-3 10-2V4c-3-1-6-1-10 2Zm0 0v15M5 8h4m-4 4h4m6-4h4m-4 4h4',
  medal:'m7 3 5 7 5-7M4 3h6l2 5 2-5h6l-5 9M18 16a6 6 0 1 1-12 0 6 6 0 0 1 12 0Zm-6-3 1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2Z',
  notebook:'M6 3h14v18H6V3Zm-3 3h5m-5 4h5m-5 4h5m-5 4h5m3-11h5m-5 4h5m-5 4h3',
  trophy:'M7 3h10v7c0 7-10 7-10 0V3Zm0 2H3v3c0 4 4 5 5 5m9-8h4v3c0 4-4 5-5 5m-4 2v6m-5 0h10',
  droplets:'M9 2c-1 4-6 7-6 11a6 6 0 0 0 12 0c0-4-5-7-6-11Zm9 8c-1 3-3 5-3 7a4 4 0 0 0 8 0c0-2-4-5-5-7Z',
  hand:'M8 13V5a2 2 0 0 1 4 0v7-4a2 2 0 0 1 4 0v5-2a2 2 0 0 1 4 0v6c0 7-8 7-11 3l-5-6c-2-3 1-5 3-2l1 1',
  package:'m12 2 10 5v10l-10 5-10-5V7l10-5Zm0 10v10M2 7l10 5 10-5M7 4l10 5v4',
  wind:'M3 8h12c7 0 6-8 1-5M3 12h17c5 0 4 8-1 6M3 16h8c4 0 4 6 0 5',
  compass:'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Zm-7-3-2 6-6 2 2-6 6-2Z',
  bookmark:'M6 3h12v19l-6-4-6 4V3Zm3 5h6m-6 4h6',
  zap:'m13 2-9 12h7l-1 8 10-13h-8l1-7Z',
  gem:'m7 3-5 6 10 13L22 9l-5-6H7Zm-5 6h20M7 3l5 19 5-19',
  'heart-handshake':'M12 5C5-3-4 9 12 21 28 9 19-3 12 5Zm-8 5 5 1 3-3 6 5-3 3-5-3m-3 1 5 4',
};
export function talentIcon(icon){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="'+talentIcons[icon]+'"/></svg>';}
export function talentLayout(width) {
  const narrow=width<480,height=narrow?636:width,cx=width/2,cy=height/2,rx=cx-34,ry=cy-34,points=[{x:cx,y:cy,color:'#788875'}];
  const children=id=>talents.filter(t=>t.parent===id);
  function place(id,radius,angle,color){const a=angle*Math.PI/180;points[id]={x:cx+Math.cos(a)*rx*radius,y:cy+Math.sin(a)*ry*radius,color};}
  function fold(id,u,v,route){const a=route.angle*Math.PI/180;points[id]={x:cx+(Math.cos(a)*u-Math.sin(a)*v)*(width-44)/274,y:cy+Math.sin(a)*u+Math.cos(a)*v,color:route.color};}
  for(const route of routes){
    const horizontal=route.angle===0||route.angle===180;
    if(narrow)fold(route.id,horizontal?48:64,0,route);else place(route.id,.27,route.angle,route.color);
    route.branches.forEach((id,index)=>{
      const offset=[0,27,-27][index],sign=index===1?1:-1,leaves=children(id);
      if(narrow)fold(id,index===0?(horizontal?96:138):(horizontal?72:160),index===0?0:sign*(horizontal?110:76),route);else place(id,.51,route.angle+offset,route.color);
      leaves.forEach((leaf,i)=>{
        const spread=leaves.length===2?(i===0?-10:10):0;
        if(narrow)fold(leaf.id,index===0?(horizontal?132:leaves.length===2?248:212):(horizontal?132:252),index===0?(leaves.length===2?(i===0?-28:28):horizontal?48:0):sign*(horizontal?185:88),route);else place(leaf.id,index===0?(leaves.length===2?.85:.755):.8,route.angle+offset+spread,route.color);
        for(const end of children(leaf.id)){if(narrow)fold(end.id,horizontal?132:286,horizontal?100:0,route);else place(end.id,1,route.angle+offset+spread,route.color);}
      });
    });
  }
  return {height,points};
}
export function zoomTalentView(view,scale,from,to,width,height,size) {
  const min=Math.min(width/size,height/size),s=Math.max(min,Math.min(2.5,scale));
  const constrain=(value,space)=>space>=0?space/2:Math.max(space,Math.min(0,value));
  return {scale:s,x:constrain(to.x-(from.x-view.x)*s/view.scale,width-size*s),y:constrain(to.y-(from.y-view.y)*s/view.scale,height-size*s)};
}
export function initTalents(getState,buy,onError) {
  const dialog=document.querySelector('#talent-dialog'),board=dialog.querySelector('.talent-board'),svg=board.querySelector('svg'),detail=dialog.querySelector('.talent-detail'),nodes=[];
  let selected=0,busy=false;
  const scroller=dialog.querySelector('.talent-scroller'),controls=document.createElement('div');
  scroller.classList.add('zoomable');scroller.id='skill-tree';controls.className='talent-zoom-controls';
  controls.innerHTML='<button type="button" aria-label="缩小技能图">−</button><button type="button" class="zoom-fit">查看全貌</button><button type="button" aria-label="放大技能图">＋</button><output aria-live="polite"></output>';scroller.before(controls);
  let view={scale:1,x:0,y:0},size=640,gesture=null,ignoreClickUntil=0,gestureMoved=false;
  const pointers=new Map(),center=()=>({x:scroller.clientWidth/2,y:scroller.clientHeight/2});
  function paint(){board.style.transform=`translate(${view.x}px,${view.y}px) scale(${view.scale})`;controls.querySelector('output').textContent=Math.round(view.scale*100)+'%';}
  function zoom(scale,from=center(),to=from){view=zoomTalentView(view,scale,from,to,scroller.clientWidth,scroller.clientHeight,size);paint();}
  function fit(){const c=center();view={scale:Math.min(scroller.clientWidth/size,scroller.clientHeight/size),x:0,y:0};zoom(view.scale,c);}
  controls.children[0].onclick=()=>zoom(view.scale/1.25);controls.children[1].onclick=fit;controls.children[2].onclick=()=>zoom(view.scale*1.25);
  const local=e=>{const r=scroller.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};};
  const point=e=>({x:e.clientX,y:e.clientY});
  function baseline(){const rect=scroller.getBoundingClientRect(),p=[...pointers.values()].map(p=>({x:p.x-rect.left,y:p.y-rect.top}));gesture=p.length?{rect,scrollTop:dialog.scrollTop,view:{...view},point:p[0],mid:p.length>1?{x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2}:p[0],distance:p.length>1?Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y):0}:null;}
  scroller.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;if(!pointers.size)gestureMoved=false;pointers.set(e.pointerId,point(e));(e.target.closest('button')||scroller).setPointerCapture(e.pointerId);if(pointers.size>1){gestureMoved=true;ignoreClickUntil=Date.now()+400;}baseline();});
  scroller.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId)||!gesture)return;pointers.set(e.pointerId,point(e));const p=[...pointers.values()].map(p=>({x:p.x-gesture.rect.left,y:p.y-gesture.rect.top}));view={...gesture.view};if(p.length>1){gestureMoved=true;ignoreClickUntil=Date.now()+400;const mid={x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2},distance=Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y);zoom(gesture.distance>0?gesture.view.scale*distance/gesture.distance:gesture.view.scale,gesture.mid,mid);}else{const dx=p[0].x-gesture.point.x,dy=p[0].y-gesture.point.y;if(Math.hypot(dx,dy)>6){gestureMoved=true;ignoreClickUntil=Date.now()+400;}zoom(view.scale,gesture.point,p[0]);if(gestureMoved&&e.pointerType!=='mouse')dialog.scrollTop=gesture.scrollTop-dy+(view.y-gesture.view.y);}});
  function end(e){if(!pointers.has(e.pointerId))return;if(gestureMoved)ignoreClickUntil=Date.now()+400;pointers.delete(e.pointerId);baseline();}
  scroller.addEventListener('pointerup',end);scroller.addEventListener('pointercancel',end);scroller.addEventListener('lostpointercapture',end);
  scroller.addEventListener('click',e=>{if(Date.now()<ignoreClickUntil){e.preventDefault();e.stopImmediatePropagation();}},true);
  scroller.addEventListener('wheel',e=>{if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();zoom(view.scale*Math.exp(-e.deltaY*.002),local(e));},{passive:false});
  const guide=document.createElement('div');guide.className='talent-guide';guide.innerHTML='<strong>解锁卖蛋 · 点亮你的小摊</strong><p>「开摊入门」是技能树的中心。免费点亮后，就能把刚刚剥好的蛋卖出去，收到第一笔收入。</p><button class="primary-button">免费点亮「开摊入门」 →</button>';dialog.querySelector('.talent-summary').after(guide);
  guide.querySelector('button').onclick=()=>{selected=0;render();detail.querySelector('button').click();};
  for(const t of talents){const node=document.createElement('button');node.className='talent-node';node.dataset.id=t.id;node.innerHTML=`<span class="talent-symbol" aria-hidden="true">${talentIcon(t.icon)}</span><small></small><span class="talent-name">${t.name}</span>`;node.onclick=()=>{selected=t.id;render();if(matchMedia('(max-width:700px)').matches)detail.scrollIntoView({behavior:'instant',block:'start'});};board.append(node);nodes.push(node);}
  const pathTo=id=>{const path=[];for(let t=talents[id];t;t=t.parent===null?null:talents[t.parent])path.unshift(t.name);return path.join(' → ');};
  function draw(){
    const width=board.clientWidth;if(!width)return;
    const {height,points}=talentLayout(width);board.style.height=height+'px';board.classList.toggle('compact',width<600);board.classList.toggle('unlabeled',width<734);
    svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.replaceChildren();const levels=getState()?.talents??Array(30).fill(0);
    for(const t of talents){const p=points[t.id];nodes[t.id].style.left=p.x+'px';nodes[t.id].style.top=p.y+'px';nodes[t.id].style.setProperty('--route-color',p.color);if(t.parent===null)continue;
      const from=points[t.parent],line=document.createElementNS('http://www.w3.org/2000/svg','line');for(const [key,value] of Object.entries({x1:from.x,y1:from.y,x2:p.x,y2:p.y,stroke:levels[t.id]?p.color:'#d1d8ce','stroke-width':levels[t.id]?2.5:1.5}))line.setAttribute(key,value);svg.append(line);
    }
  }
  function render(){
    const state=getState(),levels=state?.talents??Array(30).fill(0);
    guide.hidden=!state||Boolean(levels[0]);guide.querySelector('button').disabled=busy||!state;
    dialog.querySelector('.talent-summary').textContent=`余额 ${state?yuan(state.money):'待同步'} · 已点亮 ${levels.filter(n=>n>0).length} / 30`;
    for(const t of talents){const node=nodes[t.id],rank=levels[t.id],ready=t.parent===null||levels[t.parent]>0;node.dataset.status=rank?'active':ready?'available':'locked';node.querySelector('small').textContent=`${rank} / ${t.prices.length}`;node.setAttribute('aria-pressed',String(t.id===selected));node.setAttribute('aria-label',`${t.name}，${rank} / ${t.prices.length}${!ready?'，需要先点亮'+talents[t.parent].name:''}`);node.title=t.name;}
    const t=talents[selected],rank=levels[t.id],ready=t.parent===null||levels[t.parent]>0,full=rank===t.prices.length,price=t.prices[rank],reserve=t.id===0||state?.active?.phase==='peeling'?0:eggCost;
    detail.querySelector('h3').textContent=`${t.name} · ${rank} / ${t.prices.length}`;detail.querySelector('.talent-effect').textContent=t.effect;detail.querySelector('.talent-path').textContent=pathTo(selected);
    const button=detail.querySelector('button');button.disabled=busy||!state||full||!ready||state.money-price<reserve;
    button.textContent=full?'已点满':`${busy?'正在点亮…':rank?'升一层':'点亮'} · ${price?yuan(price):'免费'}`;
    const note=detail.querySelector('.talent-cost-note');
    note.textContent=!state?'正在同步零钱…':full?'':!ready?'先点亮「'+talents[t.parent].name+'」':state.money<price?'余额不足 · 当前 '+yuan(state.money):state.money-price<reserve?'余额不足 · 购买后需留够 ¥2.00 进货':'';
    note.hidden=!note.textContent;if(dialog.open)draw();
  }
  detail.querySelector('button').onclick=async()=>{if(busy)return;busy=true;const id=selected,rank=getState().talents[id];render();try{await buy(id,rank);if(id===0&&rank===0)dialog.close();}catch(error){onError(error.message);}finally{busy=false;render();}};
  function resize(){if(!dialog.open||!scroller.clientWidth)return;size=Math.max(640,scroller.clientWidth);board.style.width=size+'px';scroller.style.height=Math.min(scroller.clientWidth,680)+'px';draw();fit();}
  document.querySelector('#open-talents').onclick=()=>{if(!getState()?.talents[0])selected=0;pointers.clear();gesture=null;dialog.showModal();render();dialog.scrollTop=0;resize();};document.querySelector('#close-talents').onclick=()=>dialog.close();
  dialog.querySelector('.back-to-tree').onclick=()=>scroller.scrollIntoView({behavior:'instant',block:'start'});
  new ResizeObserver(resize).observe(scroller);render();return ()=>{if(dialog.open)render();};
}
