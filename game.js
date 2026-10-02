import {fetch} from './local-api.mjs';
import * as THREE from './lib/three.module.js';
import {makeCells,patchGeometry,eggGeometry,makeTexturesAsync,eggPoint} from './egg.mjs';
import {createRound,tapShell} from './logic.mjs';
import {eggKinds,teaKinds} from './catalog.mjs';
import {talents,mechanics,mastery,masteryBonus,stampChanges,salePrice,yuan} from './progression.mjs';
import {initTalents} from './talents.mjs?v=20261002-scroll';
import {stampArt,stampUrl} from './stamps.mjs?v=20261002-fast';
import {initFinance} from './finance.mjs';
initFinance();
const $=selector=>document.querySelector(selector);
const surfacePhotos=await Promise.all(['./shell-albedo.jpg','./white-albedo.jpg'].map(src=>new THREE.ImageLoader().loadAsync(src))).catch(error=>{console.warn('Surface texture unavailable',error);return [];});
let reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
try{const saved=localStorage.getItem('tea-reduced-motion');if(saved!==null)reducedMotion=saved==='on';}catch{}
const canvas = document.querySelector('#game');
const eggDisplayScale=.8;
let renderer;
try { renderer = new THREE.WebGLRenderer({canvas,antialias:true,alpha:false}); }
catch { document.querySelector('#load-error').hidden=false; throw Error('WebGL is unavailable'); }
const mobileRendering=matchMedia('(max-width:700px), (pointer:coarse)').matches;
renderer.setPixelRatio(Math.min(devicePixelRatio,mobileRendering?1.25:1.5));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.06;
const scene=new THREE.Scene();
scene.background=new THREE.Color('#bdc9ba');
const camera=new THREE.PerspectiveCamera(33,1,.1,60);
camera.position.set(0,6.9,10);
camera.lookAt(0,1,0);
scene.add(new THREE.HemisphereLight('#edf1f7','#806447',.85));
const sun=new THREE.DirectionalLight('#fff9ef',2.8);
sun.position.set(-4,8,4);sun.castShadow=true;
sun.shadow.mapSize.set(mobileRendering?512:1024,mobileRendering?512:1024);
Object.assign(sun.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:.1,far:25});
sun.shadow.bias=-.0002;sun.shadow.normalBias=.012;sun.shadow.radius=4;
scene.add(sun);
const fill=new THREE.DirectionalLight('#e7edff',.35);fill.position.set(4,4,-2);scene.add(fill);
const studio=new THREE.Scene();studio.background=new THREE.Color('#817b70');
const windowLight=new THREE.Mesh(new THREE.PlaneGeometry(5,7),new THREE.MeshBasicMaterial({color:'#ffffff',side:THREE.DoubleSide}));
windowLight.position.set(-4,5,4);windowLight.lookAt(0,0,0);studio.add(windowLight);
const environment=new THREE.PMREMGenerator(renderer);scene.environment=environment.fromScene(studio,.04).texture;scene.environmentIntensity=.55;environment.dispose();windowLight.geometry.dispose();windowLight.material.dispose();
const table=new THREE.Mesh(new THREE.PlaneGeometry(50,50),new THREE.MeshStandardMaterial({color:'#bdc9ba',roughness:.94}));
table.rotation.x=-Math.PI/2;table.receiveShadow=true;scene.add(table);
const plateProfile=[[0,.16],[1.55,.16],[1.82,.19],[2.1,.27],[2.38,.39],[2.53,.44],[2.6,.42],[2.62,.37],[2.56,.32],[2.25,.19],[1.85,.07],[.6,.07],[0,.07]].map(p=>new THREE.Vector2(...p));
const plate=new THREE.Mesh(new THREE.LatheGeometry(plateProfile,100),new THREE.MeshPhysicalMaterial({color:'#f0e8d8',roughness:.28,metalness:0,clearcoat:.35,clearcoatRoughness:.32,side:THREE.DoubleSide}));
plate.receiveShadow=true;plate.castShadow=true;scene.add(plate);
const rim=new THREE.Mesh(new THREE.TorusGeometry(2.52,.016,8,120),new THREE.MeshStandardMaterial({color:'#938974',roughness:.5}));rim.rotation.x=-Math.PI/2;rim.position.y=.434;scene.add(rim);
const shadowCanvas=Object.assign(document.createElement('canvas'),{width:128,height:128}),shadowCtx=shadowCanvas.getContext('2d');
const contactGradient=shadowCtx.createRadialGradient(64,64,2,64,64,64);contactGradient.addColorStop(0,'rgba(43,29,17,.72)');contactGradient.addColorStop(.35,'rgba(43,29,17,.30)');contactGradient.addColorStop(1,'rgba(43,29,17,0)');shadowCtx.fillStyle=contactGradient;shadowCtx.fillRect(0,0,128,128);
const contactShadow=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.2),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));
contactShadow.rotation.x=-Math.PI/2;contactShadow.position.y=.172;scene.add(contactShadow);
const egg=new THREE.Group();egg.position.y=1.67;egg.rotation.z=-.12;scene.add(egg);
const whiteMaterial=new THREE.MeshPhysicalMaterial({roughness:.39,clearcoat:.16,clearcoatRoughness:.38,specularIntensity:.7,bumpScale:.002});
const wholeMaterial=new THREE.MeshPhysicalMaterial({roughness:.8,clearcoat:0,bumpScale:.014});
const shellMaterial=new THREE.MeshPhysicalMaterial({roughness:.82,clearcoat:0,bumpScale:.014});
const insideMaterial=new THREE.MeshStandardMaterial({color:'#e1d7c2',roughness:.86,bumpScale:.004,side:THREE.DoubleSide});
const membraneMaterial=new THREE.MeshPhysicalMaterial({color:'#f1e9d7',transparent:true,opacity:.28,roughness:.5,side:THREE.DoubleSide,depthWrite:false});
const body=new THREE.Mesh(eggGeometry(),whiteMaterial);
const whole=new THREE.Mesh(eggGeometry(1.023),wholeMaterial);
for(const mesh of [body,whole]){mesh.castShadow=true;mesh.receiveShadow=true;egg.add(mesh);}
let renderDirty=true;const lastRenderedOrientation=new THREE.Quaternion();
let round,cells=[],patches=[],meshes=[],textures=[],roundId,flipMotion=null,wobble=0,eggKind=eggKinds[0],teaKind=teaKinds[0],roundIndex=0;
let sweepMotions=[];
let total=null,saving=false,completedRecord=null,toastTimer,savedCounts={egg:[],tea:[]};
let gameState=null,purchasing=false,purchaseId=null,purchaseChoice=null,roundEffects=null,refreshTalents=()=>{},selling=false;
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
const up=new THREE.Vector3(0,1,0),right=new THREE.Vector3(1,0,0);
let soundVolume=.7;try{const saved=localStorage.getItem("tea-volume");if(saved!==null&&Number.isFinite(Number(saved)))soundVolume=Math.max(0,Math.min(1,Number(saved)));}catch{}
let soundOn=true,audioContext;const soundBuffers=new Map();
try {soundOn=localStorage.getItem('tea-sound')!=='off';}catch{}

function playSound(kind,pieces=1) {
  if(!soundOn||soundVolume===0)return;
  try {
    audioContext??=new (window.AudioContext||window.webkitAudioContext)();
    if(audioContext.state==='suspended')void audioContext.resume();
    const now=audioContext.currentTime;
    const duration=kind==='knock'?.12:kind==='land'?.09:kind==='loosen'?.18:.26;
    let buffer=soundBuffers.get(kind);if(!buffer){buffer=audioContext.createBuffer(1,Math.ceil(audioContext.sampleRate*duration),audioContext.sampleRate);const data=buffer.getChannelData(0);
    for(let i=0;i<data.length;i++) {const t=i/data.length,seconds=i/audioContext.sampleRate;let env=Math.exp(-t*(kind==='knock'?9:kind==='land'?12:5));const noise=Math.random()*2-1;if(kind==='peel'||kind==='loosen'){env*=Math.min(1,t*30)*(.15+.85*Math.pow(Math.sin(t*19),6));data[i]=noise*env;}else data[i]=(noise*.35+Math.sin(seconds*Math.PI*2*(kind==='knock'?920:420))*.45+Math.sin(seconds*Math.PI*2*(kind==='knock'?1730:870))*.2)*env;}
    soundBuffers.set(kind,buffer);}
    const source=audioContext.createBufferSource(),filter=audioContext.createBiquadFilter(),gain=audioContext.createGain();
    source.buffer=buffer;filter.type='lowpass';filter.frequency.value=kind==='knock'?2300:kind==='land'?1000:2500;filter.Q.value=.5;
    gain.gain.value=kind==='knock'?.13:kind==='land'?.035:Math.min(.09,.045+pieces*.005);
    gain.gain.value*=soundVolume/.7;
    source.connect(filter).connect(gain).connect(audioContext.destination);source.start(now);
    source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
  }catch{ /* Sound is optional; the game remains playable. */ }
}
function updateSound() {
  $('#sound').setAttribute('aria-pressed',String(soundOn));
  $('#sound').setAttribute('aria-label',soundOn?'关闭剥壳声音':'打开剥壳声音');
  $('#sound').title=soundOn?'关闭剥壳声音':'打开剥壳声音';
  $('#sound-state').textContent=soundOn?'已开启':'已关闭';
}
$('#sound').onclick=()=>{soundOn=!soundOn;try{localStorage.setItem('tea-sound',soundOn?'on':'off');}catch{}updateSound();};
updateSound();
$("#volume").value=Math.round(soundVolume*100);$("#volume-value").textContent=Math.round(soundVolume*100)+"%";
$("#volume").oninput=()=>{soundVolume=Number($("#volume").value)/100;$("#volume-value").textContent=Math.round(soundVolume*100)+"%";try{localStorage.setItem("tea-volume",String(soundVolume));}catch{}};
$("#volume").onchange=()=>playSound("knock");

// Settings reuse the existing sound and animation controls.
$('#open-settings').onclick=()=>$('#settings-dialog').showModal();
$('#close-settings').onclick=()=>$('#settings-dialog').close();
$('#open-gift').onclick=()=>{$('#gift-status').textContent='';$('#gift-dialog').showModal();$('#gift-code').focus({preventScroll:true});};
$('#close-gift').onclick=()=>$('#gift-dialog').close();
$('#reduced-motion').checked=reducedMotion;
$('#reduced-motion').onchange=()=>{reducedMotion=$('#reduced-motion').checked;try{localStorage.setItem('tea-reduced-motion',reducedMotion?'on':'off');}catch{}};

let sweepShake=true;try{sweepShake=localStorage.getItem("tea-sweep-shake")!=="off";}catch{}
$("#sweep-shake").checked=sweepShake;
$("#sweep-shake").onchange=()=>{sweepShake=$("#sweep-shake").checked;try{localStorage.setItem("tea-sweep-shake",sweepShake?"on":"off");}catch{}};

let redeeming=false;
$('#gift-form').onsubmit=async event=>{
  event.preventDefault();if(redeeming)return;
  const code=$('#gift-code').value.trim();if(!code){$('#gift-status').textContent='请输入礼品码。';return;}
  redeeming=true;$('#redeem-gift').disabled=true;$('#gift-status').textContent='正在兑换…';
  try{await gameAction({action:'redeem',code});$('#gift-status').textContent='兑换成功！零钱已到账，当前余额 '+yuan(gameState.money);$('#gift-code').value='';}
  catch(error){$('#gift-status').textContent=error.message;}
  finally{redeeming=false;$('#redeem-gift').disabled=false;}
};

function toast(message) {$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),1900);}
function refreshCounters() {
  $('#clicks').textContent=round.clicks;
  const removed=round.patches.reduce((sum,p)=>sum+(p.released?p.cells.length:0),0);
  const percent=Math.round(removed/cells.length*100);
  $('#progress').style.width=percent+'%';$('.progress-track').setAttribute('aria-valuenow',percent);
  $('#progress-label').textContent=round.phase==='cracking'?'壳还完整，慢慢来':percent===100?'剥得干干净净':`慢慢露出来了 · ${percent}%`;
  $('#recipe').textContent=`${eggKind.name} · ${teaKind.name}`;
}

function patchBoundary(ids) {
  const edges=new Map(),key=p=>p.toArray().map(n=>Math.round(n*1e6)).join(',');
  for(const id of ids){const corners=cells[id].corners;for(let i=0;i<corners.length;i++){
    const a=corners[i],b=corners[(i+1)%corners.length],ka=key(a),kb=key(b),id=ka<kb?`${ka}|${kb}`:`${kb}|${ka}`;
    const edge=edges.get(id);if(edge)edge.count++;else edges.set(id,{a,b,count:1});
  }}
  return [...edges.values()].filter(edge=>edge.count===1).sort((a,b)=>b.a.distanceToSquared(b.b)-a.a.distanceToSquared(a.b))[0]||{a:cells[ids[0]].corners[0],b:cells[ids[0]].corners[1]};
}

async function startRound(active=gameState?.active) {
  if(!active)return;
  renderDirty=true;egg.visible=false;$('#finish').hidden=true;$('#discovery').hidden=true;$('.play-area').classList.remove('complete');$("#shop-gate").classList.add('preparing');$("#shop-gate").hidden=false;$("#shop-title").textContent="正在准备这一颗蛋…";sweepMotions=[];
  for(const patch of patches) {patch.group.removeFromParent();patch.membrane.removeFromParent();patch.membrane.geometry.dispose();}
  for(const mesh of meshes)mesh.geometry.dispose();patches=[];meshes=[];
  for(const t of textures)t.dispose();
  roundIndex=total??0;eggKind=eggKinds[active.egg];teaKind=teaKinds[active.tea];roundEffects=mechanics(eggKind,active.levels);
  for(const [kind,item] of [['egg',eggKind],['tea',teaKind]]){const image=new Image();image.src=stampUrl(kind,item);}
  body.geometry.dispose();body.geometry=eggGeometry(1,eggKind);whole.geometry.dispose();whole.geometry=eggGeometry(1.023,eggKind);
  const character=['basketball','penguin'].includes(eggKind.motif),century=eggKind.motif==='century',gray=eggKind.name==='乌鸡蛋';
  wholeMaterial.color.set('#ffffff');shellMaterial.color.set('#ffffff');whiteMaterial.color.set(character||century?'#ffffff':eggKind.whiteTint);whiteMaterial.roughness=century?.18:gray?.28:character?.34:.39;whiteMaterial.clearcoat=century?.65:gray?.28:.16;whiteMaterial.clearcoatRoughness=gray?.30:.38;whiteMaterial.envMapIntensity=gray?.25:1;whiteMaterial.specularColor.set(gray?'#edf1ff':'#ffffff');whiteMaterial.transmission=century?.08:0;whiteMaterial.thickness=century?.12:0;whiteMaterial.attenuationColor.set('#c48e43');whiteMaterial.attenuationDistance=2;insideMaterial.color.set(eggKind.innerTint);shellMaterial.bumpScale=character?.003:eggKind.speckles?.022:.014;wholeMaterial.bumpScale=character?.003:.014;
  cells=makeCells();round=createRound(cells.map(c=>c.neighbors),Math.random,roundEffects.peels,roundEffects);roundId=active.id;
  textures=await makeTexturesAsync(cells,surfacePhotos,Math.random,eggKind,teaKind,512);
  wholeMaterial.map=textures[0];wholeMaterial.bumpMap=textures[3];wholeMaterial.needsUpdate=true;
  shellMaterial.map=textures[1];shellMaterial.bumpMap=textures[3];shellMaterial.needsUpdate=true;
  whiteMaterial.map=textures[2];whiteMaterial.bumpMap=textures[3];whiteMaterial.bumpScale=century?.0006:character?.0005:.002;whiteMaterial.needsUpdate=true;
  insideMaterial.bumpMap=textures[3];insideMaterial.roughness=.91;insideMaterial.bumpScale=.0015;insideMaterial.needsUpdate=true;
  membraneMaterial.color.set(eggKind.innerTint).lerp(new THREE.Color('#fff9ef'),.68);
  meshes=[];patches=[];flipMotion=null;
  egg.quaternion.setFromEuler(new THREE.Euler(character?.06:.12,character?0:Math.random()*Math.PI,character?-.06:-1.4));egg.scale.setScalar(eggDisplayScale);egg.position.y=character?eggKind.height*eggKind.scale*eggDisplayScale+.22:1.67;
  contactShadow.scale.setScalar(Math.max(.45,eggKind.scale*eggDisplayScale));
  whole.visible=true;
  for(const data of round.patches) {
    const center=new THREE.Vector3(),normal=new THREE.Vector3();
    for(const id of data.cells){center.add(eggPoint(cells[id].site,1.021,eggKind));normal.add(cells[id].site);}
    center.divideScalar(data.cells.length);normal.normalize();
    const group=new THREE.Group();group.position.copy(center);egg.add(group);group.visible=false;
    const patch={group,center,normal,base:center.clone(),edge:patchBoundary(data.cells),motion:null,data};
    const mesh=new THREE.Mesh(patchGeometry(cells,data.cells,eggKind,center,mobileRendering?1:2),[shellMaterial,insideMaterial]);mesh.userData.cell=data.cells[0];mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);meshes.push(mesh);
    const membraneGeometry=new THREE.BufferGeometry();
    membraneGeometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(18),3));
    patch.membrane=new THREE.Mesh(membraneGeometry,membraneMaterial);patch.membrane.visible=false;patch.membrane.frustumCulled=false;egg.add(patch.membrane);
    patches.push(patch);
  }
  $('.play-area').classList.remove('complete');$('#finish').hidden=true;$('#discovery').hidden=true;
  $('#step-number').textContent='01';$('#step-label').textContent='先敲一敲';$('#instruction').textContent='轻点鸡蛋，唤醒一圈裂纹';
  $('#toast').classList.remove('visible');$('#flip').disabled=false;$('#shop-gate').hidden=true;$('#shop-gate').classList.remove('preparing');egg.visible=true;completedRecord=null;refreshCounters();resizeScene();
  if(active.phase==='peeled'){round.phase='complete';round.clicks=active.clicks;round.remaining=0;for(const patch of patches){patch.data.released=true;patch.group.visible=false;}whole.visible=false;refreshCounters();finishRound(true);}
}

function updateMembrane(patch,amount) {
  const a=eggPoint(patch.edge.a,1.022,eggKind),b=eggPoint(patch.edge.b,1.022,eggKind);
  const outward=new THREE.Vector3().addVectors(a,b).normalize(),width=new THREE.Vector3().crossVectors(outward,b.clone().sub(a)).normalize().multiplyScalar(.018+amount*.1);
  const stretch=patch.normal.clone().multiplyScalar(amount),c=b.clone().add(stretch).add(width),d=a.clone().add(stretch).sub(width);
  const p=patch.membrane.geometry.attributes.position;p.array.set([...a,...b,...c,...b,...d,...c]);p.needsUpdate=true;patch.membrane.geometry.computeVertexNormals();patch.membrane.visible=amount>.008;
}

function beginPeel(patch) {
  patch.motion={phase:'lift',start:performance.now(),from:patch.group.position.clone()};
}
function releaseToDish(patch,now) {
  patch.membrane.visible=false;
  scene.attach(patch.group);
  patch.onDish=false;
  const angle=Math.random()*Math.PI*2;
  const normal=patch.normal.clone().applyQuaternion(egg.quaternion).normalize();
  const toQ=new THREE.Quaternion().setFromUnitVectors(normal,up.clone().multiplyScalar(Math.random()<.3?-1:1)).premultiply(new THREE.Quaternion().setFromAxisAngle(up,Math.random()*Math.PI*2));
  let bottom=0,extent=0;const vertex=new THREE.Vector3();
  for(const mesh of patch.group.children) {
    const points=mesh.geometry.attributes.position;
    for(let i=0;i<points.count;i++){vertex.fromBufferAttribute(points,i).add(mesh.position).multiplyScalar(eggDisplayScale).applyQuaternion(toQ);bottom=Math.min(bottom,vertex.y);extent=Math.max(extent,Math.hypot(vertex.x,vertex.z));}
  }
  const radius=Math.min(1.15+Math.random()*.42,Math.max(.4,2.2-extent));
  const target=new THREE.Vector3(Math.cos(angle)*radius,.17-bottom+(round.patches.length-round.remaining)*.0015,Math.sin(angle)*radius);
  patch.motion={phase:'fall',start:now,from:patch.group.position.clone(),to:target,fromQ:patch.group.quaternion.clone(),toQ,duration:reducedMotion?.12:.48+Math.random()*.15};
}
function sweepShells() {
  const targets=patches.filter(p=>p.onDish&&p.group.parent===scene);
  if(!targets.length){toast('盘子上暂时没有碎壳');return;}
  $('#sweep').disabled=true;if(sweepShake)$('.play-area').classList.add('scanning');setTimeout(()=>{$('#sweep').disabled=false;$('.play-area').classList.remove('scanning');},650);
  if(sweepShake)try{navigator.vibrate?.([35,35,45]);}catch{}
  const now=performance.now();
  for(const patch of targets) {
    const from=patch.group.position.clone(),angle=Math.random()*Math.PI*2,distance=4+Math.random()*1.5,axis=new THREE.Vector3(Math.random()-.5,Math.random(),Math.random()-.5).normalize();
    sweepMotions.push({group:patch.group,start:now+Math.random()*35,from,to:from.clone().add(new THREE.Vector3(Math.cos(angle)*distance,.5+Math.random(),Math.sin(angle)*distance)),fromQ:patch.group.quaternion.clone(),fromScale:patch.group.scale.clone(),axis,spin:2+Math.random()*4,duration:reducedMotion?.16:.42+Math.random()*.14});
    patch.motion=null;
    patch.onDish=false;
  }
  toast(sweepShake?'轻轻一震，碎壳都散开了':'盘子上的碎壳已扫走');
}

function hitAt(clientX,clientY) {
  const rect=canvas.getBoundingClientRect();pointer.set((clientX-rect.left)/rect.width*2-1,-(clientY-rect.top)/rect.height*2+1);
  raycaster.setFromCamera(pointer,camera);
  const targets=round.phase==='cracking'?[whole]:[body,...meshes.filter(m=>!round.patches[round.byCell[m.userData.cell]].released)];
  return raycaster.intersectObjects(targets,false)[0];
}
function acceptTap(cell) {
  const action=tapShell(round,cell);
  if(action.type==='ignored')return action;
  if(action.type==='knock'||action.type==='cracked') {
    wobble=performance.now();playSound('knock');
    wholeMaterial.map=textures[1];
    if(action.type==='knock') {toast('咔嚓，裂纹慢慢散开');}
    else {whole.visible=false;for(const p of patches)p.group.visible=true;$('#step-number').textContent='02';$('#step-label').textContent='慢慢剥开';$('#instruction').textContent='点一片壳，看看能带下多少';toast('敲好了，从哪儿开始都可以');}
  } else {
    const patch=patches[round.byCell[cell]];
    if(action.type==='loosen') {renderDirty=true;playSound('loosen');patch.group.position.copy(patch.base).addScaledVector(patch.normal,.045);updateMembrane(patch,.08);}
    else {playSound('peel',action.cells.length);(action.patches??[round.byCell[cell]]).forEach((index,i)=>{if(i)setTimeout(()=>beginPeel(patches[index]),75*i);else beginPeel(patches[index]);});}
    if(action.complete) {
      const id=roundId;setTimeout(()=>{if(roundId===id)finishRound();},reducedMotion?300:1100);
    }
  }
  refreshCounters();return action;
}
function tapAt(x,y) {
  if(!round||round.phase==='complete'||!$('#shop-gate').hidden)return;
  scene.updateMatrixWorld(true);
  const hit=hitAt(x,y);
  if(!hit)return;
  if(round.phase==='cracking')acceptTap(0);
  else if(hit.object===body)toast('这里已经剥好了，转一转找剩下的壳');
  else acceptTap(hit.object.userData.cell);
}

let gesture=null;
canvas.addEventListener('pointerdown',event=>{
  if(event.button!==0||!event.isPrimary)return;
  canvas.focus({preventScroll:true});canvas.setPointerCapture(event.pointerId);
  if(!round||!$('#shop-gate').hidden)return;
  flipMotion=null;gesture={id:event.pointerId,x:event.clientX,y:event.clientY,lastX:event.clientX,lastY:event.clientY,drag:false};
});
canvas.addEventListener('pointermove',event=>{
  if(!gesture||event.pointerId!==gesture.id)return;
  if(Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>7)gesture.drag=true;
  if(gesture.drag) {
    const yaw=new THREE.Quaternion().setFromAxisAngle(up,(event.clientX-gesture.lastX)*.008);
    const pitch=new THREE.Quaternion().setFromAxisAngle(right,(event.clientY-gesture.lastY)*.008);
    egg.quaternion.premultiply(yaw).premultiply(pitch);
  }
  gesture.lastX=event.clientX;gesture.lastY=event.clientY;
});
canvas.addEventListener('pointerup',event=>{
  if(!gesture||event.pointerId!==gesture.id)return;
  const wasTap=!gesture.drag;gesture=null;
  if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
  if(wasTap)tapAt(event.clientX,event.clientY);
});
canvas.addEventListener('pointercancel',()=>{gesture=null;});
canvas.addEventListener('lostpointercapture',()=>{gesture=null;});

function flipEgg() {
  if(!round||!$('#shop-gate').hidden)return;
  const q=egg.quaternion.clone().premultiply(new THREE.Quaternion().setFromAxisAngle(right,Math.PI));
  flipMotion={start:performance.now(),from:egg.quaternion.clone(),to:q};
}
$('#flip').onclick=flipEgg;
$('#sweep').onclick=sweepShells;
function keyboardPeel() {
  if(!round||!$('#shop-gate').hidden)return {type:'ignored'};
  if(round.phase==='cracking')return acceptTap(0);
  if(round.phase==='complete')return {type:'ignored'};
  scene.updateMatrixWorld(true);
  const rect=canvas.getBoundingClientRect();
  const choices=meshes.filter(m=>!round.patches[round.byCell[m.userData.cell]].released).map(mesh=>({mesh,point:mesh.getWorldPosition(new THREE.Vector3()).project(camera)})).sort((a,b)=>a.point.x**2+a.point.y**2-b.point.x**2-b.point.y**2);
  for(const {mesh,point} of choices) {
    const hit=hitAt(rect.left+(point.x+1)*rect.width/2,rect.top+(1-point.y)*rect.height/2);
    if(hit?.object===mesh)return acceptTap(mesh.userData.cell);
  }
  toast('这一面剥好了，翻个面继续');return {type:'no-visible-shell'};
}
canvas.addEventListener('keydown',event=>{
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','Enter'].includes(event.key)) {
    event.preventDefault();if(event.repeat)return;
    if(event.key===' '||event.key==='Enter')keyboardPeel();
    else {flipMotion=null;const axis=event.key.includes('Left')||event.key.includes('Right')?up:right;const sign=event.key.includes('Left')||event.key.includes('Up')?-1:1;egg.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(axis,sign*.24));}
  }
});

function stampCard(item,index,kind,className='stamp') {
  const card=document.createElement('article');card.className=className;card.dataset.rarity=item.rarity;
  card.style.setProperty('--stamp-fill',kind==='egg'?item.stampColor:item.color);
  card.innerHTML=`<span class="stamp-art">${stampArt(kind,item,className==='stamp'?'lazy':'eager')}</span><span class="stamp-name">${item.name}</span><b class="rarity">${item.rarity}</b>`;return card;
}
function discoveryCard(item,index,kind) {
  const entry=document.createElement('div');entry.className='discovery-entry';
  const description=document.createElement('p');description.className='stamp-intro';description.textContent=item.description;
  entry.append(stampCard(item,index,kind,'discovery-stamp'),description);return entry;
}
let stampNoticeQueue=[];
function showStampNotices(changes) {
  if(!changes.length)return;
  stampNoticeQueue=[...changes];showNextStampNotice();
}
function showNextStampNotice() {
  const change=stampNoticeQueue.shift();
  if(!change){$('#discovery').hidden=true;$('#finish').hidden=gameState?.active?.phase!=='peeled';if(!gameState?.active)showShop();return;}
  const upgrades=change.to>change.from,fresh=change.fresh;
  $('#discovery-title').textContent=upgrades?(fresh?'恭喜，新印章入册，也升级啦！':'恭喜，你的印章升级啦！'):'恭喜，发现了新的小印章！';
  $('#discovery-label').textContent=upgrades?'印章养成 · 收益提升':'新印章入册';
  $('#discovery-stamps').replaceChildren(...[change].map(change=>{
    const {kind,index}=change,item=(kind==='egg'?eggKinds:teaKinds)[index],entry=discoveryCard(item,index,kind);
    if(change.to>change.from){
      const level=document.createElement('p');level.className='stamp-upgrade';level.textContent=`Lv.${change.from} → Lv.${change.to}`;
      const gain=document.createElement('p');gain.className='stamp-gain';
      const before=document.createElement('span'),after=document.createElement('strong');before.textContent='+'+yuan(change.beforeBonus)+' → ';after.textContent='+'+yuan(change.afterBonus);
      gain.append(before,after);
      const note=document.createElement('p');note.className='stamp-intro';note.textContent='每颗使用此'+(kind==='egg'?'蛋种':'茶种')+'的蛋，售价加成提升';
      entry.append(level,gain,note);if(gameState?.talents[18]&&gameState.active?.notices?.some(n=>n.kind===kind&&n.index===index&&n.to>n.from)){const gift=document.createElement('p');gift.className='stamp-intro';gift.textContent='晋级贺礼 +¥0.30 · 售出这颗蛋时领取';entry.append(gift);}
    }
    return entry;
  }));
  $('#discovery').hidden=false;$('#finish').hidden=true;$('#shop-gate').hidden=true;$('#discovery-accept').textContent=stampNoticeQueue.length?'收好这一枚，下一枚 →':'太好了，继续 →';$('#discovery-accept').focus({preventScroll:true});
}
function renderStampSet(target,items,counts,kind) {
  target.replaceChildren();
  items.forEach((item,index)=>{
    const count=counts[index]??0;if(item.retired&&!count)return;
    const unlocked=count>0,card=stampCard(item,index,kind);card.classList.toggle('locked',!unlocked);
    const label=document.createElement('span');label.className='stamp-count';label.textContent=total===null?'待同步':unlocked?`已获得 × ${count}`:'尚未获得';card.append(label);
    if(unlocked&&gameState){const m=mastery(count,kind,gameState.talents),level=document.createElement('span');level.className='stamp-level';level.textContent='Lv.'+m.level+(m.next?' · '+count+' / '+m.next+' 次':' · 已满级');card.append(level);const gain=document.createElement('span');gain.className='stamp-level';gain.textContent='每颗售价加成 +'+yuan(masteryBonus(m.level,kind,gameState.talents));card.append(gain);}
    if(item.unlockTalent&&!gameState?.talents[item.unlockTalent]&&!unlocked){const note=document.createElement('span');note.className='stamp-unlock';note.textContent='需「'+talents[item.unlockTalent].name+'」';card.append(note);}
    card.setAttribute('aria-label',`${item.name}，${item.rarity}，${label.textContent}`);target.append(card);
  });
}
function showTotal() {
  const earned=total??0;$('#total').textContent=total??'—';
  $('#stamp-description').textContent=total===null?'小印章册暂时没有连上，稍后再打开看看。':`已经剥好 ${earned} 颗 · 蛋种 ${eggKinds.length} 枚，茶种 ${teaKinds.filter(item=>!item.retired).length} 枚收藏印章。`;
  if(!$('#stamp-dialog').open)return;
  renderStampSet($('#egg-stamps'),eggKinds,savedCounts.egg,'egg');
  renderStampSet($('#tea-stamps'),teaKinds,savedCounts.tea,'tea');
}
function acceptCollection(data) {
  if(!Number.isSafeInteger(data.total)||data.total<0||!['egg','tea'].every(key=>Array.isArray(data.counts?.[key])&&data.counts[key].length===(key==='egg'?eggKinds.length:teaKinds.length)&&data.counts[key].every(n=>Number.isSafeInteger(n)&&n>=0&&n<=data.total)&&data.counts[key].reduce((sum,n)=>sum+n,0)===data.total))throw Error('印章数据没有同步好。');
  if(!Number.isSafeInteger(data.money)||data.money<0||!Array.isArray(data.talents)||data.talents.length!==talents.length||data.talents.some((n,i)=>!Number.isInteger(n)||n<0||n>talents[i].prices.length))throw Error('零钱数据没有同步好。');
  if(data.active&&(!eggKinds[data.active.egg]||!teaKinds[data.active.tea]||!Array.isArray(data.active.levels)||data.active.levels.length!==30))throw Error('鸡蛋数据没有同步好。');
  gameState=data;total=data.total;savedCounts=data.counts;$('#money').textContent=yuan(data.money);showTotal();refreshTalents();refreshSale();
}
async function gameAction(body) {
  const previous=gameState;
  const response=await fetch('/api/game',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),data=await response.json();
  if(data.state)acceptCollection(data.state);
  if(!response.ok){const error=Error(data.error||'小摊没有连上，请再试一次。');error.status=response.status;throw error;}
  acceptCollection(data);if(body.action==='talent'&&previous){const changes=stampChanges(previous,data);if(changes.length){$('#talent-dialog').close();showStampNotices(changes);}}return data;
}
async function loadTotal() {
  try{const response=await fetch('/api/game',{cache:'no-store'});if(!response.ok)throw Error();acceptCollection(await response.json());return true;}catch{showTotal();return false;}
}
function showShop() {
  $('#shop-gate').classList.remove('preparing');
  $('#shop-gate').hidden=false;egg.visible=false;renderDirty=true;
  const state=gameState,tutorial=state&&!state.talents[0];
  $('#shop-title').textContent=tutorial?'先剥好第一颗蛋':state?'挑一颗，慢慢剥':'小摊暂时没有连上';
  $('#shop-copy').textContent=tutorial?'先买一颗蛋，轻点敲碎蛋壳，再慢慢揭下来。剥好后，我们再学怎么卖蛋。新手零钱 2 元，买一颗花 2 元。':state?'每次进货随机遇见一种蛋和一种茶。普通搭配基础售价 2.20 元，稀有品种和熟练度会提高售价。':'连接恢复后，零钱和印章会一起回来。';
  $('#buy-egg').disabled=purchasing;$('#buy-egg').textContent=state?'买一颗蛋 · ¥2.00':'重新连接';
}
async function buyEgg(choice=null) {
  if(purchasing)return;purchasing=true;$('#buy-egg').disabled=true;$('#next').disabled=true;$('#shop-error').textContent='';
  try {
    if(!gameState&&!await loadTotal())throw Error('小摊还没有连上，请再试一次。');
    if(gameState.active){if(roundId!==gameState.active.id)await startRound();return;}
    if(!purchaseId){purchaseId=crypto.randomUUID();purchaseChoice=choice?.kind?choice:null;}await gameAction({action:'buy',id:purchaseId,...(purchaseChoice?{choice:purchaseChoice}:{})});purchaseId=null;purchaseChoice=null;await startRound();canvas.focus({preventScroll:true});
  }catch(error){if(error.status){purchaseId=null;purchaseChoice=null;}$('#shop-gate').classList.remove('preparing');$('#shop-error').textContent=error.message;toast(error.message);}finally{purchasing=false;$('#buy-egg').disabled=false;refreshSale();}
}
function refreshSale() {
  const active=gameState?.active,price=active?.phase==='peeled'?salePrice(active,savedCounts,gameState.talents,active.repeat):null;
  const needsTalent=price!==null&&!gameState.talents[0];
  $('#sell').disabled=Boolean(saving||selling||completedRecord||price===null||needsTalent);$('#sell').textContent=needsTalent?'卖出 · 先解锁开摊入门':selling?'正在卖出…':price!==null?'卖出 · '+yuan(price):'已卖出，零钱已到账';
  $('#sale-guide').hidden=!needsTalent;$('#open-talents').classList.toggle('tutorial-target',needsTalent);
  $('#next').disabled=Boolean(saving||selling||completedRecord||active);
  for(const id of ['#order-egg','#order-next']){$(id).hidden=!gameState?.talents[26];$(id).disabled=Boolean(purchasing||saving||selling||completedRecord||active);}
  $('.buy-actions').classList.toggle('has-order',Boolean(gameState?.talents[26]));
}
async function saveStamp() {
  if(saving||!completedRecord)return;const record=completedRecord;saving=true;refreshSale();$('#save-status').classList.remove('error');$('#save-status').textContent='正在盖上这一枚小印章…';
  try {await gameAction({action:'finish',id:record.id,clicks:record.clicks});completedRecord=null;$('#save-status').textContent='两枚印章各累计 1 次 · 剥好 '+total+' 颗';showStampNotices(gameState.active?.notices||[]);}
  catch(error){$('#save-status').classList.add('error');$('#save-status').textContent='这枚印章还没存好，';const retry=document.createElement('button');retry.textContent='再试一次';retry.onclick=saveStamp;$('#save-status').append(retry);}
  finally{saving=false;refreshSale();}
}
function finishRound(restored=false) {
  if(!restored&&(!$('#finish').hidden||!$('#discovery').hidden))return;
  $('.play-area').classList.add('complete');$('#finish-clicks').textContent=round.clicks;$('#step-number').textContent='03';$('#instruction').textContent='剥好了，可以卖出换点零钱';
  const eggIndex=eggKinds.indexOf(eggKind),teaIndex=teaKinds.indexOf(teaKind);
  $('#finish-stamps').replaceChildren(stampCard(eggKind,eggIndex,'egg','finish-stamp'),stampCard(teaKind,teaIndex,'tea','finish-stamp'));
  $('#discovery').hidden=true;$('#finish').hidden=false;
  if(restored){showStampNotices(gameState.active?.notices||[]);$('#save-status').textContent='印章已入册，卖出这颗蛋即可收到零钱。';refreshSale();}else{completedRecord={id:roundId,clicks:round.clicks};void saveStamp();}
}
$('#discovery-accept').onclick=showNextStampNotice;
$('#next').onclick=buyEgg;$('#buy-egg').onclick=buyEgg;
$('#sale-guide-open').onclick=()=>$('#open-talents').click();
$('#sell').onclick=async()=>{
  if(selling||saving||completedRecord||gameState?.active?.phase!=='peeled')return;
  selling=true;refreshSale();const before=gameState.money;
  try{await gameAction({action:'sell',id:roundId});$('#save-status').textContent='卖出收入 '+yuan(gameState.money-before)+' · 零钱已到账';toast('收好零钱，再挑一颗吧');}
  catch(error){$('#save-status').textContent=error.message;toast(error.message);}finally{selling=false;refreshSale();}
};
refreshTalents=initTalents(()=>gameState,async(id,rank)=>{await gameAction({action:'talent',talent:id,rank});toast('点亮了「'+talents[id].name+'」');if(!round&&$('#discovery').hidden)showShop();},toast);
$('#collection').onclick=$('#finish-collection').onclick=()=>{$('#stamp-dialog').showModal();showTotal();if(total===null)void loadTotal();};
$('#close-stamps').onclick=()=>$('#stamp-dialog').close();
$('#stamp-dialog').addEventListener('click',event=>{if(event.target===$('#stamp-dialog')){const r=event.target.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)event.target.close();}});
window.addEventListener('online',()=>{if(completedRecord)void saveStamp();else void loadTotal().then(ok=>{if(ok&&!$('#shop-gate').hidden)showShop();});});

function resizeScene(){
  renderDirty=true;
  const {width,height}=canvas.getBoundingClientRect();renderer.setSize(width,height,false);camera.aspect=width/height;
  const distance=(camera.aspect<.75?12.0:10)*Math.max(1,eggKind.scale);
  camera.position.set(0,distance*.69,distance);camera.lookAt(0,1,0);camera.updateProjectionMatrix();
}
new ResizeObserver(resizeScene).observe(canvas);
void loadTotal().then(async ok=>{if(ok&&gameState.active)await startRound();else showShop();});
renderer.setAnimationLoop(now=>{
  if(document.hidden||document.querySelector('dialog[open]'))return;
  if(!renderDirty&&!flipMotion&&!wobble&&!sweepMotions.length&&!patches.some(p=>p.motion)&&egg.quaternion.equals(lastRenderedOrientation))return;
  const positionChanged=renderDirty||Boolean(flipMotion)||!egg.quaternion.equals(lastRenderedOrientation);renderDirty=false;
  if(flipMotion) {const t=Math.min(1,(now-flipMotion.start)/(reducedMotion?1:500)),ease=t*t*(3-2*t);egg.quaternion.slerpQuaternions(flipMotion.from,flipMotion.to,ease);if(t===1)flipMotion=null;}
  if(positionChanged){let bottom=0;const foot=new THREE.Vector3();
  for(const cell of cells){const p=eggPoint(cell.site,1,eggKind).applyQuaternion(egg.quaternion);if(p.y<bottom){bottom=p.y;foot.copy(p);}}
  egg.position.y=.165-bottom*eggDisplayScale;
  contactShadow.position.x=foot.x*eggDisplayScale;contactShadow.position.z=foot.z*eggDisplayScale;}
  if(wobble) {const t=(now-wobble)/300;egg.scale.set(eggDisplayScale*(1+Math.sin(t*22)*.013*(1-t)),eggDisplayScale*(1-Math.sin(t*22)*.008*(1-t)),eggDisplayScale);if(t>=1){wobble=0;egg.scale.setScalar(eggDisplayScale);}}
  for(const patch of patches) {
    if(patch.motion?.phase==='lift') {
      const motion=patch.motion,t=Math.min(1,(now-motion.start)/(reducedMotion?1:170*round.peelSpeed)),ease=t*t*(3-2*t);
      patch.group.position.copy(motion.from).addScaledVector(patch.normal,.16*ease);updateMembrane(patch,.1*ease);
      if(t===1)patch.motion={phase:'flipOut',start:now,from:patch.group.position.clone(),fromQ:patch.group.quaternion.clone()};
    }else if(patch.motion?.phase==='flipOut') {
      const motion=patch.motion,t=Math.min(1,(now-motion.start)/(reducedMotion?1:260*round.peelSpeed)),ease=t*t*(3-2*t),axis=new THREE.Vector3().crossVectors(patch.normal,up).normalize();
      if(axis.lengthSq()<.1)axis.copy(right);
      patch.group.position.copy(motion.from).addScaledVector(patch.normal,.1*ease).addScaledVector(axis,.09*ease);
      patch.group.quaternion.copy(motion.fromQ).multiply(new THREE.Quaternion().setFromAxisAngle(axis,1.75*ease));updateMembrane(patch,.1*(1-ease));
      if(t===1)releaseToDish(patch,now);
    }else if(patch.motion?.phase==='fall') {
      const motion=patch.motion,t=Math.min(1,(now-motion.start)/(motion.duration*1000));
      patch.group.position.lerpVectors(motion.from,motion.to,t);patch.group.position.y+=Math.sin(Math.PI*t)*.22;
      patch.group.quaternion.slerpQuaternions(motion.fromQ,motion.toQ,t);
      if(t===1){patch.onDish=true;patch.motion={phase:'settle',start:now};playSound('land');}
    }else if(patch.motion?.phase==='settle') {
      const t=(now-patch.motion.start)/180;patch.group.position.y+=Math.sin(t*Math.PI*2)*.001*(1-t);
      if(t>=1)patch.motion=null;
    }
  }
  if(roundEffects?.sweep&&patches.filter(p=>p.onDish&&!p.motion&&p.group.parent===scene).length>=roundEffects.sweep&&!$('#sweep').disabled)sweepShells();
  sweepMotions=sweepMotions.filter(motion=>{
    if(now<motion.start)return true;
    const t=Math.min(1,(now-motion.start)/(motion.duration*1000)),ease=1-(1-t)**3;
    motion.group.position.lerpVectors(motion.from,motion.to,ease);motion.group.position.y+=Math.sin(Math.PI*t)*.32;
    motion.group.quaternion.copy(motion.fromQ).multiply(new THREE.Quaternion().setFromAxisAngle(motion.axis,motion.spin*ease));
    motion.group.scale.copy(motion.fromScale).multiplyScalar(1-ease);
    if(t<1)return true;
    for(const mesh of motion.group.children)mesh.geometry.dispose();motion.group.removeFromParent();return false;
  });
  renderer.render(scene,camera);lastRenderedOrientation.copy(egg.quaternion);
});

// Expose the same accessible actions to agents when the browser supports WebMCP.
if(document.modelContext?.registerTool) {
  const lifecycle=new AbortController();window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
  const snapshot=()=>({phase:round?.phase??'shop',peelingClicks:round?.clicks??0,remainingPatches:round?.remaining??0,stamps:total,money:gameState?.money??null});
  for(const tool of [
    {name:'tea_egg_status',description:'Read the current tea egg, peeling count and saved stamp count.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>snapshot()},
    {name:'tea_egg_action',description:'Perform one visible game action: tap a front shell, flip the egg, sweep plate shells away, or buy the next egg for ¥2.00 after selling this one. A final peeling tap earns and saves two stamps.',inputSchema:{type:'object',properties:{action:{type:'string',enum:['tap','flip','sweep','next']}},required:['action'],additionalProperties:false},annotations:{readOnlyHint:false},execute:async input=>{
      if(!input||!['tap','flip','sweep','next'].includes(input.action)||Object.keys(input).some(k=>k!=='action'))throw Error('Choose tap, flip, sweep or next');
      if(input.action==='tap'){keyboardPeel();await new Promise(r=>setTimeout(r,1000));}
      else if(input.action==='flip'){flipEgg();await new Promise(r=>setTimeout(r,520));}
      else if(input.action==='sweep'){sweepShells();await new Promise(r=>setTimeout(r,700));}
      else{if(gameState?.active||saving||completedRecord)throw Error('Finish and sell this egg first');await buyEgg();}
      return snapshot();
    }}
  ])try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}
}

for(const button of document.querySelectorAll('.mobile-nav button'))button.onclick=()=>document.getElementById(button.dataset.open).click();

function fillOrder(){const kind=$('#order-kind').value,items=kind==='egg'?eggKinds:teaKinds;$('#order-item').replaceChildren();items.forEach((item,index)=>{if(item.retired||item.unlockTalent&&!gameState.talents[item.unlockTalent]&&!savedCounts[kind][index])return;const option=document.createElement('option');option.value=index;option.textContent=item.name+' · '+item.rarity;$('#order-item').append(option);});}
function openOrder(){if(purchasing||gameState?.active||!gameState?.talents[26])return;fillOrder();$('#order-status').textContent=gameState.money<1700?'余额不足，需 17 元。':'';$('#confirm-order').disabled=gameState.money<1700;$('#order-dialog').showModal();}
$('#order-kind').onchange=fillOrder;$('#order-egg').onclick=openOrder;$('#order-next').onclick=openOrder;$('#close-order').onclick=()=>$('#order-dialog').close();
$('#confirm-order').onclick=async()=>{if(purchasing)return;$('#confirm-order').disabled=true;await buyEgg({kind:$('#order-kind').value,index:Number($('#order-item').value)});if(gameState?.active)$('#order-dialog').close();else{$('#order-status').textContent=$('#shop-error').textContent;$('#confirm-order').disabled=false;}};
