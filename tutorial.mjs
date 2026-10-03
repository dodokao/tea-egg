const features=[
  {id:'storage',title:'储存室 · 想剥的时候再继续',text:'没剥完的蛋可暂存并保留进度，取出后继续；剥好的蛋可留在库中，再逐颗选择出售。',note:'取出另一颗蛋时，手中的蛋会自动暂存。没剥完的蛋不能出售。',target:'open-storage',dialog:'storage-dialog',action:'打开储存室'},
  {id:'stamps',title:'我的印章 · 每一颗都算数',text:'剥好一颗蛋，蛋种和茶种印章各累计一次。重复获得可升级印章，提高对应茶叶蛋的售价。',note:'印章册显示获得次数、等级和收益加成；「全部印章」还可查看未收集的种类。',target:'collection',dialog:'stamp-dialog',action:'打开我的印章'},
  {id:'skills',title:'蛋之技能 · 选择成长方向',text:'四条分支分别改善剥壳、寻宝、经营和印章养成。先点亮前置技能，再点下一点；部分技能可叠三层。',note:'点图标看效果和价格。手机双指缩放，放大后单指拖动，也可点「查看全貌」。现在无需购买技能。',target:'open-talents',dialog:'talent-dialog',action:'打开蛋之技能'},
  {id:'wallet',title:'零钱明细 · 看懂每一笔收支',text:'在这里查看余额折线、收入与支出。展开卖蛋流水，可以看到蛋种、茶种、印章及技能分别增加了多少售价。',note:'买蛋和购买技能会花钱，卖蛋与礼品码奖励会增加零钱；暂存和取出不收费。',target:'open-finance',dialog:'finance-dialog',action:'打开零钱明细'},
  {id:'settings',title:'设置 · 调成舒服的玩法',text:'可以开关音效、调整音量，关闭扫一扫震动或减弱动画，也能输入礼品码兑换奖励。',note:'以后忘了功能怎么用，就在设置里打开「玩法指南」。',target:'open-settings',dialog:'settings-dialog',action:'打开设置'}
];

export function tutorialLesson({state,phase,ready,blocked},progress) {
  if(!state||blocked||progress.dismissed||progress.tour===features.length)return null;
  if(progress.tour>=0)return {...features[progress.tour],step:'功能 '+(progress.tour+1)+' / '+features.length};
  const active=state.active,inventory=state.inventory??[],finished=active?.phase==='peeled'||inventory.some(egg=>egg.phase==='peeled');
  if(finished&&!state.talents[0])return {id:'unlock',step:'第一颗 · 开摊',title:'剥好了，先免费点亮开摊入门',text:'卖蛋按钮暂时不可用。打开「蛋之技能」，免费点亮中心的「开摊入门」，然后关闭面板回来卖蛋。',note:'这是免费技能，不需要花钱，也不需要先买其他技能。',target:'open-talents',action:'打开蛋之技能'};
  if(finished)return {id:active?.phase==='peeled'?'sell':'sell-stored',step:'第一颗 · 收入',title:'现在可以卖出第一颗蛋了',text:active?.phase==='peeled'?'点「卖出这颗蛋」，收入会记入零钱。你也可以先放入储存室，等想卖时再卖。':'你的剥好的蛋在储存室。打开储存室，选择那颗蛋的「卖出这颗」，即可收到零钱。',note:'剥好时印章已自动入册；出售只结算收入，不会重复获得印章。',target:active?.phase==='peeled'?'sell':'open-storage',action:active?.phase==='peeled'?'卖出这颗蛋':'打开储存室'};
  if(active){
    if(!ready||phase==='complete')return null;
    return phase==='cracking'
      ?{id:'knock',step:'第一颗 · 敲壳',title:'先轻点鸡蛋，把壳敲裂',text:'在鸡蛋上轻点几次，裂纹铺开后就会进入剥壳阶段。现在还不用急着剥。',note:'可以用鼠标点击或手机轻点；敲裂次数与蛋种和已学技能有关。',target:'game'}
      :{id:'peel',step:'第一颗 · 剥壳',title:'继续点蛋壳，把这颗蛋剥好',text:'轻点剥壳，拖动鸡蛋或点「翻个面」查看另一侧。蛋壳挡住视线时，点「扫一扫」清理盘子。',note:'想歇一会儿可点「暂存这颗」，之后从储存室取出继续剥。',target:'game'};
  }
  if(inventory.length)return {id:'resume',step:'第一颗 · 继续',title:'暂存的蛋还在，继续剥吧',text:'打开储存室，找到未剥完的蛋，点「继续剥壳」。它会恢复暂存时的剥壳进度。',note:'未剥完的蛋只能暂存，完全剥好后才可以卖。',target:'open-storage',action:'打开储存室'};
  return {id:'buy',step:'第一颗 · 进货',title:'用 2 元买你的第一颗蛋',text:'点下方「买一颗蛋」开始。第一颗固定为土鸡蛋配红茶，先熟悉敲壳、剥壳，再学会卖蛋。',note:'之后每颗进货价为 2 元，蛋种和茶种会随机搭配。',target:'buy-egg'};
}

export function initTutorial(getContext) {
  const $=selector=>document.querySelector(selector),key='tea-egg-tutorial-v1';
  const card=$('#tutorial-card'),title=$('#tutorial-title'),text=$('#tutorial-copy'),note=$('#tutorial-note'),step=$('#tutorial-step'),action=$('#tutorial-action'),help=$('#help-dialog');
  let progress=null,lesson=null,painted='',highlighted=[];
  try{const saved=JSON.parse(localStorage.getItem(key));if(saved&&Number.isInteger(saved.tour)&&saved.tour>=-1&&saved.tour<=features.length)progress={tour:saved.tour,dismissed:Boolean(saved.dismissed)};}catch{}
  const persist=()=>{try{localStorage.setItem(key,JSON.stringify(progress));}catch{}};
  function clearHighlight(){highlighted.forEach(node=>node.classList.remove('tutorial-entry'));highlighted=[];}
  function refresh(event) {
    const context=getContext();
    if(event==='reset'){progress=null;painted='';}
    if(!context.state){card.hidden=true;clearHighlight();return;}
    if(!progress){progress={tour:context.state.talents[0]?0:-1,dismissed:false};persist();}
    const soldFirst=context.state.talents[0]&&context.state.total>0&&context.state.active?.phase!=='peeled'&&!(context.state.inventory??[]).some(egg=>egg.phase==='peeled');
    if(progress.tour===-1&&(event==='sell'||soldFirst)){progress.tour=0;persist();}
    lesson=tutorialLesson(context,progress);
    card.hidden=!lesson||Boolean(document.querySelector('dialog[open]'));
    if(!lesson||card.hidden){clearHighlight();return;}
    if(painted!==lesson.id){
      painted=lesson.id;title.textContent=lesson.title;text.textContent=lesson.text;note.textContent=lesson.note;step.textContent=lesson.step;
      action.hidden=!lesson.action;action.textContent=lesson.action||'';
    }
    const mobile=$('.mobile-nav [data-open="'+lesson.target+'"]');
    const target=mobile&&matchMedia('(max-width:700px)').matches?mobile:$('#'+lesson.target);
    action.disabled=Boolean($('#'+lesson.target)?.disabled);
    if(highlighted[0]!==target){clearHighlight();if(target&&!target.hidden){target.classList.add('tutorial-entry');highlighted=[target];}}
  }
  action.onclick=()=>{if(!lesson)return;const target=$('#'+lesson.target);if(target&&!target.disabled)target.click();refresh();};
  $('#tutorial-later').onclick=()=>{if(!progress)return;progress.dismissed=true;persist();refresh();};
  function openHelp(){if(!help.open)help.showModal();refresh();}
  $('#open-help').onclick=$('#tutorial-help').onclick=openHelp;
  $('#close-help').onclick=()=>help.close();
  $('#restart-tutorial').onclick=()=>{progress=null;try{localStorage.removeItem(key);}catch{}help.close();$('#settings-dialog').close();refresh();card.scrollIntoView({block:'nearest'});};
  for(const feature of features)$('#'+feature.dialog).addEventListener('close',()=>{
    if(progress&&!progress.dismissed&&progress.tour>=0&&features[progress.tour]?.dialog===feature.dialog){progress.tour++;persist();}
    refresh();
  });
  for(const dialog of document.querySelectorAll('dialog')){
    dialog.addEventListener('close',refresh);
    new MutationObserver(()=>refresh()).observe(dialog,{attributes:true,attributeFilter:['open']});
  }
  window.addEventListener('storage',event=>{if(event.key===key){progress=null;try{const saved=JSON.parse(event.newValue);if(saved&&Number.isInteger(saved.tour)&&saved.tour>=-1&&saved.tour<=features.length)progress={tour:saved.tour,dismissed:Boolean(saved.dismissed)};}catch{}painted='';refresh();}});
  window.addEventListener('resize',()=>refresh());
  refresh();return refresh;
}
