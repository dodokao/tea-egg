const key='tea-egg-tutorial-video-v1';

export function shouldShowTutorial(state,{seen=false,hasSave=false}={}) {
  return Boolean(state&&!seen&&!hasSave&&state.total===0&&state.sequence===0&&state.money===200&&!state.active&&!state.inventory?.length&&state.talents.every(rank=>rank===0));
}

export function initTutorial(getContext) {
  const $=selector=>document.querySelector(selector),dialog=$('#help-dialog'),video=$('#tutorial-video'),status=$('#video-status');
  let checked=false;
  function play() {
    status.textContent='';
    if(!video.src){video.poster=video.dataset.poster;video.src='./tutorial.mp4?v=20261004-video';}
    if(video.error)video.load();
    video.currentTime=0;
    void video.play().catch(()=>{});
  }
  function open() {
    if(!dialog.open)dialog.showModal();
    play();
    try{localStorage.setItem(key,'1');}catch{}
  }
  $('#open-help').onclick=open;
  $('#close-help').onclick=$('#help-start').onclick=()=>dialog.close();
  $('#replay-video').onclick=play;
  dialog.addEventListener('close',()=>video.pause());
  video.addEventListener('error',()=>{status.textContent='短片暂时没有加载出来，请点「重新播放」再试一次。';});
  function refresh() {
    const {state,blocked}=getContext();
    if(checked||!state||blocked||document.querySelector('dialog[open]'))return;
    checked=true;
    let seen=false,hasSave=false;
    try{seen=localStorage.getItem(key)==='1';hasSave=localStorage.getItem('tea-egg-pages-v1')!==null;}catch{hasSave=true;}
    if(shouldShowTutorial(state,{seen,hasSave}))open();
  }
  refresh();return refresh;
}
