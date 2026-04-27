const AudioEngine = (() => {
  let ctx = null;
  function get() {
    try {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch {
      return null;
    }
  }
  return { get };
})();

const VerseSnippets = (() => {
  const MAX_LEN = 90;

  const ruf = [
    { ref: 'Mt 4:19', text: '„Jöjjetek utánam, és én emberhalászokká teszlek titeket.”' },
    { ref: 'Mk 16:15', text: '"Menjetek el az egész világra, és hirdessétek az evangéliumot minden teremtménynek."' },
    { ref: 'Jn 3:16', text: '"Mert úgy szerette Isten e világot, hogy az ő egyszülött Fiát adta, hogy valaki hiszen ő benne, el ne vesszen, hanem örök élete legyen."' },
    { ref: 'Jn 8:12', text: '"„Én vagyok a világ világossága. Aki követ engem, nem jár sötétben, hanem övé lesz az élet világossága."' },
    { ref: 'Lk 19:10', text: '' },
    { ref: 'Mt 11:28', text: '' },
    { ref: 'Jn 14:6', text: '' },
    { ref: 'Róm 10:14', text: '' },
    { ref: 'Lk 5:10', text: '' },
    { ref: 'Lk 5:5', text: '' },
    { ref: 'Préd 3:1', text: '' },
  ];

  function sanitize(s) {
    const t = String(s || '').replace(/\s+/g, ' ').trim();
    return t.length > MAX_LEN ? t.slice(0, MAX_LEN - 1) + '…' : t;
  }

  function getList() {
    return ruf.map(v => ({ ref: v.ref, text: sanitize(v.text) }));
  }

  function hasAnyText(list) {
    return list.some(v => (v.text || '').trim().length > 0);
  }

  return { getList, hasAnyText, MAX_LEN };
})();

const App = (() => {
  const screens = Array.from(document.querySelectorAll('.screen'));
  const progressContainer = document.getElementById('menuProgressSteps');
  const resetProgressBtn = document.getElementById('resetProgressBtn');
  const soundToggleBtn = document.getElementById('soundToggleBtn');

  const defaultProgress = { fishing: false, story: false, lesson: false };
  let progress = loadProgress();
  let soundOn = loadSound();

  renderSoundButton();
  renderProgress();
  setBrandTo22();

  function setBrandTo22() {
    document.title = document.title.replace('2.1', '2.2');
    const topEyebrow = document.querySelector('.topbar .eyebrow');
    if (topEyebrow) topEyebrow.textContent = topEyebrow.textContent.replace('2.1', '2.2');
  }

  function loadProgress() {
    try {
      const raw = localStorage.getItem('lukacs5-progress');
      return raw ? { ...defaultProgress, ...JSON.parse(raw) } : { ...defaultProgress };
    } catch {
      return { ...defaultProgress };
    }
  }

  function saveProgress() {
    localStorage.setItem('lukacs5-progress', JSON.stringify(progress));
  }

  function loadSound() {
    try {
      const raw = localStorage.getItem('lukacs5-sound');
      return raw === null ? true : raw === 'true';
    } catch {
      return true;
    }
  }

  function saveSound() {
    localStorage.setItem('lukacs5-sound', String(soundOn));
  }

  function renderSoundButton() {
    if (!soundToggleBtn) return;
    soundToggleBtn.textContent = soundOn ? '🔊 Hang: be' : '🔈 Hang: ki';
    soundToggleBtn.setAttribute('aria-pressed', String(soundOn));
  }

  function toggleSound() {
    soundOn = !soundOn;
    saveSound();
    renderSoundButton();
  }

  function playTone(freq = 440, duration = 0.08, type = 'sine', gainValue = 0.03) {
    if (!soundOn) return;
    const ctx = AudioEngine.get();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = gainValue;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.stop(ctx.currentTime + duration);
  }

  function playSuccess() {
    playTone(660, 0.085, 'triangle', 0.04);
    setTimeout(() => playTone(880, 0.11, 'triangle', 0.035), 85);
  }

  function playFail() {
    playTone(240, 0.14, 'sine', 0.022);
  }

  function playClick() {
    playTone(520, 0.05, 'sine', 0.02);
  }

  function renderProgress() {
    if (!progressContainer) return;
    progressContainer.innerHTML = '';
    const items = [
      { key: 'fishing', label: '1. Emberhalászat' },
      { key: 'story', label: '2. Történet' },
      { key: 'lesson', label: '3. Tanulság-labor' },
    ];
    const currentIdx = items.findIndex(item => !progress[item.key]);
    items.forEach((item, idx) => {
      const el = document.createElement('div');
      el.className = 'step-pill';
      if (progress[item.key]) el.classList.add('done');
      else if (idx === currentIdx) el.classList.add('current');
      el.textContent = `${item.label}${progress[item.key] ? ' ✓' : ''}`;
      progressContainer.appendChild(el);
    });
  }

  function markDone(key) {
    progress[key] = true;
    saveProgress();
    renderProgress();
  }

  function resetProgress() {
    progress = { ...defaultProgress };
    saveProgress();
    renderProgress();
    FishingGame.reset();
    StoryGame.reset();
    LessonGame.reset();
    goTo('menu');
  }

  function goTo(name) {
    screens.forEach(scr => scr.classList.toggle('active', scr.id === `screen-${name}`));
    if (name === 'fishing') FishingGame.start();
    if (name === 'story') StoryGame.render();
    if (name === 'lesson') LessonGame.render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    playClick();
  }

  resetProgressBtn?.addEventListener('click', resetProgress);
  soundToggleBtn?.addEventListener('click', toggleSound);

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-go]');
    if (btn) goTo(btn.dataset.go);
  });

  return {
    goTo,
    markDone,
    playSuccess,
    playFail,
    playClick
  };
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

  const teachingCard = document.getElementById('teachingCard');
  const teachingText = document.getElementById('teachingText');
  const teachingRef = document.getElementById('teachingRef');

  const endOverlay = document.getElementById('fishingEndOverlay');
  const endTitle = document.getElementById('fishingEndTitle');
  const endSummary = document.getElementById('fishingEndSummary');
  const continueBtn = document.getElementById('fishingContinueBtn');
  const replayBtn = document.getElementById('fishingReplayBtn');

  const targetsPool = [
    { icon: '🧍'},
    { icon: '🧍‍♀️'},
    { icon: '🧑'},
    { icon: '🧑‍🦱'},
  ];

  const verseList = VerseSnippets.getList();
  const verseHasText = VerseSnippets.hasAnyText(verseList);

  let running = false;
  let rafId = null;
  let timerId = null;
  let bubbleId = null;

  let timeLeft = 45;
  let score = 0;
  let goal = 6;

  let combo = 1;
  let lastCatchAt = 0;

  let teachIndex = 0;
  let boatX = 10;
  let boatDir = 1;

  let castLocked = false;
  let targets = [];

  function resetState() {
    timeLeft = 45;
    score = 0;
    goal = 6;
    combo = 1;
    lastCatchAt = 0;
    teachIndex = 0;
    boatX = 10;
    boatDir = 1;
    castLocked = false;
    targets = [];

    if (timeEl) timeEl.textContent = String(timeLeft);
    if (scoreEl) scoreEl.textContent = '0';
    if (comboEl) comboEl.textContent = 'x1';
    if (goalEl) goalEl.textContent = String(goal);

    setTeaching({
      text: 'Időzíts nyugodtan. Siker után állj meg egy pillanatra az igével.',
      ref: 'Lk 5'
    });

    arena?.querySelectorAll('.target')?.forEach(el => el.remove());
    if (bubbleLayer) bubbleLayer.innerHTML = '';
    hideOverlay(endOverlay);

    if (castBtn) {
      castBtn.disabled = false;
      castBtn.textContent = 'Háló dobása';
    }
  }

  function setTeaching({ text, ref }) {
    if (!teachingText || !teachingRef) return;
    teachingText.textContent = text;
    teachingRef.textContent = ref;
    if (teachingCard) {
      const prev = teachingCard.style.boxShadow;
      teachingCard.style.boxShadow = '0 0 0 3px rgba(11,124,255,.18), 0 16px 30px rgba(11,124,255,.10)';
      setTimeout(() => { teachingCard.style.boxShadow = prev; }, 480);
    }
  }

  function makeBubble() {
    if (!bubbleLayer) return;
    const el = document.createElement('div');
    el.className = 'bubble';
    const size = rand(6, 14);
    const left = rand(4, 96);
    const duration = rand(8, 14);
    el.style.left = `${left}%`;
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.animationDuration = `${duration}s`;
    el.style.opacity = String(Math.random() * 0.35 + 0.15);
    bubbleLayer.appendChild(el);
    setTimeout(() => el.remove(), duration * 1000);
  }

  function createTarget() {
    if (!arena) return;
    const p = targetsPool[rand(0, targetsPool.length - 1)];
    const el = document.createElement('div');
    el.className = 'target good';
    el.innerHTML = `<div class="person-icon">${p.icon}</div><div class="name-tag">${p.label}</div>`;
    el.style.left = `${rand(12, 88)}%`;
    el.style.top = `${rand(46, 78)}%`;

    const target = {
      x: parseFloat(el.style.left),
      y: parseFloat(el.style.top),
      speed: rand(6, 12) / 10,
      dir: Math.random() > 0.5 ? 1 : -1,
      phase: Math.random() * Math.PI * 2,
      el
    };

    arena.appendChild(el);
    targets.push(target);
  }

  function fillTargets() {
    while (targets.length < 4) createTarget();
  }

  function loop() {
    if (!running) return;

    boatX += 0.18 * boatDir;
    if (boatX >= 86) boatDir = -1;
    if (boatX <= 6) boatDir = 1;
    if (boat) boat.style.left = `${boatX}%`;

    const now = performance.now();
    targets.forEach(t => {
      t.x += 0.08 * t.speed * t.dir;
      if (t.x > 92) t.dir = -1;
      if (t.x < 6) t.dir = 1;
      const wave = Math.sin(now / 900 + t.phase) * 1.2;
      t.el.style.left = `${t.x}%`;
      t.el.style.top = `${t.y + wave}%`;
    });

    rafId = requestAnimationFrame(loop);
  }

  function splashAt(x, yPercent = 74) {
    if (!impactRing) return;
    impactRing.style.left = `${x}%`;
    impactRing.style.top = `${yPercent}%`;
    impactRing.style.opacity = '1';
    impactRing.style.animation = 'none';
    impactRing.offsetHeight;
    impactRing.style.animation = 'ring .42s ease forwards';
  }

  function lockCast(ms) {
    castLocked = true;
    if (castBtn) castBtn.disabled = true;
    setTimeout(() => {
      castLocked = false;
      if (castBtn) castBtn.disabled = false;
    }, ms);
  }

  function pickCatch(x) {
    let best = null;
    let bestDist = Infinity;
    for (const t of targets) {
      const d = Math.abs(t.x - x);
      if (d < bestDist) {
        bestDist = d;
        best = t;
      }
    }
    return bestDist <= 5 ? best : null;
  }

  function nextVerse() {
    const v = verseList[teachIndex % verseList.length];
    teachIndex += 1;

    if (verseHasText && v.text) {
      return { text: `„${v.text}”`, ref: v.ref };
    }
    return { text: 'Olvasd el a teljes igét a Bibliádban / Biblia appban.', ref: v.ref };
  }

  function castNet() {
    if (!running || castLocked || !arena) return;

    const x = boatX;
    lockCast(900);

    if (dropLine) {
      dropLine.style.opacity = '1';
      dropLine.style.left = `${x}%`;
      dropLine.style.height = '0px';
      const dropHeight = Math.max(220, arena.getBoundingClientRect().height * 0.68);
      requestAnimationFrame(() => {
        dropLine.style.transition = 'height .32s ease';
        dropLine.style.height = `${dropHeight}px`;
      });
    }

    setTimeout(() => {
      if (netEffect) {
        netEffect.style.opacity = '1';
        netEffect.style.left = `${x}%`;
        netEffect.style.top = '74%';
        netEffect.style.transform = 'translate(-50%,-50%) scale(1.15)';
      }
      splashAt(x);

      const caught = pickCatch(x);

      if (caught) {
        const now = Date.now();
        combo = (now - lastCatchAt < 3200) ? Math.min(combo + 1, 3) : 1;
        lastCatchAt = now;

        score += combo;
        if (scoreEl) scoreEl.textContent = String(score);
        if (comboEl) comboEl.textContent = `x${combo}`;

        const verse = nextVerse();
        setTeaching(verse);
        App.playSuccess();

        caught.el.classList.add('caught');
        targets = targets.filter(t => t !== caught);

        setTimeout(() => {
          caught.el.remove();
          fillTargets();
        }, 420);

        lockCast(1200);
      } else {
        combo = 1;
        if (comboEl) comboEl.textContent = 'x1';
        setTeaching({ text: 'Néha a legjobb lépés a türelmes figyelem.', ref: 'Préd 3:1' });
        App.playFail();
      }
    }, 320);

    setTimeout(() => {
      if (dropLine) {
        dropLine.style.transition = 'height .24s ease, opacity .2s ease';
        dropLine.style.height = '0px';
        dropLine.style.opacity = '0';
      }
      if (netEffect) {
        netEffect.style.opacity = '0';
        netEffect.style.transform = 'translate(-50%,-50%) scale(.5)';
      }
    }, 940);
  }

  function endGame() {
    running = false;
    cancelAnimationFrame(rafId);
    clearInterval(timerId);
    clearInterval(bubbleId);

    App.markDone('fishing');

    const reachedGoal = score >= goal;
    if (endTitle) endTitle.textContent = reachedGoal ? 'Küldetés teljesítve!' : 'Küldetés lezárva';

    if (endSummary) {
      endSummary.textContent = reachedGoal
        ? `Nyugodt tempóban ${score} elérést szereztél.`
        : `${score} elérés született. A figyelem és a megfelelő pillanat számít.`;
    }

    showOverlay(endOverlay);
  }

  function start() {
    if (running) return;
    resetState();
    running = true;
    fillTargets();
    loop();

    bubbleId = setInterval(makeBubble, 420);
    timerId = setInterval(() => {
      timeLeft -= 1;
      if (timeEl) timeEl.textContent = String(timeLeft);
      if (timeLeft <= 0) endGame();
    }, 1000);
  }

  function reset() {
    running = false;
    cancelAnimationFrame(rafId);
    clearInterval(timerId);
    clearInterval(bubbleId);
    resetState();
  }

  castBtn?.addEventListener('click', castNet);
  restartBtn?.addEventListener('click', () => { reset(); start(); });
  replayBtn?.addEventListener('click', () => { hideOverlay(endOverlay); reset(); start(); });
  continueBtn?.addEventListener('click', () => { hideOverlay(endOverlay); App.goTo('story'); });

  document.addEventListener('keydown', (e) => {
    if (!running) return;
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      castNet();
    }
  });

  return { start, reset };
})();

const StoryGame = (() => {
  const visual = document.getElementById('storyVisual');
  const stepLabel = document.getElementById('storyStepLabel');
  const progressFill = document.getElementById('storyProgressFill');
  const avatar = document.getElementById('storyAvatar');
  const speaker = document.getElementById('storySpeaker');
  const text = document.getElementById('storyText');
  const verseChip = document.getElementById('storyVerseChip');
  const feedback = document.getElementById('storyFeedback');
  const choices = document.getElementById('storyChoices');
  const endOverlay = document.getElementById('storyEndOverlay');
  const continueBtn = document.getElementById('storyContinueBtn');
  const menuBtn = document.getElementById('storyMenuBtn');

  const scenes = [
    { id:'shore', verse:'Lk 5:1–3', type:'narration', speaker:'Narrátor', avatar:'Narrator', avatarText:'N',
      text:'A Genezáreti-tónál nagy sokaság gyűlt Jézus köré, hogy hallja Isten üzenetét. Jézus beszállt Simon egyik csónakjába, kissé eltávolodott a parttól, és onnan tanította a népet.' },
    { id:'teach', verse:'Lk 5:4', type:'narration', speaker:'Jézus', avatar:'Jesus', avatarText:'J',
      text:'Amikor befejezte a tanítást, Jézus Simonhoz fordult: „Evezz a mélyre, és vessétek ki a hálókat fogásra.”' },
    { id:'choice-deep', verse:'Lk 5:5', type:'choice', speaker:'Péter', avatar:'Peter', avatarText:'P',
      prompt:'Mit válaszol Péter Jézusnak?',
      text:'Péter egész éjjel dolgozott, és semmit sem fogott. Mégis döntenie kell, hogyan reagál Jézus kérésére.',
      correct:0,
      options:[
        { text:'„Mester, egész éjjel fáradtunk, és semmit sem fogtunk – de a te szavadra mégis kivetem a hálót.”',
          success:'Ez a történet kulcsa: nem a körülmények, hanem Jézus szava az irány.' },
        { text:'„Most nincs értelme próbálkozni, hiszen már mindent megtettünk.”',
          feedback:'Érthető lenne, de a történetben Péter a fáradtsága ellenére lép.' },
        { text:'„Előbb találjunk jobb helyet, és aztán meglátjuk.”',
          feedback:'Itt nem saját stratégiát választ, hanem Jézus kérésére reagál.' },
      ] },
    { id:'catch', verse:'Lk 5:6–7', type:'narration', speaker:'Narrátor', avatar:'Narrator', avatarText:'N',
      text:'Amikor megtették, akkora halfogásuk lett, hogy a hálóik szakadozni kezdtek. Intettek társaiknak a másik csónakból, hogy jöjjenek segíteni, és mindkét csónak annyira megtelt, hogy csaknem elsüllyedt.' },
    { id:'choice-humility', verse:'Lk 5:8', type:'choice', speaker:'Péter', avatar:'Peter', avatarText:'P',
      prompt:'Hogyan reagál Péter erre a csodára?',
      text:'Péter nem egyszerűen örül a fogásnak. A csodában Jézus nagyságát látja meg.',
      correct:0,
      options:[
        { text:'Jézus elé borul, és érzi, mennyire más Jézus, mint bárki más.',
          success:'Igen. Péter alázattal reagál, mert felismeri Jézus szentségét.' },
        { text:'Azonnal azon kezd gondolkodni, mekkora haszon lesz ebből a fogásból.',
          feedback:'A hangsúly nem a haszon, hanem Jézus személyének felismerése.' },
        { text:'Úgy érzi, végre bebizonyította, hogy ő a legjobb halász.',
          feedback:'A bibliai történetben Péter nem dicsekszik, hanem megrendül.' },
      ] },
    { id:'humility', verse:'Lk 5:8', type:'narration', speaker:'Péter', avatar:'Peter', avatarText:'P',
      text:'Péter Jézus elé borult, és azt érezte: „Uram, menj el tőlem, mert bűnös ember vagyok.” Nem eltaszítani akarta Jézust, hanem megdöbbent attól, hogy mennyire szent és hatalmas.' },
    { id:'partners', verse:'Lk 5:9–10a', type:'narration', speaker:'Narrátor', avatar:'Narrator', avatarText:'N',
      text:'Nemcsak Pétert, hanem társait is mélyen megrendítette a fogás: Jakabot és Jánost is, Zebedeus fiait, akik Simon munkatársai voltak.' },
    { id:'choice-call', verse:'Lk 5:10b', type:'choice', speaker:'Jézus', avatar:'Jesus', avatarText:'J',
      prompt:'Mi Jézus következő mondata Péterhez?',
      text:'Jézus nem félelmet akar kelteni, hanem új irányt ad Péter életének.',
      correct:2,
      options:[
        { text:'„Most már tudod, hogyan kell jól halászni.”',
          feedback:'A történet nem technikáról szól, hanem elhívásról.' },
        { text:'„Maradj ennél a munkánál, csak most már jobban fog menni.”',
          feedback:'Jézus nem csupán jobb munkát ígér, hanem új küldetést ad.' },
        { text:'„Ne félj; mostantól embereket fogsz halászni.”',
          success:'Pontosan. Jézus bátorít, majd új küldetést ad.' },
      ] },
    { id:'leave', verse:'Lk 5:11', type:'choice', speaker:'Péter', avatar:'Peter', avatarText:'P',
      prompt:'Mi a történet lezárása?',
      text:'A kérdés már nem az, hogy volt-e csoda, hanem az, mit kezdenek vele.',
      correct:1,
      options:[
        { text:'Visszatérnek a szokásos életükhöz, de most már több reménnyel.',
          feedback:'A történet ennél tovább megy: a csoda követésre hív.' },
        { text:'Kivonják a csónakokat a partra, mindent otthagynak, és követik Jézust.',
          success:'Igen. Az igazi válasz a követés, nem pusztán a csoda csodálata.' },
        { text:'Először megünneplik a nagy fogást, és csak utána döntenek.',
          feedback:'A szakasz gyors és világos választ mutat: Jézust kezdték követni.' },
      ] },
  ];

  let index = 0;
  let removedMap = {};

  function render() {
    hideOverlay(endOverlay);
    const scene = scenes[index];

    if (stepLabel) stepLabel.textContent = `Jelenet ${index + 1} / ${scenes.length}`;
    if (progressFill) progressFill.style.width = `${((index + 1) / scenes.length) * 100}%`;

    if (avatar) {
      avatar.className = `avatar ${scene.avatar}`;
      avatar.textContent = scene.avatarText;
    }
    if (speaker) speaker.textContent = scene.speaker;
    if (text) text.textContent = scene.text;
    if (verseChip) verseChip.textContent = scene.verse;

    if (feedback) {
      feedback.classList.add('hidden');
      feedback.classList.remove('success');
      feedback.textContent = '';
    }

    if (visual) visual.innerHTML = buildSceneSVG(scene.id);
    if (choices) choices.innerHTML = '';

    if (!choices) return;

    if (scene.type === 'narration') {
      const nextBtn = document.createElement('button');
      nextBtn.className = 'primary-btn shimmer';
      nextBtn.type = 'button';
      nextBtn.textContent = index === scenes.length - 1 ? 'Befejezés' : 'Tovább';
      nextBtn.addEventListener('click', () => { App.playClick(); next(); });
      choices.appendChild(nextBtn);
      return;
    }

    const prompt = document.createElement('div');
    prompt.className = 'mini-note';
    prompt.innerHTML = `<p class="eyebrow">Kérdés</p><p>${scene.prompt}</p>`;
    choices.appendChild(prompt);

    scene.options.forEach((option, idx) => {
      if (removedMap[index]?.includes(idx)) return;
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.type = 'button';
      btn.textContent = option.text;
      btn.addEventListener('click', () => choose(idx));
      choices.appendChild(btn);
    });
  }

  function choose(idx) {
    const scene = scenes[index];
    const option = scene.options[idx];

    if (!feedback || !choices) return;

    if (idx === scene.correct) {
      feedback.textContent = option.success || 'Helyes válasz.';
      feedback.classList.remove('hidden');
      feedback.classList.add('success');
      App.playSuccess();
      choices.querySelectorAll('button').forEach(btn => btn.disabled = true);
      setTimeout(next, 980);
    } else {
      feedback.textContent = `${option.feedback} Most már csak a helyes válasz marad nyitva.`;
      feedback.classList.remove('hidden');
      feedback.classList.remove('success');
      App.playFail();
      removedMap[index] = [...(removedMap[index] || []), idx];
      setTimeout(render, 920);
    }
  }

  function next() {
    if (index < scenes.length - 1) {
      index += 1;
      render();
      return;
    }
    if (progressFill) progressFill.style.width = '100%';
    App.markDone('story');
    showOverlay(endOverlay);
  }

  function reset() {
    index = 0;
    removedMap = {};
    render();
  }

  continueBtn?.addEventListener('click', () => { hideOverlay(endOverlay); App.goTo('lesson'); });
  menuBtn?.addEventListener('click', () => { hideOverlay(endOverlay); App.goTo('menu'); });

  return { render, reset };
})();

const LessonGame = (() => {
  const stage = document.getElementById('lessonStage');
  const stepLabel = document.getElementById('lessonStepLabel');
  const progressFill = document.getElementById('lessonProgressFill');
  const restartBtn = document.getElementById('restartLessonBtn');

  const endOverlay = document.getElementById('lessonEndOverlay');
  const endSummary = document.getElementById('lessonEndSummary');
  const menuBtn = document.getElementById('lessonMenuBtn');
  const replayBtn = document.getElementById('lessonReplayBtn');

  let index = 0;
  let score = 0;

  const tasks = [
    { type:'sequence', title:'1. Tedd sorrendbe a történetet',
      text:'Koppints a kártyákra a helyes sorrendben.',
      items:[
        'Jézus a csónakból tanítja a tömeget.',
        'Péter Jézus szavára újra kiveteti a hálót.',
        'Csodálatos halfogás történik.',
        'Jézus azt mondja: „Ne félj.”',
        'Péter és társai követik Jézust.',
      ] },
    { type:'fear', title:'2. „Ne félj” – félelmek átadása',
      text:'Érintsd meg azokat a gondolatokat, amelyeket ma is letehetsz Jézus elé.',
      fears:['Mi van, ha kudarcot vallok?', 'Fáradt vagyok.', 'Nem látom előre a végét.', 'Mit fognak gondolni rólam?'] },
    { type:'persona', title:'3. Helyzetek ma',
      text:'Válaszd ki azt a helyzetet, amelyik a legközelebb áll a történet üzenetéhez.',
      options:[
        { name:'Helyzet A', desc:'Bizonytalan, mégis megnyílna és segítséget kérne.', good:true },
        { name:'Helyzet B', desc:'Csak akkor lép, ha előre biztos a siker.', good:false },
        { name:'Helyzet C', desc:'Fáradt, mégis megtesz egy szeretetteljes lépést.', good:true },
        { name:'Helyzet D', desc:'Inkább kivár, hogy semmi kényelmetlen ne történjen.', good:false },
      ] },
    { type:'mission', title:'4. Az elhívás képe',
      text:'Nyomd meg a gombot, és figyeld meg, hogyan válik a kép küldetéssé.' },
  ];

  function render() {
    hideOverlay(endOverlay);
    const task = tasks[index];

    if (stepLabel) stepLabel.textContent = `Feladat ${index + 1} / ${tasks.length}`;
    if (progressFill) progressFill.style.width = `${((index + 1) / tasks.length) * 100}%`;

    if (!stage) return;

    if (task.type === 'sequence') renderSequence(task);
    if (task.type === 'fear') renderFear(task);
    if (task.type === 'persona') renderPersona(task);
    if (task.type === 'mission') renderMission(task);
  }

  function next() {
    if (index < tasks.length - 1) {
      index += 1;
      render();
    }
  }

  function renderSequence(task) {
    const correctOrder = task.items.slice();
    const shuffled = task.items.slice().sort(() => Math.random() - 0.5);
    let current = 0;

    stage.innerHTML = `
      <div class="lesson-stage-grid">
        <div class="lesson-main">
          <h3>${task.title}</h3>
          <p>${task.text}</p>
          <div class="sequence-wrap" id="sequenceWrap"></div>
          <div class="lesson-feedback hidden" id="lessonFeedback"></div>
        </div>
        <aside class="lesson-panel">
          <p class="eyebrow">Megfigyelés</p>
          <h3>Történetív</h3>
          <p>Engedelmesség → csoda → felismerés → bátorítás → elhívás.</p>
        </aside>
      </div>
    `;

    const wrap = document.getElementById('sequenceWrap');
    const feedback = document.getElementById('lessonFeedback');

    shuffled.forEach(item => {
      const btn = document.createElement('button');
      btn.className = 'sequence-card';
      btn.type = 'button';
      btn.textContent = item;

      btn.addEventListener('click', () => {
        if (btn.disabled) return;

        if (item === correctOrder[current]) {
          btn.classList.add('correct');
          btn.disabled = true;
          current += 1;
          App.playSuccess();

          if (current === correctOrder.length) {
            score += 1;
            if (feedback) {
              feedback.textContent = 'Szép munka! Most már tisztán látszik a történet íve.';
              feedback.classList.remove('hidden');
            }
            setTimeout(next, 1200);
          }
        } else {
          btn.classList.add('wrong');
          App.playFail();
          if (feedback) {
            feedback.textContent = 'Ez a kártya korábban vagy később következik.';
            feedback.classList.remove('hidden');
          }
          setTimeout(() => btn.classList.remove('wrong'), 700);
        }
      });

      wrap?.appendChild(btn);
    });
  }

  function renderFear(task) {
    stage.innerHTML = `
      <div class="lesson-stage-grid">
        <div class="lesson-main">
          <h3>${task.title}</h3>
          <p>${task.text}</p>
          <div class="fear-cloud" id="fearCloud"></div>
          <div class="lesson-feedback hidden" id="lessonFeedback"></div>
        </div>
        <aside class="lesson-panel">
          <p class="eyebrow">Kulcs</p>
          <h3>„Ne félj”</h3>
          <p>Jézus bátorít, és ebből nyílik új irány.</p>
        </aside>
      </div>
    `;

    const cloud = document.getElementById('fearCloud');
    const feedback = document.getElementById('lessonFeedback');
    let dismissed = 0;

    task.fears.forEach(fear => {
      const btn = document.createElement('button');
      btn.className = 'fear-chip';
      btn.type = 'button';
      btn.textContent = fear;

      btn.addEventListener('click', () => {
        if (btn.classList.contains('dismissed')) return;
        btn.classList.add('dismissed');
        dismissed += 1;
        App.playClick();

        if (dismissed === task.fears.length) {
          score += 1;
          if (feedback) {
            feedback.textContent = 'Amikor mindet leteszed, a félelem nem vezet tovább.';
            feedback.classList.remove('hidden');
          }
          App.playSuccess();
          setTimeout(next, 1200);
        }
      });

      cloud?.appendChild(btn);
    });
  }

  function renderPersona(task) {
    stage.innerHTML = `
      <div class="lesson-stage-grid">
        <div class="lesson-main">
          <h3>${task.title}</h3>
          <p>${task.text}</p>
          <div class="persona-grid" id="personaGrid"></div>
          <div class="lesson-feedback hidden" id="lessonFeedback"></div>
        </div>
        <aside class="lesson-panel">
          <p class="eyebrow">Alkalmazás</p>
          <h3>Mai döntések</h3>
          <p>Ugyanaz a kérdés: mire támaszkodom, amikor lépek?</p>
        </aside>
      </div>
    `;

    const grid = document.getElementById('personaGrid');
    const feedback = document.getElementById('lessonFeedback');

    task.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'persona-card';
      btn.type = 'button';
      btn.innerHTML = `
        <div class="persona-name">${opt.name}</div>
        <div class="persona-choice">${opt.desc}</div>
      `;

      btn.addEventListener('click', () => {
        grid?.querySelectorAll('button').forEach(b => b.disabled = true);
        btn.classList.add('selected');

        if (opt.good) {
          score += 1;
          if (feedback) feedback.textContent = 'Jó választás: lépés a bizonytalanságban is.';
          App.playSuccess();
        } else {
          if (feedback) feedback.textContent = 'Ez inkább a biztosat keresi. A történet bátorít a lépésre.';
          App.playFail();
        }

        feedback?.classList.remove('hidden');
        setTimeout(next, 1350);
      });

      grid?.appendChild(btn);
    });
  }

  function renderMission(task) {
    stage.innerHTML = `
      <div class="lesson-stage-grid">
        <div class="lesson-main">
          <h3>${task.title}</h3>
          <p>${task.text}</p>
          <div class="mission-strip">
            <div class="mission-card">🐟🎣</div>
            <div class="mission-arrow">→</div>
            <div class="mission-card" id="missionTarget">🧍🧍‍♀️🧑</div>
          </div>
          <div class="challenge-options">
            <button class="primary-btn shimmer" id="missionRevealBtn" type="button">Megmutatás</button>
          </div>
          <div class="lesson-feedback hidden" id="lessonFeedback"></div>
        </div>
        <aside class="lesson-panel">
          <p class="eyebrow">Összegzés</p>
          <h3>Küldetés</h3>
          <p>A történet vége nem zárás, hanem irányváltás.</p>
        </aside>
      </div>
    `;

    const target = document.getElementById('missionTarget');
    const btn = document.getElementById('missionRevealBtn');
    const feedback = document.getElementById('lessonFeedback');

    btn?.addEventListener('click', () => {
      if (target) target.textContent = '🫶👣';
      if (feedback) {
        feedback.textContent = 'Az elhívás lényege: emberek felé menni Jézus üzenetével.';
        feedback.classList.remove('hidden');
      }
      score += 1;
      App.playSuccess();

      setTimeout(() => {
        App.markDone('lesson');
        if (endSummary) endSummary.textContent = `A 4 feladatból ${score} pontot szereztél.`;
        showOverlay(endOverlay);
      }, 1400);
    }, { once: true });
  }

  function reset() {
    index = 0;
    score = 0;
    render();
  }

  restartBtn?.addEventListener('click', reset);
  menuBtn?.addEventListener('click', () => { hideOverlay(endOverlay); App.goTo('menu'); });
  replayBtn?.addEventListener('click', () => { hideOverlay(endOverlay); reset(); });

  return { render, reset };
})();

function buildSceneSVG(sceneId) {
  const commonTop = '<defs><linearGradient id="sky" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#b7ebff"/><stop offset="68%" stop-color="#7cd6ff"/><stop offset="100%" stop-color="#33a8e8"/></linearGradient><linearGradient id="water" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#76d7ff"/><stop offset="100%" stop-color="#0e84cc"/></linearGradient><linearGradient id="boatBrown" x1="0" x2="1"><stop offset="0%" stop-color="#8d5a2b"/><stop offset="100%" stop-color="#6b3d18"/></linearGradient></defs>';
  const lake = '<rect width="100%" height="100%" fill="url(#sky)"/><circle cx="70" cy="54" r="38" fill="rgba(255,255,255,.45)"/><rect y="230" width="100%" height="250" fill="url(#water)"/><ellipse cx="240" cy="290" rx="280" ry="60" fill="rgba(255,255,255,.14)"/><ellipse cx="360" cy="340" rx="320" ry="70" fill="rgba(255,255,255,.18)"/>';
  const shorePeople = '<g><circle cx="72" cy="226" r="14" fill="#f7c59f"/><rect x="58" y="240" width="28" height="38" rx="10" fill="#6a9df8"/><circle cx="112" cy="224" r="12" fill="#f7c59f"/><rect x="100" y="236" width="24" height="36" rx="10" fill="#ff8f70"/><circle cx="144" cy="230" r="11" fill="#f7c59f"/><rect x="134" y="242" width="20" height="30" rx="9" fill="#65c27a"/></g>';
  const boat = '<g><ellipse cx="320" cy="232" rx="78" ry="18" fill="rgba(0,0,0,.08)"/><path d="M248 206 Q320 186 392 206 L376 238 Q320 248 264 238 Z" fill="url(#boatBrown)"/><rect x="313" y="148" width="6" height="60" fill="#a66f34"/><path d="M319 150 L365 190 L319 190 Z" fill="#fff7da"/><line x1="318" y1="151" x2="318" y2="190" stroke="#b8d6ff" stroke-width="2"/></g>';
  const jesus = '<g><circle cx="330" cy="196" r="14" fill="#f3c79a"/><path d="M314 188 q16 -26 32 0" fill="#6e4d35"/><rect x="316" y="210" width="28" height="38" rx="12" fill="#8f88ff"/></g>';
  const peter = '<g><circle cx="296" cy="200" r="14" fill="#f3c79a"/><path d="M281 191 q15 -24 30 0" fill="#7c5328"/><rect x="282" y="214" width="28" height="36" rx="12" fill="#f1be4a"/></g>';
  const net = '<path d="M334 214 C380 230, 408 250, 432 286" stroke="#ffffff" stroke-width="3" fill="none" stroke-dasharray="4 4"/><circle cx="434" cy="289" r="18" fill="none" stroke="#ffffff" stroke-width="3"/>';
  const fishGroup = '<g><path d="M424 295 q18 -14 34 0 q-16 14 -34 0" fill="#ffd166"/><circle cx="451" cy="295" r="2.4" fill="#243b55"/><path d="M394 318 q18 -14 34 0 q-16 14 -34 0" fill="#ff9f43"/><circle cx="421" cy="318" r="2.4" fill="#243b55"/><path d="M444 326 q18 -14 34 0 q-16 14 -34 0" fill="#7dd3fc"/><circle cx="471" cy="326" r="2.4" fill="#243b55"/></g>';
  const extraBoat = '<g><ellipse cx="474" cy="246" rx="66" ry="14" fill="rgba(0,0,0,.08)"/><path d="M420 220 Q474 206 528 220 L516 246 Q474 256 432 246 Z" fill="#8d5a2b"/></g>';
  const kneel = '<g><circle cx="302" cy="216" r="14" fill="#f3c79a"/><rect x="286" y="230" width="32" height="24" rx="10" fill="#f1be4a"/><rect x="320" y="228" width="14" height="26" rx="7" fill="#f1be4a"/></g>';

  const svgStart = '<svg viewBox="0 0 640 420" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Bibliai jelenet">' + commonTop;
  const end = '</svg>';

  const scenes = {
    shore: svgStart + lake + '<rect y="210" width="220" height="40" fill="#e7cfa3"/>' + shorePeople + boat + jesus + '<text x="42" y="86" fill="#ffffff" font-size="22" font-weight="800">A sokaság hallgatja Jézust</text>' + end,
    teach: svgStart + lake + boat + jesus + '<text x="44" y="78" fill="#ffffff" font-size="22" font-weight="800">Jézus a csónakból tanít</text><text x="44" y="104" fill="#eaf9ff" font-size="15">A parton marad a tömeg, a tavon pedig új irány nyílik</text>' + end,
    'choice-deep': svgStart + lake + boat + jesus + peter + '<text x="40" y="78" fill="#ffffff" font-size="22" font-weight="800">„Evezz a mélyre!”</text><text x="40" y="104" fill="#eaf9ff" font-size="15">Péternek döntenie kell: tapasztalat vagy engedelmesség?</text>' + end,
    catch: svgStart + lake + boat + extraBoat + jesus + peter + net + fishGroup + '<text x="42" y="74" fill="#ffffff" font-size="22" font-weight="800">A háló megtelik</text><text x="42" y="100" fill="#eaf9ff" font-size="15">Olyan sok a fogás, hogy segítséget kell hívni</text>' + end,
    'choice-humility': svgStart + lake + boat + jesus + fishGroup + '<text x="42" y="74" fill="#ffffff" font-size="22" font-weight="800">Péter felismeri Jézus nagyságát</text>' + end,
    humility: svgStart + lake + boat + jesus + kneel + '<text x="42" y="74" fill="#ffffff" font-size="22" font-weight="800">Alázat és bűnismeret</text><text x="42" y="100" fill="#eaf9ff" font-size="15">A csoda mély felismerést is hoz</text>' + end,
    partners: svgStart + lake + boat + extraBoat + jesus + peter + fishGroup + '<text x="42" y="74" fill="#ffffff" font-size="22" font-weight="800">Jakab és János is ott vannak</text>' + end,
    'choice-call': svgStart + lake + boat + jesus + peter + '<text x="42" y="74" fill="#ffffff" font-size="22" font-weight="800">„Ne félj”</text><text x="42" y="100" fill="#eaf9ff" font-size="15">Jézus bátorít, majd új küldetést ad</text>' + end,
    leave: svgStart + lake + '<rect y="210" width="220" height="40" fill="#e7cfa3"/>' + boat + '<g transform="translate(-80,22)">' + peter + '</g><g transform="translate(-20,18)">' + jesus + '</g><text x="42" y="74" fill="#ffffff" font-size="22" font-weight="800">A követés elkezdődik</text><text x="42" y="100" fill="#eaf9ff" font-size="15">A történet vége új életirány kezdete</text>' + end,
  };

  return scenes[sceneId] || scenes.shore;
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function showOverlay(el) {
  el?.classList.remove('hidden');
}

function hideOverlay(el) {
  el?.classList.add('hidden');
}

StoryGame.reset();
LessonGame.reset();
