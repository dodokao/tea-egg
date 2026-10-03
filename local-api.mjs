import {eggKinds,teaKinds} from './catalog.mjs';
import {talents,drawKind,salePrice,rarityOrder,eggCost,stampChanges,saleBreakdown,mechanics} from './progression.mjs?v=20261002-peel';
const giftCodes={yumi666:50000},uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const headers={},key='tea-egg-pages-v1',json=(data,status=200)=>Response.json(data,{status});
const initial=(redeemed=[])=>({total:0,counts:{egg:eggKinds.map(()=>0),tea:teaKinds.map(()=>0)},money:200,talents:talents.map(()=>0),active:null,inventory:[],sequence:0,egg_streak:0,tea_streak:0,redeemed,eggs:{},entries:[]});
const load=()=>({...initial(),...JSON.parse(localStorage.getItem(key)||'null')});
const save=s=>localStorage.setItem(key,JSON.stringify(s));
function publicState(s){return {...s,eggStreak:s.egg_streak,teaStreak:s.tea_streak};}
function partialProgress(active,p) {
  if(!p||typeof p!=='object'||Array.isArray(p))return null;
  const effects=mechanics(eggKinds[active.egg],active.levels),indices=a=>Array.isArray(a)&&a.length<effects.peels&&a.every(i=>Number.isInteger(i)&&i>=0&&i<effects.peels)&&new Set(a).size===a.length;
  if(!Number.isInteger(p.seed)||p.seed!==parseInt(active.id.slice(0,8),16)||!['cracking','peeling'].includes(p.phase)||!Number.isInteger(p.knocks)||p.knocks<0||p.knocks>effects.knocks||!Number.isInteger(p.clicks)||p.clicks<0||p.clicks>120||!indices(p.released)||!indices(p.loosened)||typeof p.longPeel!=='boolean'||p.longPeel&&!effects.longPeel||!Array.isArray(p.rotation)||p.rotation.length!==4||!p.rotation.every(n=>Number.isFinite(n)&&Math.abs(n)<=1.001)||!Number.isInteger(p.percent)||p.percent<0||p.percent>99)return null;
  if(p.phase==='cracking'&&(p.knocks>=effects.knocks||p.clicks||p.released.length||p.loosened.length||p.percent||p.longPeel!==Boolean(effects.longPeel)))return null;
  if(p.phase==='peeling'&&(p.knocks!==effects.knocks||p.released.length>p.clicks*3||p.loosened.length>p.clicks||!p.released.length&&p.percent))return null;
  return {seed:p.seed,phase:p.phase,knocks:p.knocks,clicks:p.clicks,released:[...p.released],loosened:[...p.loosened],longPeel:p.longPeel,rotation:[...p.rotation],percent:p.percent};
}

async function handle(path,options){
if(path==='/api/finance'){const s=load(),totals={entries:s.entries.length,income:0,expense:0,profit:0,gifts:0,skills:0,purchases:0,sold:0};for(const e of s.entries){totals.income+=Math.max(0,e.amount);totals.expense+=Math.max(0,-e.amount);if(e.action==='sell'){totals.profit+=e.detail.profit;totals.sold++;}if(e.action==='redeem')totals.gifts+=e.amount;if(e.action==='talent')totals.skills-=e.amount;if(e.action==='buy')totals.purchases-=e.amount;}return json({money:s.money,totals,entries:s.entries.slice(-200).reverse()});}
if(options.method!=='POST')return json(publicState(load()));
const body=JSON.parse(options.body);
if(!body||typeof body!=='object'||Array.isArray(body)||!['reset','redeem','talent','buy','finish','sell','store','take'].includes(body.action))return json({error:'Invalid action'},400);
    if(body.action==='reset') {
      save(initial(load().redeemed));
      return json(publicState(load()),200,headers);
    }
    const s=load(),next={...s,talents:[...s.talents],inventory:[...s.inventory]};
    const fail=(message,status=409)=>json({error:message,state:publicState(s)},status,headers);
    let detail={title:""};next.eggs={...s.eggs};next.redeemed=[...s.redeemed];next.entries=[...s.entries];
    if(body.action==='redeem') {
      if(typeof body.code!=='string'||body.code.length>64)return fail('请输入有效的礼品码。',400);
      const code=body.code.trim().toLowerCase(),reward=giftCodes[code];
      if(!Number.isSafeInteger(reward)||reward<=0)return fail('礼品码无效，请检查后再试。',400);
      if(s.redeemed.includes(code))return fail('这个礼品码已经兑换过了。');
      next.money+=reward;detail={title:'礼品码奖励',code};
      next.redeemed.push(code);
    }else if(body.action==='talent') {
      const t=talents[body.talent];
      if(!Number.isInteger(body.talent)||!t)return fail('没有这个技能。',400);
      const rank=s.talents[t.id];
      if(!Number.isInteger(body.rank)||body.rank<0||body.rank>t.prices.length)return fail('Invalid talent rank',400);
      if(body.rank!==rank)return body.rank<rank?json(publicState(s),200,headers):fail('技能已变化，请再试一次。');
      if(rank>=t.prices.length)return fail('这个技能已经点满了。');
      if(t.parent!==null&&!s.talents[t.parent])return fail(`先点亮「${talents[t.parent].name}」。`);
      const price=t.prices[rank],reserve=t.id===0||s.active?.phase==='peeling'||s.inventory.some(egg=>egg.phase==='peeling')?0:eggCost;
      if(s.money-price<reserve)return fail(s.money<price?'钱还不够，再卖几颗蛋吧。':'先留 2 元买下一颗蛋。');
      next.money-=price;next.talents[t.id]++;detail={title:'蛋之技能 · '+t.name,rank:rank+1};
    }else {
      if(typeof body.id!=='string'||!uuid.test(body.id))return fail('Invalid egg ID',400);
      if(body.action==='sell'&&!s.talents[0])return fail('点击上方「蛋之技能」，免费点亮「开摊入门」后才能卖蛋。');
      if(body.action==='buy') {
        if(s.inventory.some(egg=>egg.id===body.id))return json(publicState(s),200,headers);
        if(s.active)return s.active.id===body.id?json(publicState(s),200,headers):fail('先把手里这一颗卖出或存入储藏室。');
        const existing=s.eggs[body.id];
        if(existing)return json(publicState(s),200,headers);
        const choice=body.choice;let fee=0;
        if(choice!==undefined){if(!s.talents[26])return fail('请先解锁定向进货。');if(!choice||!['egg','tea'].includes(choice.kind)||!Number.isInteger(choice.index))return fail('请选择有效原料。',400);const items=choice.kind==='egg'?eggKinds:teaKinds,item=items[choice.index];if(!item||item.retired||item.unlockTalent&&!s.talents[item.unlockTalent]&&!s.counts[choice.kind][choice.index])return fail('该原料尚未开放进货。');fee=1500;}
        if(s.money<eggCost+fee)return fail(fee?'定向进货需 17 元（指定费 15 元 + 进货费 2 元）。':'进货需要 2 元。');
        next.money-=eggCost+fee;next.sequence++;
        const first=s.sequence===0&&s.total===0;
        next.active={id:body.id,egg:first?eggKinds.findIndex(item=>item.name==='土鸡蛋'):drawKind('egg',s.talents,s.counts.egg,s.egg_streak),tea:first?teaKinds.findIndex(item=>item.name==='红茶'):drawKind('tea',s.talents,s.counts.tea,s.tea_streak),levels:[...s.talents],cost:eggCost+fee,phase:'peeling'};if(choice)next.active[choice.kind]=choice.index;
        detail={fee,title:(fee?'定向进货 · ':'进货 · ')+eggKinds[next.active.egg].name+' × '+teaKinds[next.active.tea].name,egg:eggKinds[next.active.egg].name,tea:teaKinds[next.active.tea].name};
      }else if(body.action==='take') {
        if(s.active?.id===body.id)return json(publicState(s),200,headers);
        const target=s.inventory.find(egg=>egg.id===body.id);
        if(!target)return fail('储藏室里没有这颗蛋，请同步小摊。');
        if(s.active) {
          const progress=s.active.phase==='peeled'?null:partialProgress(s.active,body.progress);
          if(s.active.phase!=='peeled'&&!progress)return fail('请保存有效的剥蛋进度后再切换。',400);
          next.inventory.push({...s.active,...(progress?{progress}:{storedComplete:true}),storedAt:s.active.storedAt??new Date().toISOString()});
        }
        next.inventory=next.inventory.filter(egg=>egg.id!==body.id);next.active=target;
      }else if(body.action==='store') {
        if(s.inventory.some(egg=>egg.id===body.id))return json(publicState(s),200,headers);
        if(s.active?.id===body.id) {
          const progress=s.active.phase==='peeled'?null:partialProgress(s.active,body.progress);
          if(s.active.phase!=='peeled'&&!progress)return fail('请保存有效的剥蛋进度。',400);
          next.inventory.push({...s.active,...(progress?{progress}:{storedComplete:true}),storedAt:s.active.storedAt??new Date().toISOString()});next.active=null;
        }else {
          const existing=s.eggs[body.id];
          if(existing?.revenue>0)return json(publicState(s),200,headers);
          return fail('这颗蛋已经变化了，请同步小摊。');
        }
      }else if(body.action==='sell') {
        const target=s.active?.id===body.id?s.active:s.inventory.find(egg=>egg.id===body.id);
        if(!target) {
          const existing=s.eggs[body.id];
          if(existing?.revenue>0)return json(publicState(s),200,headers);
          return fail('这颗蛋已经变化了，请同步小摊。');
        }
        if(target.phase!=='peeled')return fail('先把蛋壳剥干净。');
        detail={title:'卖出茶叶蛋',...saleBreakdown(target,s.counts,s.talents,target.repeat)};
        const revenue=detail.price;next.money+=revenue;
        if(s.active?.id===body.id)next.active=null;else next.inventory=next.inventory.filter(egg=>egg.id!==body.id);
        next.egg_streak=rarityOrder.indexOf(eggKinds[target.egg].rarity)>=2?0:s.egg_streak+1;
        next.tea_streak=rarityOrder.indexOf(teaKinds[target.tea].rarity)>=2?0:s.tea_streak+1;
        next.eggs[body.id]={revenue};
      }else if(!s.active||s.active.id!==body.id) {
        const existing=s.eggs[body.id];
        if(existing&&(body.action==='finish'||existing.revenue>0))return json(publicState(s),200,headers);
        return fail('这颗蛋已经变化了，请同步小摊。');
      }else if(body.action==='finish') {
        if(!Number.isInteger(body.clicks)||body.clicks<1||body.clicks>120)return fail('Invalid peeling count',400);
        if(s.active.phase==='peeled')return json(publicState(s),200,headers);
        const repeat=s.counts.egg[s.active.egg]>0&&s.counts.tea[s.active.tea]>0;
        const counts={egg:[...s.counts.egg],tea:[...s.counts.tea]};counts.egg[s.active.egg]++;counts.tea[s.active.tea]++;next.counts=counts;next.total=s.total+1;
        next.active={...s.active,phase:'peeled',clicks:body.clicks,repeat,notices:stampChanges(s,{counts,talents:s.talents})};next.active.revenue=salePrice(next.active,counts,s.talents,repeat);
        delete next.active.progress;
        next.eggs[body.id]={revenue:0};
      }
    }
    if(!['finish','store','take'].includes(body.action))next.entries.push({id:next.entries.length+1,action:body.action,amount:next.money-s.money,balance:next.money,detail,created:new Date().toISOString()});
save(next);return json(publicState(next));
}
export async function fetch(path,options={}){
if(!['/api/game','/api/stamps','/api/finance'].includes(path))return globalThis.fetch(path,options);
try{return navigator.locks?await navigator.locks.request(key,()=>handle(path,options)):await handle(path,options);}catch{return json({error:'无法保存本地记录，请检查浏览器存储空间后重试。'},503);}
}
