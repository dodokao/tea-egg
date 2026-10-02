import {eggKinds,teaKinds} from './catalog.mjs';
export function stampArt(kind,item) {
  const index=(kind==='egg'?eggKinds:teaKinds).indexOf(item);
  return '<img src="./art/stamps/'+kind+'-'+index+'.png" alt="" aria-hidden="true" width="320" height="320" loading="eager" decoding="async">';
}
