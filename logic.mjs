export function randomFrom(seed) {
  return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let n=Math.imul(seed^seed>>>15,1|seed);n=n+Math.imul(n^n>>>7,61|n)^n;return ((n^n>>>14)>>>0)/4294967296;};
}

export function createRound(adjacency,random=Math.random,peelCount=16+Math.floor(random()*3),options={}) {
  const count=Math.min(adjacency.length,peelCount);
  const patches=Array.from({length:count},()=>({cells:[],sticky:false,loosened:false,released:false}));
  const byCell=Array(adjacency.length).fill(-1),queue=[];
  const offset=Math.floor(random()*adjacency.length);
  for(let p=0;p<count;p++) {
    const cell=(Math.floor(p*adjacency.length/count)+offset)%adjacency.length;
    byCell[cell]=p;patches[p].cells.push(cell);queue.push(cell);
  }
  // Multi-source graph growth keeps every membrane patch connected.
  for(let q=0;q<queue.length;q++) {
    const cell=queue[q],p=byCell[cell];
    for(const neighbor of adjacency[cell]) if(byCell[neighbor]===-1) {
      byCell[neighbor]=p;patches[p].cells.push(neighbor);queue.push(neighbor);
    }
  }
  if(byCell.includes(-1)) throw Error('The shell graph must be connected');
  const stickyCount=Math.min(count,Math.round((Math.floor(count/8)+1)*(options.stickyFactor??1)));
  const start=Math.floor(random()*count);
  for(let p=0;p<stickyCount;p++) patches[(start+Math.floor(p*count/stickyCount))%count].sticky=true;
  let carriedCount=0;
  for(const patch of patches.filter(p=>p.sticky)) {
    if(carriedCount===2)break;
    const own=byCell[patch.cells[0]],adjacent=new Set(patch.cells.flatMap(cell=>adjacency[cell].map(n=>byCell[n])).filter(i=>i!==own&&!patches[i].sticky));
    const candidates=[...adjacent];if(candidates.length){patch.carries=candidates[Math.floor(random()*candidates.length)];carriedCount++;}
  }
  const neighbors=patches.map((patch,index)=>[...new Set(patch.cells.flatMap(cell=>adjacency[cell].map(n=>byCell[n])).filter(n=>n!==index))]);
  return {phase:'cracking',knocks:0,knockTarget:options.knocks??4,clicks:0,patches,byCell,neighbors,longPeel:Boolean(options.longPeel),peelSpeed:options.peelSpeed??1,remaining:count};
}

export function tapShell(round,cell) {
  if(!Number.isInteger(cell)||cell<0||cell>=round.byCell.length||round.phase==='complete')return {type:'ignored'};
  if(round.phase==='cracking') {
    round.knocks++;
    if(round.knocks===round.knockTarget)round.phase='peeling';
    return {type:round.phase==='peeling'?'cracked':'knock'};
  }
  const patch=round.patches[round.byCell[cell]];
  if(patch.released)return {type:'ignored'};
  round.clicks++;
  if(patch.sticky&&!patch.loosened){patch.loosened=true;return {type:'loosen',cells:patch.cells};}
  const patchIndex=round.byCell[cell];
  const indices=round.longPeel?round.neighbors[patchIndex].filter(i=>!round.patches[i].released).slice(0,2):patch.carries===undefined?[]:[patch.carries];
  if(round.longPeel&&indices.length===1)indices.push(...round.neighbors[indices[0]].filter(i=>i!==patchIndex&&!round.patches[i].released&&!indices.includes(i)).slice(0,1));
  const carried=indices.map(i=>round.patches[i]).filter(p=>!p.released);
  round.longPeel=false;
  patch.released=true;round.remaining--;
  for(const extra of carried){extra.released=true;round.remaining--;}
  if(round.remaining===0)round.phase='complete';
  return {type:'peel',cells:[...patch.cells,...carried.flatMap(p=>p.cells)],patches:[patchIndex,...carried.map(p=>round.patches.indexOf(p))],complete:round.phase==='complete'};
}
