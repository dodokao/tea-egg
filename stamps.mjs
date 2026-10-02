import {eggKinds,teaKinds} from './catalog.mjs';
export function stampUrl(kind,item) {
  const index=(kind==='egg'?eggKinds:teaKinds).indexOf(item);
  return './art/stamps/'+kind+'-'+index+'.webp';
}
export function stampArt(kind,item,loading='eager') {
  return '<img src="'+stampUrl(kind,item)+'" alt="" aria-hidden="true" width="320" height="320" loading="'+loading+'" decoding="async">';
}
