import * as THREE from './lib/three.module.js';
import {ConvexHull} from './lib/ConvexHull.js';

export function eggPoint(p,scale=1,kind={scale:1,height:1.38,taper:.15,width:1}) {
  const width=kind.width*(1-kind.taper*p.y);
  return new THREE.Vector3(p.x*width,p.y*kind.height,p.z*width).multiplyScalar(scale*kind.scale);
}

export function makeCells(random=Math.random,count=160) {
  const sites=[new THREE.Vector3(0,1,0),new THREE.Vector3(0,-1,0)];
  for(let i=2;i<count;i++) {
    let p;
    for(let attempt=0;attempt<80;attempt++) {
      const y=1-random()*2,angle=random()*Math.PI*2;
      p=new THREE.Vector3(Math.sqrt(1-y*y)*Math.cos(angle),y,Math.sqrt(1-y*y)*Math.sin(angle));
      if(sites.every(q=>p.distanceToSquared(q)>.0121))break;
    }
    sites.push(p);
  }
  const hull=new ConvexHull().setFromPoints(sites),indices=new Map(sites.map((p,i)=>[p,i]));
  const cells=sites.map((site,id)=>({id,site,corners:[],neighbors:new Set()}));
  for(const face of hull.faces) {
    const points=[];let edge=face.edge;
    do {points.push(indices.get(edge.head().point));edge=edge.next;}while(edge!==face.edge);
    for(const a of points){cells[a].corners.push(face.normal.clone());for(const b of points)if(a!==b)cells[a].neighbors.add(b);}
  }
  for(const cell of cells) {
    const axis=new THREE.Vector3().crossVectors(cell.site,Math.abs(cell.site.y)>.9?new THREE.Vector3(1,0,0):new THREE.Vector3(0,1,0)).normalize();
    const other=new THREE.Vector3().crossVectors(cell.site,axis);
    cell.corners.sort((a,b)=>Math.atan2(a.dot(other),a.dot(axis))-Math.atan2(b.dot(other),b.dot(axis)));
    cell.neighbors=[...cell.neighbors];
  }
  return cells;
}

function normalAt(p,kind) {
  const k=1-kind.taper*p.y;
  return new THREE.Vector3(p.x/(kind.width*k),(p.y+kind.taper*(p.x*p.x+p.z*p.z)/k)/kind.height,p.z/(kind.width*k)).normalize();
}

export function fragmentGeometry(cell,kind={scale:1,height:1.38,taper:.15,width:1},detail=2) {
  const positions=[],normals=[],uvs=[];
  const center=eggPoint(cell.site,1.021,kind);
  const corners=cell.corners.map(p=>p.clone().lerp(cell.site,.003).normalize());
  function triangle(a,b,c,scale,inward=false,depth=detail) {
    if(depth){const ab=a.clone().add(b).normalize(),bc=b.clone().add(c).normalize(),ca=c.clone().add(a).normalize();triangle(a,ab,ca,scale,inward,depth-1);triangle(ab,b,bc,scale,inward,depth-1);triangle(ca,bc,c,scale,inward,depth-1);triangle(ab,bc,ca,scale,inward,depth-1);return;}
    const points=inward?[a,c,b]:[a,b,c];
    const uv=points.map(p=>[.5+Math.atan2(p.z,-p.x)/(2*Math.PI),.5+Math.asin(p.y)/Math.PI]);
    const reference=uv[points.findIndex(p=>Math.abs(p.y)<=.999999)][0];
    for(const p of uv)p[0]+=Math.round(reference-p[0]);
    points.forEach((p,i)=>{if(Math.abs(p.y)>.999999)uv[i][0]=(uv[(i+1)%3][0]+uv[(i+2)%3][0])/2;});
    points.forEach((p,i)=>{const at=eggPoint(p,scale,kind);positions.push(...at.clone().sub(center));normals.push(...normalAt(p,kind).multiplyScalar(inward?-1:1));uvs.push(...uv[i]);});
  }
  for(let i=0;i<corners.length;i++)triangle(cell.site,corners[i],corners[(i+1)%corners.length],1.021);
  const outerCount=positions.length/3;
  for(let i=0;i<corners.length;i++)triangle(cell.site,corners[i],corners[(i+1)%corners.length],1.009,true);
  function side(from,to,depth=detail) {
    if(depth){const mid=from.clone().add(to).normalize();side(from,mid,depth-1);side(mid,to,depth-1);return;}
    const a=eggPoint(from,1.021,kind).sub(center),b=eggPoint(to,1.021,kind).sub(center),c=eggPoint(to,1.009,kind).sub(center),d=eggPoint(from,1.009,kind).sub(center);
    const n=new THREE.Vector3().subVectors(d,a).cross(new THREE.Vector3().subVectors(b,a)).normalize();
    for(const p of [a,d,b,b,d,c]){positions.push(...p);normals.push(...n);uvs.push(0,0);}
  }
  for(let i=0;i<corners.length;i++)side(corners[i],corners[(i+1)%corners.length]);
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.addGroup(0,outerCount,0);geometry.addGroup(outerCount,positions.length/3-outerCount,1);
  geometry.computeBoundingSphere();
  return {geometry,center};
}

export function patchGeometry(cells,ids,kind,center,detail=2) {
  const parts=ids.map(id=>fragmentGeometry(cells[id],kind,detail)),geometry=new THREE.BufferGeometry();
  const count=parts.reduce((n,p)=>n+p.geometry.attributes.position.count,0);
  for(const [name,size] of [['position',3],['normal',3],['uv',2]]) {
    const out=new Float32Array(count*size);let offset=0;
    for(let material=0;material<2;material++)for(const part of parts){const group=part.geometry.groups[material],attribute=part.geometry.attributes[name];
      for(let i=group.start;i<group.start+group.count;i++)for(let c=0;c<size;c++)out[offset++]=attribute.array[i*size+c]+(name==='position'?part.center.getComponent(c)-center.getComponent(c):0);
    }
    geometry.setAttribute(name,new THREE.BufferAttribute(out,size));
  }
  const outer=parts.reduce((n,p)=>n+p.geometry.groups[0].count,0);
  geometry.addGroup(0,outer,0);geometry.addGroup(outer,count-outer,1);geometry.computeBoundingSphere();for(const part of parts)part.geometry.dispose();return geometry;
}
export function eggGeometry(scale=1,kind={scale:1,height:1.38,taper:.15,width:1}) {
  const geometry=new THREE.SphereGeometry(1,96,64),p=geometry.attributes.position;
  for(let i=0;i<p.count;i++){const v=eggPoint(new THREE.Vector3(p.getX(i),p.getY(i),p.getZ(i)),scale,kind);p.setXYZ(i,v.x,v.y,v.z);}
  const uv=geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setX(i,uv.getX(i)+.5);
  geometry.computeVertexNormals();return geometry;
}

function* textureBake(cells,photos=[],random=Math.random,kind={},teaKind={color:'#b8a074'},width=1024) {
  const height=width/2;
  const canvases=Array.from({length:4},()=>Object.assign(document.createElement('canvas'),{width,height}));
  const images=canvases.map(c=>c.getContext('2d').createImageData(width,height));
  const scans=photos.map(photo=>{
    const canvas=Object.assign(document.createElement('canvas'),{width,height}),ctx=canvas.getContext('2d');
    ctx.drawImage(photo,0,0,width,height);return ctx.getImageData(0,0,width,height).data;
  });
  const sites=cells.map(c=>c.site);
  const offset=random()*100;
  const shift=Math.floor(random()*width);
  const rgb=hex=>[1,3,5].map(start=>parseInt(hex.slice(start,start+2),16));
  const teaTint=rgb(teaKind.color),eggTint=rgb(kind.shellTint||'#c8b99b');
  const shellTint=teaTint.map((v,c)=>v*.78+eggTint[c]*.22);
  function scanColor(scan,x,y,channel) {
    const column=(x+shift)%width,index=(y*width+column)*4+channel;
    const edge=Math.min(column,width-1-column),blend=Math.max(0,1-edge/32)*.5;
    return scan[index]*(1-blend)+scan[(y*width+width-1-column)*4+channel]*blend;
  }
  // Yield between small batches so texture preparation does not freeze input.
  for(let y=0;y<height;y++) {
    if(y&&y%8===0)yield;
    const theta=(y+.5)/height*Math.PI,sy=Math.cos(theta),ring=Math.sin(theta);
    for(let x=0;x<width;x++) {
      const phi=(x+.5)/width*Math.PI*2-Math.PI;
      const sx=-Math.cos(phi)*ring,sz=Math.sin(phi)*ring;
      let best=-2,second=-2,nearest=0,runnerUp=0;
      for(let i=0;i<sites.length;i++) {const s=sites[i],dot=sx*s.x+sy*s.y+sz*s.z;if(dot>best){second=best;runnerUp=nearest;best=dot;nearest=i;}else if(dot>second){second=dot;runnerUp=i;}}
      const distance=(best-second)/sites[nearest].distanceTo(sites[runnerUp]);
      const flow=Math.sin(16*sx+offset+Math.sin(12*sz))*Math.sin(19*sy+Math.sin(14*sx));
      const grain=(random()-.5)*9;
      const hairline=Math.exp(-Math.pow(distance/.0028,2));
      const index=(y*width+x)*4;
      const shellScan=scans[0]?[0,1,2].map(c=>scanColor(scans[0],x,y,c)):[165+flow*10,127+flow*8,88+flow*5];
      const shellLight=(shellScan[0]*.3+shellScan[1]*.59+shellScan[2]*.11)/160;
      const shell=shellTint.map(v=>v*Math.max(.57,Math.min(1.16,.32+shellLight*.68)));
      const white=scans[1]?[0,1,2].map(c=>scanColor(scans[1],x,y,c)):[231+flow*8,215+flow*12,182+flow*15];
      const stain=scans[1]?Math.max(0,245-white[0])*.7:0;
      for(let c=0;c<3;c++)white[c]-=stain;
      if(kind.name==='鸭蛋'){const light=white[0]*.30+white[1]*.59+white[2]*.11;for(let c=0;c<3;c++)white[c]=white[c]*.30+light*.62+246*.08;}
      if(kind.name==='乌鸡蛋'){const gray=white[0]*.30+white[1]*.59+white[2]*.11;white.fill(gray);}
      if(kind.motif==='basketball'||kind.motif==='penguin') {
        const front=sz>0;
        let clothing=null;
        if(kind.motif==='penguin') {
          const belly=front&&(sx*sx/.42+((sy+.12)/.80)**2<1);
          if(!belly){for(let c=0;c<3;c++){white[c]=white[c]*.67+[99,100,101][c]*.33;shell[c]=shell[c]*.72+[80,82,83][c]*.28;}}
          if(sy>.08&&sy<.20||(front&&sx>.30&&sx<.43&&sy>-.22&&sy<.10))clothing=[168,57,61];
        }else {
          // A softly stained bib, trousers and long straps form one complete overall silhouette.
          const abs=Math.abs(sx),bib=front&&sy>-.43&&sy<-.05&&abs<.37;
          const trousers=sy<-.43,strap=sy>-.10&&sy<.63&&Math.abs(abs-(.28+.025*Math.sin(sy*5)))<.043;
          if(bib||trousers||strap){for(let c=0;c<3;c++){white[c]*=strap?.78:.87;shell[c]*=strap?.81:.89;}}
        }
        if(clothing){white.splice(0,3,...clothing.map(v=>v+grain*.18));shell.splice(0,3,...clothing.map(v=>v+grain*.18));}
      }
      if(kind.motif==='stink'){const age=(flow+1)*.5;for(let c=0;c<3;c++)white[c]=white[c]*.22+[233,237,220][c]*.78-age*[4,2,7][c]+grain*.12;}
      if(kind.motif==='century')white.splice(0,3,27+flow*5+grain*.12,23+flow*4+grain*.1,20+flow*3+grain*.1);
      // Small species markings follow the curved surface rather than becoming flat stickers.
      let mark=0;
      if(kind.motif==='flame')mark=sy<-.25+.18*Math.sin(phi*7+.9*Math.sin(sy*6))?.18:0;
      if(kind.motif==='snow')mark=Math.pow(Math.max(0,Math.sin(phi*9+sy*15)*Math.sin(sy*19)),12)*.16;
      if(kind.motif==='bolt')mark=Math.abs(Math.sin(phi*3+Math.floor((sy+1)*7)*.7))<.09?.22:0;
      if(kind.motif==='moon')mark=sy>.15&&sy<.6&&Math.cos(phi+.4)>.92?.12:0;
      if(kind.motif==='pixel'){
        const column=Math.floor((phi+Math.PI)/(Math.PI*2)*24),row=Math.floor(y/height*16);
        const tile=(column*7+row*11+(column^row)*3)%13;
        const shade=tile<3?.78:tile<6?.91:tile===8?1.06:1;
        for(let c=0;c<3;c++){shell[c]*=shade;white[c]=[216,229,202][c]*shade+grain*.08;}
      }
      if(kind.motif==='ninja')mark=sy>.2&&sy<.3?.2:0;
      for(let c=0;c<3;c++){shell[c]=shell[c]*(1-mark)+[244,219,151][c]*mark;white[c]=white[c]*(1-mark*.45)+[247,224,167][c]*mark*.45;}
      // Brewing stains precede the new fractures from tapping; the white never inherits a tiled outline.
      const tea=Math.max(0,245-white[0])*.22;
      for(let c=0;c<3;c++)shell[c]-=tea;
      const pore=174+grain*3+(random()<.008?-55:0);
      const rgb=[
        shell,
        shell.map((v,c)=>v-hairline*[52,40,25][c]),
        white,
        [pore,pore,pore]
      ];
      for(let i=0;i<4;i++){images[i].data.set([...rgb[i].map(v=>Math.max(0,Math.min(255,v))),255],index);}
    }
  }
  if(kind.motif==='century') {
    // Uneven dendritic deposits are baked with subpixel coverage, so crystals blend into the egg.
    const pixels=images[2].data;
    function deposit(x0,y0,x1,y1,radius,opacity) {
      const steps=Math.max(1,Math.ceil(Math.hypot(x1-x0,y1-y0)*2));
      for(let step=0;step<=steps;step++){
        const t=step/steps,x=x0+(x1-x0)*t,y=y0+(y1-y0)*t;
        for(let yy=Math.floor(y-1);yy<=Math.ceil(y+1);yy++)for(let xx=Math.floor(x-1);xx<=Math.ceil(x+1);xx++){
          if(yy<0||yy>=height)continue;
          const coverage=Math.max(0,Math.min(1,radius+.55-Math.hypot(xx+.5-x,yy+.5-y)))*opacity*.40;
          const k=(yy*width+(xx+width)%width)*4;
          for(let c=0;c<3;c++)pixels[k+c]=pixels[k+c]*(1-coverage)+[157,149,121][c]*coverage;
        }
      }
    }
    function crystal(x,y,angle,length,depth,opacity) {
      const sections=4+Math.floor(random()*4),step=length/sections;
      for(let j=0;j<sections;j++){
        angle+=(random()-.5)*.24;
        const nx=x+Math.cos(angle)*step,ny=y+Math.sin(angle)*step;
        deposit(x,y,nx,ny,.18+depth*.13,opacity*(1-j/sections*.4));
        if(depth>0&&j>0&&random()<.78){
          const side=random()<.5?-1:1;
          crystal(nx,ny,angle+side*(.5+random()*.7),length*(1-j/sections)*(.25+random()*.3),depth-1,opacity*.76);
          if(random()<.33)crystal(nx,ny,angle-side*.65,length*(1-j/sections)*.25,depth-1,opacity*.6);
        }
        x=nx;y=ny;
      }
    }
    for(let n=0;n<42;n++)crystal(random()*width,25+random()*(height-50),random()*Math.PI*2,16+random()*47,3,.30+random()*.55);
  }
  const speckles=kind.speckles?Array.from({length:260},()=>({x:random()*width,y:random()*height,r:.7+random()*2.1,angle:random()*.8})):[];
  return canvases.map((canvas,i)=>{const ctx=canvas.getContext('2d');ctx.putImageData(images[i],0,0);if(i<2){ctx.fillStyle='rgba(76,43,28,.23)';for(const spot of speckles){ctx.beginPath();ctx.ellipse(spot.x,spot.y,spot.r,spot.r*.7,spot.angle,0,Math.PI*2);ctx.fill();}}

    const t=new THREE.CanvasTexture(canvas);if(i<3)t.colorSpace=THREE.SRGBColorSpace;t.wrapS=THREE.RepeatWrapping;t.anisotropy=4;return t;
  });
}

export function makeTextures(...args){const bake=textureBake(...args);let step;do{step=bake.next();}while(!step.done);return step.value;}
export async function makeTexturesAsync(...args){const bake=textureBake(...args);let step;while(!(step=bake.next()).done){if(globalThis.scheduler?.yield)await globalThis.scheduler.yield();else await new Promise(resolve=>setTimeout(resolve,0));}return step.value;}
