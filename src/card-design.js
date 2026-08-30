const SUITS = {
  blue: { label: 'NAVIGATION', short: 'NAV', icon: navigationIcon },
  yellow: { label: 'DATA PULSE', short: 'PULSE', icon: pulseIcon },
  green: { label: 'SUPPORT', short: 'SUPPORT', icon: supportIcon },
  pink: { label: 'SIGNAL FLARE', short: 'FLARE', icon: flareIcon },
  rocket: { label: 'ROCKET TRUMP', short: 'TRUMP', icon: rocketIcon }
};

function svg(paths, extra='') {
  return `<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" ${extra}>${paths}</svg>`;
}

function navigationIcon() {
  return svg(`
    <circle cx="32" cy="32" r="23" class="icon-ring"/>
    <path d="M32 9 45 48 32 41 19 48Z" class="icon-main"/>
    <path d="M32 19v22M21 34h22" class="icon-detail"/>
    <circle cx="32" cy="9" r="2.2" class="icon-dot"/>
    <circle cx="53" cy="34" r="1.8" class="icon-dot"/>
  `);
}

function pulseIcon() {
  return svg(`
    <path d="M14 18 32 8l18 10v28L32 56 14 46Z" class="icon-ring"/>
    <path d="M18 32h7l3-12 6 25 4-18 3 5h7" class="icon-main icon-stroke"/>
    <path d="M21 17v7M43 40v7" class="icon-detail"/>
  `);
}

function supportIcon() {
  return svg(`
    <path d="M12 27a20 20 0 0 1 40 0M17 27a15 15 0 0 1 30 0M22 27a10 10 0 0 1 20 0" class="icon-ring icon-stroke"/>
    <path d="M32 52V31c-10 1-15 7-14 16 7 0 11-3 14-8 3 5 7 8 14 8 1-9-4-15-14-16Z" class="icon-main"/>
  `);
}

function flareIcon() {
  return svg(`
    <circle cx="32" cy="32" r="22" class="icon-ring"/>
    <path d="m32 8 4.8 19.2L56 32l-19.2 4.8L32 56l-4.8-19.2L8 32l19.2-4.8Z" class="icon-main"/>
    <circle cx="32" cy="32" r="4.2" class="icon-cut"/>
  `);
}

function rocketIcon() {
  return svg(`
    <circle cx="32" cy="34" r="22" class="icon-ring"/>
    <path d="M32 8c8 8 11 18 8 29l-8 9-8-9C21 26 24 16 32 8Z" class="icon-main"/>
    <circle cx="32" cy="26" r="4" class="icon-cut"/>
    <path d="m24 37-7 9 9-3M40 37l7 9-9-3M28 47l4 9 4-9" class="icon-main icon-stroke"/>
  `);
}

function emblem(suit, className='') {
  const meta=SUITS[suit] || SUITS.blue;
  const span=document.createElement('span');
  span.className=`suit-emblem ${className}`.trim();
  span.innerHTML=meta.icon();
  return span;
}

function cardCorner(value,suit,where) {
  const corner=document.createElement('span');
  corner.className=`card-corner card-corner-${where}`;
  const n=document.createElement('strong');n.textContent=value;
  corner.append(n,emblem(suit,'corner-emblem'));
  return corner;
}

function decorateCard(card) {
  if(card.dataset.cardReady==='1')return;
  card.dataset.cardReady='1';
  const suit=Object.keys(SUITS).find(s=>card.classList.contains(s)) || 'blue';
  card.dataset.suit=suit;

  if(card.classList.contains('back-card')) {
    card.replaceChildren();
    const core=document.createElement('span');core.className='card-back-core';
    core.append(emblem('blue','back-emblem'));
    const word=document.createElement('span');word.className='card-back-word';word.textContent='OPENCREW';
    const sub=document.createElement('span');sub.className='card-back-sub';sub.textContent='COOPERATE · SIGNAL · COMPLETE';
    core.append(word,sub);card.append(core);return;
  }

  const value=card.querySelector('b')?.textContent?.trim() || '';
  card.dataset.value=value;
  const meta=SUITS[suit];
  card.replaceChildren();
  const art=document.createElement('span');art.className='card-art';
  art.append(emblem(suit,'hero-emblem'));
  const label=document.createElement('span');label.className='card-label';label.textContent=meta.label;
  art.append(label);
  card.append(cardCorner(value,suit,'top'),art,cardCorner(value,suit,'bottom'));
  card.setAttribute('aria-label',suit==='rocket'?`Rocket trump ${value}`:`${meta.label} ${value}`);
}

function decorateSignal(button) {
  if(button.dataset.signalReady==='1')return;
  button.dataset.signalReady='1';
  const suit=Object.keys(SUITS).find(s=>button.classList.contains(s)) || 'blue';
  const raw=button.textContent.trim();
  const parts=raw.split('·').map(s=>s.trim());
  const left=parts[0]||raw;
  const kind=parts[1]||'';
  const value=(left.match(/\d+/)||[''])[0];
  button.replaceChildren();
  const top=document.createElement('span');top.className='signal-kind';top.textContent=kind;
  const center=document.createElement('span');center.className='signal-center';center.append(emblem(suit,'signal-emblem'));
  const num=document.createElement('strong');num.textContent=value;center.append(num);
  button.append(top,center);
}

function decorateTask(task) {
  if(task.dataset.objectiveReady==='1')return;
  task.dataset.objectiveReady='1';task.classList.add('objective-card');
  const text=task.textContent.toLowerCase();
  const suit=['blue','yellow','green','pink','rocket'].find(s=>text.includes(s));
  if(suit)task.classList.add(`objective-${suit}`);
}

function scan(root=document) {
  root.querySelectorAll?.('.card').forEach(decorateCard);
  root.querySelectorAll?.('.signal-chip').forEach(decorateSignal);
  root.querySelectorAll?.('.task').forEach(decorateTask);
}

const app=document.querySelector('#app');
if(app) {
  scan(app);
  new MutationObserver(records=>{
    for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1){
      if(node.matches?.('.card'))decorateCard(node);
      if(node.matches?.('.signal-chip'))decorateSignal(node);
      if(node.matches?.('.task'))decorateTask(node);
      scan(node);
    }
  }).observe(app,{childList:true,subtree:true});
}
