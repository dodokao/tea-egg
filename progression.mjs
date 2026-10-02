import {eggKinds,teaKinds} from './catalog.mjs';

export const eggCost=200;
export const yuan=cents=>'¥'+(cents/100).toFixed(2);
export const rarityOrder=['C','B','A','S','SR','SSR'];
export const routes=[
  {name:'剥壳手法',color:'#789d94',angle:-90,id:1,branches:[2,4,24]},
  {name:'珍稀寻宝',color:'#ba9561',angle:0,id:6,branches:[7,9,25]},
  {name:'小摊经营',color:'#bc8583',angle:90,id:11,branches:[21,12,14]},
  {name:'印章养成',color:'#9590b2',angle:180,id:16,branches:[17,19,26]}
];

export function mastery(count,kind,levels) {
  const thresholds=[levels[16]?6:8,...[20,40,80].map(n=>Math.ceil(n*(1-.1*levels[17])))];
  const level=thresholds.filter(n=>count>=n).length;
  return {level,next:thresholds[level]??null};
}
export function masteryBonus(level,kind,levels) {
  return level*5;
}
export function stampChanges(before,after) {
  const changes=[];
  for(const kind of ['egg','tea'])after.counts[kind].forEach((count,index)=>{
    const previous=before.counts[kind][index]??0;
    const from=mastery(previous,kind,before.talents).level,to=mastery(count,kind,after.talents).level;
    if(count>0&&(previous===0||to>from))changes.push({kind,index,fresh:previous===0,from,to,beforeBonus:masteryBonus(from,kind,before.talents),afterBonus:masteryBonus(to,kind,after.talents)});
  });
  return changes;
}
export function mechanics(kind,levels) {
  const base=kind.scale<.75?5:kind.scale>=1.45?8:kind.scale>1.12?7:6;
  return {knocks:Math.max(1,base-(levels[1]?1:0)),peels:Math.max(6,kind.peels+16-[0,1,2,4][levels[2]]-(levels[27]?6:0)),stickyFactor:1-.2*levels[4],longPeel:Boolean(levels[5]),peelSpeed:levels[3]?.67:1,sweep:[0,8,6,4][levels[24]]};
}
export function saleBreakdown(pair,counts,levels,repeat=counts.egg[pair.egg]>1&&counts.tea[pair.tea]>1) {
  const premium={C:0,B:10,A:30,S:80,SR:180,SSR:400};
  const egg=eggKinds[pair.egg],tea=teaKinds[pair.tea],eg=rarityOrder.indexOf(egg.rarity),tg=rarityOrder.indexOf(tea.rarity);
  const el=mastery(counts.egg[pair.egg],'egg',levels).level,tl=mastery(counts.tea[pair.tea],'tea',levels).level;
  const lines=[];let price=0;
  const add=(label,amount,showZero=false)=>{if(amount||showZero){lines.push({label,amount});price+=amount;}};
  add('基础售价',220);add(egg.name+' · '+egg.rarity+'级',premium[egg.rarity],true);add(tea.name+' · '+tea.rarity+'级',premium[tea.rarity],true);
  add('定价入门',levels[11]?6:0);add('蛋品溢价',Math.round(premium[egg.rarity]*(1+.12*levels[12]))-premium[egg.rarity]);
  add(egg.name+'印章 Lv.'+el,masteryBonus(el,'egg',levels));add(tea.name+'印章 Lv.'+tl,masteryBonus(tl,'tea',levels));
  add('卫生管理',Math.round((price-eggCost)*.12*levels[21]));
  if(levels[13]&&egg.scale>=1.15)add('份量招牌',22);
  if(tg<=1)add('家常茶香',[0,4,8,12][levels[14]]);
  if(levels[15]&&eg===tg&&eg>=2)add('同阶佳配',30);
  if(levels[22]&&Number.isInteger(pair.clicks)&&pair.clicks<=mechanics(egg,pair.levels??levels).peels)add('净手巧剥',15);
  if(levels[18])add('晋级贺礼',(pair.notices??[]).filter(n=>n.to>n.from).length*30);
  const collected=teaKinds.filter((item,i)=>!item.retired&&counts.tea[i]>0);
  add('茶谱广记',Math.min(10,Math.floor(collected.length/5))*[0,2,3,4][levels[19]]);
  if(levels[20]&&teaKinds.every((item,i)=>item.retired||item.rarity!=='C'||counts.tea[i]>0))add('普茶成册',18);

  if(levels[29]&&el===4&&tl===4)add('双章传家',25);
  if(levels[23])add('品质封装',12);
  return {price,lines,egg:egg.name,tea:tea.name,cost:pair.cost??eggCost,profit:price-(pair.cost??eggCost)};
}
export function salePrice(...args){return saleBreakdown(...args).price;}
export function drawKind(kind,levels,counts,streak,random=Math.random) {
  const items=kind==='egg'?eggKinds:teaKinds;
  const pool=items.map((item,index)=>({item,index})).filter(({item,index})=>!item.retired&&(!item.unlockTalent||levels[item.unlockTalent]>0||counts[index]>0));
  const pity=kind==='tea'&&Boolean(levels[10])&&streak>=12;
  const choices=pool.filter(({item})=>!pity||rarityOrder.indexOf(item.rarity)>=2).map(({item,index})=>{
    const grade=rarityOrder.indexOf(item.rarity);
    let weight=item.weight;
    if(grade===1&&levels[6])weight*=1.2;
    if(kind==='egg'&&grade>=2)weight*=1+.2*levels[7];
    if(kind==='tea'&&!counts[index])weight*=1+.2*levels[9];
    if(item.unlockTalent)weight*=1+.2*levels[25];
    return {index,weight};
  });
  let roll=random()*choices.reduce((n,item)=>n+item.weight,0);
  for(const item of choices){roll-=item.weight;if(roll<0)return item.index;}
  return choices.at(-1).index;
}

export const talents=[
    {id:0,name:'开摊入门',parent:null,prices:[0],icon:'store',effect:'解锁茶叶蛋出售功能。新手阶段可免费学习。'},
    {id:1,name:'敲壳入门',parent:0,prices:[1],icon:'hammer',effect:'每颗蛋的基础敲壳次数减少 1 次，最低为 1 次。'},
    {id:2,name:'裂纹引导',parent:1,prices:[3,6,10],icon:'split',effect:'初始壳块数量分别减少 1 / 2 / 4 块，最低为 6 块。'},
    {id:3,name:'轻巧揭壳',parent:2,prices:[18],icon:'layers',effect:'揭壳抬起与外翻动作的持续时间缩短 33%。'},
    {id:4,name:'松膜巧手',parent:1,prices:[3,6,10],icon:'unlink',effect:'需要额外松动黏膜的壳块数量分别减少 20% / 40% / 60%。'},
    {id:5,name:'连膜长揭',parent:4,prices:[18],icon:'link',effect:'每颗蛋首次成功揭壳时，额外移除最多 2 块相邻壳块。每颗蛋限触发一次。'},
    {id:6,name:'市集识材',parent:0,prices:[1],icon:'search',effect:'B 级蛋种与茶种的抽取权重提高 20%。'},
    {id:7,name:'好蛋入锅',parent:6,prices:[3,6,10],icon:'egg',effect:'A 级及以上蛋种的抽取权重分别提高 20% / 40% / 60%。'},
    {id:8,name:'珍禽来访',parent:7,prices:[20],icon:'bird',effect:'解锁珍禽蛋种的进货资格。A 级：孔雀蛋、蜂鸟蛋、天鹅蛋、雷电鸟蛋；S 级：雉鸡蛋、鸸鹋蛋、火焰鸟蛋、急冻鸟蛋；SR 级：王企鹅蛋。'},
    {id:9,name:'茶谱寻新',parent:6,prices:[3,6,10],icon:'leaf',effect:'尚未获得印章的茶种，其抽取权重分别提高 20% / 40% / 60%。获得对应印章后，该茶种不再享受此项加成。'},
    {id:10,name:'珍茗保底',parent:9,prices:[20],icon:'sparkles',effect:'解锁摸鱼下午茶、教父、血腥玛丽与马汀尼的进货资格。连续出售 12 颗采用 C 级或 B 级茶种的茶叶蛋后，下一次进货的茶种必为 A 级及以上。'},
    {id:11,name:'定价入门',parent:0,prices:[1],icon:'coins',effect:'每颗茶叶蛋的基础售价增加 0.06 元。'},
    {id:12,name:'蛋品溢价',parent:11,prices:[3,6,10],icon:'badge-dollar-sign',effect:'蛋种稀有度带来的售价加成分别提高 12% / 24% / 36%。'},
    {id:13,name:'份量招牌',parent:12,prices:[18],icon:'crown',effect:'蛋种体型系数达到 1.15 时，出售价格额外增加 0.22 元。'},
    {id:14,name:'家常茶香',parent:11,prices:[3,6,10],icon:'cup-soda',effect:'采用 C 级或 B 级茶种时，出售价格分别增加 0.04 / 0.08 / 0.12 元。'},
    {id:15,name:'同阶佳配',parent:14,prices:[18],icon:'award',effect:'蛋种与茶种稀有等级相同，且均达到 A 级及以上时，出售价格增加 0.30 元。'},
    {id:16,name:'熟练入门',parent:0,prices:[1],icon:'stamp',effect:'蛋种与茶种印章升至 Lv.1 所需的累计获得次数由 8 次降至 6 次。'},
    {id:17,name:'章页熟读',parent:16,prices:[3,6,10],icon:'book-open',effect:'蛋种与茶种印章升至 Lv.2、Lv.3 和 Lv.4 的累计次数要求均降低 10% / 20% / 30%，分别对应技能第 1 / 2 / 3 层。基础要求为 20 / 40 / 80 次，计算结果向上取整。'},
    {id:18,name:'晋级贺礼',parent:17,prices:[18],icon:'medal',effect:'本次剥蛋每触发一枚印章升级，出售该颗茶叶蛋时额外获得 0.30 元奖励。'},
    {id:19,name:'茶谱广记',parent:16,prices:[3,6,10],icon:'notebook',effect:'每收集 5 种不同茶种，单颗茶叶蛋的出售价格分别增加 0.02 / 0.03 / 0.04 元。最多计入 10 组。'},
    {id:20,name:'普茶成册',parent:19,prices:[18],icon:'trophy',effect:'获得全部 C 级茶种印章后，每颗茶叶蛋的出售价格增加 0.18 元。'},
    {id:21,name:'卫生管理',parent:11,prices:[3,6,10],icon:'droplets',effect:'出售价格增加基础利润的 12% / 24% / 36%。基础利润按基础售价、品种溢价与印章等级加成之和，减去 2 元进货成本计算。'},
    {id:22,name:'净手巧剥',parent:21,prices:[18],icon:'hand',effect:'剥壳点击次数不超过该颗蛋的初始壳块数量时，出售价格增加 0.15 元。敲壳次数不计入。'},
    {id:23,name:'品质封装',parent:21,prices:[18],icon:'package',effect:'每颗茶叶蛋的出售价格增加 0.12 元。'},
    {id:24,name:'清盘巧扫',parent:1,prices:[3,6,10],icon:'wind',effect:'盘中静止壳片达到 8 / 6 / 4 片时，自动触发清盘。'},
    {id:25,name:'趣味摊位',parent:6,prices:[3,6,10],icon:'compass',effect:'解锁 10 种趣味原料的进货资格：夜猫子蛋、战斗机蛋、动漫热血鸡蛋、滚蛋、魔法少女蛋、忍者鸡蛋、珍珠奶茶、抹茶拿铁、芝士乌龙、可乐快乐茶。所有已获得进货资格且需技能解锁的原料，其抽取权重分别提高 20% / 40% / 60%。'},
    {id:26,name:'定向进货',parent:16,prices:[12],icon:'bookmark',effect:'解锁指定原料功能。每次支付 15 元可指定下一颗蛋的蛋种或茶种，另一项随机。仅可选择已开放进货的品种，另需支付 2 元进货费用。'},
    {id:27,name:'熟手剥壳',parent:3,prices:[28],icon:'zap',effect:'初始壳块数量额外减少 6 块，可与裂纹引导叠加，最低为 6 块。'},
    {id:28,name:'奇蛋奇遇',parent:8,prices:[28],icon:'gem',effect:'解锁小恐龙蛋、鸵鸟蛋、坤蛋与 QQ 鹅蛋的进货资格。'},
    {id:29,name:'双章传家',parent:18,prices:[28],icon:'heart-handshake',effect:'本颗蛋的蛋种与茶种印章均达到 Lv.4 时，出售价格增加 0.25 元。'}
  ];
talents.forEach(t=>{t.prices=t.prices.map(n=>n*100);});
