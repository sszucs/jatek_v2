
const AudioEngine = (() => {
  let ctx = null;
  function get() {
    try {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch { return null; }
  }
  return { get };
})();

const App = (() => {
  const screens = Array.from(document.querySelectorAll('.screen'));
  const progressContainer = document.getElementById('menuProgressSteps');
  const resetProgressBtn = document.getElementById('resetProgressBtn');
  const soundToggleBtn = document.getElementById('soundToggleBtn');
  const defaultProgress = { fishing:false, story:false, lesson:false };
  let progress = loadProgress();
  let soundOn = loadSound();
  renderSoundButton();

  function loadProgress(){ try{ const r=localStorage.getItem('lukacs5-progress'); return r?{...defaultProgress,...JSON.parse(r)}:{...defaultProgress}; }catch{ return {...defaultProgress}; } }
  function saveProgress(){ localStorage.setItem('lukacs5-progress', JSON.stringify(progress)); }
  function loadSound(){ try{ const r=localStorage.getItem('lukacs5-sound'); return r===null?true:r==='true'; }catch{ return true; } }
  function saveSound(){ localStorage.setItem('lukacs5-sound', String(soundOn)); }
  function renderSoundButton(){ soundToggleBtn.textContent = soundOn?'🔊 Hang: be':'🔈 Hang: ki'; soundToggleBtn.setAttribute('aria-pressed', String(soundOn)); }
  function toggleSound(){ soundOn=!soundOn; saveSound(); renderSoundButton(); }
  function playTone(freq=440,duration=.08,type='sine',gainValue=.03){ if(!soundOn) return; const ctx=AudioEngine.get(); if(!ctx) return; const o=ctx.createOscillator(); const g=ctx.createGain(); o.type=type; o.frequency.value=freq; g.gain.value=gainValue; o.connect(g); g.connect(ctx.destination); o.start(); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime+duration); o.stop(ctx.currentTime+duration); }
  function playSuccess(){ playTone(660,.08,'triangle',.04); setTimeout(()=>playTone(880,.1,'triangle',.035),80); }
  function playFail(){ playTone(240,.14,'sine',.02); }
  function playClick(){ playTone(520,.05,'sine',.02); }
  function renderProgress(){ if(!progressContainer) return; progressContainer.innerHTML=''; const items=[{key:'fishing',label:'1. Emberhalászat'},{key:'story',label:'2. Történet'},{key:'lesson',label:'3. Tanulság-labor'}]; const currentIdx=items.findIndex(i=>!progress[i.key]); items.forEach((it,idx)=>{ const el=document.createElement('div'); el.className='step-pill'; if(progress[it.key]) el.classList.add('done'); else if(idx===currentIdx) el.classList.add('current'); el.textContent=`${it.label}${progress[it.key]?' ✓':''}`; progressContainer.appendChild(el); }); }
  function markDone(key){ progress[key]=true; saveProgress(); renderProgress(); }
  function resetProgress(){ progress={...defaultProgress}; saveProgress(); renderProgress(); FishingGame.reset(); StoryGame.reset(); LessonGame.reset(); goTo('menu'); }
  function goTo(name){ screens.forEach(s=>s.classList.toggle('active', s.id===`screen-${name}`)); if(name==='fishing') FishingGame.start(); if(name==='story') StoryGame.render(); if(name==='lesson') LessonGame.render(); window.scrollTo({top:0,behavior:'smooth'}); playClick(); }
  resetProgressBtn?.addEventListener('click', resetProgress);
  soundToggleBtn?.addEventListener('click', toggleSound);
  document.addEventListener('click', e=>{ const b=e.target.closest('[data-go]'); if(b) goTo(b.dataset.go); });
  renderProgress();
  return { goTo, markDone, playSuccess, playFail, playClick };
})();

const FishingGame = (() => {
  const arena = document.getElementById('fishingArena');
  const bubbleLayer = document.getElementById('bubbleLayer');
  const boat = document.getElementById('boatSprite');
  const dropLine = document.getElementById('dropLine');
  const netEffect = document.getElementById('netEffect');
  const impactRing = document.getElementById('impactRing');
  const castBtn = document.getElementById('castNetBtn');
  const restartBtn = document.getElementById('restartFishingBtn');
  const timeEl = document.getElementById('fishingTime');
  const scoreEl = document.getElementById('fishingScore');
  const comboEl = document.getElementById('fishingCombo');
  const goalEl = document.getElementById('fishingGoal');
  const teachingText = document.getElementById('teachingText');
  const teachingRef = document.getElementById('teachingRef');
  const endOverlay = document.getElementById('fishingEndOverlay');
  const endTitle = document.getElementById('fishingEndTitle');
  const endSummary = document.getElementById('fishingEndSummary');
  const continueBtn = document.getElementById('fishingContinueBtn');
  const replayBtn = document.getElementById('fishingReplayBtn');

  const peoplePool = [
    { icon:'🧍', label:'Alak' },
    { icon:'🧍‍♀️', label:'Alak' },
    { icon:'🧑', label:'Alak' },
    { icon:'🧒', label:'Alak' }
  ];
  const gospelMoments = [
    { ref:'Mt 4:19', text:'Kövess engem – és embereket fogsz hívni Istenhez.' },
    { ref:'Jn 3:16', text:'Isten szeretete minden ember felé nyitott.' },
    { ref:'Lk 5:10', text:'Ne félj – új küldetés kezdődik.' },
    { ref:'Róm 10:14', text:'Az üzenet akkor ér célba, ha továbbadjuk.' }
  ];

  let running=false, rafId=null, timerId=null, bubbleId=null;
  let timeLeft=45, score=0, goal=6, combo=1, lastCatchAt=0, teachIndex=0, boatX=10, boatDir=1;
  let targets=[];

  function resetState(){ timeLeft=45; score=0; goal=6; combo=1; lastCatchAt=0; teachIndex=0; boatX=10; boatDir=1; targets=[]; timeEl.textContent=timeLeft; scoreEl.textContent='0'; comboEl.textContent='x1'; goalEl.textContent=goal; teachingText.textContent='Időzíts nyugodtan, és amikor elérsz egy alakot, állj meg egy pillanatra az üzenettel.'; teachingRef.textContent='Lk 5'; arena?.querySelectorAll('.target')?.forEach(el=>el.remove()); bubbleLayer.innerHTML=''; hideOverlay(endOverlay); }

  function makeBubble(){ const el=document.createElement('div'); el.className='bubble'; const size=rand(6,14), left=rand(4,96), duration=rand(7,14); el.style.left=`${left}%`; el.style.width=`${size}px`; el.style.height=`${size}px`; el.style.animationDuration=`${duration}s`; el.style.opacity=String(Math.random()*.35+.15); bubbleLayer.appendChild(el); setTimeout(()=>el.remove(), duration*1000); }

  function createTarget(){ const p=peoplePool[rand(0,peoplePool.length-1)]; const el=document.createElement('div'); el.className='target good'; el.innerHTML=`<div class="person-icon">${p.icon}</div><div class="name-tag">${p.label}</div>`; el.style.left=`${rand(12,88)}%`; el.style.top=`${rand(44,78)}%`; const t={ x:parseFloat(el.style.left), y:parseFloat(el.style.top), speed:rand(6,12)/10, dir:Math.random()>.5?1:-1, phase:Math.random()*Math.PI*2, el }; arena.appendChild(el); targets.push(t); }
  function fillTargets(){ while(targets.length<4) createTarget(); }

  function loop(){ if(!running) return; boatX += .18*boatDir; if(boatX>=86) boatDir=-1; if(boatX<=6) boatDir=1; boat.style.left=`${boatX}%`; const now=performance.now(); targets.forEach(t=>{ t.x += .08*t.speed*t.dir; if(t.x>92) t.dir=-1; if(t.x<6) t.dir=1; const wave=Math.sin(now/900+t.phase)*1.2; t.el.style.left=`${t.x}%`; t.el.style.top=`${t.y+wave}%`; }); rafId=requestAnimationFrame(loop); }

  function splashAt(x,y=74){ impactRing.style.left=`${x}%`; impactRing.style.top=`${y}%`; impactRing.style.opacity='1'; impactRing.style.animation='none'; impactRing.offsetHeight; impactRing.style.animation='ring .42s ease forwards'; }

  function castNet(){ if(!running) return; castBtn.disabled=true; const x=boatX; dropLine.style.opacity='1'; dropLine.style.left=`${x}%`; dropLine.style.height='0px'; const dropHeight=Math.max(220, arena.getBoundingClientRect().height*.68); requestAnimationFrame(()=>{ dropLine.style.transition='height .32s ease'; dropLine.style.height=`${dropHeight}px`; });
    setTimeout(()=>{
      netEffect.style.opacity='1'; netEffect.style.left=`${x}%`; netEffect.style.top='74%'; netEffect.style.transform='translate(-50%,-50%) scale(1.15)'; splashAt(x);
      const caught = targets.find(t=>Math.abs(t.x-x)<5 && t.y>40);
      if(caught){ const now=Date.now(); combo = now-lastCatchAt<3000?Math.min(combo+1,3):1; lastCatchAt=now; score+=combo; scoreEl.textContent=score; comboEl.textContent=`x${combo}`; const m=gospelMoments[teachIndex%gospelMoments.length]; teachIndex++; teachingText.textContent=m.text; teachingRef.textContent=m.ref; App.playSuccess(); caught.el.classList.add('caught'); targets=targets.filter(t=>t!==caught); setTimeout(()=>{ caught.el.remove(); fillTargets(); },420); }
      else{ combo=1; comboEl.textContent='x1'; teachingText.textContent='Néha várni kell a megfelelő pillanatra. Az üzenet időt kér.'; teachingRef.textContent='Préd 3:1'; App.playFail(); }
    }, 320);
    setTimeout(()=>{ dropLine.style.transition='height .24s ease, opacity .2s ease'; dropLine.style.height='0px'; dropLine.style.opacity='0'; netEffect.style.opacity='0'; netEffect.style.transform='translate(-50%,-50%) scale(.5)'; castBtn.disabled=false; }, 900);
  }

  function endGame(){ running=false; cancelAnimationFrame(rafId); clearInterval(timerId); clearInterval(bubbleId); App.markDone('fishing'); const ok=score>=goal; endTitle.textContent= ok?'Küldetés beteljesítve':'Küldetés lezárva'; endSummary.textContent= ok?`Nyugodt tempóban ${score} elérést szereztél. Az üzeneteknek ideje volt megszólalni.`:`${score} elérés született. A lényeg a figyelem és az időzítés.`; showOverlay(endOverlay); }

  function start(){ if(running) return; resetState(); running=true; fillTargets(); loop(); bubbleId=setInterval(makeBubble,420); timerId=setInterval(()=>{ timeLeft--; timeEl.textContent=timeLeft; if(timeLeft<=0) endGame(); },1000); }
  function reset(){ running=false; cancelAnimationFrame(rafId); clearInterval(timerId); clearInterval(bubbleId); resetState(); }

  castBtn?.addEventListener('click', castNet);
  restartBtn?.addEventListener('click', ()=>{ reset(); start(); });
  replayBtn?.addEventListener('click', ()=>{ hideOverlay(endOverlay); reset(); start(); });
  continueBtn?.addEventListener('click', ()=>{ hideOverlay(endOverlay); App.goTo('story'); });
  return { start, reset };
})();

const StoryGame = (()=>({ render(){}, reset(){} }))();
const LessonGame = (()=>({ render(){}, reset(){} }))();

function rand(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
function showOverlay(el){ el?.classList.remove('hidden'); }
function hideOverlay(el){ el?.classList.add('hidden'); }
